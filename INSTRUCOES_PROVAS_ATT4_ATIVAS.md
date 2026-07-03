# Como ativar as provas ATT 4 no Supabase

Este pacote já contém as 2 provas ATT 4 configuradas no arquivo `js/seed-data.js`.

Para gravar as provas de verdade no banco do Supabase, rode este SQL:

```text
sql/seed-provas-alivio-tensao.sql
```

O script faz o seguinte:

1. Cria a coluna `subarea` nas tabelas `provas` e `tentativas`, caso ela ainda não exista.
2. Classifica as provas de ATT como `alivio_termico`.
3. Cria ou atualiza as provas `ATT4-1` e `ATT4-2`.
4. Deixa as duas provas como `ativo = true`.
5. Substitui as questões dessas duas provas pelo conteúdo extraído das planilhas anexadas.
6. Não apaga o histórico de tentativas já realizadas.

Depois de rodar, entre no site como administrador e acesse:

**Dados & provas > Editar provas**

As provas devem aparecer como:

- `Prova ATT 4 — Parte 1` — 10 questões — Ativa
- `Prova ATT 4 — Parte 2` — 10 questões — Ativa

