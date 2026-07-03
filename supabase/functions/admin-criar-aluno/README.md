# Edge Function `admin-criar-aluno`

Esta função permite que o administrador cadastre uma conta de aluno e defina uma senha inicial sem expor a `service_role key` no GitHub Pages.

Ela cria/atualiza:

- usuário no Supabase Auth;
- linha em `public.profiles`, preservando `role = 'admin'` se o usuário já for administrador;
- linha em `public.alunos_cadastrados`;
- campo `empresa`, usado nos filtros e relatórios futuros.

A senha não fica salva no banco; ela é enviada apenas ao Supabase Auth.
