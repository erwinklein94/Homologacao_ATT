-- =====================================================================
-- PADRONIZAÇÃO + IMAGENS NAS QUESTÕES + PERFIL EDITÁVEL DO ALUNO
--
-- JÁ APLICADO no projeto Supabase (zupiomlphokfpuufzyog) em 17/07/2026
-- via migrações: padronizar_especificacao_man_vp_0036,
-- imagens_questoes_alternativas e aluno_atualizar_meu_cadastro.
-- Este arquivo fica no repositório como registro/reexecução (idempotente).
--
-- O que faz:
--  1) Padroniza a especificação técnica de TODO o site para
--     "MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO"
--     (histórico, cadastro de alunos, defaults e trigger do histórico).
--  2) Imagens nas questões e alternativas: coluna questoes.imagens,
--     bucket público provas-imagens (upload só de admin) e RPCs
--     questoes_da_prova / salvar_prova_completa atualizadas.
--  3) RPC atualizar_meu_cadastro: o aluno logado edita nome, matrícula
--     e empresa (sincroniza profiles + alunos_cadastrados).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ESPECIFICAÇÃO TÉCNICA PADRÃO ÚNICA
-- ---------------------------------------------------------------------

update public.historico_alivio_tensao
   set especificacao = 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO',
       atualizado_em = now()
 where especificacao is distinct from 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO';

update public.alunos_cadastrados
   set especificacao = 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO'
 where coalesce(especificacao, '') is distinct from 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO';

alter table public.alunos_cadastrados
  alter column especificacao set default 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO';

alter table public.historico_alivio_tensao
  alter column especificacao set default 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO';

-- Registro do Histórico gerado por prova do sistema usa a especificação
-- padrão quando o cadastro do aluno não tiver uma.
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
    (coalesce(nullif(v_cad.especificacao, ''), 'MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO'),
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

-- ---------------------------------------------------------------------
-- 2) IMAGENS NAS QUESTÕES E ALTERNATIVAS
-- ---------------------------------------------------------------------

alter table public.questoes
  add column if not exists imagens jsonb not null default '[]'::jsonb;

-- Bucket público para as imagens das provas (só o admin envia/remove).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provas-imagens', 'provas-imagens', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists provas_imagens_select on storage.objects;
create policy provas_imagens_select on storage.objects
  for select using (bucket_id = 'provas-imagens');

drop policy if exists provas_imagens_insert_admin on storage.objects;
create policy provas_imagens_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'provas-imagens' and public.is_admin_area('alivio_tensao'));

drop policy if exists provas_imagens_update_admin on storage.objects;
create policy provas_imagens_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'provas-imagens' and public.is_admin_area('alivio_tensao'))
  with check (bucket_id = 'provas-imagens' and public.is_admin_area('alivio_tensao'));

drop policy if exists provas_imagens_delete_admin on storage.objects;
create policy provas_imagens_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'provas-imagens' and public.is_admin_area('alivio_tensao'));

-- O aluno lê as questões (sem gabarito) já com as imagens.
drop function if exists public.questoes_da_prova(uuid);
create or replace function public.questoes_da_prova(p_prova_id uuid)
returns table (
  id           uuid,
  ordem        int,
  enunciado    text,
  alternativas jsonb,
  imagens      jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.ordem, q.enunciado, q.alternativas, coalesce(q.imagens, '[]'::jsonb)
  from public.questoes q
  join public.provas p on p.id = q.prova_id
  where q.prova_id = p_prova_id
    and p.ativo = true
    and public.tem_acesso_area(p.area)
  order by q.ordem
$$;

grant execute on function public.questoes_da_prova(uuid) to authenticated;

-- Salvamento da prova completa grava também as imagens da questão.
-- (As imagens das alternativas viajam dentro do jsonb alternativas.)
create or replace function public.salvar_prova_completa(
  p_prova_id    uuid,
  p_titulo      text,
  p_descricao   text,
  p_nota_minima numeric,
  p_ativo       boolean,
  p_questoes    jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area text;
  q jsonb;
  i int := 0;
begin
  select area into v_area from public.provas where id = p_prova_id;
  if not found then
    raise exception 'Prova não encontrada.';
  end if;
  if not public.is_admin_area(v_area) then
    raise exception 'Apenas o administrador desta área pode editar provas.';
  end if;

  update public.provas
     set titulo        = coalesce(nullif(trim(p_titulo), ''), titulo),
         descricao     = coalesce(p_descricao, ''),
         nota_minima   = coalesce(p_nota_minima, 7),
         ativo         = coalesce(p_ativo, true),
         atualizado_em = now()
   where id = p_prova_id;

  delete from public.questoes where prova_id = p_prova_id;

  for q in select * from jsonb_array_elements(coalesce(p_questoes, '[]'::jsonb)) loop
    i := i + 1;
    insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa, imagens)
    values (
      p_prova_id,
      i,
      q ->> 'enunciado',
      coalesce(q -> 'alternativas', '[]'::jsonb),
      coalesce(q ->> 'correta', 'a'),
      coalesce(q ->> 'justificativa', ''),
      coalesce(q -> 'imagens', '[]'::jsonb)
    );
  end loop;
end;
$$;

grant execute on function public.salvar_prova_completa(uuid, text, text, numeric, boolean, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 3) ALUNO EDITA O PRÓPRIO CADASTRO (perfil.html)
-- ---------------------------------------------------------------------

create or replace function public.atualizar_meu_cadastro(
  p_nome      text,
  p_matricula text,
  p_empresa   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'Sessão inválida. Entre novamente.';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome completo.';
  end if;

  update public.profiles
     set nome      = trim(p_nome),
         matricula = nullif(trim(coalesce(p_matricula, '')), ''),
         empresa   = nullif(trim(coalesce(p_empresa, '')), '')
   where id = v_uid and area = 'alivio_tensao';

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  update public.alunos_cadastrados
     set nome          = trim(p_nome),
         matricula     = nullif(trim(coalesce(p_matricula, '')), ''),
         empresa       = nullif(trim(coalesce(p_empresa, '')), ''),
         atualizado_em = now()
   where area = 'alivio_tensao'
     and email_normalizado = lower(trim(coalesce(v_email, '')));
end;
$$;

grant execute on function public.atualizar_meu_cadastro(text, text, text) to authenticated;
