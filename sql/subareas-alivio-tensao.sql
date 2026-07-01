-- =====================================================================
-- Migração: sub-áreas (treinamentos) dentro de Alívio de Tensão
--
-- A área alivio_tensao passa a ter 4 treinamentos:
--   alivio_termico        -> Alívio de tensão térmica
--   prospeccao_trilhos    -> Prospecção de trilhos
--   operacao_verse        -> Operação com verse
--   temperaturas_neutras  -> Temperaturas neutras
--
-- Cada prova e cada tentativa de alivio_tensao pertence a um treinamento.
-- Registros já existentes (provas ATT 4 e tentativas antigas) são
-- classificados como alivio_termico, pois ATT = Alívio de Tensão Térmica.
-- Na área de solda a coluna fica nula (não se aplica).
--
-- Rode este script UMA vez no SQL Editor do Supabase.
-- =====================================================================

alter table public.provas
  add column if not exists subarea text
  check (subarea is null or subarea in
    ('alivio_termico', 'prospeccao_trilhos', 'operacao_verse', 'temperaturas_neutras'));

alter table public.tentativas
  add column if not exists subarea text
  check (subarea is null or subarea in
    ('alivio_termico', 'prospeccao_trilhos', 'operacao_verse', 'temperaturas_neutras'));

-- Backfill: tudo que já existia em Alívio de Tensão é do treinamento térmico.
update public.provas
   set subarea = 'alivio_termico'
 where area = 'alivio_tensao' and subarea is null;

update public.tentativas
   set subarea = 'alivio_termico'
 where area = 'alivio_tensao' and subarea is null;

create index if not exists idx_provas_area_subarea on public.provas (area, subarea);
create index if not exists idx_tentativas_area_subarea on public.tentativas (area, subarea, realizado_em desc);

-- Conferência rápida (opcional):
-- select area, subarea, count(*) from public.provas group by 1,2 order by 1,2;
-- select area, subarea, count(*) from public.tentativas group by 1,2 order by 1,2;
