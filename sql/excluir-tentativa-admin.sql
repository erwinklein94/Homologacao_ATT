-- Exclusao atomica de registros de prova pelo administrador da area.
-- Remove primeiro o historico e depois a tentativa, invalidando tambem o
-- certificado que dependia dessa tentativa.

create or replace function public.excluir_tentativa_admin(p_tentativa_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_area text;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select t.area
    into v_area
  from public.tentativas t
  where t.id = p_tentativa_id
  for update;

  if not found then
    raise exception 'Tentativa nao encontrada.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.area = v_area
      and p.role = 'admin'
  ) then
    raise exception 'Somente um administrador desta area pode excluir a tentativa.';
  end if;

  delete from public.historico_alivio_tensao
  where tentativa_id = p_tentativa_id;

  delete from public.tentativas
  where id = p_tentativa_id;

  if not found then
    raise exception 'Nao foi possivel excluir a tentativa.';
  end if;

  return true;
end;
$$;

revoke execute on function public.excluir_tentativa_admin(uuid) from public, anon;
grant execute on function public.excluir_tentativa_admin(uuid) to authenticated;
