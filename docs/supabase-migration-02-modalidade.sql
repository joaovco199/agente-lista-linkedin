-- Migração 02: adiciona modalidade da vaga (presencial/híbrido/remoto).
-- Rodar no Supabase Dashboard > SQL Editor > Run.
-- Idempotente.

alter table public.vagas
  add column if not exists modalidade text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vagas_modalidade_check'
  ) then
    alter table public.vagas
      add constraint vagas_modalidade_check
      check (modalidade is null or modalidade in ('presencial','hibrido','remoto'));
  end if;
end$$;
