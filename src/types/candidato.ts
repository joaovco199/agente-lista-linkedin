export type FonteHighlight = "sobre" | "experiencia" | "skill" | "educacao";

export type Highlight = {
  trecho: string;
  fonte: FonteHighlight;
};

export type CandidatoRanqueado = {
  linkedin_url: string;
  score: number;
  justificativa: string;
  highlights: Highlight[];
};

// Perfil cru vindo do Proxycurl — subset do que usamos.
export type PerfilProxycurl = {
  public_identifier?: string;
  full_name?: string | null;
  occupation?: string | null;
  headline?: string | null;
  summary?: string | null;
  city?: string | null;
  state?: string | null;
  country_full_name?: string | null;
  experiences?: Array<{
    starts_at?: { day?: number; month?: number; year?: number } | null;
    ends_at?: { day?: number; month?: number; year?: number } | null;
    company?: string | null;
    title?: string | null;
    description?: string | null;
    location?: string | null;
  }>;
  education?: Array<{
    school?: string | null;
    degree_name?: string | null;
    field_of_study?: string | null;
  }>;
  accomplishment_certifications?: Array<{
    name?: string | null;
    authority?: string | null;
  }>;
  skills?: string[];
  languages?: string[];
};

export type PerfilEnriquecido = {
  linkedin_url: string;
  dados: PerfilProxycurl;
};

export type Candidato = {
  id: string;
  vaga_id: string;
  linkedin_url: string;
  nome: string | null;
  cargo: string | null;
  empresa: string | null;
  enrichment_json: PerfilProxycurl | null;
  score: number | null;
  justificativa: string | null;
  highlights: Highlight[] | null;
  created_at: string;
};
