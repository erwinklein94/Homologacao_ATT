-- =====================================================================
-- HOMOLOGACAO ADMINISTRATIVA DE CERTIFICADOS
--
-- Rode este script depois de sql/atualizacao-seguranca.sql.
-- Uma nota acima do minimo passa a criar uma solicitacao PENDENTE.
-- O certificado somente e liberado depois da decisao de um administrador.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ESTADO E AUDITORIA NA TENTATIVA
-- ---------------------------------------------------------------------

alter table public.tentativas
  add column if not exists status_homologacao text,
  add column if not exists homologado_por uuid references auth.users (id) on delete set null,
  add column if not exists homologado_em timestamptz,
  add column if not exists motivo_recusa text;

update public.tentativas
set status_homologacao = case when aprovado then 'pendente' else 'nao_aplicavel' end
where status_homologacao is null;

alter table public.tentativas
  alter column status_homologacao set default 'pendente',
  alter column status_homologacao set not null;

alter table public.tentativas
  drop constraint if exists tentativas_status_homologacao_chk;
alter table public.tentativas
  add constraint tentativas_status_homologacao_chk
  check (
    (not aprovado
      and status_homologacao = 'nao_aplicavel'
      and homologado_por is null
      and homologado_em is null
      and motivo_recusa is null)
    or
    (aprovado
      and status_homologacao = 'pendente'
      and homologado_por is null
      and homologado_em is null
      and motivo_recusa is null)
    or
    (aprovado
      and status_homologacao = 'aprovada'
      and homologado_por is not null
      and homologado_em is not null
      and motivo_recusa is null)
    or
    (aprovado
      and status_homologacao = 'recusada'
      and homologado_por is not null
      and homologado_em is not null
      and nullif(trim(motivo_recusa), '') is not null)
  );

create index if not exists idx_tentativas_homologacao_pendente
  on public.tentativas (area, subarea, realizado_em desc)
  where status_homologacao = 'pendente';
create index if not exists idx_tentativas_homologado_por
  on public.tentativas (homologado_por)
  where homologado_por is not null;

-- Garante o estado correto mesmo se uma funcao antiga inserir a tentativa
-- sem informar explicitamente status_homologacao.
create or replace function public.definir_status_homologacao_tentativa()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.aprovado then
    if new.status_homologacao is null
       or new.status_homologacao = 'nao_aplicavel' then
      new.status_homologacao := 'pendente';
    end if;
  else
    new.status_homologacao := 'nao_aplicavel';
    new.homologado_por := null;
    new.homologado_em := null;
    new.motivo_recusa := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_definir_status_homologacao on public.tentativas;
create trigger trg_definir_status_homologacao
  before insert or update of aprovado on public.tentativas
  for each row execute function public.definir_status_homologacao_tentativa();

revoke execute on function public.definir_status_homologacao_tentativa() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) ESPELHO AUDITAVEL NO HISTORICO ADMINISTRATIVO
-- ---------------------------------------------------------------------

alter table public.historico_alivio_tensao
  add column if not exists tentativa_id uuid references public.tentativas (id) on delete set null,
  add column if not exists status_homologacao text not null default 'nao_aplicavel',
  add column if not exists homologado_por uuid references auth.users (id) on delete set null,
  add column if not exists homologado_por_nome text,
  add column if not exists homologado_em timestamptz,
  add column if not exists motivo_recusa text;

alter table public.historico_alivio_tensao
  drop constraint if exists historico_status_homologacao_chk;
alter table public.historico_alivio_tensao
  add constraint historico_status_homologacao_chk
  check (status_homologacao in ('nao_aplicavel', 'pendente', 'aprovada', 'recusada'));

create unique index if not exists idx_historico_tentativa_id
  on public.historico_alivio_tensao (tentativa_id)
  where tentativa_id is not null;
create index if not exists idx_historico_homologado_por
  on public.historico_alivio_tensao (homologado_por)
  where homologado_por is not null;

-- Atualiza o gatilho que registra provas online no historico.
create or replace function public.historico_registrar_tentativa()
returns trigger
language plpgsql
security invoker
set search_path = ''
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
     nota, aprovacao, subarea, origem, tentativa_id, status_homologacao,
     homologado_por, homologado_por_nome, homologado_em, motivo_recusa)
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
     'sistema',
     new.id,
     new.status_homologacao,
     new.homologado_por,
     null,
     new.homologado_em,
     new.motivo_recusa)
  on conflict (tentativa_id) where tentativa_id is not null do nothing;
  return new;
end;
$$;

revoke execute on function public.historico_registrar_tentativa() from public, anon, authenticated;

-- Inclui no historico tentativas antigas que ainda nao estavam vinculadas.
insert into public.historico_alivio_tensao
  (especificacao, modalidade, categoria, data_inicio, data_fim, carga_horaria,
   local, gerencia, participante, funcao, matricula, empresa, email, instrutor,
   nota, aprovacao, subarea, origem, tentativa_id, status_homologacao,
   homologado_por, homologado_por_nome, homologado_em, motivo_recusa)
select
  coalesce(nullif(c.especificacao, ''), t.prova_titulo, ''),
  coalesce(nullif(c.modalidade, ''), 'TEÓRICO'),
  'HOMOLOGAÇÃO',
  (t.realizado_em at time zone 'America/Sao_Paulo')::date,
  (t.realizado_em at time zone 'America/Sao_Paulo')::date,
  '',
  coalesce(c.local, ''),
  coalesce(c.gerencia, ''),
  coalesce(t.aluno_nome, ''),
  coalesce(c.funcao, ''),
  coalesce(nullif(t.aluno_matricula, ''), c.matricula, ''),
  coalesce(nullif(t.empresa, ''), c.empresa, ''),
  coalesce(p.email, ''),
  coalesce(nullif(t.instrutor_nome, ''), c.instrutor, ''),
  t.nota,
  case when t.aprovado then 'APROVADO' else 'REPROVADO' end,
  coalesce(nullif(t.subarea, ''), 'alivio_termico'),
  'sistema',
  t.id,
  t.status_homologacao,
  t.homologado_por,
  null,
  t.homologado_em,
  t.motivo_recusa
from public.tentativas t
left join public.profiles p
  on p.id = t.aluno_id and p.area = t.area
left join public.alunos_cadastrados c
  on c.area = t.area
 and c.email_normalizado = lower(trim(coalesce(p.email, '')))
where not exists (
  select 1
  from public.historico_alivio_tensao h
  where h.tentativa_id = t.id
)
on conflict (tentativa_id) where tentativa_id is not null do nothing;

-- ---------------------------------------------------------------------
-- 3) DECISAO ADMINISTRATIVA ATOMICA
-- ---------------------------------------------------------------------

create or replace function public.decidir_homologacao(
  p_tentativa_id uuid,
  p_decisao text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tent public.tentativas%rowtype;
  v_status text;
  v_motivo text;
  v_admin_nome text;
begin
  if v_uid is null then
    raise exception 'Sessao invalida. Entre novamente.';
  end if;

  select * into v_tent
  from public.tentativas
  where id = p_tentativa_id
  for update;

  if not found then
    raise exception 'Tentativa nao encontrada.';
  end if;

  select p.nome into v_admin_nome
  from public.profiles p
  where p.id = v_uid
    and p.area = v_tent.area
    and p.role = 'admin';

  if not found then
    raise exception 'Somente um administrador desta area pode decidir a homologacao.';
  end if;

  if not v_tent.aprovado then
    raise exception 'A nota desta tentativa nao atingiu o minimo para homologacao.';
  end if;

  case lower(trim(coalesce(p_decisao, '')))
    when 'aprovar' then
      v_status := 'aprovada';
      v_motivo := null;
    when 'recusar' then
      v_status := 'recusada';
      v_motivo := nullif(trim(coalesce(p_motivo, '')), '');
      if v_motivo is null then
        raise exception 'Informe o motivo da recusa.';
      end if;
    else
      raise exception 'Decisao invalida. Use aprovar ou recusar.';
  end case;

  update public.tentativas
  set status_homologacao = v_status,
      homologado_por = v_uid,
      homologado_em = now(),
      motivo_recusa = v_motivo
  where id = p_tentativa_id
  returning * into v_tent;

  update public.historico_alivio_tensao
  set status_homologacao = v_status,
      homologado_por = v_uid,
      homologado_por_nome = coalesce(nullif(v_admin_nome, ''), 'Administrador'),
      homologado_em = v_tent.homologado_em,
      motivo_recusa = v_motivo,
      atualizado_em = now()
  where tentativa_id = p_tentativa_id;

  return jsonb_build_object(
    'tentativa_id', v_tent.id,
    'status_homologacao', v_tent.status_homologacao,
    'homologado_por', v_tent.homologado_por,
    'homologado_em', v_tent.homologado_em,
    'motivo_recusa', v_tent.motivo_recusa
  );
end;
$$;

revoke execute on function public.decidir_homologacao(uuid, text, text) from public, anon;
grant execute on function public.decidir_homologacao(uuid, text, text) to authenticated;

-- A alteracao fica limitada as colunas de homologacao e aos administradores
-- da area. A interface usa a funcao acima para manter a atualizacao atomica.
drop policy if exists tentativas_update_admin on public.tentativas;
drop policy if exists tentativas_update_homologacao_admin on public.tentativas;
create policy tentativas_update_homologacao_admin on public.tentativas
  for update to authenticated
  using ((select public.is_admin_area(area)))
  with check ((select public.is_admin_area(area)));
revoke update on public.tentativas from authenticated;
grant update (status_homologacao, homologado_por, homologado_em, motivo_recusa)
  on public.tentativas to authenticated;

-- ---------------------------------------------------------------------
-- 4) DOWNLOAD E VERIFICACAO SOMENTE DEPOIS DA HOMOLOGACAO
-- ---------------------------------------------------------------------

create or replace function public.obter_certificado(p_tentativa_id uuid)
returns table (
  codigo text,
  aluno_nome text,
  matricula text,
  prova_titulo text,
  nota numeric,
  acertos int,
  total int,
  aprovado boolean,
  status_homologacao text,
  instrutor_nome text,
  realizado_em timestamptz,
  nota_minima numeric,
  area text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select t.codigo_cert,
         t.aluno_nome,
         t.aluno_matricula,
         t.prova_titulo,
         round(t.nota, 1),
         t.acertos,
         t.total,
         t.aprovado,
         t.status_homologacao,
         t.instrutor_nome,
         t.realizado_em,
         coalesce(p.nota_minima, 7),
         t.area
  from public.tentativas t
  left join public.provas p on p.id = t.prova_id
  where t.id = p_tentativa_id
    and t.aprovado = true
    and t.status_homologacao = 'aprovada'
    and (
      t.aluno_id = auth.uid()
      or exists (
        select 1 from public.profiles adm
        where adm.id = auth.uid()
          and adm.area = t.area
          and adm.role = 'admin'
      )
    )
  limit 1
$$;

revoke execute on function public.obter_certificado(uuid) from public, anon;
grant execute on function public.obter_certificado(uuid) to authenticated;

create or replace function public.verificar_certificado(p_codigo text)
returns table (
  codigo text,
  aluno_nome text,
  prova_titulo text,
  nota numeric,
  acertos int,
  total int,
  aprovado boolean,
  realizado_em timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select t.codigo_cert, t.aluno_nome, t.prova_titulo,
         round(t.nota, 1), t.acertos, t.total, t.aprovado, t.realizado_em
  from public.tentativas t
  where t.codigo_cert = upper(trim(p_codigo))
    and t.aprovado = true
    and t.status_homologacao = 'aprovada'
  limit 5
$$;

revoke execute on function public.verificar_certificado(text) from public;
grant execute on function public.verificar_certificado(text) to anon, authenticated;
