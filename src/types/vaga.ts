export type PerfilReferencia = {
  url: string;
  razao: string;
};

export type FormularioVaga = {
  jd: string;
  keywords: string;
  cargo_senioridade: string;
  localizacao: string;
  bons_perfis: PerfilReferencia[];
  maus_perfis: PerfilReferencia[];
};

export type ICP = {
  titulos: string[];
  skills_must: string[];
  skills_nice: string[];
  senioridade: string;
  setores: string[];
  sinais_evitar: string[];
};

export type PlataformaSearchString = "linkedin" | "google";

export type SearchString = {
  titulo: string;
  string: string;
  plataforma: PlataformaSearchString;
};

export type StatusVaga =
  | "rascunho"
  | "direcionamento_ok"
  | "lista_gerada"
  | "erro";

export type Vaga = {
  id: string;
  created_at: string;
  jd: string;
  keywords: string;
  cargo_senioridade: string;
  localizacao: string;
  bons_perfis: PerfilReferencia[];
  maus_perfis: PerfilReferencia[];
  icp: ICP | null;
  search_strings: SearchString[] | null;
  status: StatusVaga;
};

export type VagaListItem = Pick<
  Vaga,
  "id" | "created_at" | "cargo_senioridade" | "status"
>;

export type DirecionamentoOutput = {
  icp: ICP;
  search_strings: SearchString[];
};
