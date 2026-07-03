# Cadastro de contas

Esta versão troca a página **Cadastro de Alunos** por **Cadastro de contas**.

## O que mudou

- O menu do administrador agora mostra **Cadastro de contas**.
- A página lista os usuários em duas tabelas:
  - **Administradores**
  - **Alunos**
- O administrador pode promover aluno para administrador.
- O administrador pode rebaixar outro administrador para aluno.
- A criação de nova conta de aluno agora pede **Empresa**.
- O primeiro acesso do aluno também pede **Empresa**.
- As tentativas de prova passam a salvar matrícula e empresa para uso em filtros futuros.

## SQL obrigatório

Antes de usar a nova tela, rode no Supabase SQL Editor:

```sql
sql/cadastro-contas.sql
```

Esse SQL adiciona as colunas necessárias em `profiles`, `alunos_cadastrados` e `tentativas`, atualiza a função `buscar_aluno_cadastrado` e libera as permissões de leitura/edição dos perfis para administradores.

## Edge Function obrigatória

Atualize também a Edge Function:

```text
supabase/functions/admin-criar-aluno/index.ts
```

Ela agora recebe e salva o campo `empresa` no Supabase Auth, em `profiles` e em `alunos_cadastrados`.
