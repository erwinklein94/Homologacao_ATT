-- =====================================================================
-- Cadastro de Contas — atualização para perfis, empresas e promoção
-- Rode no Supabase > SQL Editor antes de usar a página Cadastro de contas.
-- =====================================================================

-- 1) Novas informações dos perfis.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists email_normalizado text;
alter table public.profiles add column if not exists empresa text;

-- 2) Empresa também fica disponível na lista administrativa e nas tentativas.
alter table public.alunos_cadastrados add column if not exists empresa text;
alter table public.tentativas add column if not exists aluno_matricula text;
alter table public.tentativas add column if not exists empresa text;

create index if not exists idx_profiles_area_email on public.profiles (area, email_normalizado);
create index if not exists idx_profiles_area_empresa on public.profiles (area, empresa);
create index if not exists idx_tentativas_area_empresa on public.tentativas (area, empresa, realizado_em desc);

-- 3) Preenche e-mail em perfis antigos usando auth.users.
update public.profiles p
set email = coalesce(nullif(p.email, ''), u.email),
    email_normalizado = lower(trim(coalesce(nullif(p.email, ''), u.email)))
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '' or p.email_normalizado is null or p.email_normalizado = '');

-- 4) Se houver empresa já registrada na lista de alunos, aproveita no perfil.
update public.profiles p
set empresa = coalesce(nullif(p.empresa, ''), c.empresa)
from public.alunos_cadastrados c
where p.area = c.area
  and lower(trim(coalesce(p.email, ''))) = c.email_normalizado
  and c.empresa is not null
  and c.empresa <> ''
  and (p.empresa is null or p.empresa = '');

-- 5) Atualiza a função que cria profile ao aluno fazer primeiro acesso.
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

  insert into public.profiles (id, nome, matricula, email, email_normalizado, empresa, area, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'matricula',
    new.email,
    lower(trim(new.email)),
    nullif(new.raw_user_meta_data ->> 'empresa', ''),
    area_informada,
    'aluno'
  )
  on conflict (id, area) do update set
    nome = coalesce(nullif(excluded.nome, ''), public.profiles.nome),
    matricula = coalesce(excluded.matricula, public.profiles.matricula),
    email = coalesce(excluded.email, public.profiles.email),
    email_normalizado = coalesce(excluded.email_normalizado, public.profiles.email_normalizado),
    empresa = coalesce(excluded.empresa, public.profiles.empresa);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) Atualiza a consulta de primeiro acesso para também devolver empresa.
-- IMPORTANTE: o Supabase/PostgreSQL não permite trocar o tipo de retorno
-- de uma função existente usando apenas CREATE OR REPLACE.
-- Por isso a função antiga precisa ser removida antes de recriar.
drop function if exists public.buscar_aluno_cadastrado(text, text);

create or replace function public.buscar_aluno_cadastrado(
  p_email text,
  p_area text default 'alivio_tensao'
)
returns table (
  email text,
  nome text,
  matricula text,
  empresa text,
  area text,
  ativo boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select c.email, c.nome, c.matricula, c.empresa, c.area, c.ativo
  from public.alunos_cadastrados c
  where c.area = p_area
    and c.email_normalizado = lower(trim(p_email))
    and c.ativo = true
  limit 1
$$;

-- 7) Permissões para a página Cadastro de contas.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.alunos_cadastrados to authenticated;
grant select, insert, update, delete on public.tentativas to authenticated;
grant execute on function public.buscar_aluno_cadastrado(text, text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.alunos_cadastrados enable row level security;

-- Administrador da área enxerga e atualiza os perfis da área.
drop policy if exists profiles_select_area on public.profiles;
create policy profiles_select_area on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or (role = 'admin' and public.tem_acesso_area(area))
    or public.is_admin_area(area)
  );

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin_area(area))
  with check (public.is_admin_area(area));

-- Mantém o próprio aluno autorizado a criar/atualizar apenas seu perfil de aluno.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'aluno' and area in ('solda', 'alivio_tensao'));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and role = 'aluno')
  with check (id = auth.uid() and role = 'aluno' and area in ('solda', 'alivio_tensao'));

-- Políticas da lista administrativa de alunos.
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
