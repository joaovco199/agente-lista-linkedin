import type { ClaudeTool } from "@/lib/anthropic";

export const extractBriefingSystem = `Você é um assistente que extrai briefing estruturado de vaga a partir de texto livre colado pelo recrutador.

O recrutador cola um texto que pode conter: descrição da vaga, conversa por chat, anotações bagunçadas, keywords soltas, links de perfis, etc.

Sua tarefa: extrair os campos estruturados chamando a ferramenta \`extrair_briefing\`.

Regras:
- Se o texto não traz info clara de algum campo, coloque uma string curta com "?" ou sua melhor inferência (ex: cargo_senioridade: "Analista — senioridade não especificada").
- JD: inclua o texto da descrição como veio, sem resumir. Se o texto todo É a JD, retorne o texto inteiro.
- Cargo/senioridade: cargo alvo. Se o texto fala "estagiário de marketing", retorne "Estagiário de Marketing".
- Localização: cidade e país. Se só mencionar cidade, mantenha cidade.
- Modalidade: "presencial" | "hibrido" | "remoto". Se não aparecer, default "presencial".
- Keywords: 4-10 palavras-chave separadas por vírgula, extraídas do texto.
- Perfis bons e maus: URLs do LinkedIn que aparecerem no texto, com razão curta inferida do contexto (ou "referência mencionada" se não souber o porquê).
- Use português brasileiro.
- Responda SEMPRE chamando a ferramenta. Não escreva texto livre.`;

export function buildExtractBriefingUser(textoLivre: string): string {
  return `# Texto livre colado pelo recrutador

${textoLivre}

Extraia o briefing chamando \`extrair_briefing\`.`;
}

export const extractBriefingTool: ClaudeTool = {
  name: "extrair_briefing",
  description:
    "Extrai briefing estruturado de vaga a partir de um texto livre colado pelo recrutador.",
  input_schema: {
    type: "object",
    required: [
      "jd",
      "cargo_senioridade",
      "localizacao",
      "modalidade",
      "keywords",
      "bons_perfis",
      "maus_perfis",
    ],
    additionalProperties: false,
    properties: {
      jd: {
        type: "string",
        description: "Job description (a própria descrição da vaga, sem resumir).",
      },
      cargo_senioridade: {
        type: "string",
        description: "Cargo + senioridade (ex: 'Account Executive Sênior').",
      },
      localizacao: {
        type: "string",
        description: "Cidade/região (ex: 'São Paulo, Brasil').",
      },
      modalidade: {
        type: "string",
        enum: ["presencial", "hibrido", "remoto"],
        description: "Modalidade de trabalho.",
      },
      keywords: {
        type: "string",
        description:
          "Palavras-chave separadas por vírgula (ex: 'outbound, SaaS B2B, HubSpot').",
      },
      bons_perfis: {
        type: "array",
        maxItems: 5,
        description:
          "URLs de perfis do LinkedIn que aparecem no texto como referência positiva.",
        items: {
          type: "object",
          required: ["url", "razao"],
          additionalProperties: false,
          properties: {
            url: { type: "string" },
            razao: { type: "string" },
          },
        },
      },
      maus_perfis: {
        type: "array",
        maxItems: 5,
        description:
          "URLs de perfis do LinkedIn mencionados como anti-exemplo.",
        items: {
          type: "object",
          required: ["url", "razao"],
          additionalProperties: false,
          properties: {
            url: { type: "string" },
            razao: { type: "string" },
          },
        },
      },
    },
  },
};

export type BriefingExtraido = {
  jd: string;
  cargo_senioridade: string;
  localizacao: string;
  modalidade: "presencial" | "hibrido" | "remoto";
  keywords: string;
  bons_perfis: { url: string; razao: string }[];
  maus_perfis: { url: string; razao: string }[];
};
