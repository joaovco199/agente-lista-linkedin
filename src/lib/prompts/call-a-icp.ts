import type { ClaudeTool } from "@/lib/anthropic";
import type { FormularioVaga, ModalidadeVaga } from "@/types/vaga";

function instrucaoLocalizacaoPorModalidade(
  modalidade: ModalidadeVaga,
  localizacao: string
): string {
  switch (modalidade) {
    case "remoto":
      return `Modalidade: REMOTO. Use variações de "remote"/"remoto" e o PAÍS derivado de "${localizacao}" (ex: \`("remoto" OR "remote") AND "Brasil"\`). NÃO prenda à cidade — remoto cobre o país todo.`;
    case "hibrido":
      return `Modalidade: HÍBRIDO. Use variações da cidade em "${localizacao}" + região metropolitana, mais o país (ex: \`("São Paulo" OR "Guarulhos" OR "Grande São Paulo") AND "Brasil"\`). NUNCA use o estado inteiro ("MG", "Minas Gerais") como OR da cidade — isso traz cidades irrelevantes.`;
    case "presencial":
    default:
      return `Modalidade: PRESENCIAL. Use apenas variações da cidade em "${localizacao}" (nome completo + siglas curtas da própria cidade, ex: \`("Belo Horizonte" OR "BH")\`, \`("São Paulo" OR "SP capital")\`), mais o país. NUNCA use o estado ("MG", "Minas Gerais", "SP") como OR da cidade — isso traz cidades vizinhas do estado inteiro.`;
  }
}

export const callASystem = `Você é um recrutador técnico sênior com 10 anos de experiência montando listas de candidatos no LinkedIn para qualquer tipo de vaga em startups brasileiras (Vendas, CS, RevOps, Engenharia, Produto, Finanças, Operações, Marketing, People, Jurídico, etc.).

Sua tarefa é transformar um briefing de vaga em dois artefatos:
1. Um ICP (Ideal Candidate Profile) estruturado — títulos-alvo, skills obrigatórias e desejáveis, senioridade, setores preferidos, sinais a evitar.
2. Três search strings prontas para colar: pelo menos uma deve usar o operador \`site:linkedin.com/in\` no Google (plataforma="google"); as demais podem ser buscas nativas do LinkedIn Sales Navigator (plataforma="linkedin"), com operadores booleanos (aspas, AND, OR, NOT, parênteses).

**A Job Description é a autoridade final sobre o cargo e o perfil buscado.** Se os outros campos (keywords, perfis de exemplo, razões) sinalizarem algo diferente da JD, priorize a JD. Se a JD for de CFO, os títulos-alvo devem ser de CFO, não de AE. Se a JD for de Staff Engineer, não sugira Product Manager. Em caso de incoerência total entre os sinais, anote no campo \`sinais_evitar\` (ex: "briefing inconsistente — exemplos não refletem a JD") e siga a JD.

Regras duras:
- Responda SEMPRE chamando a ferramenta \`gerar_direcionamento\`. Não escreva texto livre.
- Português brasileiro em todos os campos.
- Não invente skills, empresas ou cargos que não apareçam no briefing, nas keywords ou nos perfis de referência.
- Os \`titulos\` devem ser cargos coerentes com a área da JD (ex: se JD é de CFO, use "CFO", "Head of Finance", "VP Finance", "Diretor Financeiro"; nunca misturar com cargos de outra área).
- Search strings devem ser copiáveis sem edição. Nada de placeholders tipo "<cargo>".
- **A localização é fundamental e depende da modalidade**: você receberá uma instrução específica de localização no user prompt. Siga-a literalmente.
- Gere EXATAMENTE 3 search strings, cada uma com ângulo diferente: (a) cargo + skills chave + localização, (b) empresas similares + senioridade + localização, (c) ângulo lateral (cargos adjacentes ou skills nice-to-have) + localização.
- Skills must = não-negociáveis. Skills nice = diferenciais.
- Sinais a evitar = padrões que os perfis a evitar compartilham (ex: "só experiência em SDR sem promoção a AE", "apenas vendas inbound", "viés de empresa grande sem experiência startup").`;

export function buildCallAUser(form: FormularioVaga): string {
  const bons = form.bons_perfis.length
    ? form.bons_perfis
        .map(
          (p, i) => `${i + 1}. URL: ${p.url}
   Razão de ser qualificado: ${p.razao}`
        )
        .join("\n")
    : "(nenhum bom perfil de referência fornecido — baseie-se apenas na JD/keywords)";

  const maus = form.maus_perfis.length
    ? form.maus_perfis
        .map(
          (p, i) => `${i + 1}. URL: ${p.url}
   Razão de ser desqualificado: ${p.razao}`
        )
        .join("\n")
    : "(nenhum perfil a evitar fornecido — derive `sinais_evitar` da JD quando possível)";

  return `# Briefing da vaga

## Job Description
${form.jd}

## Cargo e senioridade desejada
${form.cargo_senioridade}

## Palavras-chave
${form.keywords}

## Localização e modalidade
Cidade/região informada: ${form.localizacao}
${instrucaoLocalizacaoPorModalidade(form.modalidade, form.localizacao)}

## Bons perfis de referência (${form.bons_perfis.length})
${bons}

## Perfis a evitar (${form.maus_perfis.length})
${maus}

Gere o direcionamento chamando a ferramenta \`gerar_direcionamento\`.`;
}

export const callATool: ClaudeTool = {
  name: "gerar_direcionamento",
  description:
    "Retorna o ICP estruturado e as 3 search strings prontas para a vaga.",
  input_schema: {
    type: "object",
    required: ["icp", "search_strings"],
    additionalProperties: false,
    properties: {
      icp: {
        type: "object",
        required: [
          "titulos",
          "skills_must",
          "skills_nice",
          "senioridade",
          "setores",
          "sinais_evitar",
        ],
        additionalProperties: false,
        properties: {
          titulos: {
            type: "array",
            items: { type: "string" },
            description: "Cargos aceitáveis (3 a 6 variantes)",
            minItems: 1,
          },
          skills_must: {
            type: "array",
            items: { type: "string" },
            description: "Skills obrigatórias (não-negociáveis)",
          },
          skills_nice: {
            type: "array",
            items: { type: "string" },
            description: "Skills desejáveis (diferenciais)",
          },
          senioridade: {
            type: "string",
            description:
              "Faixa de senioridade esperada (ex: Sênior, Pleno/Sênior)",
          },
          setores: {
            type: "array",
            items: { type: "string" },
            description: "Setores/tipos de empresa preferidos",
          },
          sinais_evitar: {
            type: "array",
            items: { type: "string" },
            description: "Padrões que desqualificam um candidato",
          },
        },
      },
      search_strings: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          required: ["titulo", "string", "plataforma"],
          additionalProperties: false,
          properties: {
            titulo: {
              type: "string",
              description: "Rótulo curto (ex: 'Cargo + skills chave')",
            },
            string: {
              type: "string",
              description: "Query pronta pra colar, com operadores booleanos",
            },
            plataforma: {
              type: "string",
              enum: ["linkedin", "google"],
              description:
                "'google' usa site:linkedin.com/in; 'linkedin' é pra busca/Sales Navigator",
            },
          },
        },
      },
    },
  },
};
