-- =====================================================================
-- Homologacoes Rumo — Historico de Alivio de Tensao (importado da planilha)
-- Cria a tabela public.historico_alivio_tensao, aplica RLS (somente admin da
-- area de Alivio de Tensao le/gerencia) e carrega os 109 registros da
-- planilha "Historico de notas alivio de tensao.xlsx" (versao 2026-07-04).
-- O historico e EDITAVEL pelo administrador na aba Historico de admin.html.
--
-- COMO USAR: Supabase > SQL Editor > New query > cole TUDO > Run.
-- ATENCAO: a carga APAGA o conteudo atual da tabela e regrava a planilha.
-- Pre-requisito: o schema.sql ja foi executado (funcao public.is_admin_area).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELA
-- ---------------------------------------------------------------------
create table if not exists public.historico_alivio_tensao (
  id             uuid primary key default gen_random_uuid(),
  especificacao  text not null default '',
  modalidade     text not null default '',          -- TEORICO / PRATICO
  categoria      text not null default '',          -- HOMOLOGACAO / CAPACITACAO
  data_inicio    date,
  data_fim       date,
  carga_horaria  text default '',
  local          text default '',
  gerencia       text default '',
  participante   text not null default '',
  funcao         text default '',
  matricula      text default '',
  empresa        text default '',
  nota           numeric,
  aprovacao      text not null default 'NA',        -- APROVADO / REPROVADO / NA
  origem         text not null default 'planilha',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists idx_hist_alivio_data on public.historico_alivio_tensao (data_inicio desc);
create index if not exists idx_hist_alivio_part on public.historico_alivio_tensao (participante);

-- ---------------------------------------------------------------------
-- 2) ROW LEVEL SECURITY (somente admin da area de Alivio de Tensao)
-- ---------------------------------------------------------------------
alter table public.historico_alivio_tensao enable row level security;

drop policy if exists hist_alivio_select_admin on public.historico_alivio_tensao;
create policy hist_alivio_select_admin on public.historico_alivio_tensao
  for select using (public.is_admin_area('alivio_tensao'));

drop policy if exists hist_alivio_write_admin on public.historico_alivio_tensao;
create policy hist_alivio_write_admin on public.historico_alivio_tensao
  for all using (public.is_admin_area('alivio_tensao'))
  with check (public.is_admin_area('alivio_tensao'));

grant select, insert, update, delete on public.historico_alivio_tensao to authenticated;

-- ---------------------------------------------------------------------
-- 3) CARGA DA PLANILHA (substitui o conteudo atual da tabela)
-- ---------------------------------------------------------------------
delete from public.historico_alivio_tensao;

insert into public.historico_alivio_tensao (especificacao, modalidade, categoria, data_inicio, data_fim, carga_horaria, local, gerencia, participante, funcao, matricula, empresa, nota, aprovacao) values
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'VALDSON DE SOUZA', 'ENCARREGADO DE SUPERESTRUTURA', '4902187337', 'COTRIN', 9.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'ISRAEL VALE DE ALBUQUERQUE', 'AJUDANTE GERAL', '60844140339', 'COTRIN', 6.9, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'ANTÔNIO CARLOS SANTOS DA SILVA', 'INSPETOR DE VIA PERMANENTE', '7531804727', 'PRIORIZA', 8.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'DEIMISON LUAN DE SOUZA', 'INSPETOR DE VIA PERMANENTE', '42571140884', 'PRIORIZA', 9.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'ANDRÉ DE OLIVEIRA', 'INSPETOR DE VIA PERMANENTE', '28599518810', 'PRIORIZA', 8, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'ANTÔNIO MARCOS DOS SANTOS', 'ENCARREGADO DE SUPERESTRUTURA', '3467213189', 'TRILL', 8.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'ABIMAEL NASCIMENTO DOS SANTOS', 'FEITOR DE VIA PERMANENTE', '61112179330', 'TRILL', 6.4, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-04-27', '2023-04-27', '8h', 'MAIRINQUE/SP', 'SP SUL', 'RODRIGO SANTINELLI ESTAVAO', 'RONDANTE', 'CS372989', 'RUMO', 8.8, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-06-06', '2023-06-07', '8h', 'TRINDADE/GO', 'PROJ. MC', 'FERNANDO OLIVEIRA DA SILVA', 'SUB ENCARREGADO DE SUPERESTRUTURA', '3864322367', 'COTRIN', 8.2, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-06-06', '2023-06-06', '8h', 'TRINDADE/GO', 'PROJ. MC', 'REGINALDO MOURA DE JESUS', 'ENCARREGADO DE SUPERESTRUTURA', '85973610349', 'COTRIN', 8, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-06-06', '2023-06-07', '8h', 'TRINDADE/GO', 'PROJ. MC', 'RAFAEL MAURO CRUZ', 'APONTADOR', '3960603254', 'COTRIN', 7.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-06-06', '2023-06-07', '8h', 'TRINDADE/GO', 'PROJ. MC', 'EMERSON DE ARAÚJO FREITAS', 'SUB ENCARREGADO DE SUPERESTRUTURA', '2527854362', 'COTRIN', 9.1, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-06-06', '2023-06-06', '8h', 'TRINDADE/GO', 'PROJ. MC', 'ANTÔNIO RODRIGUES DE SOUSA', 'ENCARREGADO DE SUPERESTRUTURA', '36304573200', 'COTRIN', 8.1, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-06-06', '2023-06-06', '8h', 'TRINDADE/GO', 'PROJ. MC', 'THARLLISON MARINHO SOBRINHO', 'ENCARREGADO DE SUPERESTRUTURA', '3455805329', 'COTRIN', 8.9, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-06-06', '2023-06-06', '8h', 'TRINDADE/GO', 'PROJ. MC', 'FRANCIMAR DE COSTA', 'ENCARREGADO DE SUPERESTRUTURA', '82770204800', 'COTRIN', 9, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-06-07', '2023-06-07', '4h', 'NOVA VENEZA/GO', 'PROJ. MC', 'REGINALDO MOURA DE JESUS', 'ENCARREGADO DE SUPERESTRUTURA', '85973610349', 'COTRIN', 7.6, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-06-07', '2023-06-07', '4h', 'NOVA VENEZA/GO', 'PROJ. MC', 'ANTÔNIO RODRIGUES DE SOUSA', 'ENCARREGADO DE SUPERESTRUTURA', '36304573200', 'COTRIN', 7.6, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-06-07', '2023-06-07', '4h', 'NOVA VENEZA/GO', 'PROJ. MC', 'THARLLISON MARINHO SOBRINHO', 'ENCARREGADO DE SUPERESTRUTURA', '3455805329', 'COTRIN', 7.6, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-06-07', '2023-06-07', '4h', 'NOVA VENEZA/GO', 'PROJ. MC', 'FRANCIMAR DE COSTA', 'ENCARREGADO DE SUPERESTRUTURA', '82770204800', 'COTRIN', 7.6, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'TAINAN BUSARANHO TEIXEIRA', 'COORDENADOR DE VIA', 'CS370511', 'RUMO', 9.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'ADRIANO BRUM', 'LÍDER DE VIA PERMANENTE', 'CS318663', 'RUMO', 9.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'ROMILDO BOLOGNIM CIPRIANO', 'LÍDER DE VIA PERMANENTE', 'CS261416', 'RUMO', 9.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'FERNANDO AUGUSTO GRANDO', 'ENCARREGADO DE SUPERESTRUTURA', '32878391182', 'TRILL', 9.4, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'MARCOS SOARES PEREIRA', 'FEITOR DE VIA PERMANENTE', '2740965958', 'TRILL', 9.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'CLAYTON ELOISO DA SILVA', 'ENCARREGADO DE SUPERESTRUTURA', '9327269683', 'TRILL', 9.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'HOMOLOGAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'ERIVELTON ALVES LOBO', 'ENCARREGADO DE SUPERESTRUTURA', '5313461966', 'TRILL', 9.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'LUIZ MÁRIO DOS SANTOS FERNANDES', 'ENCARREGADO DE SUPERESTRUTURA', '73271713120', 'TRILL', 9.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'CARLOS DE LÃ', 'SUPERVISOR', '75548801287', 'TRILL', 9.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'WENDEL PEREIRA LIMA', 'DESENHISTA DE ENGENHARIA', '32014453802', 'EWAVE', 9.7, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'TEÓRICO', 'CAPACITAÇÃO', '2023-07-10', '2023-07-10', '8h', 'SÃO JOSÉ DO RIO PRETO/SP', 'SP NORTE', 'DANIEL MERIA BARBOSA DE SOUZA', 'FISCAL DE VIA PERMANENTE', '5470124118', 'IDG', 9.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-07-11', '2023-07-11', '4h', 'VOTUPORANGA/SP', 'SP NORTE', 'CLAYTON ELOISO DA SILVA', 'ENCARREGADO DE SUPERESTRUTURA', '9327269683', 'TRILL', 8, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-07-11', '2023-07-11', '4h', 'VOTUPORANGA/SP', 'SP NORTE', 'ERIVELTON ALVES LOBO', 'ENCARREGADO DE SUPERESTRUTURA', '5313461966', 'TRILL', 8, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-07-18', '2023-07-18', '4h', 'PALMEIRAS DE GOIÁS/GO', 'PROJ. MC', 'REGINALDO MOURA DE JESUS', 'ENCARREGADO DE SUPERESTRUTURA', '85973610349', 'COTRIN', 9.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-07-18', '2023-07-18', '4h', 'PALMEIRAS DE GOIÁS/GO', 'PROJ. MC', 'ANTÔNIO RODRIGUES DE SOUSA', 'ENCARREGADO DE SUPERESTRUTURA', '36304573200', 'COTRIN', 9.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-07-18', '2023-07-18', '4h', 'PALMEIRAS DE GOIÁS/GO', 'PROJ. MC', 'THARLLISON MARINHO SOBRINHO', 'ENCARREGADO DE SUPERESTRUTURA', '3455805329', 'COTRIN', 9.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS', 'PRÁTICO', 'HOMOLOGAÇÃO', '2023-07-18', '2023-07-18', '4h', 'PALMEIRAS DE GOIÁS/GO', 'PROJ. MC', 'FRANCIMAR DE COSTA', 'ENCARREGADO DE SUPERESTRUTURA', '82770204800', 'COTRIN', 9.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Eduardo Oliveira', '', '025.993.343-06', 'Castilho', 8.6, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Marlon de Oliveira', '', '861.211.185-47', 'Castilho', 7.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Arthur Coroeiro', '', '481.600.558-02', 'Castilho', 8.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Evandro Pedroso', '', '055.201.667-52', 'Castilho', 8.05, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Werbeth Gonçalves', '', '612.647.373-60', 'Castilho', 7.3, 'APROVADO'),
    ('ENG-ETS-ON-T009/04.00-TEMPERATURAS NEUTRAS DE REFERÊNCIA PARA SERVIÇOS DE TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Eduardo Oliveira', '', '025.993.343-06', 'Castilho', 8.6, 'APROVADO'),
    ('ENG-ETS-ON-T009/04.00-TEMPERATURAS NEUTRAS DE REFERÊNCIA PARA SERVIÇOS DE TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Marlon de Oliveira', '', '861.211.185-47', 'Castilho', 7.5, 'APROVADO'),
    ('ENG-ETS-ON-T009/04.00-TEMPERATURAS NEUTRAS DE REFERÊNCIA PARA SERVIÇOS DE TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Arthur Coroeiro', '', '481.600.558-02', 'Castilho', 8.3, 'APROVADO'),
    ('ENG-ETS-ON-T009/04.00-TEMPERATURAS NEUTRAS DE REFERÊNCIA PARA SERVIÇOS DE TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-04-03', '2025-04-04', '8h', 'Paratinga/SP', 'SP SUL', 'Evandro Pedroso', '', '055.201.667-52', 'Castilho', 8.05, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Eduardo Dopkoski', 'Chefe de boletim', '092.350.879-10', 'Prumo', 8.5, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Marcos Franca Silva', 'Operador', '064.284.005.96', 'Prumo', 6.7, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Rodrigo F. Sobrinho', 'Feitor', '036.159.826-22', 'Prumo', 7.9, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Jandson Santos Carvalho', 'Conservador', '37055', 'Prumo', 1.5, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Renison Thierre Jesus Silva', 'Conservador', '37058', 'Prumo', 7.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Paulo Andersson', 'Conservador', '35658', 'Prumo', 1.7, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Fabio Jose Alves dos Santos', 'Tecnico de Segurança do Trabalho', '37203', 'Prumo', 7.2, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Edvaldo Fernandes carvalho', 'Encarregado III', '36930', 'Prumo', 7.3, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'CAPACITAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Edson Silva Prado', 'Tecnico de Campo', '164.807.077-96', 'Engefoto', 9.1, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Julio Junior', 'Encarregado', '165.680.326-10', 'Prumo', 8, 'APROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Tlenate Ferreira de Macedo', 'Supervisor de Obra', '100.807.526-40', 'Prumo', 7.8, 'REPROVADO'),
    ('ENG-ETS-ON-T003/06.00 - ALÍVIO DE TENSÕES TÉRMICAS EM TRILHOS;', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Sivaldo dos Santos', 'Engarregado', '076.747.804-57', 'Prumo', 7.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'wemerson Privado de Carvalho', 'Engarregado', '057.178.273-69', 'Prumo', 8.3, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-05-20', '2025-05-20', '8h', 'ARARQUARA/SP', 'SP NORTE', 'Jocimar da Silva Almeida', 'Supervisor', '27186', 'Prumo', 8.1, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Airton Junior', 'Encarregado', '13373427690', 'Prumo', 8.5, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Edson Vieira', 'Encarregado', '11346334676', 'Prumo', 8.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Vinicius Alves', 'Analista', '257187', 'Prumo', 8.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Jackson Souza', 'Operador', '33074', 'Prumo', 6.5, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Aisemberg Gomes', 'Supervisor', '102.275.676.17', 'Prumo', 9.4, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Deimison Luan de Souza', 'Supervisor', '425.711.408-84', 'Prumo', 8.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Carlos Santos Moreira', 'Encarregado', '087111046-60', 'Prumo', 8.7, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Daniel Felipe', 'Lider', '299972', 'Prumo', 8.3, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'José Nelson Rodrigues Cruz', 'Supervisor', '85942941580', 'Prumo', 7.6, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Diego Henrrique', 'Encarregado', '11235806693', 'Prumo', 8.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2025-08-20', '2025-08-20', '8h', 'Paratinga/SP', 'SP SUL', 'Luciano Ferreira', 'Supervisor', '3546547640', 'Prumo', 9.3, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Dasio Enio Costa Dias', 'Oficial', '4771433500', 'Pelicano', 5.3, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Carlos José', 'FISCAL DE VIA PERMANENTE', '59979567365', 'Pelicano', 7.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Rodrigo Mendonça', 'Encarregado', '4023325314', 'Pelicano', 7.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Antonio Cardoso', 'Supervisor', '791550303', 'Pelicano', 7.3, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Carlos Gaspar', 'FISCAL DE VIA PERMANENTE', '097.369.406-83', 'IDG', 8.7, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Adriano Marcio', 'FISCAL DE VIA PERMANENTE', '62436506387', 'IDG', 8.5, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Wesley Paiva', 'COORDENADOR DE VIA', '2832', 'IDG', 8.4, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Mauricio da Silva', 'Meio Oficial', '61356874339', 'Pelicano', 6.3, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Carlos Henrique', 'Ajudante', '618561133-31', 'Pelicano', 4.8, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2025-12-16', '2025-12-17', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Ronildo Conseição', 'Ajudante', '085.445.383.04', 'Pelicano', 6.2, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-05-13', '2026-05-13', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Alclide Ismar de Aguiar', 'Soldador', '27713', 'Pelicano', 7.3, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-05-13', '2026-05-13', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Francisco Leonardo Pereira', 'Apropriador', '27359', 'Pelicano', 7.7, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-05-13', '2026-05-13', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'João Pirlo Silva', 'Soldador', '29209', 'Pelicano', 8.8, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-05-13', '2026-05-13', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Francisco Batista', 'Soldador', '27712', 'Pelicano', 3.8, 'REPROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-05-13', '2026-05-13', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Mateus Henrrique', 'Analista de Qualidade', '055.104.171-45', 'Rumo', 9.2, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-05-13', '2026-05-13', '8h', 'RONDONÓPOLIS/MT', 'SP NORTE', 'Luciano Ferreira', 'Fiscal de Estaleiro', '2871', 'IDG', 9.3, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Jocimar dias de Almeida', 'Supervisor', '866.110.622-20', 'Prumo', 9.4, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Wemerson Privado de Carvalho', 'Encarregado', '057.178.273-69', 'Prumo', 9.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Silvaldo dos Santos da Silva', 'Encarregado', '7674780457', 'Prumo', 9.2, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Wilson Floret Oliveira', 'Supervisor', '011.451.381-36', 'Prumo', 8.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Junio M da Silva', 'Encarregado', '289.525.878-01', 'Prumo', 8.2, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Leandro Pereira da Silva', 'Encarregado', '061.037.225-43', 'Prumo', 9.3, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Robson Silva de Souza', 'Encarregado', '084.254.635-99', 'Prumo', 8.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Rômulo Ricardo Rodrigues', 'Analista de Via', '316797', 'Prumo', 9.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Igor de Almeida', 'Supervisor VP', '118.476.986-97', 'Prumo', 9.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Raifran Rodrigues', 'Especialista VP', '453949', 'Rumo', 9.6, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Rafael Silva Santos', 'Encarregado', '858.623.615-23', 'Prumo', 9.4, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Antoni Moreira', 'Encarregado', '036.769.023-35', 'Prumo', 7.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Wellinton Dilson Santos', 'Encarregado', '100.859.606-08', 'Prumo', 9.5, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-02', '2026-06-02', '8h', 'ARARAQUARA/SP', 'SP NORTE', 'Alexsandro Silva dos Santos', 'Especialista Op', '376207', 'Prumo', 8.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Carlos Roberto Lopes', 'Encarregado', '4011', 'TRILL', 9.4, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Ernesto Caetano de Andrade', 'Fiscal de Obras', '2540', 'IDG', 8.7, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'CAPACITAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Jussimar da Cruz', 'Coordenador de Obras', '113.102.627-64', 'IDG', 8.8, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Nelson Renato Lima', 'Supervisor', '330.225.148-32', 'TRILL', 9.5, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'José Aparecido da Silva', 'Fiscal de Obras', '67877001649', 'TRILL', 8.7, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Rogério dos Santos', 'Encarregado', '5909526582', 'TRILL', 8.9, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Clécio Teurencio', 'Supervisor', '4563658693', 'TRILL', 9.7, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Frey Lima dos Santos', 'Encarregado', '349729720', 'TRILL', 8.2, 'APROVADO'),
    ('MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES TÉRMICAS EM TRILHO', 'TEÓRICO', 'HOMOLOGAÇÃO', '2026-06-16', '2026-06-16', '8h', 'CHAPADÃO DO SUL/MS', 'SP NORTE', 'Carlos Roberto Gomes', 'Supervisor', '298468000000', 'TRILL', 9, 'APROVADO');
