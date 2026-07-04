# Edge Function `admin-criar-aluno`

Esta função permite que o administrador cadastre um aluno e defina uma senha inicial sem expor a `service_role key` no GitHub Pages.

Ela cria/atualiza:

- usuário no Supabase Auth;
- linha em `public.profiles` com `role = 'aluno'`;
- linha em `public.alunos_cadastrados`.

A senha não fica salva no banco; ela é enviada apenas ao Supabase Auth.
