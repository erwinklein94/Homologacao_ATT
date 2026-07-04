// =====================================================================
// login.js — autenticação (refeito do zero)
// Administrador: entra com e-mail e senha e vai para o Painel.
// Aluno: solicita o primeiro acesso (nome, matrícula, e-mail e senha);
// a solicitação fica pendente até o administrador aprovar na página
// Cadastro de Alunos. Só depois da aprovação o aluno consegue entrar.
// A trava de aprovação é validada no servidor (RPC email_autorizado e
// bloqueio em corrigir_prova) — o front apenas antecipa a mensagem.
// =====================================================================

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.exigeConfig()) return;
  const area = window.getAreaEscolhida();
  aplicarTextoDaArea(area);

  // Liga os formulários antes de qualquer espera de rede, para nunca
  // acontecer um envio nativo (que jogaria e-mail/senha na URL).
  ligarAbas();
  ligarSenhaVisivel();
  ligarEsqueciSenha();
  ligarFormAdmin(area);
  ligarFormAluno(area);
  ligarFormSolicitar(area);

  // Sessão já ativa (ex.: F5 na página de login): segue para a página certa.
  const sessao = await getSessao();
  if (sessao) await encaminharLogado(area, null);
});

// ------------------------------------------------------------- roteamento
// Decide o destino de uma sessão autenticada. Devolve false quando a
// sessão foi encerrada (perfil ausente, papel errado ou aluno pendente).
async function encaminharLogado(area, msgSelector) {
  const perfil = await getPerfil();
  if (!perfil) {
    await encerrarSessao();
    if (msgSelector) {
      msg(msgSelector, "erro", "Conta autenticada, mas sem perfil nesta área. Fale com o administrador.");
    }
    return false;
  }

  if (perfil.role === "admin") {
    window.location.replace("dashboard.html");
    return true;
  }

  if (await alunoAprovado(area)) {
    window.location.replace("prova.html");
    return true;
  }

  await encerrarSessao();
  msg(msgSelector || "[data-msg-aluno]", "aviso",
    "Sua solicitação de acesso ainda não foi aprovada. Avise o administrador e tente novamente depois da aprovação.");
  return false;
}

// O cadastro do aluno está aprovado (ativo) na lista do administrador?
// Se a consulta falhar, deixa passar: o servidor ainda bloqueia a prova.
async function alunoAprovado(area) {
  const { data, error } = await sb.rpc("email_autorizado", { area_alvo: area });
  if (error) {
    console.warn("Não consegui verificar a aprovação do cadastro:", error.message);
    return true;
  }
  return data === true;
}

async function encerrarSessao() {
  if (window.sb) await window.sb.auth.signOut();
  if (window.limparPerfilCache) window.limparPerfilCache();
}

// ------------------------------------------------------------ formulários
function ligarFormAdmin(area) {
  const f = document.querySelector("[data-form-admin]");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]");
    travar(btn, true, "Entrando…");
    msg("[data-msg-admin]", null);

    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(), password: f.senha.value,
    });
    if (error) { msg("[data-msg-admin]", "erro", traduzErro(error)); travar(btn, false); return; }

    const perfil = await getPerfil();
    if (!perfil) {
      await encerrarSessao();
      msg("[data-msg-admin]", "erro", "Conta autenticada, mas sem perfil nesta área. Fale com o administrador.");
      travar(btn, false);
      return;
    }
    if (perfil.role !== "admin") {
      await encerrarSessao();
      msg("[data-msg-admin]", "erro", "Esta conta não é de administrador. Use o card Aluno ao lado.");
      travar(btn, false);
      return;
    }
    window.location.replace("dashboard.html");
  });
}

function ligarFormAluno(area) {
  const f = document.querySelector("[data-form-aluno]");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]");
    travar(btn, true, "Entrando…");
    msg("[data-msg-aluno]", null);

    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(), password: f.senha.value,
    });
    if (error) { msg("[data-msg-aluno]", "erro", traduzErro(error)); travar(btn, false); return; }

    const perfil = await getPerfil();
    if (!perfil) {
      await encerrarSessao();
      msg("[data-msg-aluno]", "erro", "Conta autenticada, mas sem perfil nesta área. Fale com o administrador.");
      travar(btn, false);
      return;
    }
    if (perfil.role === "admin") {
      await encerrarSessao();
      msg("[data-msg-aluno]", "erro", "Esta conta é de administrador. Use o card Administrador ao lado.");
      travar(btn, false);
      return;
    }
    if (!(await alunoAprovado(area))) {
      await encerrarSessao();
      msg("[data-msg-aluno]", "aviso",
        "Sua solicitação de acesso ainda não foi aprovada pelo administrador. Tente novamente depois da aprovação.");
      travar(btn, false);
      return;
    }
    window.location.replace("prova.html");
  });
}

function ligarFormSolicitar(area) {
  const f = document.querySelector("[data-form-solicitar]");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg("[data-msg-solicitar]", null);

    const nome = f.nome.value.trim();
    const matricula = f.matricula.value.trim() || null;
    const email = f.email.value.trim().toLowerCase();

    if (!nome) { f.nome.focus(); return msg("[data-msg-solicitar]", "erro", "Informe seu nome completo — o administrador usa esse nome para aprovar."); }
    if (!email || !email.includes("@")) { f.email.focus(); return msg("[data-msg-solicitar]", "erro", "Informe um e-mail válido."); }
    if (f.senha.value.length < 6) { f.senha.focus(); return msg("[data-msg-solicitar]", "erro", "A senha precisa ter ao menos 6 caracteres."); }
    if (f.senha.value !== f.senha2.value) { f.senha2.focus(); return msg("[data-msg-solicitar]", "erro", "As senhas não conferem."); }

    const btn = f.querySelector("button[type=submit]");
    travar(btn, true, "Enviando solicitação…");

    // O signUp cria a conta no Auth; o gatilho handle_new_user (banco)
    // registra a solicitação como PENDENTE em alunos_cadastrados.
    const { data, error } = await sb.auth.signUp({
      email,
      password: f.senha.value,
      options: { data: { nome, matricula, area } },
    });

    if (error) {
      msg("[data-msg-solicitar]", "erro", traduzErro(error));
      travar(btn, false);
      return;
    }
    if (contaJaExistia(data)) {
      msg("[data-msg-solicitar]", "erro",
        "Este e-mail já tem uma conta ou solicitação em andamento. Use a aba Entrar — se esqueceu a senha, use “Esqueci minha senha”.");
      travar(btn, false);
      return;
    }

    // A solicitação não dá acesso: encerra qualquer sessão criada pelo signUp.
    await encerrarSessao();
    f.reset();
    travar(btn, false);
    msg("[data-msg-solicitar]", "ok",
      "Solicitação enviada! Avise o administrador para aprovar seu acesso. Depois da aprovação, entre na aba Entrar com seu e-mail e senha.");
  });
}

// ---- Esqueci minha senha ----
// Botões [data-esqueci="idDoInputDeEmail"] com data-msg="seletorDaMsg".
function ligarEsqueciSenha() {
  document.querySelectorAll("[data-esqueci]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const input = document.getElementById(botao.dataset.esqueci);
      const alvoMsg = botao.dataset.msg || "[data-msg-aluno]";
      const email = (input?.value || "").trim();
      if (!email || !email.includes("@")) {
        msg(alvoMsg, "erro", "Digite seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.");
        if (input) input.focus();
        return;
      }
      botao.disabled = true;
      const redirectTo = new URL("redefinir-senha.html", window.location.href).href;
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      botao.disabled = false;
      if (error) { msg(alvoMsg, "erro", traduzErro(error)); return; }
      msg(alvoMsg, "ok", "Se este e-mail tiver acesso, enviamos um link de redefinição de senha. Abra o e-mail e siga o link.");
    });
  });
}

// ------------------------------------------------------------- UI helpers
function aplicarTextoDaArea(areaId) {
  const area = window.getAreaMeta(areaId);
  document.title = `${area.titulo} · Login · Rumo`;
  const titulo = document.querySelector("[data-area-titulo]");
  const descricao = document.querySelector("[data-area-descricao]");
  const rodape = document.querySelector("[data-area-rodape]");
  const alunoLabel = document.querySelector("[data-label-aluno]");
  if (titulo) titulo.textContent = area.titulo;
  if (descricao) descricao.textContent = area.descricao;
  if (rodape) rodape.textContent = (area.rodape || "") + " · v3";
  if (alunoLabel) alunoLabel.textContent = area.alunoLabel || "Aluno";
}

function ligarAbas() {
  const abas = document.querySelectorAll("[data-tab]");
  abas.forEach((b) => b.addEventListener("click", () => {
    abas.forEach((x) => x.classList.toggle("is-active", x === b));
    document.querySelectorAll("[data-painel]").forEach((p) =>
      p.classList.toggle("hidden", p.dataset.painel !== b.dataset.tab));
  }));
}

function ligarSenhaVisivel() {
  document.querySelectorAll("[data-toggle-password]").forEach((botao) => {
    const input = document.getElementById(botao.dataset.togglePassword);
    if (!input) return;
    botao.addEventListener("click", () => {
      const vaiMostrar = input.type === "password";
      input.type = vaiMostrar ? "text" : "password";
      botao.textContent = vaiMostrar ? "Ocultar" : "Mostrar";
      botao.setAttribute("aria-label", vaiMostrar ? "Ocultar senha" : "Mostrar senha");
      input.focus({ preventScroll: true });
    });
  });
}

function travar(btn, on, txt) {
  if (!btn) return;
  if (!btn.dataset.textoOriginal) btn.dataset.textoOriginal = btn.textContent;
  btn.disabled = on;
  btn.textContent = txt || (on ? btn.textContent : btn.dataset.textoOriginal);
}

function msg(sel, tipo, texto) {
  const el = document.querySelector(sel);
  if (!el) return;
  if (!tipo) { el.className = "hidden"; el.textContent = ""; return; }
  el.className = "alerta alerta--" + tipo;
  el.style.marginTop = ".8rem";
  el.textContent = texto;
}

// Com confirmação de e-mail ativa, o Supabase não devolve erro para e-mail
// repetido no signUp: devolve um usuário sem identities.
function contaJaExistia(data) {
  const ids = data?.user?.identities;
  return Array.isArray(ids) && ids.length === 0;
}

function traduzErro(error) {
  const m = (error && error.message) || "Erro inesperado.";
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered|already been registered|user already registered|already exists/i.test(m)) {
    return "Este e-mail já tem uma conta ou solicitação em andamento. Use a aba Entrar.";
  }
  if (/email.+confirm/i.test(m)) return "Confirme seu e-mail antes de entrar.";
  if (/rate limit/i.test(m)) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  // O gatilho handle_new_user recusa e-mail marcado como inativo; o Supabase
  // devolve isso como "Database error saving new user".
  if (/cadastro está inativo|database error saving new user/i.test(m)) {
    return "Este e-mail está bloqueado pelo administrador. Procure o especialista responsável.";
  }
  return m;
}
