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

**Regra crítica 1 — CARGO ATUAL (o mais importante):**
- O "cargo atual" do candidato aparece no TÍTULO do resultado do Google (ex: "João Silva - Estagiário de Operações | LinkedIn") ou no começo do snippet (ex: "Estagiária na XP · São Paulo").
- Se o cargo atual **não corresponde a NENHUM** dos \`icp.titulos\`, score MÁXIMO é **2**, mesmo que o perfil tenha experiências passadas que se encaixam.
- Se o snippet ou título explicitamente mostra que a pessoa é "Ex-estagiário", "Foi estagiário", "Estagiário (2022-2023)" e agora está em cargo mais alto (Analista, Coordenador, Pleno, Sênior, Assistente CLT, etc.), score MÁXIMO é **1** — o ICP busca o cargo ATIVO, não histórico.
- Se o cargo atual é claramente adjacente mas não idêntico (ex: ICP pede "Estagiário de Operações" e candidato é "Estagiário de Logística"), pode ser score 3 com nota.
- Se o cargo atual é ambíguo ou não aparece explicitamente, score máximo 3 com nota "cargo atual não confirmado".
- SEMPRE cite o cargo que você identificou em pelo menos 1 highlight (fonte: "titulo" ou "snippet").

**Regra crítica 2 — SETOR da empresa:**
- Se o snippet/título cita empresa de setor claramente FORA dos \`icp.setores\` (ex: vaga pede B2B/varejo e candidato está em software puro, banco, healthcare, consultoria de TI), score MÁXIMO é **3**.
- Se você não consegue inferir o setor da empresa a partir do snippet, não penalize — trate como setor ambíguo.

**Regra crítica 3 — LOCALIZAÇÃO (nível CIDADE, não só país):**
- Você encontra a localização do candidato em: (a) subdomínio da URL (ex: \`br.linkedin.com\` = Brasil), (b) snippet ("São Paulo, SP", "Lisboa, Portugal"), (c) título.
- Cidade claramente diferente da pedida (mesmo país) → score MÁXIMO **2**.
- País diferente → score MÁXIMO **1**.
- Cidade adjacente/região metropolitana (Guarulhos pra São Paulo) → aceita normal.
- Localização não aparece → score máximo **4** com nota "localização não confirmada".

**Regra crítica 4 — EVIDÊNCIA LITERAL:**
- A justificativa DEVE citar trechos literais do título ou snippet.
- Se o snippet é vazio ou irrelevante ("ver o perfil completo no LinkedIn"), score máximo é **3** e a justificativa deve deixar claro que foi só pelo título.
- A regra de localização e cargo tem PRIORIDADE sobre skills. Skills bonitas não compensam cargo/cidade errada.

**Processo obrigatório pra cada candidato:**
1. Identifique o cargo atual (cite trecho).
2. Compare com \`icp.titulos\`. Se não bate, teto 2.
3. Identifique a cidade. Compare com localização. Aplique teto de localização.
4. Só depois avalie skills/experiências pra decidir dentro do teto.

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
  notasGlobais?: string;
}): string {
  const {
    icp,
    localizacao,
    modalidade,
    bonsPerfis,
    mausPerfis,
    candidatos,
    notasGlobais,
  } = params;

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

  const notasBloco =
    notasGlobais && notasGlobais.trim()
      ? `# Notas globais de prospecção (aplicam a TODAS as vagas — use como contexto adicional no ranking)
${notasGlobais}

`
      : "";

  return `${notasBloco}# ICP
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
