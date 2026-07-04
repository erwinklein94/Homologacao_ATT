-- =====================================================================
-- ATUALIZAÇÃO DE SEGURANÇA E INTEGRIDADE — Homologação Alívio de Tensão
--
-- Rode este script UMA vez no Supabase > SQL Editor, DEPOIS de já ter
-- rodado sql/schema.sql e sql/subareas-alivio-tensao.sql.
--
-- O que este script faz:
--  1) Correção da prova passa a acontecer NO BANCO (RPC corrigir_prova).
--     O gabarito nunca mais é enviado ao navegador do aluno e o aluno
--     não consegue mais inserir tentativas com nota forjada.
--  2) Alunos leem as questões por RPC SEM as colunas correta/justificativa.
--  3) Primeiro acesso só funciona para e-mail cadastrado (e ativo) pelo
--     administrador em alunos_cadastrados — validado no servidor.
--  4) Aluno com cadastro INATIVO não consegue registrar prova.
--  5) Nota calculada e gravada com 1 casa decimal (fim do "7,0 reprovado").
--  6) Código de verificação do certificado vira coluna real (codigo_cert)
--     com RPC pública verificar_certificado (página verificar.html).
--  7) Salvamento de prova + questões vira transação única no banco
--     (RPC salvar_prova_completa) — sem risco de prova ficar sem questões.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Garantias de pré-requisito (não faz nada se já existirem)
-- ---------------------------------------------------------------------

alter table public.provas
  add column if not exists subarea text
  check (subarea is null or subarea in
    ('alivio_termico', 'prospeccao_trilhos', 'operacao_verse', 'temperaturas_neutras'));

alter table public.tentativas
  add column if not exists subarea text
  check (subarea is null or subarea in
    ('alivio_termico', 'prospeccao_trilhos', 'operacao_verse', 'temperaturas_neutras'));

-- ---------------------------------------------------------------------
-- 1) CÓDIGO DE VERIFICAÇÃO DO CERTIFICADO
--    Mesma fórmula que o site já usava: HSA- + 8 primeiros hex do id.
-- ---------------------------------------------------------------------

alter table public.tentativas
  add column if not exists codigo_cert text
  generated always as ('HSA-' || upper(substr(replace(id::text, '-', ''), 1, 8))) stored;

create index if not exists idx_tentativas_codigo_cert
  on public.tentativas (codigo_cert);

-- RPC pública: qualquer pessoa com o código valida o certificado.
-- Devolve apenas os dados que já constam no PDF (nada além disso).
create or replace function public.verificar_certificado(p_codigo text)
returns table (
  codigo        text,
  aluno_nome    text,
  prova_titulo  text,
  nota          numeric,
  acertos       int,
  total         int,
  aprovado      boolean,
  realizado_em  timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select t.codigo_cert, t.aluno_nome, t.prova_titulo,
         round(t.nota, 1), t.acertos, t.total, t.aprovado, t.realizado_em
  from public.tentativas t
  where t.codigo_cert = upper(trim(p_codigo))
  limit 5
$$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) QUESTÕES SEM GABARITO PARA O ALUNO
--    O aluno passa a ler as questões por esta RPC, que NÃO devolve
--    correta/justificativa. O select direto na tabela questoes fica
--    restrito ao administrador (a policy questoes_write_admin é FOR ALL
--    e já cobre o select do admin).
-- ---------------------------------------------------------------------

create or replace function public.questoes_da_prova(p_prova_id uuid)
returns table (
  id           uuid,
  ordem        int,
  enunciado    text,
  alternativas jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select q.id, q.ordem, q.enunciado, q.alternativas
  from public.questoes q
  join public.provas p on p.id = q.prova_id
  where q.prova_id = p_prova_id
    and p.ativo = true
    and public.tem_acesso_area(p.area)
  order by q.ordem
$$;

grant execute on function public.questoes_da_prova(uuid) to authenticated;

-- Remove o select direto do aluno na tabela de questões (que expunha o gabarito).
drop policy if exists questoes_select_auth on public.questoes;

-- ---------------------------------------------------------------------
-- 3) CORREÇÃO DA PROVA NO SERVIDOR
--    O aluno envia apenas as respostas; nota, acertos e aprovado são
--    calculados aqui. A resposta devolve a tentativa gravada + o
--    gabarito (para a tela de revisão), só DEPOIS da prova corrigida.
-- ---------------------------------------------------------------------

create or replace function public.corrigir_prova(
  p_prova_id    uuid,
  p_respostas   jsonb,
  p_instrutor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_prova     public.provas%rowtype;
  v_perfil    public.profiles%rowtype;
  v_instrutor public.profiles%rowtype;
  v_cad       public.alunos_cadastrados%rowtype;
  v_total     int;
  v_acertos   int;
  v_nota      numeric;
  v_aprovado  boolean;
  v_tent      public.tentativas%rowtype;
  v_gabarito  jsonb;
begin
  if v_uid is null then
    raise exception 'Sessão inválida. Entre novamente.';
  end if;

  select * into v_prova from public.provas where id = p_prova_id;
  if not found then
    raise exception 'Prova não encontrada.';
  end if;
  if not v_prova.ativo then
    raise exception 'Esta prova não está mais ativa.';
  end if;

  select * into v_perfil
  from public.profiles
  where id = v_uid and area = v_prova.area;
  if not found then
    raise exception 'Você não tem perfil nesta área.';
  end if;

  -- Aluno desativado pelo administrador não registra prova.
  select u.email into v_email from auth.users u where u.id = v_uid;
  select * into v_cad
  from public.alunos_cadastrados c
  where c.area = v_prova.area
    and c.email_normalizado = lower(trim(coalesce(v_email, '')));
  if found and v_cad.ativo = false then
    raise exception 'Seu cadastro está inativo. Procure o administrador.';
  end if;

  -- O instrutor precisa ser um administrador desta área (sem texto livre).
  select * into v_instrutor
  from public.profiles
  where id = p_instrutor_id and area = v_prova.area and role = 'admin';
  if not found then
    raise exception 'Selecione um instrutor válido (administrador da área).';
  end if;

  select count(*) into v_total from public.questoes where prova_id = p_prova_id;
  if v_total = 0 then
    raise exception 'Esta prova não possui questões cadastradas.';
  end if;

  select count(*) into v_acertos
  from public.questoes q
  where q.prova_id = p_prova_id
    and (p_respostas ->> q.id::text) = q.correta;

  -- Nota SEMPRE com 1 casa decimal (mesma precisão exibida na tela e no PDF).
  v_nota := round(v_acertos::numeric * 10 / v_total, 1);
  v_aprovado := v_nota >= coalesce(v_prova.nota_minima, 7);

  insert into public.tentativas
    (area, subarea, aluno_id, aluno_nome, prova_id, prova_titulo,
     instrutor_id, instrutor_nome, nota, acertos, total, aprovado, respostas)
  values
    (v_prova.area,
     v_prova.subarea,
     v_uid,
     coalesce(nullif(v_perfil.nome, ''), split_part(coalesce(v_email, ''), '@', 1)),
     v_prova.id,
     v_prova.titulo,
     v_instrutor.id,
     v_instrutor.nome,
     v_nota, v_acertos, v_total, v_aprovado,
     coalesce(p_respostas, '{}'::jsonb))
  returning * into v_tent;

  select jsonb_agg(
           jsonb_build_object(
             'questao_id', q.id,
             'correta', q.correta,
             'justificativa', coalesce(q.justificativa, '')
           ) order by q.ordem)
    into v_gabarito
  from public.questoes q
  where q.prova_id = p_prova_id;

  return jsonb_build_object(
    'tentativa', to_jsonb(v_tent),
    'gabarito', coalesce(v_gabarito, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.corrigir_prova(uuid, jsonb, uuid) to authenticated;

-- Bloqueia inserção direta de tentativas pelo navegador.
-- A única porta de entrada passa a ser a RPC corrigir_prova.
drop policy if exists tentativas_insert_own on public.tentativas;
revoke insert on public.tentativas from authenticated;

-- (Opcional) Normaliza notas antigas gravadas com 2 casas para 1 casa.
-- Não altera aprovado/reprovado, apenas a precisão exibida.
update public.tentativas set nota = round(nota, 1) where nota <> round(nota, 1);

-- ---------------------------------------------------------------------
-- 4) PRIMEIRO ACESSO SÓ PARA E-MAIL CADASTRADO PELO ADMINISTRADOR
--    Validação no servidor (gatilho): não dá para burlar pelo front.
-- ---------------------------------------------------------------------

-- Helper: o e-mail do usuário logado está cadastrado e ativo na área?
create or replace function public.email_autorizado(area_alvo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.alunos_cadastrados c
    join auth.users u on u.id = auth.uid()
    where c.area = area_alvo
      and c.ativo = true
      and c.email_normalizado = lower(trim(u.email))
  )
$$;

-- Gatilho de novo usuário: primeiro acesso é aberto a qualquer e-mail.
-- Quem já foi cadastrado (e explicitamente desativado) pelo administrador
-- continua bloqueado; quem é novo entra automaticamente como PENDENTE
-- (inativo) em alunos_cadastrados até o administrador aprovar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  area_informada text;
  v_cad public.alunos_cadastrados%rowtype;
begin
  area_informada := coalesce(nullif(new.raw_user_meta_data ->> 'area', ''), 'alivio_tensao');
  if area_informada not in ('solda', 'alivio_tensao') then
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
      (area, nome, matricula, email, email_normalizado, ativo)
    values (
      area_informada,
      coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
      nullif(new.raw_user_meta_data ->> 'matricula', ''),
      new.email,
      lower(trim(new.email)),
      false
    )
    on conflict (area, email_normalizado) do nothing;
  end if;

  insert into public.profiles (id, nome, matricula, empresa, email, email_normalizado, area, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), nullif(v_cad.nome, ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'matricula', ''), v_cad.matricula),
    nullif(new.raw_user_meta_data ->> 'empresa', ''),
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
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O caminho "e-mail já existe no Auth, criar perfil desta área" também
-- passa a exigir cadastro ativo.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'aluno'
    and area in ('solda', 'alivio_tensao')
    and public.email_autorizado(area)
  );

-- ---------------------------------------------------------------------
-- 5) SALVAR PROVA + QUESTÕES EM UMA ÚNICA TRANSAÇÃO
--    Se qualquer parte falhar, nada é alterado (a prova nunca fica
--    "sem questões" por queda de rede no meio do salvamento).
-- ---------------------------------------------------------------------

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
    insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
    values (
      p_prova_id,
      i,
      q ->> 'enunciado',
      coalesce(q -> 'alternativas', '[]'::jsonb),
      coalesce(q ->> 'correta', 'a'),
      coalesce(q ->> 'justificativa', '')
    );
  end loop;
end;
$$;

grant execute on function public.salvar_prova_completa(uuid, text, text, numeric, boolean, jsonb) to authenticated;

-- =====================================================================
-- BOOTSTRAP DO ADMINISTRADOR (leia com atenção)
--
-- Com o primeiro acesso travado, para criar o PRIMEIRO administrador:
--
-- 1) Cadastre o e-mail dele na lista (rode isto, trocando nome/e-mail):
--
--    insert into public.alunos_cadastrados (area, nome, email)
--    values ('alivio_tensao', 'Nome do Especialista', 'voce@rumolog.com')
--    on conflict (area, email_normalizado) do update set ativo = true;
--
-- 2) No site, faça o "Primeiro acesso" com esse e-mail.
--
-- 3) Promova a administrador:
--
--    update public.profiles set role = 'admin'
--    where area = 'alivio_tensao'
--      and id = (select id from auth.users where lower(email) = lower('voce@rumolog.com'));
-- =====================================================================
