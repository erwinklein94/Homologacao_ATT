-- =====================================================================
-- Cadastro de Alunos — Homologação Alívio de Tensão
-- Rode este arquivo no Supabase > SQL Editor depois de subir o código.
--
-- Objetivo:
-- 1) Administrador cadastra alunos autorizados em public.alunos_cadastrados.
-- 2) Aluno só consegue fazer "Primeiro acesso" se o e-mail estiver ativo aqui.
-- 3) O aluno cria a própria senha; a senha NÃO fica salva nesta tabela.
-- =====================================================================

create table if not exists public.alunos_cadastrados (
  id                 uuid primary key default gen_random_uuid(),
  area               text not null default 'alivio_tensao' check (area in ('solda', 'alivio_tensao')),
  nome               text not null default '',
  matricula          text,
  email              text not null,
  email_normalizado  text not null,
  ativo              boolean not null default true,
  criado_por         uuid references auth.users (id) on delete set null,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  unique (area, email_normalizado)
);

create index if not exists idx_alunos_cadastrados_area
  on public.alunos_cadastrados (area, ativo, nome);

create index if not exists idx_alunos_cadastrados_email
  on public.alunos_cadastrados (area, email_normalizado);

-- Normaliza e-mail antes de gravar.
create or replace function public.normalizar_aluno_cadastrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := trim(new.email);
  new.email_normalizado := lower(trim(coalesce(new.email_normalizado, new.email)));
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_normalizar_aluno_cadastrado on public.alunos_cadastrados;
create trigger trg_normalizar_aluno_cadastrado
  before insert or update on public.alunos_cadastrados
  for each row execute function public.normalizar_aluno_cadastrado();

-- Função usada pela tela de primeiro acesso.
-- Ela retorna apenas o cadastro do e-mail digitado, sem liberar listagem pública da tabela.
create or replace function public.buscar_aluno_cadastrado(
  p_email text,
  p_area text default 'alivio_tensao'
)
returns table (
  email text,
  nome text,
  matricula text,
  area text,
  ativo boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.email,
    c.nome,
    c.matricula,
    c.area,
    c.ativo
  from public.alunos_cadastrados c
  where c.area = p_area
    and c.email_normalizado = lower(trim(p_email))
    and c.ativo = true
  limit 1
$$;

-- Permissões básicas.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.alunos_cadastrados to authenticated;
grant execute on function public.buscar_aluno_cadastrado(text, text) to anon, authenticated;

-- RLS.
alter table public.alunos_cadastrados enable row level security;

drop policy if exists alunos_cadastrados_select_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_select_admin
on public.alunos_cadastrados
for select
to authenticated
using (public.is_admin_area(area));

drop policy if exists alunos_cadastrados_insert_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_insert_admin
on public.alunos_cadastrados
for insert
to authenticated
with check (public.is_admin_area(area));

drop policy if exists alunos_cadastrados_update_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_update_admin
on public.alunos_cadastrados
for update
to authenticated
using (public.is_admin_area(area))
with check (public.is_admin_area(area));

drop policy if exists alunos_cadastrados_delete_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_delete_admin
on public.alunos_cadastrados
for delete
to authenticated
using (public.is_admin_area(area));

-- Opcional: importar os alunos que já existem em profiles para a nova lista.
-- Como profiles não guarda e-mail, esta importação usa apenas nome/matrícula
-- e deixa o administrador cadastrar e-mail quando necessário.
-- O login dos alunos já existentes continua funcionando normalmente.
