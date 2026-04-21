-- Migração 01: permite marcar cada candidato como aceito/rejeitado com razão.
-- Rodar no Supabase Dashboard > SQL Editor > Run.
-- Idempotente (usa IF NOT EXISTS).

alter table public.candidatos_gerados
  add column if not exists decisao text,
  add column if not exists decisao_razao text,
  add column if not exists decisao_at timestamptz;

-- Constraint separado (o "if not exists" funciona em colunas, não em check constraints).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidatos_gerados_decisao_check'
  ) then
    alter table public.candidatos_gerados
      add constraint candidatos_gerados_decisao_check
      check (decisao is null or decisao in ('aceito','rejeitado'));
  end if;
end$$;
