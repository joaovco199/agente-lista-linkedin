-- Migração 03: tabela `configuracoes` pra key/value globais (notas de prospecção etc).
-- Rodar no Supabase Dashboard > SQL Editor > Run.
-- Idempotente.

create table if not exists public.configuracoes (
  chave text primary key,
  valor text,
  updated_at timestamptz not null default now()
);
