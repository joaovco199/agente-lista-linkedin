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
import {
  buildCallARefineUser,
  callARefineSystem,
  callARefineTool,
} from "@/lib/prompts/call-a-refine";
import {
  direcionamentoSchema,
  ranquearCandidatosSchema,
} from "@/types/api";
import { getNotasProspecao } from "@/lib/configuracoes";
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

  // 2.4) Se há decisões anteriores, refina ICP + search strings ANTES de buscar.
  // Isso garante que o Google retorne perfis diferentes dos já avaliados.
  let icpEmUso = vaga.icp;
  let searchStringsEmUso = vaga.search_strings;
  let icpFoiRefinado = false;

  if (aceitosAnteriores.length > 0 || rejeitadosAnteriores.length > 0) {
    try {
      const rawRefine = await callClaudeWithTool<unknown>({
        system: callARefineSystem,
        user: buildCallARefineUser({
          form: {
            jd: vaga.jd,
            keywords: vaga.keywords,
            cargo_senioridade: vaga.cargo_senioridade,
            localizacao: vaga.localizacao,
            modalidade: vaga.modalidade ?? "presencial",
            bons_perfis: vaga.bons_perfis,
            maus_perfis: vaga.maus_perfis,
          },
          icpAtual: vaga.icp,
          searchStringsAtuais: vaga.search_strings,
          modalidade: vaga.modalidade,
          aceitos: aceitosAnteriores,
          rejeitados: rejeitadosAnteriores,
        }),
        tool: callARefineTool,
        model: "default",
        maxTokens: 2048,
      });
      const refined = direcionamentoSchema.parse(rawRefine);
      icpEmUso = refined.icp;
      searchStringsEmUso = refined.search_strings;
      icpFoiRefinado = true;

      // Persiste o ICP refinado na vaga (sobrescreve o anterior).
      await supabase
        .from("vagas")
        .update({
          icp: refined.icp,
          search_strings: refined.search_strings,
        })
        .eq("id", vagaId);
    } catch (err) {
      console.warn(
        "[gerar-lista] Call A-refine falhou, seguindo com ICP atual",
        err
      );
    }
  }

  // 2.5) Tenta TODAS as search strings (google + linkedin) e ACUMULA
  // resultados, deduplicando por URL. Se nada vier, faz 2ª rodada prefixando
  // `site:linkedin.com/in` nas strings (caso o Claude tenha esquecido).
  const localizacaoParaBusca = vaga.localizacao;
  const desiredCountry = inferCountryFromLocation(localizacaoParaBusca);
  const serpResultsMap = new Map<string, SerpResult>();
  const queriesTentadas: string[] = [];
  const MAX_RESULTS_ACUMULADOS = 30;

  async function tentarQuery(query: string) {
    try {
      queriesTentadas.push(query);
      const raw = await serpapiSearch(query, 20, {
        location: localizacaoParaBusca,
        gl: desiredCountry ?? "br",
      });
      const filtered = filterByCountry(raw, desiredCountry);
      const results = filtered.length > 0 ? filtered : raw;
      for (const r of results) {
        if (!serpResultsMap.has(r.url)) {
          serpResultsMap.set(r.url, r);
        }
      }
    } catch (err) {
      console.warn("[gerar-lista] SerpApi falhou em uma query:", err);
    }
  }

  // Rodada 1: TODAS as strings, do jeito que vieram.
  for (const q of searchStringsEmUso) {
    await tentarQuery(q.string);
    if (serpResultsMap.size >= MAX_RESULTS_ACUMULADOS) break;
  }

  // Rodada 2 (fallback): se nada foi encontrado, força `site:linkedin.com/in`.
  if (serpResultsMap.size === 0) {
    for (const q of searchStringsEmUso) {
      const comSite = q.string.includes("site:linkedin.com/in")
        ? q.string
        : `site:linkedin.com/in ${q.string}`;
      await tentarQuery(comSite);
    }
  }

  // Rodada 3 (fallback forte): query simplificada só com cargo + cidade.
  if (serpResultsMap.size === 0) {
    const cargoKw = vaga.cargo_senioridade.split(/[,-]/)[0].trim();
    const cidadeKw = vaga.localizacao.split(",")[0].trim();
    if (cargoKw && cidadeKw) {
      await tentarQuery(
        `site:linkedin.com/in "${cargoKw}" "${cidadeKw}"`
      );
    }
  }

  let serpResults: SerpResult[] = Array.from(serpResultsMap.values()).map(
    (r, i) => ({ ...r, index: i + 1 })
  );

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
        icp: icpEmUso,
        localizacao: vaga.localizacao,
        modalidade: vaga.modalidade,
        bonsPerfis: [...vaga.bons_perfis, ...aceitosAnteriores],
        mausPerfis: [...vaga.maus_perfis, ...rejeitadosAnteriores],
        candidatos: serpResultsNovos,
        notasGlobais: await getNotasProspecao(),
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

  // 4) Persiste candidatos novos. NADA é apagado — aceitos, rejeitados e
  // pendentes anteriores ficam todos. Duplicatas já foram filtradas acima.
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
      icp_refinado: icpFoiRefinado,
      queriesTentadas,
    },
  });
}
