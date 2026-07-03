// =====================================================================
// cadastro-contas.js — controle administrativo de contas
// Lista administradores e alunos, cria novas contas de aluno e permite
// promover/rebaixar perfis na área atual do sistema.
// =====================================================================

const contas = {
  perfil: null,
  usuarios: [],
  busca: "",
};

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina({ requerAdmin: true });
  if (!perfil) return;
  contas.perfil = perfil;
  await carregarContas();
  renderCadastroContas();
});

async function carregarContas() {
  const { data, error } = await sb
    .from("profiles")
    .select("id, nome, matricula, email, empresa, role, area, criado_em")
    .eq("area", contas.perfil.area)
    .order("role", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    contas.usuarios = [];
    return { error };
  }

  contas.usuarios = (data || []).map((u) => ({
    ...u,
    email: u.email || "",
    empresa: u.empresa || "",
  }));
  return { error: null };
}

function renderCadastroContas() {
  const host = document.querySelector("[data-cadastro-contas]");
  const admins = contas.usuarios.filter((u) => u.role === "admin");
  const alunos = contas.usuarios.filter((u) => u.role === "aluno");

  host.innerHTML = `
    <div class="kpis" style="margin-bottom:1.2rem">
      <div class="kpi"><div class="kpi__label">Contas cadastradas</div><div class="kpi__value">${contas.usuarios.length}</div></div>
      <div class="kpi"><div class="kpi__label">Administradores</div><div class="kpi__value">${admins.length}</div></div>
      <div class="kpi kpi--verde"><div class="kpi__label">Alunos</div><div class="kpi__value">${alunos.length}</div></div>
    </div>

    <div class="card card--chanfro stack" style="margin-bottom:1.2rem">
      <div>
        <h2 style="margin-bottom:.25rem">Criar nova conta de aluno</h2>
        <p class="muted" style="margin:0">
          Crie uma conta de aluno com e-mail, senha inicial e empresa. Depois, se necessário, promova esse usuário para administrador nas tabelas abaixo.
        </p>
        <p class="muted small" style="margin:.35rem 0 0">
          A senha é enviada ao Supabase Auth e não fica salva no banco. Para funcionar, publique/atualize a Edge Function <code>admin-criar-aluno</code> deste projeto.
        </p>
      </div>

      <form data-form-criar-conta novalidate>
        <div class="row">
          <div class="field" style="flex:2;min-width:240px">
            <label for="conta-nome">Nome completo</label>
            <input id="conta-nome" class="input" name="nome" required placeholder="Nome do aluno" />
          </div>
          <div class="field" style="min-width:170px">
            <label for="conta-matricula">Matrícula</label>
            <input id="conta-matricula" class="input" name="matricula" placeholder="Ex.: TR061052" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:2;min-width:240px">
            <label for="conta-email">E-mail</label>
            <input id="conta-email" class="input" type="email" name="email" required placeholder="aluno@empresa.com" />
          </div>
          <div class="field" style="flex:1;min-width:220px">
            <label for="conta-empresa">Empresa</label>
            <input id="conta-empresa" class="input" name="empresa" required placeholder="Ex.: Rumo, COTRIN, TRILL" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1;min-width:220px">
            <label for="conta-senha">Senha inicial</label>
            <input id="conta-senha" class="input" type="password" name="senha" autocomplete="new-password" required placeholder="Mínimo 6 caracteres" />
          </div>
          <div class="field" style="flex:1;min-width:220px">
            <label for="conta-senha2">Confirmar senha</label>
            <input id="conta-senha2" class="input" type="password" name="senha2" autocomplete="new-password" required placeholder="Repita a senha" />
          </div>
        </div>
        <div class="toolbar">
          <button class="btn btn--success" type="submit" data-btn-criar-conta>Salvar aluno e criar acesso</button>
          <span class="spacer"></span>
          <span class="muted small" data-status-form></span>
        </div>
      </form>
    </div>

    <div class="card stack" style="margin-bottom:1.2rem">
      <div class="toolbar">
        <h2 style="margin:0">Perfis dos usuários</h2>
        <span class="spacer"></span>
        <div class="field" style="margin:0;min-width:320px">
          <label for="busca-conta">Buscar</label>
          <input id="busca-conta" class="input" data-busca-conta placeholder="Nome, e-mail, matrícula ou empresa…" />
        </div>
      </div>
    </div>

    <div class="card stack" style="margin-bottom:1.2rem">
      <div class="toolbar">
        <h2 style="margin:0">Administradores</h2>
        <span class="badge badge--ok badge--dot">${admins.length} conta(s)</span>
      </div>
      <div data-tabela-admins></div>
    </div>

    <div class="card stack">
      <div class="toolbar">
        <h2 style="margin:0">Alunos</h2>
        <span class="badge badge--dot">${alunos.length} conta(s)</span>
      </div>
      <div data-tabela-alunos></div>
    </div>`;

  const form = host.querySelector("[data-form-criar-conta]");
  form.addEventListener("submit", criarContaAluno);

  const busca = host.querySelector("[data-busca-conta]");
  busca.value = contas.busca;
  busca.addEventListener("input", () => {
    contas.busca = busca.value.trim().toLowerCase();
    desenharTabelasContas();
  });

  desenharTabelasContas();
}

function desenharTabelasContas() {
  const busca = contas.busca;
  const filtrar = (u) => {
    if (!busca) return true;
    const alvo = `${u.nome || ""} ${u.email || ""} ${u.matricula || ""} ${u.empresa || ""}`.toLowerCase();
    return alvo.includes(busca);
  };

  desenharTabela("[data-tabela-admins]", contas.usuarios.filter((u) => u.role === "admin" && filtrar(u)), "admin");
  desenharTabela("[data-tabela-alunos]", contas.usuarios.filter((u) => u.role === "aluno" && filtrar(u)), "aluno");
}

function desenharTabela(selector, linhas, tipo) {
  const host = document.querySelector(selector);
  if (!host) return;

  if (linhas.length === 0) {
    host.innerHTML = `<p class="muted center" style="padding:1.4rem 0">Nenhuma conta encontrada.</p>`;
    return;
  }

  const corpo = linhas.map((u) => {
    const papel = u.role === "admin"
      ? '<span class="badge-role badge-role--admin">Administrador</span>'
      : '<span class="badge-role">Aluno</span>';
    const acao = u.role === "admin"
      ? (u.id === contas.perfil.id
        ? '<span class="muted small">Conta atual</span>'
        : `<button class="btn btn--ghost btn--sm" data-rebaixar="${u.id}">Rebaixar para aluno</button>`)
      : `<button class="btn btn--success btn--sm" data-promover="${u.id}">Promover para admin</button>`;

    return `<tr>
      <td><b>${escaparHtml(u.nome || "—")}</b></td>
      <td>${escaparHtml(u.email || "—")}</td>
      <td class="nowrap">${escaparHtml(u.matricula || "—")}</td>
      <td>${escaparHtml(u.empresa || "—")}</td>
      <td>${papel}</td>
      <td class="nowrap">${fmtData(u.criado_em)}</td>
      <td class="nowrap">${acao}</td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <p class="muted small" style="margin:.2rem 0 .6rem">${linhas.length} conta(s)</p>
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Nome</th><th>E-mail</th><th>Matrícula</th><th>Empresa</th><th>Perfil</th><th>Criado em</th><th>Ações</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;

  host.querySelectorAll("[data-promover]").forEach((b) =>
    b.addEventListener("click", () => alterarPerfil(b.dataset.promover, "admin")));
  host.querySelectorAll("[data-rebaixar]").forEach((b) =>
    b.addEventListener("click", () => alterarPerfil(b.dataset.rebaixar, "aluno")));
}

async function criarContaAluno(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector("[data-btn-criar-conta]");
  const status = form.querySelector("[data-status-form]");

  const nome = form.nome.value.trim();
  const matricula = form.matricula.value.trim() || null;
  const email = form.email.value.trim();
  const empresa = form.empresa.value.trim();
  const senha = form.senha.value || "";
  const senha2 = form.senha2.value || "";

  if (!nome) { status.textContent = "Informe o nome do aluno."; form.nome.focus(); return; }
  if (!email || !email.includes("@")) { status.textContent = "Informe um e-mail válido."; form.email.focus(); return; }
  if (!empresa) { status.textContent = "Informe a empresa do aluno."; form.empresa.focus(); return; }
  if (senha.length < 6) { status.textContent = "Informe uma senha inicial com pelo menos 6 caracteres."; form.senha.focus(); return; }
  if (senha !== senha2) { status.textContent = "As senhas não conferem."; form.senha2.focus(); return; }

  travarBtn(btn, true, "Criando acesso…");
  status.textContent = "";

  const resposta = await chamarFuncaoAdminCriarAluno({
    area: contas.perfil.area,
    nome,
    matricula,
    email,
    empresa,
    senha,
    ativo: true,
  });

  if (resposta.error) {
    console.error(resposta.error);
    status.textContent = resposta.error;
    travarBtn(btn, false, "Salvar aluno e criar acesso");
    return;
  }

  form.reset();
  status.textContent = resposta.data?.message || "Conta criada/atualizada com sucesso.";
  await carregarContas();
  renderCadastroContas();
}

async function alterarPerfil(id, novoRole) {
  const usuario = contas.usuarios.find((u) => u.id === id);
  if (!usuario) return;

  if (id === contas.perfil.id && novoRole !== "admin") {
    alert("Você não pode rebaixar a própria conta enquanto está logado como administrador.");
    return;
  }

  const frase = novoRole === "admin"
    ? `Promover ${usuario.nome || usuario.email} para administrador?`
    : `Rebaixar ${usuario.nome || usuario.email} para aluno?`;
  if (!confirm(frase)) return;

  const { error } = await sb
    .from("profiles")
    .update({ role: novoRole })
    .eq("id", id)
    .eq("area", contas.perfil.area);

  if (error) {
    alert("Não consegui alterar o perfil: " + error.message);
    return;
  }

  await carregarContas();
  renderCadastroContas();
}

async function chamarFuncaoAdminCriarAluno(payload) {
  try {
    const { data, error } = await sb.functions.invoke("admin-criar-aluno", { body: payload });

    if (error) {
      let detalhe = error.message || "Erro ao chamar a função admin-criar-aluno.";
      if (error.context && typeof error.context.json === "function") {
        try {
          const corpo = await error.context.json();
          detalhe = corpo?.error || corpo?.message || detalhe;
        } catch (_) { /* ignora */ }
      }
      return { error: detalhe };
    }

    if (!data || data.ok !== true) {
      return { error: data?.error || "A função admin-criar-aluno não confirmou o cadastro." };
    }

    return { data };
  } catch (err) {
    return {
      error:
        "Não consegui criar o acesso no Supabase Auth. Confira se a Edge Function admin-criar-aluno foi publicada no Supabase. Detalhe: " +
        (err?.message || String(err)),
    };
  }
}

function travarBtn(btn, on, txt) {
  if (!btn) return;
  if (!btn.dataset.textoOriginal) btn.dataset.textoOriginal = btn.textContent;
  btn.disabled = on;
  btn.textContent = txt || (on ? btn.textContent : btn.dataset.textoOriginal);
}
