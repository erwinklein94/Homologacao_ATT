-- =====================================================================
-- Permitir a exclusão de contas pela Edge Function admin-excluir-conta
--
-- A função usa a chave service_role, que tinha INSERT/SELECT/UPDATE nas
-- tabelas, mas NÃO tinha DELETE — por isso "Excluir" falhava com
-- "permission denied for table alunos_cadastrados". Este script concede
-- o DELETE que faltava.
--
-- COMO USAR: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Idempotente (grant repetido não causa erro).
-- =====================================================================

grant delete on public.alunos_cadastrados to service_role;
grant delete on public.profiles          to service_role;
grant delete on public.tentativas        to service_role;
