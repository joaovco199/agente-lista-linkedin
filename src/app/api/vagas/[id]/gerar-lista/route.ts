import { NextResponse } from "next/server";
import { callClaudeWithTool } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import {
  serpapiSearch,
  filterByCountry,
  inferCountryFromLocation,
  type SerpResult,
} from "@/lib/serpapi";
import {
  buildCallCUser,
  callCSystem,
  callCTool,
} from "@/lib/prompts/call-c-ranking";
import { ranquearCandidatosSchema } from "@/types/api";
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

  // 1) Carrega vaga completa.
  const { data: vaga, error: fetchErr } = await supabase
    .from("vagas")
    .select("*")
    .eq("id", vagaId)
    .single<Vaga>();

  if (fetchErr || !vaga) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  if (!vaga.icp || !vaga.search_strings || vaga.search_strings.length === 0) {
    return NextResponse.json(
      { error: "Vaga sem ICP ou search strings — gere o direcionamento antes." },
      { status: 409 }
    );
  }

  // 2) SerpApi — tenta queries `plataforma=google` primeiro, pois são as que
  // funcionam via Google search. Se as google forem vazias, tenta as linkedin
  // também (operadores booleanos nativos podem funcionar no Google também).
  const googleStrings = vaga.search_strings.filter(
    (s) => s.plataforma === "google"
  );
  const queries =
    googleStrings.length > 0 ? googleStrings : vaga.search_strings;

  const desiredCountry = inferCountryFromLocation(vaga.localizacao);
  let serpResults: SerpResult[] = [];
  const queriesTentadas: string[] = [];
  for (const q of queries) {
    try {
      queriesTentadas.push(q.string);
      const raw = await serpapiSearch(q.string, 20, {
        location: vaga.localizacao,
        gl: desiredCountry ?? "br",
      });
      const filtered = filterByCountry(raw, desiredCountry);
      // Se o filtro derrubou tudo, prefere raw (Claude ainda vai penalizar).
      const results = filtered.length > 0 ? filtered : raw;
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
          "Nenhum resultado do Google pras search strings. Refine o briefing.",
        queriesTentadas,
      },
      { status: 502 }
    );
  }

  // 3) Call C — Claude filtra + ranqueia em uma só chamada.
  let ranking;
  try {
    const raw = await callClaudeWithTool<unknown>({
      system: callCSystem,
      user: buildCallCUser({
        icp: vaga.icp,
        localizacao: vaga.localizacao,
        modalidade: vaga.modalidade,
        bonsPerfis: vaga.bons_perfis,
        mausPerfis: vaga.maus_perfis,
        candidatos: serpResults,
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
      { error: "Falha no ranking Claude" },
      { status: 502 }
    );
  }

  if (ranking.length === 0) {
    await marcarErro(vagaId);
    return NextResponse.json(
      { error: "Claude não conseguiu ranquear nenhum candidato." },
      { status: 502 }
    );
  }

  // 4) Persiste candidatos — usa o snippet/title do SerpApi como nome/cargo
  // quando possível (não temos Proxycurl nessa versão).
  const byUrl = new Map(serpResults.map((r) => [r.url, r]));
  const rows = ranking.map((r) => {
    const serp = byUrl.get(r.linkedin_url);
    return {
      vaga_id: vagaId,
      linkedin_url: r.linkedin_url,
      nome: serp?.title?.split(" - ")[0] ?? null,
      cargo: serp?.title?.split(" - ")[1]?.split(" | ")[0] ?? null,
      empresa: null,
      enrichment_json: serp ? { title: serp.title, snippet: serp.snippet } : null,
      score: r.score,
      justificativa: r.justificativa,
      highlights: r.highlights,
    };
  });

  // Apaga candidatos antigos dessa vaga (caso seja re-geração) e insere novos.
  await supabase.from("candidatos_gerados").delete().eq("vaga_id", vagaId);
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
      total_ranqueados: ranking.length,
      queriesTentadas,
    },
  });
}
