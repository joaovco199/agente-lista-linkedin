import { z } from "zod";

export const perfilReferenciaSchema = z.object({
  url: z
    .string()
    .url("Precisa ser uma URL válida")
    .refine((url) => url.includes("linkedin.com/"), {
      message: "Precisa ser uma URL do LinkedIn",
    }),
  razao: z
    .string()
    .min(10, "Explique em pelo menos 10 caracteres por que o perfil encaixa"),
});

export const criarVagaBodySchema = z.object({
  jd: z.string().min(50, "Job description deve ter ao menos 50 caracteres"),
  keywords: z.string().min(3, "Liste pelo menos uma palavra-chave"),
  cargo_senioridade: z
    .string()
    .min(3, "Informe cargo e senioridade (ex: AE Sênior)"),
  localizacao: z.string().min(2, "Informe a localização alvo"),
  bons_perfis: z.array(perfilReferenciaSchema).length(5, "Forneça 5 bons perfis"),
  maus_perfis: z.array(perfilReferenciaSchema).length(5, "Forneça 5 perfis a evitar"),
});

export type CriarVagaBody = z.infer<typeof criarVagaBodySchema>;

export const icpSchema = z.object({
  titulos: z.array(z.string()).min(1),
  skills_must: z.array(z.string()),
  skills_nice: z.array(z.string()),
  senioridade: z.string(),
  setores: z.array(z.string()),
  sinais_evitar: z.array(z.string()),
});

export const searchStringSchema = z.object({
  titulo: z.string(),
  string: z.string(),
  plataforma: z.enum(["linkedin", "google"]),
});

export const direcionamentoSchema = z.object({
  icp: icpSchema,
  search_strings: z.array(searchStringSchema).length(3),
});

export type DirecionamentoPayload = z.infer<typeof direcionamentoSchema>;
