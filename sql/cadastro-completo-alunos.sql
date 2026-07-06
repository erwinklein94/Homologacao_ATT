-- =====================================================================
-- Cadastro completo do aluno — campos que alimentam o Histórico
-- (Participante, E-mail, Especificação, Função, Empresa, Matrícula/CPF,
--  Local, Gerência, Modalidade, Instrutor)
--
-- - Novas colunas em public.alunos_cadastrados.
-- - handle_new_user grava os campos informados na solicitação de acesso
--   (substitui a versão de sql/atualizacao-seguranca.sql).
-- - historico_registrar_tentativa passa a preencher o registro do
--   Histórico com os dados do cadastro do aluno
--   (substitui a versão de sql/historico-alivio-tensao.sql).
--
-- COMO USAR: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

alter table public.alunos_cadastrados add column if not exists funcao text default '';
alter table public.alunos_cadastrados add column if not exists local text default '';
alter table public.alunos_cadastrados add column if not exists gerencia text default '';
alter table public.alunos_cadastrados add column if not exists modalidade text default '';
alter table public.alunos_cadastrados add column if not exists instrutor text default '';
alter table public.alunos_cadastrados add column if not exists especificacao text default '';

-- Solicitação de acesso grava todos os campos informados pelo aluno.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  area_informada text;
  v_cad public.alunos_cadastrados%rowtype;
begin
  area_informada := coalesce(nullif(new.raw_user_meta_data ->> 'area',''),'alivio_tensao');
  if area_informada not in ('solda','alivio_tensao') then
    area_informada := 'alivio_tensao';
  end if;

  select * into v_cad
  from public.alunos_cadastrados c
  where c.area = area_informada
    and c.email_normalizado = lower(trim(new.email));

  if found and not v_cad.ativo then
    raise exception 'Seu cadastro está inativo. Procure o administrador.';
  end if;

  if not found then
    insert into public.alunos_cadastrados
      (area, nome, matricula, email, email_normalizado, empresa, funcao, local,
       gerencia, modalidade, instrutor, especificacao, ativo)
    values (
      area_informada,
      coalesce(nullif(new.raw_user_meta_data ->> 'nome',''), split_part(new.email,'@',1)),
      nullif(new.raw_user_meta_data ->> 'matricula',''),
      new.email,
      lower(trim(new.email)),
      coalesce(new.raw_user_meta_data ->> 'empresa',''),
      coalesce(new.raw_user_meta_data ->> 'funcao',''),
      coalesce(new.raw_user_meta_data ->> 'local',''),
      coalesce(new.raw_user_meta_data ->> 'gerencia',''),
      coalesce(new.raw_user_meta_data ->> 'modalidade',''),
      coalesce(new.raw_user_meta_data ->> 'instrutor',''),
      coalesce(new.raw_user_meta_data ->> 'especificacao',''),
      false
    )
    on conflict (area, email_normalizado) do nothing;
  end if;

  insert into public.profiles (id, nome, matricula, empresa, email, email_normalizado, area, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome',''), nullif(v_cad.nome,''), split_part(new.email,'@',1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'matricula',''), v_cad.matricula),
    nullif(new.raw_user_meta_data ->> 'empresa',''),
    new.email,
    lower(trim(new.email)),
    area_informada,
    'aluno'
  )
  on conflict (id, area) do update set
    email = coalesce(excluded.email, public.profiles.email),
    email_normalizado = coalesce(excluded.email_normalizado, public.profiles.email_normalizado);

  return new;
end;
$function$;

-- Registro do Histórico gerado pela prova puxa os dados do cadastro do aluno.
create or replace function public.historico_registrar_tentativa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_cad public.alunos_cadastrados%rowtype;
begin
  select p.email into v_email
  from public.profiles p
  where p.id = new.aluno_id and p.area = new.area;

  select * into v_cad
  from public.alunos_cadastrados c
  where c.area = new.area
    and c.email_normalizado = lower(trim(coalesce(v_email, '')));

  insert into public.historico_alivio_tensao
    (especificacao, modalidade, categoria, data_inicio, data_fim, carga_horaria,
     local, gerencia, participante, funcao, matricula, empresa, email, instrutor,
     nota, aprovacao, subarea, origem)
  values
    (coalesce(nullif(v_cad.especificacao, ''), new.prova_titulo, ''),
     coalesce(nullif(v_cad.modalidade, ''), 'TEÓRICO'),
     'HOMOLOGAÇÃO',
     (new.realizado_em at time zone 'America/Sao_Paulo')::date,
     (new.realizado_em at time zone 'America/Sao_Paulo')::date,
     '',
     coalesce(v_cad.local, ''),
     coalesce(v_cad.gerencia, ''),
     coalesce(new.aluno_nome, ''),
     coalesce(v_cad.funcao, ''),
     coalesce(nullif(new.aluno_matricula, ''), v_cad.matricula, ''),
     coalesce(nullif(new.empresa, ''), v_cad.empresa, ''),
     coalesce(v_email, ''),
     coalesce(nullif(new.instrutor_nome, ''), v_cad.instrutor, ''),
     new.nota,
     case when new.aprovado then 'APROVADO' else 'REPROVADO' end,
     coalesce(nullif(new.subarea, ''), 'alivio_termico'),
     'sistema');
  return new;
end;
$$;
