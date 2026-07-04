-- =====================================================================
-- [SUBSTITUÍDO] Permitir primeiro acesso criado pelo próprio aluno
--
-- Este script foi SUBSTITUÍDO por sql/atualizacao-seguranca.sql.
--
-- A versão antiga deste arquivo recriava um gatilho que permitia QUALQUER
-- e-mail criar o primeiro acesso (o site é público no GitHub Pages, então
-- qualquer pessoa da internet conseguia criar conta de aluno).
--
-- A regra atual é: o primeiro acesso só funciona para e-mails cadastrados
-- (e ativos) pelo administrador em public.alunos_cadastrados. O gatilho
-- handle_new_user com essa validação está em sql/atualizacao-seguranca.sql.
--
-- NÃO rode a versão antiga deste arquivo. Se você precisa reparar o
-- primeiro acesso, rode (ou re-rode) sql/atualizacao-seguranca.sql —
-- ele é idempotente e pode ser executado mais de uma vez sem problema.
-- =====================================================================

select 'Use sql/atualizacao-seguranca.sql — este script foi substituído.' as aviso;
