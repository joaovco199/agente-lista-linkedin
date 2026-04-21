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
import type { PerfilReferencia, Vaga } from "@/types/vaga";
import type { Candidato } from "@/types/candidato";

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

  // 2) Carrega candidatos já existentes pra preservar os decididos e evitar duplicatas.
  const { data: existentes } = await supabase
    .from("candidatos_gerados")
    .select("*")
    .eq("vaga_id", vagaId)
    .returns<Candidato[]>();

  const urlsJaVistas = new Set(
    (existentes ?? []).map((c) => c.linkedin_url)
  );
  const aceitosAnteriores: PerfilReferencia[] = (existentes ?? [])
    .filter((c) => c.decisao === "aceito" && c.decisao_razao)
    .map((c) => ({ url: c.linkedin_url, razao: c.decisao_razao! }));
  const rejeitadosAnteriores: PerfilReferencia[] = (existentes ?? [])
    .filter((c) => c.decisao === "rejeitado" && c.decisao_razao)
    .map((c) => ({ url: c.linkedin_url, razao: c.decisao_razao! }));

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

  // 2.5) Remove URLs já existentes (aceitas, rejeitadas ou pendentes) pra não duplicar.
  const serpResultsNovos = serpResults.filter((r) => !urlsJaVistas.has(r.url));
  if (serpResultsNovos.length === 0) {
    return NextResponse.json(
      {
        error:
          "Todos os resultados do Google já foram avaliados em execuções anteriores. Refine o briefing ou aguarde novos perfis aparecerem.",
        queriesTentadas,
      },
      { status: 409 }
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
        // Concatena perfis originais do briefing + decisões de rodadas anteriores.
        bonsPerfis: [...vaga.bons_perfis, ...aceitosAnteriores],
        mausPerfis: [...vaga.maus_perfis, ...rejeitadosAnteriores],
        candidatos: serpResultsNovos,
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

  // 4) Persiste candidatos novos. Remove APENAS os candidatos anteriores
  // sem decisão (pendentes) — preserva aprovados e rejeitados.
  const byUrl = new Map(serpResultsNovos.map((r) => [r.url, r]));
  const rows = ranking
    .filter((r) => !urlsJaVistas.has(r.linkedin_url)) // defesa extra
    .map((r) => {
      const serp = byUrl.get(r.linkedin_url);
      return {
        vaga_id: vagaId,
        linkedin_url: r.linkedin_url,
        nome: serp?.title?.split(" - ")[0] ?? null,
        cargo: serp?.title?.split(" - ")[1]?.split(" | ")[0] ?? null,
        empresa: null,
        enrichment_json: serp
          ? { title: serp.title, snippet: serp.snippet }
          : null,
        score: r.score,
        justificativa: r.justificativa,
        highlights: r.highlights,
      };
    });

  // Apaga só os pendentes (decisao IS NULL) da vaga, preserva decididos.
  await supabase
    .from("candidatos_gerados")
    .delete()
    .eq("vaga_id", vagaId)
    .is("decisao", null);
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
      total_serp_novos: serpResultsNovos.length,
      total_ranqueados: ranking.length,
      total_aceitos_preservados: aceitosAnteriores.length,
      total_rejeitados_preservados: rejeitadosAnteriores.length,
      queriesTentadas,
    },
  });
}
