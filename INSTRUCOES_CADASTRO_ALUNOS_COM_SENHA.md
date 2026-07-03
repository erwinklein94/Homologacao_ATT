# Cadastro de alunos com senha inicial

Nesta versão, a página **Cadastro de Alunos** permite que o administrador informe:

- nome;
- matrícula;
- e-mail;
- senha inicial;
- status.

A senha não fica salva na tabela `public.alunos_cadastrados`. Ela é enviada para o **Supabase Auth** por uma **Edge Function** chamada `admin-criar-aluno`.

## Por que precisa de Edge Function?

O site está no GitHub Pages, ou seja, roda no navegador. O navegador só pode usar a chave pública do Supabase. Para criar usuário com senha no **Supabase Auth**, é necessário usar a chave secreta `service_role`, que nunca pode ficar no GitHub nem no JavaScript do site.

Por isso o projeto agora inclui:

```text
supabase/functions/admin-criar-aluno/index.ts
```

Essa função fica dentro do Supabase, usa a chave segura do próprio Supabase e só libera a criação se o usuário logado for administrador da área.

## Passo 1 — Rodar o SQL

No Supabase, abra **SQL Editor** e rode:

```text
sql/cadastro-alunos.sql
```

Se você já rodou antes, pode rodar novamente. Ele usa `create table if not exists` e recria as policies necessárias.

## Passo 2 — Publicar a Edge Function

No computador, dentro da pasta do projeto, rode:

```bash
supabase login
supabase link --project-ref zupiomlphokfpuufzyog
supabase functions deploy admin-criar-aluno
```

O `project-ref` acima é o do seu projeto mostrado na URL do Supabase.

## Passo 3 — Subir o site no GitHub Pages

Depois de publicar a function, suba estes arquivos no GitHub:

```text
cadastro-alunos.html
js/cadastro-alunos.js
supabase/functions/admin-criar-aluno/index.ts
```

A pasta `supabase/functions` não é usada pelo GitHub Pages, mas deve ficar no repositório para versionar a função.

## Como testar

1. Entre no site como administrador.
2. Abra **Cadastro de Alunos**.
3. Cadastre um aluno com e-mail e senha inicial.
4. Saia da conta admin.
5. Entre como aluno usando o e-mail e a senha cadastrados.

Se aparecer erro dizendo que a função `admin-criar-aluno` não existe, a Edge Function ainda não foi publicada no Supabase.
