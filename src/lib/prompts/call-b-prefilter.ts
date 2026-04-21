import type { ClaudeTool } from "@/lib/anthropic";
import type { ICP } from "@/types/vaga";
import type { SerpResult } from "@/lib/serpapi";

export const callBSystem = `Você é um recrutador filtrando uma lista bruta de resultados do Google (buscas com site:linkedin.com/in) para decidir quais perfis merecem enriquecimento pago via Proxycurl.

Seu trabalho é APENAS ler título + snippet de cada resultado e decidir: "vale a pena pagar para ler o perfil completo?".

Regras:
- Descarte perfis claramente fora do ICP (cargo errado, senioridade muito distante, localização muito fora).
- Em caso de dúvida, MANTENHA — é barato errar pra mais aqui; o ranking final corta de novo com dados ricos.
- Selecione NO MÁXIMO 10 perfis, priorizando os mais promissores.
- Se houver menos de 10 resultados plausíveis, retorne só os que fazem sentido (pode ser 5, 7, 8).
- Sempre responda chamando a ferramenta \`selecionar_perfis\`.
- O \`motivo_curto\` deve citar um trecho do snippet/título que justifica o match (1 linha).`;

export function buildCallBUser(
  icp: ICP,
  serpResults: SerpResult[]
): string {
  const resultsText = serpResults
    .map(
      (r) => `${r.index}. ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet}`
    )
    .join("\n\n");

  return `# ICP
${JSON.stringify(icp, null, 2)}

# Resultados brutos da busca (Google site:linkedin.com/in)
${resultsText}

Selecione até 10 perfis chamando \`selecionar_perfis\`.`;
}

export const callBTool: ClaudeTool = {
  name: "selecionar_perfis",
  description: "Seleciona até 10 URLs promissoras para enrichment no Proxycurl.",
  input_schema: {
    type: "object",
    required: ["selecionados"],
    additionalProperties: false,
    properties: {
      selecionados: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          required: ["url", "motivo_curto"],
          additionalProperties: false,
          properties: {
            url: {
              type: "string",
              description: "URL completa do perfil (igual à recebida)",
            },
            motivo_curto: {
              type: "string",
              description: "1 linha explicando por que passou no filtro",
            },
          },
        },
      },
    },
  },
};
