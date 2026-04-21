import type { ClaudeTool } from "@/lib/anthropic";
import type { ICP, ModalidadeVaga, PerfilReferencia } from "@/types/vaga";
import type { SerpResult } from "@/lib/serpapi";

function regraLocalizacaoPorModalidade(
  modalidade: ModalidadeVaga | null
): string {
  switch (modalidade) {
    case "remoto":
      return `Modalidade REMOTO: só importa o país. Cidade do candidato é irrelevante, desde que seja no mesmo país. Se o candidato é de outro país, score máximo 1.`;
    case "hibrido":
      return `Modalidade HÍBRIDO: cidade da vaga OU região metropolitana são aceitas sem penalidade. Outras cidades do mesmo país → score máximo 3. Outro país → score máximo 1.`;
    case "presencial":
      return `Modalidade PRESENCIAL: o candidato PRECISA estar na cidade indicada. Cidade diferente no mesmo país → score máximo 2. Região metropolitana imediata (ex: Guarulhos pra São Paulo) → aceita sem penalidade. Outro país → score máximo 1.`;
    default:
      return `Modalidade não informada: trate como presencial (cidade é obrigatória). Outra cidade no mesmo país → score máximo 2.`;
  }
}

export const callCSystem = `Você é um recrutador técnico sênior fazendo o ranking final de candidatos para uma vaga.

Os candidatos vêm de uma busca no Google (site:linkedin.com/in). Para cada candidato você tem apenas: título (cargo atual ou nome) e snippet (trecho curto que o Google exibe, geralmente começo da seção "Sobre" ou headline do LinkedIn).

**Limitação importante:** você NÃO tem acesso ao perfil completo (experiência detalhada, skills, educação). Trabalhe com o que tem e seja honesto no score.

Você recebe:
- O ICP da vaga.
- Perfis bons de referência (URL + razão).
- Perfis a evitar, se houver (URL + razão).
- Uma lista bruta de ~20 candidatos (URL + título + snippet) vinda do Google.

Sua tarefa:
1. Filtrar candidatos claramente fora do ICP (cargo errado, senioridade muito distante, localização muito fora).
2. Selecionar até 10 candidatos mais promissores.
3. Dar a cada um um score de 1 a 5 e justificativa.

Regras de scoring (ajustadas para dados limitados):
- 5 = título + snippet batem perfeitamente com ICP e com perfis bons; zero sinal dos maus; localização bate.
- 4 = título claro + snippet sugere match forte; localização bate.
- 3 = título plausível mas snippet ambíguo ou pouco informativo — vale conversa.
- 2 = sinais fracos, só se faltar alternativa.
- 1 = fora do ICP ou bate com perfis a evitar.

**Regra crítica de localização (nível CIDADE, não só país):** a localização da vaga aparece no prompt como "Localização da vaga". Você encontra a localização do candidato em: (a) subdomínio da URL (ex: \`br.linkedin.com\` = Brasil, \`pt.linkedin.com\` = Portugal), (b) snippet ("São Paulo, SP", "Lisboa, Portugal", "Belo Horizonte"), (c) título.

Regras duras de localização:
- Se a cidade do candidato é **claramente diferente** da pedida (ex: vaga pede "Belo Horizonte" e snippet mostra "São Paulo, SP"), score MÁXIMO é 2 — mesmo que seja mesmo país. Justifique citando o trecho.
- Se o país é diferente (ex: vaga pede Brasil, snippet mostra "Lisboa, Portugal"), score MÁXIMO é 1.
- Se a cidade for adjacente/região metropolitana (ex: vaga pede "São Paulo" e snippet mostra "Guarulhos, SP" ou "Grande São Paulo"), aceite normal.
- Se a localização do candidato **não aparece** em título/snippet/URL, trate como ambígua: score máximo 4 (não 5) — indique na justificativa que "localização não confirmada".

**Regra crítica de evidência:** a justificativa DEVE citar trechos literais do título ou snippet. Se o snippet for vazio ou irrelevante ("ver o perfil completo no LinkedIn"), o score máximo é 3 e a justificativa deve deixar claro que foi só pelo título.

Como a fonte é limitada, **sempre inclua pelo menos 1 highlight** citando título ou snippet (fonte: "titulo" ou "snippet").

- Ordene o array final por score decrescente.
- Inclua no máximo 10 candidatos no ranking (filtre os piores).
- Responda chamando a ferramenta \`ranquear_candidatos\`.
- Escreva sempre em português brasileiro.`;

export function buildCallCUser(params: {
  icp: ICP;
  localizacao: string;
  modalidade: ModalidadeVaga | null;
  bonsPerfis: PerfilReferencia[];
  mausPerfis: PerfilReferencia[];
  candidatos: SerpResult[];
}): string {
  const { icp, localizacao, modalidade, bonsPerfis, mausPerfis, candidatos } =
    params;

  const bonsTxt = bonsPerfis.length
    ? bonsPerfis.map((p) => `URL: ${p.url}\nRazão: ${p.razao}`).join("\n---\n")
    : "(nenhum bom perfil fornecido)";

  const mausTxt = mausPerfis.length
    ? mausPerfis.map((p) => `URL: ${p.url}\nRazão: ${p.razao}`).join("\n---\n")
    : "(nenhum perfil a evitar — use os sinais_evitar do ICP)";

  const candidatosTxt = candidatos
    .map(
      (c) => `### Candidato ${c.index}
URL: ${c.url}
Título: ${c.title}
Snippet: ${c.snippet || "(vazio)"}`
    )
    .join("\n\n---\n\n");

  return `# ICP
${JSON.stringify(icp, null, 2)}

# Localização e modalidade (NÃO-NEGOCIÁVEL)
Cidade da vaga: ${localizacao}
${regraLocalizacaoPorModalidade(modalidade)}

# Perfis bons de referência
${bonsTxt}

# Perfis a evitar
${mausTxt}

# Candidatos (resultados do Google)
Total: ${candidatos.length}

${candidatosTxt}

Selecione até 10, ranqueie com score 1-5 e justificativa citando trechos, chamando \`ranquear_candidatos\`.`;
}

export const callCTool: ClaudeTool = {
  name: "ranquear_candidatos",
  description:
    "Ranking final de até 10 candidatos com score (1-5), justificativa e trechos citados do título/snippet.",
  input_schema: {
    type: "object",
    required: ["ranking"],
    additionalProperties: false,
    properties: {
      ranking: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          required: ["linkedin_url", "score", "justificativa", "highlights"],
          additionalProperties: false,
          properties: {
            linkedin_url: {
              type: "string",
              description: "URL exata do candidato, igual à recebida.",
            },
            score: { type: "integer", minimum: 1, maximum: 5 },
            justificativa: {
              type: "string",
              description:
                "Texto em pt-BR explicando o score, citando trechos literais do título ou snippet.",
            },
            highlights: {
              type: "array",
              description:
                "Trechos literais que pesaram. Pelo menos 1 item, fonte 'titulo' ou 'snippet'.",
              minItems: 1,
              items: {
                type: "object",
                required: ["trecho", "fonte"],
                additionalProperties: false,
                properties: {
                  trecho: { type: "string" },
                  fonte: {
                    type: "string",
                    enum: [
                      "titulo",
                      "snippet",
                      "sobre",
                      "experiencia",
                      "skill",
                      "educacao",
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
