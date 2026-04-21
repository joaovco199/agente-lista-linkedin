-- Schema inicial do agente-lista-linkedin.
-- Rodar no Supabase Dashboard > SQL Editor > Run.
-- Sem RLS pro bootcamp (app single-user, anon key só no backend).

create extension if not exists "uuid-ossp";

create table public.vagas (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  jd text not null,
  keywords text not null,
  cargo_senioridade text not null,
  localizacao text not null,
  bons_perfis jsonb not null default '[]'::jsonb,
  maus_perfis jsonb not null default '[]'::jsonb,
  icp jsonb,
  search_strings jsonb,
  status text not null default 'rascunho'
    check (status in ('rascunho','direcionamento_ok','lista_gerada','erro'))
);

create table public.candidatos_gerados (
  id uuid primary key default uuid_generate_v4(),
  vaga_id uuid not null references public.vagas(id) on delete cascade,
  linkedin_url text not null,
  nome text,
  cargo text,
  empresa text,
  enrichment_json jsonb,
  score int check (score between 1 and 5),
  justificativa text,
  highlights jsonb,
  created_at timestamptz not null default now()
);

create index idx_candidatos_vaga_score on public.candidatos_gerados(vaga_id, score desc);
create index idx_vagas_created_at on public.vagas(created_at desc);
