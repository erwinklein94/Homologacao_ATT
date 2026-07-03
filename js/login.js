// =====================================================================
// login.js — página inicial (index.html)
// Dois cards: Administrador e Aluno. O aluno pode criar o primeiro acesso
// mesmo sem pré-cadastro do administrador e depois entrar com o mesmo e-mail.
// =====================================================================

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.exigeConfig()) return;
  const areaLogin = window.getAreaEscolhida();
  if (!areaLogin) {
    window.location.replace("index.html");
    return;
  }
  aplicarTextoDaArea(areaLogin);

  // Liga os formulários ANTES de qualquer espera de rede. Assim nunca acontece
  // um envio nativo do formulário (que jogaria e-mail/senha na URL) enquanto o
  // JavaScript ainda está carregando a sessão.
  ligarAbas();
  ligarSenhaVisivel();
  ligarFormAdmin(areaLogin);
  ligarFormAlunoLogin(areaLogin);
  ligarFormAlunoCriar(areaLogin);

  // Se já houver sessão ativa, tenta ir direto para a área certa.
  const sessao = await getSessao();
  if (sessao) await rotaPorPapel({ areaEsperada: areaLogin });
});

// Lê o papel do usuário e redireciona. Admin -> Painel; Aluno -> Prova.
async function rotaPorPapel({ areaEsperada, roleEsperada = null, msgSelector = null } = {}) {
  const perfil = await getPerfil();
  if (!perfil) {
    // A conta autenticou, mas não há linha correspondente em public.profiles
    // (ex.: banco ainda não configurado ou usuário criado antes do gatilho).
    // Encerramos a sessão para o usuário não ficar preso num estado quebrado.
    if (window.sb) await window.sb.auth.signOut();
    console.error(
      "Sessão autenticada sem perfil em public.profiles. " +
      "Rode sql/schema.sql e o backfill de usuários no Supabase."
    );
    const aviso = "Conta autenticada, mas o perfil ainda não existe no banco. " +
      "Fale com o administrador.";
    msg("[data-msg-admin]", "erro", aviso);
    msg("[data-msg-aluno-login]", "erro", aviso);
    return false;
  }
  if (perfil.area !== areaEsperada) {
    if (window.sb) await window.sb.auth.signOut();
    if (window.limparPerfilCache) window.limparPerfilCache();
    const area = window.getAreaMeta(areaEsperada);
    const aviso = `Este login pertence a outra área. Entre com uma conta cadastrada em ${area.titulo}.`;
    msg(msgSelector || "[data-msg-aluno-login]", "erro", aviso);
    msg("[data-msg-admin]", "erro", aviso);
    return false;
  }
  if (roleEsperada && perfil.role !== roleEsperada) {
    if (window.sb) await window.sb.auth.signOut();
    if (window.limparPerfilCache) window.limparPerfilCache();
    const aviso = roleEsperada === "admin"
      ? "Esta conta não é administradora desta área."
      : "Esta conta não é aluno desta área.";
    msg(msgSelector || "[data-msg-aluno-login]", "erro", aviso);
    return false;
  }
  window.setAreaEscolhida(perfil.area);
  window.location.replace(perfil.role === "admin" ? "dashboard.html" : "prova.html");
  return true;
}

function aplicarTextoDaArea(areaId) {
  const area = window.getAreaMeta(areaId);
  document.title = `${area.titulo} · Login · Rumo`;
  const titulo = document.querySelector("[data-area-titulo]");
  const descricao = document.querySelector("[data-area-descricao]");
  const rodape = document.querySelector("[data-area-rodape]");
  const alunoLabel = document.querySelector("[data-label-aluno]");
  if (titulo) titulo.textContent = area.titulo;
  if (descricao) descricao.textContent = area.descricao;
  if (rodape) rodape.textContent = area.rodape;
  if (alunoLabel) alunoLabel.textContent = area.alunoLabel || "Aluno";
}

function ligarAbas() {
  const abas = document.querySelectorAll("[data-tab]");
  abas.forEach((b) => b.addEventListener("click", () => {
    abas.forEach((x) => x.classList.toggle("is-active", x === b));
    const alvo = b.dataset.tab;
    document.querySelectorAll("[data-painel]").forEach((p) =>
      p.classList.toggle("hidden", p.dataset.painel !== alvo));
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

function ligarFormAdmin(areaLogin) {
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
    const ok = await rotaPorPapel({ areaEsperada: areaLogin, roleEsperada: "admin", msgSelector: "[data-msg-admin]" });
    if (!ok) travar(btn, false);
  });
}

function ligarFormAlunoLogin(areaLogin) {
  const f = document.querySelector("[data-form-aluno-login]");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]");
    travar(btn, true, "Entrando…");
    msg("[data-msg-aluno-login]", null);
    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(), password: f.senha.value,
    });
    if (error) { msg("[data-msg-aluno-login]", "erro", traduzErro(error)); travar(btn, false); return; }
    const ok = await rotaPorPapel({ areaEsperada: areaLogin, roleEsperada: "aluno", msgSelector: "[data-msg-aluno-login]" });
    if (!ok) travar(btn, false);
  });
}

function ligarFormAlunoCriar(areaLogin) {
  const f = document.querySelector("[data-form-aluno-criar]");
  const preview = document.querySelector("[data-cadastro-preview]");

  // Consulta o cadastro feito pelo administrador apenas para aproveitar nome e matrícula.
  // Se não existir cadastro prévio, o aluno ainda pode criar o próprio primeiro acesso.
  if (preview && f.email) {
    let t = null;
    f.email.addEventListener("input", () => {
      clearTimeout(t);
      const email = f.email.value.trim();
      preview.textContent = "Digite o e-mail que será usado no acesso.";
      if (!email || !email.includes("@")) return;
      t = setTimeout(async () => {
        const { data, error } = await buscarCadastroAluno(email, areaLogin);
        if (error) {
          console.warn("Cadastro de aluno não consultado:", error.message || error);
          preview.textContent = "Não consultei cadastro prévio, mas você pode criar o primeiro acesso mesmo assim.";
          return;
        }
        if (data) {
          preview.textContent = `Cadastro encontrado: ${data.nome || email}${data.matricula ? " · " + data.matricula : ""}${data.empresa ? " · " + data.empresa : ""}`;
          if (f.elements.nome && !f.elements.nome.value && data.nome) f.elements.nome.value = data.nome;
          if (f.elements.matricula && !f.elements.matricula.value && data.matricula) f.elements.matricula.value = data.matricula;
          if (f.elements.empresa && !f.elements.empresa.value && data.empresa) f.elements.empresa.value = data.empresa;
        } else {
          preview.textContent = "E-mail novo: você pode criar o primeiro acesso como aluno desta área.";
        }
      }, 450);
    });
  }

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg("[data-msg-aluno-criar]", null);
    if (f.senha.value.length < 6) {
      return msg("[data-msg-aluno-criar]", "erro", "A senha precisa ter ao menos 6 caracteres.");
    }
    if (!String(f.elements.empresa?.value || "").trim()) {
      return msg("[data-msg-aluno-criar]", "erro", "Informe a empresa a que você pertence.");
    }
    if (f.senha.value !== f.senha2.value) {
      return msg("[data-msg-aluno-criar]", "erro", "As senhas não conferem.");
    }
    const btn = f.querySelector("button[type=submit]");
    travar(btn, true, "Criando acesso…");

    const email = f.email.value.trim().toLowerCase();
    const cadastro = await buscarCadastroAluno(email, areaLogin);
    if (cadastro.error) {
      // A lista administrada é opcional para este fluxo. Se a RPC/tabela ainda
      // não existir, seguimos com o cadastro aberto do aluno.
      console.warn("Cadastro de aluno não consultado:", cadastro.error.message || cadastro.error);
    }

    const nomeDigitado = (f.elements.nome?.value || "").trim();
    const matriculaDigitada = (f.elements.matricula?.value || "").trim();
    const empresaDigitada = (f.elements.empresa?.value || "").trim();
    const dadosPerfil = {
      nome: cadastro.data?.nome || nomeDigitado || email.split("@")[0],
      matricula: cadastro.data?.matricula || matriculaDigitada || null,
      empresa: cadastro.data?.empresa || empresaDigitada || null,
      criarSeNaoExistir: true,
    };

    const { data, error } = await sb.auth.signUp({
      email,
      password: f.senha.value,
      options: { data: { nome: dadosPerfil.nome, matricula: dadosPerfil.matricula, empresa: dadosPerfil.empresa, area: areaLogin } },
    });

    if (error) {
      // Se o e-mail já existe no Auth, tentamos entrar com a senha informada e
      // criar o perfil desta área como aluno, caso ainda não exista.
      if (emailJaCadastrado(error)) {
        return entrarComEmailExistente(email, f.senha.value, dadosPerfil, areaLogin, btn);
      }

      msg("[data-msg-aluno-criar]", "erro", traduzErro(error));
      travar(btn, false, "Criar primeiro acesso");
      return;
    }

    // Em alguns projetos com confirmação de e-mail ativa, o Supabase não retorna
    // erro para e-mail já existente; ele retorna usuário sem identities.
    if (usuarioJaExisteNoAuth(data)) {
      return entrarComEmailExistente(email, f.senha.value, dadosPerfil, areaLogin, btn);
    }

    if (data.session) {
      // Confirmação de e-mail desativada: já está logado.
      const perfilArea = window.garantirPerfilArea
        ? await window.garantirPerfilArea(areaLogin, dadosPerfil)
        : null;
      if (!perfilArea) {
        msg("[data-msg-aluno-criar]", "erro",
          "A conta foi criada, mas não consegui criar o perfil de aluno no banco. Rode o SQL schema.sql no Supabase e tente entrar novamente.");
        travar(btn, false, "Criar primeiro acesso");
        return;
      }
      const ok = await rotaPorPapel({ areaEsperada: areaLogin, roleEsperada: "aluno", msgSelector: "[data-msg-aluno-criar]" });
      if (!ok) travar(btn, false, "Criar primeiro acesso");
    } else {
      // Confirmação de e-mail ativada: precisa confirmar antes de entrar.
      msg("[data-msg-aluno-criar]", "ok",
        "Acesso criado! Se o Supabase pedir confirmação, confirme pelo e-mail e depois entre na aba “Entrar”.");
      travar(btn, false, "Criar primeiro acesso");
    }
  });
}

async function entrarComEmailExistente(email, senha, dadosPerfil, areaLogin, btn) {
  const login = await sb.auth.signInWithPassword({ email, password: senha });
  if (login.error) {
    msg("[data-msg-aluno-criar]", "erro",
      "Este e-mail já existe. Use a aba “Entrar” ou informe aqui a senha atual desse e-mail para liberar o acesso nesta área.");
    travar(btn, false, "Criar primeiro acesso");
    return;
  }

  if (window.garantirPerfilArea) {
    const perfilArea = await window.garantirPerfilArea(areaLogin, dadosPerfil);
    if (!perfilArea) {
      msg("[data-msg-aluno-criar]", "erro",
        "Entrei com o e-mail, mas não consegui criar o perfil desta área. Rode o SQL schema.sql no Supabase e tente novamente.");
      travar(btn, false, "Criar primeiro acesso");
      return;
    }
  }

  const ok = await rotaPorPapel({ areaEsperada: areaLogin, roleEsperada: "aluno", msgSelector: "[data-msg-aluno-criar]" });
  if (!ok) travar(btn, false, "Criar primeiro acesso");
}

async function buscarCadastroAluno(email, areaLogin) {
  const normalizado = String(email || "").trim().toLowerCase();
  if (!normalizado) return { data: null, error: null };
  const { data, error } = await sb.rpc("buscar_aluno_cadastrado", {
    p_email: normalizado,
    p_area: areaLogin,
  });
  if (error) return { data: null, error };
  const linha = Array.isArray(data) ? (data[0] || null) : data;
  return { data: linha, error: null };
}

// ---- helpers de UI ----
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
function emailJaCadastrado(error) {
  const m = (error && error.message) || "";
  return /already registered|already been registered|user already registered|email.*exists|already exists/i.test(m);
}

function usuarioJaExisteNoAuth(data) {
  const ids = data?.user?.identities;
  return Array.isArray(ids) && ids.length === 0;
}

function traduzErro(error) {
  const m = (error && error.message) || "Erro inesperado.";
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (emailJaCadastrado(error)) return "Este e-mail já tem acesso. Use a aba “Entrar”.";
  if (/email.+confirm/i.test(m)) return "Confirme seu e-mail antes de entrar.";
  if (/rate limit/i.test(m)) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  return m;
}
