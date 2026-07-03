-- =====================================================================
-- Limpeza do histórico de Alívio de Tensão: remove registros sem nota
-- Use no Supabase > SQL Editor se você já carregou a tabela
-- public.historico_alivio_tensao antes desta atualização.
-- =====================================================================

begin;

delete from public.historico_alivio_tensao
where nota is null;

commit;

-- Conferência:
select count(*) as registros_sem_nota_restantes
from public.historico_alivio_tensao
where nota is null;
