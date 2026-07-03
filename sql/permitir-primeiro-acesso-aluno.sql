-- =====================================================================
-- Permitir primeiro acesso criado pelo próprio aluno
-- Rode no Supabase > SQL Editor se o primeiro acesso criar a conta,
-- mas aparecer erro de perfil/permission denied em public.profiles.
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_area on public.profiles;
create policy profiles_select_area on public.profiles
  for select using (
    id = auth.uid()
    or (role = 'admin' and public.tem_acesso_area(area))
    or public.is_admin_area(area)
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'aluno'
    and area in ('solda', 'alivio_tensao')
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and role = 'aluno')
  with check (id = auth.uid() and role = 'aluno' and area in ('solda', 'alivio_tensao'));

-- Gatilho para todo novo usuário do Auth virar aluno da área enviada pelo site.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  area_informada text;
begin
  area_informada := coalesce(nullif(new.raw_user_meta_data ->> 'area', ''), 'alivio_tensao');
  if area_informada not in ('solda', 'alivio_tensao') then
    area_informada := 'alivio_tensao';
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
