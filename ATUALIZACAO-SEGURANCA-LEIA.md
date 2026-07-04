# Atualização de segurança — o que mudou e como implantar

## Por que esta atualização

A versão anterior tinha dois problemas graves para um sistema de homologação:

1. **O gabarito ia para o navegador do aluno antes da prova** e a correção era
   feita em JavaScript. Um aluno com o console do navegador aberto via as
   respostas certas — e conseguia até gravar uma tentativa com nota 10 forjada.
2. **Qualquer pessoa da internet criava conta de aluno**: o site é público no
   GitHub Pages e o "Primeiro acesso" não exigia cadastro prévio.

Além disso: a nota era calculada com 2 casas mas exibida com 1 (um 6,96 aparecia
como "7,0" reprovado), um F5 durante a prova perdia todas as respostas, salvar
questões podia deixar a prova vazia se a rede caísse no meio, não havia
"esqueci minha senha" e o código de verificação do certificado não era
verificável em lugar nenhum.

## O que mudou

**Banco (sql/atualizacao-seguranca.sql):**
- `corrigir_prova` — o aluno envia só as respostas; nota, acertos e aprovado
  são calculados no Postgres. Insert direto em `tentativas` foi bloqueado.
- `questoes_da_prova` — devolve as questões **sem** `correta`/`justificativa`;
  o select direto na tabela `questoes` ficou restrito ao administrador.
- `handle_new_user` — **[ATUALIZADO]** o aluno **solicita** o primeiro
  acesso pela tela de login: a solicitação entra em `alunos_cadastrados`
  como **pendente (inativo)** e o aluno só consegue entrar depois que o
  administrador aprovar na página Cadastro de Alunos; e-mail marcado como
  inativo continua bloqueado no servidor (validação não dá para burlar).
- Aluno com cadastro **inativo** não registra prova.
- Nota gravada sempre com **1 casa decimal** (notas antigas normalizadas).
- `codigo_cert` virou coluna real + RPC pública `verificar_certificado`.
- `salvar_prova_completa` — prova + questões salvas em transação única.

**Site:**
- `js/prova.js` — usa as duas RPCs; embaralha também as **alternativas**;
  rascunho no `localStorage` (F5/queda de rede não perde a prova; banner
  "Continuar prova"); instrutor travado na lista de administradores.
- `js/login.js` + `login.html` — **refeitos do zero (v3)**: card de
  administrador e card de aluno com abas **Entrar** e **Solicitar acesso**;
  o login do aluno é barrado enquanto a solicitação não for aprovada;
  botão **Esqueci minha senha** nos dois perfis.
- `js/cadastro-alunos.js` — central única de contas: aprova/recusa
  solicitações, cria e edita contas e promove/rebaixa administradores
  (a página Cadastro de contas foi removida).
- `redefinir-senha.html` — página do link de redefinição.
- `verificar.html` — validação pública do código HSA-XXXXXXXX (aceita
  `?codigo=` na URL; o PDF do certificado agora imprime esse link).
- `js/admin.js` — salvamento e carga de provas padrão via RPC transacional.
- Edge Function `admin-criar-aluno` — grava o cadastro **antes** de criar o
  usuário no Auth (necessário com o gatilho travado) e CORS restringível
  pela secret `ALLOWED_ORIGIN`.

## Checklist de implantação (nesta ordem)

1. **Supabase > SQL Editor**: rode `sql/atualizacao-seguranca.sql`.
   Pode rodar mais de uma vez sem problema (idempotente).
2. **Se você ainda não tem administrador** (ou vai criar outro), siga o
   bloco "BOOTSTRAP DO ADMINISTRADOR" no fim do próprio SQL
   (cadastrar e-mail → primeiro acesso no site → promover a admin).
3. **Republique a Edge Function** `admin-criar-aluno`
   (`supabase functions deploy admin-criar-aluno`). Opcional, recomendado:
   em Edge Functions > Secrets, crie `ALLOWED_ORIGIN` com a URL do site
   (ex.: `https://seuusuario.github.io`).
4. **Supabase > Authentication > URL Configuration**: adicione a URL de
   `redefinir-senha.html` do seu GitHub Pages em **Redirect URLs**
   (ex.: `https://seuusuario.github.io/Homologacao_ATT/redefinir-senha.html`),
   senão o link de "esqueci minha senha" não abre a página certa.
5. **Publique os arquivos do site** (git push para o GitHub Pages).

## Como testar depois de implantar

- Primeiro acesso com um e-mail **não cadastrado** → deve ser recusado com
  mensagem clara (teste também direto pelo console: o servidor bloqueia).
- Fazer uma prova, apertar F5 no meio → banner "Continuar prova" com as
  respostas preservadas.
- Abrir o DevTools durante a prova → nenhuma resposta correta na aba Network.
- Terminar uma prova e validar o código em `verificar.html`.
- "Esqueci minha senha" → e-mail chega e a troca funciona.
- Marcar um aluno como **Inativo** no Cadastro de Alunos → ele não consegue
  mais registrar prova.
