# Homologação Alívio de Tensão — Rumo

Site estático (HTML + CSS + JavaScript puro) para especialistas da **Rumo** aplicarem provas
de homologação em **Alívio de Tensão**, dividido em **4 treinamentos**:

- **Alívio de tensão térmica** (inclui as provas ATT 4 e o histórico da planilha)
- **Prospecção de trilhos**
- **Operação com verse**
- **Temperaturas neutras**

O aluno só é homologado com **nota 7,0 ou mais**. Ao final da prova é gerado um
**certificado em PDF**. Backend em **Supabase** (autenticação + banco Postgres + RLS).
Roda no **GitHub Pages** sem nenhuma etapa de build.

> **Repositório dedicado.** A Homologação de **Solda** vive em OUTRO repositório, com OUTRO
> projeto Supabase. Nada aqui acessa ou mistura dados daquela área.

---

## 1. O que cada perfil enxerga

**Administrador** (o especialista)
- O **menu superior** tem 4 botões — um por treinamento. O treinamento selecionado define
  o que o Painel, o Histórico e o editor de provas mostram.
- **Painel** (`dashboard.html`): KPIs, gráficos e filtros do treinamento selecionado.
- **Dados & provas** (`admin.html`): atividades dos alunos, **Histórico** (planilha legada +
  provas do sistema) e o **editor de provas e questões** — tudo do treinamento selecionado.
- Pode também aplicar/pré-visualizar uma prova.

**Aluno**
- **Fazer prova** (`prova.html`): as provas aparecem agrupadas por treinamento; cada
  tentativa registra o treinamento da prova. Baixa o certificado ao final.
- **Meu perfil** (`perfil.html`): seu histórico de provas e certificados.
- O aluno **nunca vê** as páginas de administrador (nem link para elas).

---

## 2. Estrutura dos arquivos

```
index.html        Redireciona para o login (site de área única)
login.html        Login e primeiro acesso
prova.html        Execução da prova + resultado + PDF
perfil.html       Histórico do aluno
admin.html        Atividades + histórico + editor de provas (somente admin)
dashboard.html    Gráficos de desempenho (somente admin)
css/rumo.css      Identidade visual da Rumo
js/config.js      URL e chave publishable do projeto Supabase de Alívio de Tensão
js/app.js         Sessão, perfil, guardas, cabeçalho e menu dos 4 treinamentos
js/login.js       Lógica do login e do primeiro acesso
js/prova.js       Execução e correção da prova
js/perfil.js      Histórico do aluno
js/admin.js       Atividades + histórico + editor de questões + carga das provas
js/dashboard.js   KPIs, filtros e gráficos (Chart.js)
js/certificado.js Geração do certificado em PDF (jsPDF)
js/seed-data.js   As 2 provas ATT 4 padrão (botão "Carregar provas padrão")
js/historico-alivio-tensao.js  Snapshot local do histórico da planilha (reserva)
sql/schema.sql    Tabelas, papéis, RLS e gatilhos
sql/subareas-alivio-tensao.sql       Cria os 4 treinamentos (colunas subarea)
sql/historico-alivio-tensao.sql      Tabela + dados do histórico da planilha (ATT)
sql/seed-provas-alivio-tensao.sql    As 2 provas ATT 4 em SQL (alternativa ao botão)
sql/limpeza-historico-alivio-sem-nota.sql  Utilitário: remove registros legados sem nota
```

As bibliotecas externas (Supabase, Chart.js, jsPDF) são carregadas por CDN — não há
`npm install` nem passo de compilação.

---

## 3. Preparar o Supabase (projeto novo — rodar UMA vez)

Este repositório usa o projeto **`zupiomlphokfpuufzyog`**, já configurado em `js/config.js`.
No **SQL Editor** do projeto, rode nesta ordem:

1. `sql/schema.sql` — tabelas, RLS e gatilhos;
2. `sql/subareas-alivio-tensao.sql` — cria os 4 treinamentos;
3. `sql/historico-alivio-tensao.sql` — tabela e dados do histórico da planilha (ATT);
4. (opcional) `sql/seed-provas-alivio-tensao.sql` — ou use o botão
   "Carregar provas padrão" no site, logado como admin no treinamento
   *Alívio de tensão térmica*.

Depois, em **Authentication → Providers → Email**, desative **"Confirm email"**
(recomendado, para o primeiro acesso ser imediato).

**As contas do projeto antigo não migram.** Alunos e administradores precisam fazer
**Primeiro acesso** de novo neste site.

> A chave **publishable** é pública por natureza — pode ficar no navegador e no repositório.
> Quem protege os dados é o **RLS**, configurado no `schema.sql`. **Nunca** use aqui a chave
> `sb_secret_...` (nem a antiga `service_role`): elas ignoram o RLS.

---

## 4. Criar o administrador

Não existe tela de "criar admin" (de propósito). O fluxo é:

1. No site, use **Primeiro acesso** com o e-mail que será do administrador.
2. No Supabase, em **SQL Editor**, rode (trocando pelo e-mail usado):

```sql
insert into public.profiles (id, nome, matricula, area, role)
select id, split_part(email, '@', 1), null, 'alivio_tensao', 'admin'
from auth.users
where lower(email) = lower('voce@rumolog.com')
on conflict (id, area) do update set role = 'admin';
```

---

## 5. Publicar no GitHub Pages

Repositório → **Settings → Pages** → Branch `main`, pasta `/ (root)`. O arquivo `.nojekyll`
já está incluído. Lembre que o `js/config.js` com a chave publishable ficará visível no
repositório — isso é esperado e seguro (ver seção 3).

