import { NextResponse } from "next/server";
import { callClaudeWithTool } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import { serpapiSearch, type SerpResult } from "@/lib/serpapi";
import { proxycurlBatch, resumoPerfil } from "@/lib/proxycurl";
import {
  buildCallBUser,
  callBSystem,
  callBTool,
} from "@/lib/prompts/call-b-prefilter";
import {
  buildCallCUser,
  callCSystem,
  callCTool,
} from "@/lib/prompts/call-c-ranking";
import {
  ranquearCandidatosSchema,
  selecionarPerfisSchema,
} from "@/types/api";
import type { Vaga } from "@/types/vaga";

export const maxDuration = 60;

async function marcarErro(vagaId: string) {
  await supabase.from("vagas").update({ status: "erro" }).eq("id", vagaId);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vagaId } = await params;

  // 1) Carrega vaga completa
  const { data: vaga, error: fetchErr } = await supabase
    .from("vagas")
    .select("*")
    .eq("id", vagaId)
    .single<Vaga>();

  if (fetchErr || !vaga) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  if (vaga.status === "rascunho") {
    return NextResponse.json(
      { error: "Direcionamento ainda não foi gerado pra esta vaga" },
      { status: 409 }
    );
  }
  if (!vaga.icp || !vaga.search_strings || vaga.search_strings.length === 0) {
    return NextResponse.json(
      { error: "Vaga sem ICP ou search strings" },
      { status: 409 }
    );
  }

  // 2) SerpApi — pega a primeira search string plataforma=google, fallback pra qualquer uma
  const googleStrings = vaga.search_strings.filter(
    (s) => s.plataforma === "google"
  );
  const queries = googleStrings.length > 0 ? googleStrings : vaga.search_strings;

  let serpResults: SerpResult[] = [];
  const queriesTentadas: string[] = [];
  for (const q of queries) {
    try {
      queriesTentadas.push(q.string);
      const results = await serpapiSearch(q.string, 20);
      if (results.length >= 3) {
        serpResults = results;
        break;
      }
      if (results.length > serpResults.length) serpResults = results;
    } catch (err) {
      console.warn("[gerar-lista] SerpApi falhou em uma query:", err);
    }
  }

  if (serpResults.length === 0) {
    await marcarErro(vagaId);
    return NextResponse.json(
      {
        error:
          "Nenhum resultado do Google/LinkedIn pras search strings geradas. Refine o briefing.",
        queriesTentadas,
      },
      { status: 502 }
    );
  }

  // 3) Call B — pré-filtro dos 10 mais promissores
  let selecionados: { url: string; motivo_curto: string }[];
  try {
    const raw = await callClaudeWithTool<unknown>({
      system: callBSystem,
      user: buildCallBUser(vaga.icp, serpResults),
      tool: callBTool,
      model: "default",
      maxTokens: 2048,
    });
    const parsed = selecionarPerfisSchema.parse(raw);
    selecionados = parsed.selecionados;
  } catch (err) {
    console.error("[gerar-lista] Call B error", err);
    await marcarErro(vagaId);
    return NextResponse.json(
      { error: "Falha no pré-filtro Claude (Call B)" },
      { status: 502 }
    );
  }

  if (selecionados.length === 0) {
    await marcarErro(vagaId);
    return NextResponse.json(
      { error: "Claude não selecionou nenhum perfil dos resultados do Google." },
      { status: 502 }
    );
  }

  // 4) Proxycurl — enrichment em paralelo
  const urls = selecionados.map((s) => s.url);
  const enriquecidos = await proxycurlBatch(urls);

  if (enriquecidos.length === 0) {
    await marcarErro(vagaId);
    return NextResponse.json(
      {
        error:
          "Nenhum perfil foi enriquecido pelo Proxycurl. Verifique saldo/chave.",
        tentados: urls.length,
      },
      { status: 502 }
    );
  }

  // 5) Call C — ranking final
  let ranking;
  try {
    const raw = await callClaudeWithTool<unknown>({
      system: callCSystem,
      user: buildCallCUser({
        icp: vaga.icp,
        bonsPerfis: vaga.bons_perfis,
        mausPerfis: vaga.maus_perfis,
        candidatos: enriquecidos,
      }),
      tool: callCTool,
      model: "default",
      maxTokens: 4096,
    });
    const parsed = ranquearCandidatosSchema.parse(raw);
    ranking = parsed.ranking;
  } catch (err) {
    console.error("[gerar-lista] Call C error", err);
    await marcarErro(vagaId);
    return NextResponse.json(
      { error: "Falha no ranking Claude (Call C)" },
      { status: 502 }
    );
  }

  // 6) Persiste candidatos em bulk
  const byUrl = new Map(enriquecidos.map((e) => [e.linkedin_url, e]));
  const rows = ranking.map((r) => {
    const enriched = byUrl.get(r.linkedin_url);
    const resumo = enriched
      ? resumoPerfil(enriched)
      : { nome: null, cargo: null, empresa: null };
    return {
      vaga_id: vagaId,
      linkedin_url: r.linkedin_url,
      nome: resumo.nome,
      cargo: resumo.cargo,
      empresa: resumo.empresa,
      enrichment_json: enriched?.dados ?? null,
      score: r.score,
      justificativa: r.justificativa,
      highlights: r.highlights,
    };
  });

  const { error: insertErr } = await supabase
    .from("candidatos_gerados")
    .insert(rows);

  if (insertErr) {
    console.error("[gerar-lista] supabase insert error", insertErr);
    await marcarErro(vagaId);
    return NextResponse.json(
      { error: "Falha ao salvar candidatos" },
      { status: 500 }
    );
  }

  await supabase
    .from("vagas")
    .update({ status: "lista_gerada" })
    .eq("id", vagaId);

  return NextResponse.json({
    data: {
      vagaId,
      total_serp: serpResults.length,
      total_selecionados: selecionados.length,
      total_enriquecidos: enriquecidos.length,
      total_ranqueados: ranking.length,
      queriesTentadas,
    },
  });
}
