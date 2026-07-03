// =====================================================================
// cadastro-alunos.js — cadastro administrativo de alunos autorizados
// O administrador cadastra nome, matrícula, e-mail e senha inicial.
// A senha é usada apenas para criar/atualizar o usuário no Supabase Auth;
// ela NÃO fica salva na tabela public.alunos_cadastrados.
// =====================================================================

const cad = {
  perfil: null,
  alunos: [],
  editandoId: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina({ requerAdmin: true });
  if (!perfil) return;
  cad.perfil = perfil;
  await carregarAlunos();
  renderCadastroAlunos();
});

async function carregarAlunos() {
  const { data, error } = await sb
    .from("alunos_cadastrados")
    .select("id, area, nome, matricula, email, email_normalizado, ativo, criado_em, atualizado_em")
    .eq("area", cad.perfil.area)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    cad.alunos = [];
    return { error };
  }
  cad.alunos = data || [];
  return { error: null };
}

function renderCadastroAlunos() {
  const host = document.querySelector("[data-cadastro-alunos]");
  const total = cad.alunos.length;
  const ativos = cad.alunos.filter((a) => a.ativo).length;
  const inativos = total - ativos;

  host.innerHTML = `
    <div class="kpis" style="margin-bottom:1.2rem">
      <div class="kpi"><div class="kpi__label">Alunos cadastrados</div><div class="kpi__value">${total}</div></div>
      <div class="kpi kpi--verde"><div class="kpi__label">Ativos</div><div class="kpi__value">${ativos}</div></div>
      <div class="kpi"><div class="kpi__label">Inativos</div><div class="kpi__value">${inativos}</div></div>
    </div>

    <div class="card card--chanfro stack" style="margin-bottom:1.2rem">
      <div>
        <h2 style="margin-bottom:.25rem" data-form-titulo>Novo aluno</h2>
        <p class="muted" style="margin:0">
          Cadastre o aluno e defina uma senha inicial. Depois ele já poderá entrar pela aba <b>Entrar como aluno</b> usando esse e-mail e senha.
        </p>
        <p class="muted small" style="margin:.35rem 0 0">
          A senha é enviada ao Supabase Auth e não fica salva na tabela de cadastro.
          Para isso funcionar, publique a Edge Function <code>admin-criar-aluno</code> incluída neste projeto.
        </p>
      </div>

      <form data-form-cadastro-aluno novalidate>
        <div class="row">
          <div class="field" style="flex:2;min-width:240px">
            <label for="cad-nome">Nome completo</label>
            <input id="cad-nome" class="input" name="nome" required placeholder="Nome do aluno" />
          </div>
          <div class="field" style="min-width:170px">
            <label for="cad-matricula">Matrícula</label>
            <input id="cad-matricula" class="input" name="matricula" placeholder="Ex.: TR061052" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:2;min-width:240px">
            <label for="cad-email">E-mail</label>
            <input id="cad-email" class="input" type="email" name="email" required placeholder="aluno@rumolog.com" />
            <div class="field__hint" data-hint-email></div>
          </div>
          <div class="field" style="min-width:160px">
            <label for="cad-status">Status</label>
            <select id="cad-status" class="select" name="ativo">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1;min-width:220px">
            <label for="cad-senha">Senha inicial</label>
            <input id="cad-senha" class="input" type="password" name="senha" autocomplete="new-password" placeholder="Mínimo 6 caracteres" />
            <div class="field__hint" data-hint-senha>Obrigatória para novo aluno. Em edição, preencha apenas se quiser trocar a senha.</div>
          </div>
          <div class="field" style="flex:1;min-width:220px">
            <label for="cad-senha2">Confirmar senha</label>
            <input id="cad-senha2" class="input" type="password" name="senha2" autocomplete="new-password" placeholder="Repita a senha" />
          </div>
        </div>
        <div class="toolbar">
          <button class="btn btn--success" type="submit" data-btn-salvar>Salvar aluno e criar acesso</button>
          <button class="btn btn--ghost hidden" type="button" data-btn-cancelar>Cancelar edição</button>
          <span class="spacer"></span>
          <span class="muted small" data-status-form></span>
        </div>
      </form>
    </div>

    <div class="card stack">
      <div class="toolbar">
        <h2 style="margin:0">Lista de alunos</h2>
        <span class="spacer"></span>
        <div class="field" style="margin:0;min-width:260px">
          <label for="busca-aluno">Buscar</label>
          <input id="busca-aluno" class="input" data-busca-aluno placeholder="Nome, matrícula ou e-mail…" />
        </div>
        <div class="field" style="margin:0;min-width:150px">
          <label for="filtro-status">Status</label>
          <select id="filtro-status" class="select" data-filtro-status>
            <option value="">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>
      <div data-tabela-alunos></div>
    </div>`;

  const form = host.querySelector("[data-form-cadastro-aluno]");
  form.addEventListener("submit", salvarAluno);
  host.querySelector("[data-btn-cancelar]").addEventListener("click", limparFormulario);

  const aplicar = () => desenharTabelaAlunos(
    host.querySelector("[data-busca-aluno]").value.trim().toLowerCase(),
    host.querySelector("[data-filtro-status]").value
  );
  host.querySelector("[data-busca-aluno]").addEventListener("input", aplicar);
  host.querySelector("[data-filtro-status]").addEventListener("change", aplicar);
  aplicar();
}

function desenharTabelaAlunos(busca, filtroStatus) {
  const host = document.querySelector("[data-tabela-alunos]");
  let linhas = cad.alunos.filter((a) => {
    const alvo = `${a.nome || ""} ${a.matricula || ""} ${a.email || ""}`.toLowerCase();
    if (busca && !alvo.includes(busca)) return false;
    if (filtroStatus === "ativo" && !a.ativo) return false;
    if (filtroStatus === "inativo" && a.ativo) return false;
    return true;
  });

  if (linhas.length === 0) {
    host.innerHTML = `<p class="muted center" style="padding:1.4rem 0">Nenhum aluno encontrado.</p>`;
    return;
  }

  const corpo = linhas.map((a) => {
    const badge = a.ativo
      ? '<span class="badge badge--ok badge--dot">Ativo</span>'
      : '<span class="badge badge--erro badge--dot">Inativo</span>';
    return `<tr>
      <td><b>${escaparHtml(a.nome || "—")}</b></td>
      <td class="nowrap">${escaparHtml(a.matricula || "—")}</td>
      <td>${escaparHtml(a.email || "—")}</td>
      <td>${badge}</td>
      <td class="nowrap">${fmtData(a.criado_em)}</td>
      <td class="nowrap">
        <button class="btn btn--ghost btn--sm" data-editar-aluno="${a.id}">Editar</button>
        <button class="btn btn--danger btn--sm" data-excluir-aluno="${a.id}">Excluir</button>
      </td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <p class="muted small" style="margin:.2rem 0 .6rem">${linhas.length} aluno(s)</p>
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Aluno</th><th>Matrícula</th><th>E-mail</th><th>Status</th><th>Cadastrado em</th><th>Ações</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;

  host.querySelectorAll("[data-editar-aluno]").forEach((b) =>
    b.addEventListener("click", () => preencherFormulario(b.dataset.editarAluno)));
  host.querySelectorAll("[data-excluir-aluno]").forEach((b) =>
    b.addEventListener("click", () => excluirAluno(b.dataset.excluirAluno)));
}

async function salvarAluno(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector("[data-btn-salvar]");
  const status = form.querySelector("[data-status-form]");
  const nome = form.nome.value.trim();
  const matricula = form.matricula.value.trim() || null;
  const email = form.email.value.trim();
  const emailNormalizado = normalizarEmail(email);
  const ativo = form.ativo.value === "true";
  const senha = form.senha.value || "";
  const senha2 = form.senha2.value || "";
  const editando = Boolean(cad.editandoId);

  if (!nome) { status.textContent = "Informe o nome do aluno."; form.nome.focus(); return; }
  if (!emailNormalizado || !emailNormalizado.includes("@")) { status.textContent = "Informe um e-mail válido."; form.email.focus(); return; }
  if (!editando && senha.length < 6) { status.textContent = "Informe uma senha inicial com pelo menos 6 caracteres."; form.senha.focus(); return; }
  if (senha && senha.length < 6) { status.textContent = "A senha precisa ter pelo menos 6 caracteres."; form.senha.focus(); return; }
  if (senha !== senha2) { status.textContent = "As senhas não conferem."; form.senha2.focus(); return; }

  travarBtn(btn, true, editando ? "Salvando…" : "Criando acesso…");
  status.textContent = "";

  const payload = {
    area: cad.perfil.area,
    nome,
    matricula,
    email,
    senha: senha || null,
    ativo,
  };

  const resposta = await chamarFuncaoAdminCriarAluno(payload);
  if (resposta.error) {
    console.error(resposta.error);
    status.textContent = resposta.error;
    travarBtn(btn, false, editando ? "Salvar edição" : "Salvar aluno e criar acesso");
    return;
  }

  await carregarAlunos();
  renderCadastroAlunos();
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

function preencherFormulario(id) {
  const aluno = cad.alunos.find((a) => a.id === id);
  if (!aluno) return;
  cad.editandoId = id;
  const host = document.querySelector("[data-cadastro-alunos]");
  const form = host.querySelector("[data-form-cadastro-aluno]");
  host.querySelector("[data-form-titulo]").textContent = "Editar aluno";
  form.nome.value = aluno.nome || "";
  form.matricula.value = aluno.matricula || "";
  form.email.value = aluno.email || "";
  form.email.readOnly = true;
  form.senha.value = "";
  form.senha2.value = "";
  form.ativo.value = aluno.ativo ? "true" : "false";
  host.querySelector("[data-hint-email]").textContent = "Para trocar o e-mail, exclua este cadastro e crie outro.";
  host.querySelector("[data-hint-senha]").textContent = "Deixe em branco para manter a senha atual. Preencha para redefinir.";
  host.querySelector("[data-btn-salvar]").textContent = "Salvar edição";
  host.querySelector("[data-btn-cancelar]").classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function limparFormulario() {
  cad.editandoId = null;
  const host = document.querySelector("[data-cadastro-alunos]");
  const form = host.querySelector("[data-form-cadastro-aluno]");
  form.reset();
  form.email.readOnly = false;
  host.querySelector("[data-form-titulo]").textContent = "Novo aluno";
  host.querySelector("[data-btn-salvar]").textContent = "Salvar aluno e criar acesso";
  host.querySelector("[data-btn-cancelar]").classList.add("hidden");
  host.querySelector("[data-status-form]").textContent = "";
  host.querySelector("[data-hint-email]").textContent = "";
  host.querySelector("[data-hint-senha]").textContent = "Obrigatória para novo aluno. Em edição, preencha apenas se quiser trocar a senha.";
}

async function excluirAluno(id) {
  const aluno = cad.alunos.find((a) => a.id === id);
  if (!aluno) return;
  const ok = confirm(`Excluir o cadastro de ${aluno.nome}? Se ele já criou acesso, o usuário do Supabase Auth não será apagado; isso apenas remove o registro da lista de alunos autorizados.`);
  if (!ok) return;
  const { error } = await sb.from("alunos_cadastrados").delete().eq("id", id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  await carregarAlunos();
  renderCadastroAlunos();
}

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function travarBtn(btn, on, txt) {
  if (!btn) return;
  if (!btn.dataset.textoOriginal) btn.dataset.textoOriginal = btn.textContent;
  btn.disabled = on;
  btn.textContent = txt || (on ? btn.textContent : btn.dataset.textoOriginal);
}
