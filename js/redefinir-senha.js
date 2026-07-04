// =====================================================================
// redefinir-senha.js — destino do link "Esqueci minha senha"
// O supabase-js lê o token do link automaticamente (detectSessionInUrl)
// e cria uma sessão temporária de recuperação; aqui só trocamos a senha.
// =====================================================================

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.exigeConfig()) return;

  const aguardando = document.querySelector("[data-aguardando]");
  const form = document.querySelector("[data-form-redefinir]");
  const semSessao = document.querySelector("[data-sem-sessao]");

  ligarSenhaVisivel();

  // Dá tempo do supabase-js processar o token que veio na URL.
  const sessao = await esperarSessaoRecuperacao();
  aguardando.classList.add("hidden");

  if (!sessao) {
    semSessao.classList.remove("hidden");
    return;
  }
  form.classList.remove("hidden");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const senha = form.senha.value;
    const senha2 = form.senha2.value;
    if (senha.length < 6) return msgRedef("erro", "A senha precisa ter ao menos 6 caracteres.");
    if (senha !== senha2) return msgRedef("erro", "As senhas não conferem.");

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Salvando…";

    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) {
      btn.disabled = false; btn.textContent = "Salvar nova senha";
      return msgRedef("erro", error.message || "Não foi possível salvar a nova senha.");
    }

    // Sai da sessão de recuperação e manda para o login normal.
    await sb.auth.signOut();
    msgRedef("ok", "Senha alterada! Redirecionando para o login…");
    setTimeout(() => window.location.replace("login.html"), 1800);
  });
});

// Espera até ~6s pela sessão criada a partir do link de recuperação.
async function esperarSessaoRecuperacao() {
  for (let i = 0; i < 12; i++) {
    const { data } = await sb.auth.getSession();
    if (data.session) return data.session;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function msgRedef(tipo, texto) {
  const el = document.querySelector("[data-msg-redefinir]");
  el.className = "alerta alerta--" + tipo;
  el.style.marginTop = ".8rem";
  el.textContent = texto;
}

function ligarSenhaVisivel() {
  document.querySelectorAll("[data-toggle-password]").forEach((botao) => {
    const input = document.getElementById(botao.dataset.togglePassword);
    if (!input) return;
    botao.addEventListener("click", () => {
      const vaiMostrar = input.type === "password";
      input.type = vaiMostrar ? "text" : "password";
      botao.textContent = vaiMostrar ? "Ocultar" : "Mostrar";
      input.focus({ preventScroll: true });
    });
  });
}
