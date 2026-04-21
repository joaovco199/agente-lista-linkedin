import type { ClaudeTool } from "@/lib/anthropic";
import type { ICP, PerfilReferencia } from "@/types/vaga";
import type { PerfilEnriquecido } from "@/types/candidato";

export const callCSystem = `Você é um recrutador técnico sênior fazendo o ranking final de candidatos enriquecidos para uma vaga.

Você recebe:
- O ICP da vaga.
- Perfis bons de referência (com URL e razão).
- Perfis a evitar (com URL e razão).
- Os dados enriquecidos dos candidatos (Sobre, experiência completa, skills, educação, certificações).

Sua tarefa: para cada candidato, atribuir score de 1 a 5 e justificativa detalhada.

Regras de scoring:
- 5 = encaixe idêntico aos bons exemplos, nenhum sinal dos maus.
- 4 = encaixe forte, 1 lacuna pequena.
- 3 = encaixe médio, vale conversa.
- 2 = encaixe fraco, só se faltar alternativa.
- 1 = fora do ICP ou bate com perfis a evitar.

**Regra crítica:** a justificativa DEVE citar trechos literais dos dados enriquecidos (campo Sobre ou descrição de experiência) que pesaram na decisão. Se você não tiver trecho para citar, o score máximo é 3 e a justificativa deve deixar claro "sem evidência textual no perfil".

- Ordene o array final por score decrescente.
- Inclua TODOS os candidatos recebidos no ranking (não descarte — quem não encaixa ganha score baixo).
- Responda chamando a ferramenta \`ranquear_candidatos\`.
- Escreva sempre em português brasileiro.`;

export function buildCallCUser(params: {
  icp: ICP;
  bonsPerfis: PerfilReferencia[];
  mausPerfis: PerfilReferencia[];
  candidatos: PerfilEnriquecido[];
}): string {
  const { icp, bonsPerfis, mausPerfis, candidatos } = params;

  const bonsTxt = bonsPerfis
    .map((p) => `URL: ${p.url}\nRazão: ${p.razao}`)
    .join("\n---\n");
  const mausTxt = mausPerfis
    .map((p) => `URL: ${p.url}\nRazão: ${p.razao}`)
    .join("\n---\n");

  const candidatosTxt = candidatos
    .map((c, i) => {
      const d = c.dados;
      const experiencias =
        d.experiences
          ?.slice(0, 6)
          .map((e) => {
            const starts = e.starts_at?.year ?? "?";
            const ends = e.ends_at?.year ?? "presente";
            const title = e.title ?? "";
            const company = e.company ?? "";
            const desc = e.description ?? "";
            return `  - ${title} @ ${company} (${starts} – ${ends}): ${desc.slice(0, 400)}`;
          })
          .join("\n") ?? "  (sem experiências)";
      const educ =
        d.education
          ?.slice(0, 4)
          .map(
            (e) =>
              `  - ${e.degree_name ?? ""} ${e.field_of_study ? `em ${e.field_of_study}` : ""} @ ${e.school ?? ""}`
          )
          .join("\n") ?? "  (sem educação)";
      const certs =
        d.accomplishment_certifications
          ?.slice(0, 6)
          .map((c) => `  - ${c.name ?? ""} (${c.authority ?? ""})`)
          .join("\n") ?? "  (sem certificações)";
      return `### Candidato ${i + 1}
URL: ${c.linkedin_url}
Nome: ${d.full_name ?? "?"}
Cargo atual: ${d.occupation ?? d.headline ?? "?"}
Localização: ${[d.city, d.state, d.country_full_name].filter(Boolean).join(", ") || "?"}

Sobre:
${(d.summary ?? "(vazio)").slice(0, 1200)}

Experiência (últimas 6):
${experiencias}

Educação:
${educ}

Certificações:
${certs}

Skills: ${(d.skills ?? []).slice(0, 30).join(", ") || "(sem skills)"}`;
    })
    .join("\n\n---\n\n");

  return `# ICP
${JSON.stringify(icp, null, 2)}

# Perfis bons de referência
${bonsTxt}

# Perfis a evitar
${mausTxt}

# Candidatos enriquecidos
${candidatosTxt}

Ranqueie TODOS os candidatos acima chamando \`ranquear_candidatos\`.`;
}

export const callCTool: ClaudeTool = {
  name: "ranquear_candidatos",
  description:
    "Ranking final dos candidatos com score (1-5), justificativa e trechos citados.",
  input_schema: {
    type: "object",
    required: ["ranking"],
    additionalProperties: false,
    properties: {
      ranking: {
        type: "array",
        items: {
          type: "object",
          required: ["linkedin_url", "score", "justificativa", "highlights"],
          additionalProperties: false,
          properties: {
            linkedin_url: { type: "string" },
            score: { type: "integer", minimum: 1, maximum: 5 },
            justificativa: {
              type: "string",
              description:
                "Texto em pt-BR explicando o score, citando trechos literais do perfil",
            },
            highlights: {
              type: "array",
              description:
                "Trechos literais do perfil que pesaram na decisão (mínimo 1 se score >= 4)",
              items: {
                type: "object",
                required: ["trecho", "fonte"],
                additionalProperties: false,
                properties: {
                  trecho: { type: "string" },
                  fonte: {
                    type: "string",
                    enum: ["sobre", "experiencia", "skill", "educacao"],
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
