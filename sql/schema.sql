-- =====================================================================
-- Homologacoes Rumo — Schema do banco (Supabase / Postgres)
-- Areas separadas por perfil:
--   solda          -> Homologacao de Solda
--   alivio_tensao  -> Homologacao Alivio de Tensao
--
-- IMPORTANTE:
-- O mesmo usuario do Supabase Auth pode ter mais de um perfil em
-- public.profiles, um para cada area. Exemplo: mesmo e-mail como aluno em
-- solda e tambem como aluno em alivio_tensao.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELAS
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid not null references auth.users (id) on delete cascade,
  nome        text not null default '',
  matricula   text,
  area        text not null default 'solda' check (area in ('solda', 'alivio_tensao')),
  role        text not null default 'aluno' check (role in ('aluno', 'admin')),
  criado_em   timestamptz not null default now(),
  primary key (id, area)
);

create table if not exists public.provas (
  id            uuid primary key default gen_random_uuid(),
  area          text not null default 'solda' check (area in ('solda', 'alivio_tensao')),
  codigo        text not null,
  titulo        text not null,
  descricao     text default '',
  nota_minima   numeric not null default 7,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (area, codigo)
);

create table if not exists public.questoes (
  id            uuid primary key default gen_random_uuid(),
  prova_id      uuid not null references public.provas (id) on delete cascade,
  ordem         int not null,
  enunciado     text not null,
  alternativas  jsonb not null default '[]'::jsonb,
  correta       text not null,
  justificativa text default '',
  unique (prova_id, ordem)
);

create table if not exists public.tentativas (
  id             uuid primary key default gen_random_uuid(),
  area           text not null default 'solda' check (area in ('solda', 'alivio_tensao')),
  aluno_id       uuid not null,
  aluno_nome     text not null default '',
  prova_id       uuid references public.provas (id) on delete set null,
  prova_titulo   text not null default '',
  instrutor_id   uuid,
  instrutor_nome text not null default '',
  nota           numeric not null,
  acertos        int not null,
  total          int not null,
  aprovado       boolean not null,
  respostas      jsonb not null default '{}'::jsonb,
  realizado_em   timestamptz not null default now(),
  foreign key (aluno_id, area) references public.profiles (id, area) on delete cascade
);

create index if not exists idx_profiles_area_role on public.profiles (area, role);
create index if not exists idx_profiles_id_area on public.profiles (id, area);
create index if not exists idx_provas_area_codigo on public.provas (area, codigo);
create index if not exists idx_questoes_prova on public.questoes (prova_id, ordem);
create index if not exists idx_tentativas_area_aluno on public.tentativas (area, aluno_id, realizado_em desc);
create index if not exists idx_tentativas_area_data on public.tentativas (area, realizado_em);

-- ---------------------------------------------------------------------
-- 2) FUNCOES DE APOIO PARA RLS
-- ---------------------------------------------------------------------

create or replace function public.tem_acesso_area(area_alvo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.area = area_alvo
  )
$$;

create or replace function public.minha_area()
returns text
language sql
security definer
set search_path = public
stable
as $$
  -- Mantida por compatibilidade com versões antigas.
  -- Em sistema multiárea, a área correta deve vir do filtro da consulta.
  select p.area
  from public.profiles p
  where p.id = auth.uid()
  order by p.criado_em desc
  limit 1
$$;

create or replace function public.is_admin_area(area_alvo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.area = area_alvo
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------
-- 3) TRIGGER: ao criar usuario no Auth, cria profile como aluno da area.
--    A area vem de raw_user_meta_data.area enviado no primeiro acesso.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  area_informada text;
begin
  area_informada := coalesce(nullif(new.raw_user_meta_data ->> 'area', ''), 'solda');
  if area_informada not in ('solda', 'alivio_tensao') then
    area_informada := 'solda';
  end if;

  insert into public.profiles (id, nome, matricula, area, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'matricula',
    area_informada,
    'aluno'
  )
  on conflict (id, area) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.provas     enable row level security;
alter table public.questoes   enable row level security;
alter table public.tentativas enable row level security;

-- ---- profiles ----
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admins on public.profiles;
drop policy if exists profiles_select_admin_all on public.profiles;
drop policy if exists profiles_select_area on public.profiles;
create policy profiles_select_area on public.profiles
  for select using (
    id = auth.uid()
    or (role = 'admin' and public.tem_acesso_area(area))
    or public.is_admin_area(area)
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (
    id = auth.uid()
    and role = 'aluno'
    and area in ('solda', 'alivio_tensao')
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() and role = 'aluno')
  with check (id = auth.uid() and role = 'aluno' and area in ('solda', 'alivio_tensao'));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin_area(area))
  with check (public.is_admin_area(area));

-- ---- provas ----
drop policy if exists provas_select_auth on public.provas;
create policy provas_select_auth on public.provas
  for select using (auth.uid() is not null and public.tem_acesso_area(area));

drop policy if exists provas_write_admin on public.provas;
create policy provas_write_admin on public.provas
  for all using (public.is_admin_area(area))
  with check (public.is_admin_area(area));

-- ---- questoes ----
drop policy if exists questoes_select_auth on public.questoes;
create policy questoes_select_auth on public.questoes
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.provas p
      where p.id = prova_id and public.tem_acesso_area(p.area)
    )
  );

drop policy if exists questoes_write_admin on public.questoes;
create policy questoes_write_admin on public.questoes
  for all using (
    exists (
      select 1 from public.provas p
      where p.id = prova_id and public.is_admin_area(p.area)
    )
  )
  with check (
    exists (
      select 1 from public.provas p
      where p.id = prova_id and public.is_admin_area(p.area)
    )
  );

-- ---- tentativas ----
drop policy if exists tentativas_select on public.tentativas;
create policy tentativas_select on public.tentativas
  for select using (aluno_id = auth.uid() or public.is_admin_area(area));

drop policy if exists tentativas_insert_own on public.tentativas;
create policy tentativas_insert_own on public.tentativas
  for insert with check (aluno_id = auth.uid() and public.tem_acesso_area(area));

drop policy if exists tentativas_update_admin on public.tentativas;
create policy tentativas_update_admin on public.tentativas
  for update using (public.is_admin_area(area))
  with check (public.is_admin_area(area));

drop policy if exists tentativas_delete_admin on public.tentativas;
create policy tentativas_delete_admin on public.tentativas
  for delete using (public.is_admin_area(area));

-- =====================================================================
-- Para promover usuario a admin de uma area sem remover o acesso em outra:
--
-- insert into public.profiles (id, nome, matricula, area, role)
-- select id, split_part(email, '@', 1), null, 'alivio_tensao', 'admin'
-- from auth.users
-- where lower(email) = lower('email@exemplo.com')
-- on conflict (id, area) do update set role = 'admin';
-- =====================================================================

-- ---------------------------------------------------------------------
-- 5) CADASTRO DE ALUNOS AUTORIZADOS PARA PRIMEIRO ACESSO
-- ---------------------------------------------------------------------

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
  select c.email, c.nome, c.matricula, c.area, c.ativo
  from public.alunos_cadastrados c
  where c.area = p_area
    and c.email_normalizado = lower(trim(p_email))
    and c.ativo = true
  limit 1
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.alunos_cadastrados to authenticated;
grant execute on function public.buscar_aluno_cadastrado(text, text) to anon, authenticated;

alter table public.alunos_cadastrados enable row level security;

drop policy if exists alunos_cadastrados_select_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_select_admin on public.alunos_cadastrados
  for select to authenticated using (public.is_admin_area(area));

drop policy if exists alunos_cadastrados_insert_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_insert_admin on public.alunos_cadastrados
  for insert to authenticated with check (public.is_admin_area(area));

drop policy if exists alunos_cadastrados_update_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_update_admin on public.alunos_cadastrados
  for update to authenticated using (public.is_admin_area(area))
  with check (public.is_admin_area(area));

drop policy if exists alunos_cadastrados_delete_admin on public.alunos_cadastrados;
create policy alunos_cadastrados_delete_admin on public.alunos_cadastrados
  for delete to authenticated using (public.is_admin_area(area));
