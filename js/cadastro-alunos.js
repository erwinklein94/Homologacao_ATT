// =====================================================================
// cadastro-alunos.js — central de contas do administrador (refeito)
// - Aprova ou recusa as solicitações de primeiro acesso feitas no login.
// - Cria contas de aluno do zero (com senha inicial) via Edge Function
//   admin-criar-aluno e edita os dados de qualquer conta existente.
// - Promove aluno a administrador e rebaixa administrador a aluno.
//
// Modelo de dados: profiles = contas reais (admin/aluno);
// alunos_cadastrados = autorização de prova (ativo) e fila de solicitações
// (ativo=false sem criado_por = pendente). Recusar/desativar NUNCA apaga o
// registro: sem ele, corrigir_prova deixaria de bloquear a prova.
// =====================================================================

const cad = {
  perfil: null,
  contas: [],      // public.profiles da área
  cadastros: [],   // public.alunos_cadastrados da área
  editandoEmail: null,
  busca: "",
  filtro: "",
};

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina({ requerAdmin: true });
  if (!perfil) return;
  cad.perfil = perfil;
  await carregarDados();
  render();
});

async function carregarDados() {
  const [contas, cadastros] = await Promise.all([
    sb.from("profiles")
      .select("id, nome, matricula, email, email_normalizado, empresa, role, area, criado_em")
      .eq("area", cad.perfil.area)
      .order("nome", { ascending: true }),
    sb.from("alunos_cadastrados")
      .select("id, area, nome, matricula, email, email_normalizado, empresa, funcao, local, gerencia, modalidade, instrutor, especificacao, ativo, criado_por, criado_em")
      .eq("area", cad.perfil.area)
      .order("criado_em", { ascending: false }),
  ]);

  if (contas.error) console.error("Erro ao carregar contas:", contas.error);
  if (cadastros.error) console.error("Erro ao carregar cadastros:", cadastros.error);
  cad.contas = contas.data || [];
  cad.cadastros = cadastros.data || [];
}

// Solicitação pendente = veio do "Solicitar acesso" do login (sem criado_por)
// e ainda não foi aprovada nem recusada por um administrador.
function ehPendente(c) {
  return !c.ativo && !c.criado_por;
}

function cadastroDaConta(conta) {
  const chave = conta.email_normalizado || String(conta.email || "").trim().toLowerCase();
  return cad.cadastros.find((c) => c.email_normalizado === chave) || null;
}

function contaDoCadastro(cadastro) {
  return cad.contas.find(
    (p) => (p.email_normalizado || String(p.email || "").trim().toLowerCase()) === cadastro.email_normalizado
  ) || null;
}

// ------------------------------------------------------------------ render
function render() {
  const host = document.querySelector("[data-cadastro-alunos]");
  const pendentes = cad.cadastros.filter(ehPendente);
  const admins = cad.contas.filter((c) => c.role === "admin").length;
  const alunos = cad.contas.filter((c) => c.role === "aluno").length;

  host.innerHTML = `
    <div class="kpis" style="margin-bottom:1.2rem">
      <div class="kpi"><div class="kpi__label">Contas</div><div class="kpi__value">${cad.contas.length}</div></div>
      <div class="kpi"><div class="kpi__label">Administradores</div><div class="kpi__value">${admins}</div></div>
      <div class="kpi kpi--verde"><div class="kpi__label">Alunos</div><div class="kpi__value">${alunos}</div></div>
      <div class="kpi kpi--laranja"><div class="kpi__label">Solicitações de acesso</div><div class="kpi__value">${pendentes.length}</div></div>
    </div>

    <div class="card card--chanfro stack" style="margin-bottom:1.2rem">
      <div class="toolbar">
        <h2 style="margin:0">Solicitações de acesso</h2>
        <span class="badge ${pendentes.length ? "badge--aviso" : "badge--ok"} badge--dot">${pendentes.length} aguardando</span>
      </div>
      <p class="muted" style="margin:0">
        Alunos que pediram o primeiro acesso pela tela de login. <b>Aprovar</b> finaliza o registro e libera o login e as provas;
        <b>Recusar</b> mantém o e-mail bloqueado (dá para reativar depois na lista de contas).
      </p>
      <div data-tabela-solicitacoes></div>
    </div>

    <div class="card card--chanfro stack" style="margin-bottom:1.2rem">
      <div>
        <h2 style="margin-bottom:.25rem" data-form-titulo>Criar conta de aluno</h2>
        <p class="muted" style="margin:0" data-form-descricao>
          Cadastre um aluno do zero com senha inicial: ele já sai aprovado e pode entrar direto pela aba
          <b>Entrar</b> do login, sem passar pela solicitação.
        </p>
        <p class="muted small" style="margin:.35rem 0 0">
          A senha vai para o Supabase Auth pela Edge Function <code>admin-criar-aluno</code> e não fica salva no banco.
        </p>
      </div>

      <form data-form-conta novalidate>
        <div class="row">
          <div class="field" style="flex:2;min-width:240px">
            <label for="ct-nome">Nome completo</label>
            <input id="ct-nome" class="input" name="nome" required placeholder="Nome do aluno" />
          </div>
          <div class="field" style="min-width:170px">
            <label for="ct-matricula">Matrícula</label>
            <input id="ct-matricula" class="input" name="matricula" placeholder="Ex.: TR061052" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:2;min-width:240px">
            <label for="ct-email">E-mail</label>
            <input id="ct-email" class="input" type="email" name="email" required placeholder="aluno@rumolog.com" />
            <div class="field__hint" data-hint-email></div>
          </div>
          <div class="field" style="flex:1;min-width:180px">
            <label for="ct-empresa">Empresa</label>
            <input id="ct-empresa" class="input" name="empresa" placeholder="Ex.: Rumo, COTRIN" />
          </div>
          <div class="field" style="min-width:150px">
            <label for="ct-status">Status</label>
            <select id="ct-status" class="select" name="ativo">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:2;min-width:280px">
            <label for="ct-especificacao">Especificação técnica / orientação</label>
            <select id="ct-especificacao" class="select" name="especificacao">
              ${(window.ESPECIFICACOES_ATT || []).map((e) =>
                `<option value="${escaparHtml(e)}">${escaparHtml(e)}</option>`).join("")}
            </select>
          </div>
          <div class="field" style="flex:1;min-width:180px">
            <label for="ct-funcao">Função</label>
            <input id="ct-funcao" class="input" name="funcao" placeholder="Ex.: Encarregado" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1;min-width:180px">
            <label for="ct-local">Local</label>
            <input id="ct-local" class="input" name="local" placeholder="Ex.: ARARAQUARA/SP" />
          </div>
          <div class="field" style="flex:1;min-width:160px">
            <label for="ct-gerencia">Gerência</label>
            <input id="ct-gerencia" class="input" name="gerencia" placeholder="Ex.: SP NORTE" />
          </div>
          <div class="field" style="min-width:140px">
            <label for="ct-modalidade">Modalidade</label>
            <select id="ct-modalidade" class="select" name="modalidade">
              <option value="TEÓRICO">Teórico</option>
              <option value="PRÁTICO">Prático</option>
            </select>
          </div>
          <div class="field" style="flex:1;min-width:180px">
            <label for="ct-instrutor">Instrutor</label>
            <input id="ct-instrutor" class="input" name="instrutor" placeholder="Nome do instrutor" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1;min-width:220px">
            <label for="ct-senha">Senha inicial</label>
            <input id="ct-senha" class="input" type="password" name="senha" autocomplete="new-password" placeholder="Mínimo 6 caracteres" />
            <div class="field__hint" data-hint-senha>Obrigatória para conta nova. Em edição, preencha apenas para trocar a senha.</div>
          </div>
          <div class="field" style="flex:1;min-width:220px">
            <label for="ct-senha2">Confirmar senha</label>
            <input id="ct-senha2" class="input" type="password" name="senha2" autocomplete="new-password" placeholder="Repita a senha" />
          </div>
        </div>
        <div class="toolbar">
          <button class="btn btn--success" type="submit" data-btn-salvar>Criar conta</button>
          <button class="btn btn--ghost hidden" type="button" data-btn-cancelar>Cancelar edição</button>
          <span class="spacer"></span>
          <span class="muted small" data-status-form></span>
        </div>
      </form>
    </div>

    <div class="card stack">
      <div class="toolbar">
        <h2 style="margin:0">Contas e cadastros</h2>
        <span class="spacer"></span>
        <div class="field" style="margin:0;min-width:260px">
          <label for="ct-busca">Buscar</label>
          <input id="ct-busca" class="input" data-busca placeholder="Nome, matrícula, e-mail ou empresa…" />
        </div>
        <div class="field" style="margin:0;min-width:170px">
          <label for="ct-filtro">Mostrar</label>
          <select id="ct-filtro" class="select" data-filtro>
            <option value="">Todos</option>
            <option value="admin">Administradores</option>
            <option value="aluno">Alunos</option>
            <option value="pendente">Pendentes</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>
      <p class="muted small" style="margin:0">
        Aqui você edita qualquer conta, muda o papel (aluno ⇄ administrador) e ativa/desativa o acesso às provas.
      </p>
      <div data-tabela-contas></div>
    </div>`;

  desenharSolicitacoes(pendentes);

  const form = host.querySelector("[data-form-conta]");
  form.addEventListener("submit", salvarConta);
  host.querySelector("[data-btn-cancelar]").addEventListener("click", limparFormulario);

  const busca = host.querySelector("[data-busca]");
  const filtro = host.querySelector("[data-filtro]");
  busca.value = cad.busca;
  filtro.value = cad.filtro;
  const aplicar = () => {
    cad.busca = busca.value.trim().toLowerCase();
    cad.filtro = filtro.value;
    desenharContas();
  };
  busca.addEventListener("input", aplicar);
  filtro.addEventListener("change", aplicar);
  desenharContas();
}

// --------------------------------------------------------- solicitações
function desenharSolicitacoes(pendentes) {
  const host = document.querySelector("[data-tabela-solicitacoes]");
  if (!host) return;

  if (pendentes.length === 0) {
    host.innerHTML = `<p class="muted center" style="padding:1rem 0">Nenhuma solicitação de acesso aguardando aprovação.</p>`;
    return;
  }

  const corpo = pendentes.map((c) => `<tr>
      <td><b>${escaparHtml(c.nome || "—")}</b></td>
      <td class="nowrap">${escaparHtml(c.matricula || "—")}</td>
      <td>${escaparHtml(c.email || "—")}</td>
      <td class="nowrap">${fmtData(c.criado_em)}</td>
      <td class="nowrap">
        <button class="btn btn--success btn--sm" data-aprovar="${c.id}">Aprovar</button>
        <button class="btn btn--ghost btn--sm" data-recusar="${c.id}">Recusar</button>
      </td>
    </tr>`).join("");

  host.innerHTML = `
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Aluno</th><th>Matrícula</th><th>E-mail</th><th>Solicitado em</th><th>Ações</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;

  host.querySelectorAll("[data-aprovar]").forEach((b) =>
    b.addEventListener("click", () => aprovarSolicitacao(b.dataset.aprovar)));
  host.querySelectorAll("[data-recusar]").forEach((b) =>
    b.addEventListener("click", () => recusarSolicitacao(b.dataset.recusar)));
}

async function aprovarSolicitacao(id) {
  const c = cad.cadastros.find((x) => x.id === id);
  if (!c) return;
  const { error } = await sb.from("alunos_cadastrados")
    .update({ ativo: true, criado_por: cad.perfil.id })
    .eq("id", id);
  if (error) { alert("Erro ao aprovar: " + error.message); return; }
  await recarregar();
}

async function recusarSolicitacao(id) {
  const c = cad.cadastros.find((x) => x.id === id);
  if (!c) return;
  const ok = confirm(
    `Recusar a solicitação de ${c.nome || c.email}? O e-mail continua bloqueado para provas. ` +
    `Se mudar de ideia, é só reativar na lista de contas.`
  );
  if (!ok) return;
  // Marca como revisado (criado_por) mantendo ativo=false. O registro NÃO é
  // apagado: sem ele, corrigir_prova deixaria de bloquear este e-mail.
  const { error } = await sb.from("alunos_cadastrados")
    .update({ criado_por: cad.perfil.id })
    .eq("id", id);
  if (error) { alert("Erro ao recusar: " + error.message); return; }
  await recarregar();
}

// -------------------------------------------------------------- contas
function desenharContas() {
  const host = document.querySelector("[data-tabela-contas]");
  if (!host) return;

  // Linhas = todas as contas + cadastros que ainda não viraram conta
  // (ex.: aluno cadastrado como inativo antes de criar acesso no Auth).
  const linhas = [];
  cad.contas.forEach((conta) => linhas.push({ conta, cadastro: cadastroDaConta(conta) }));
  cad.cadastros.forEach((c) => {
    if (!contaDoCadastro(c)) linhas.push({ conta: null, cadastro: c });
  });

  const filtradas = linhas.filter((l) => {
    const dono = l.conta || l.cadastro;
    const alvo = `${dono.nome || ""} ${dono.matricula || ""} ${dono.email || ""} ${dono.empresa || ""}`.toLowerCase();
    if (cad.busca && !alvo.includes(cad.busca)) return false;
    if (cad.filtro === "admin") return l.conta?.role === "admin";
    if (cad.filtro === "aluno") return l.conta?.role === "aluno";
    if (cad.filtro === "pendente") return l.cadastro && ehPendente(l.cadastro);
    if (cad.filtro === "inativo") return l.cadastro && !l.cadastro.ativo && !ehPendente(l.cadastro);
    return true;
  });

  if (filtradas.length === 0) {
    host.innerHTML = `<p class="muted center" style="padding:1.4rem 0">Nenhuma conta encontrada.</p>`;
    return;
  }

  const corpo = filtradas.map((l) => {
    const dono = l.conta || l.cadastro;
    const chave = dono.email_normalizado || String(dono.email || "").trim().toLowerCase();

    const papel = !l.conta
      ? '<span class="muted small">Sem conta</span>'
      : l.conta.role === "admin"
        ? '<span class="badge-role badge-role--admin">Administrador</span>'
        : '<span class="badge-role">Aluno</span>';

    // Admin não depende de alunos_cadastrados para nada; mostra "—".
    const status = l.conta?.role === "admin"
      ? '<span class="muted">—</span>'
      : !l.cadastro
        ? '<span class="badge badge--ok badge--dot">Ativo</span>'
        : l.cadastro.ativo
          ? '<span class="badge badge--ok badge--dot">Ativo</span>'
          : ehPendente(l.cadastro)
            ? '<span class="badge badge--aviso badge--dot">Pendente</span>'
            : '<span class="badge badge--erro badge--dot">Inativo</span>';

    const acoes = [];
    acoes.push(`<button class="btn btn--ghost btn--sm" data-editar="${escaparHtml(chave)}">Editar</button>`);

    if (l.cadastro && ehPendente(l.cadastro)) {
      acoes.push(`<button class="btn btn--success btn--sm" data-aprovar-linha="${l.cadastro.id}">Aprovar</button>`);
      acoes.push(`<button class="btn btn--ghost btn--sm" data-recusar-linha="${l.cadastro.id}">Recusar</button>`);
    } else if (l.conta) {
      if (l.conta.id === cad.perfil.id) {
        acoes.push('<span class="muted small">Conta atual</span>');
      } else if (l.conta.role === "aluno") {
        acoes.push(`<button class="btn btn--primary btn--sm" data-promover="${l.conta.id}">Tornar admin</button>`);
      } else {
        acoes.push(`<button class="btn btn--ghost btn--sm" data-rebaixar="${l.conta.id}">Tornar aluno</button>`);
      }
      if (l.conta.role === "aluno" && l.cadastro) {
        acoes.push(l.cadastro.ativo
          ? `<button class="btn btn--danger btn--sm" data-desativar="${l.cadastro.id}">Desativar</button>`
          : `<button class="btn btn--success btn--sm" data-reativar="${l.cadastro.id}">Reativar</button>`);
      }
    }

    return `<tr>
      <td><b>${escaparHtml(dono.nome || "—")}</b></td>
      <td class="nowrap">${escaparHtml(dono.matricula || "—")}</td>
      <td>${escaparHtml(dono.email || "—")}</td>
      <td>${escaparHtml(dono.empresa || "—")}</td>
      <td>${papel}</td>
      <td>${status}</td>
      <td class="nowrap">${acoes.join(" ")}</td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <p class="muted small" style="margin:.2rem 0 .6rem">${filtradas.length} conta(s)/cadastro(s)</p>
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Empresa</th><th>Perfil</th><th>Status</th><th>Ações</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;

  host.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => preencherFormulario(b.dataset.editar)));
  host.querySelectorAll("[data-promover]").forEach((b) =>
    b.addEventListener("click", () => mudarPapel(b.dataset.promover, "admin")));
  host.querySelectorAll("[data-rebaixar]").forEach((b) =>
    b.addEventListener("click", () => mudarPapel(b.dataset.rebaixar, "aluno")));
  host.querySelectorAll("[data-aprovar-linha]").forEach((b) =>
    b.addEventListener("click", () => aprovarSolicitacao(b.dataset.aprovarLinha)));
  host.querySelectorAll("[data-recusar-linha]").forEach((b) =>
    b.addEventListener("click", () => recusarSolicitacao(b.dataset.recusarLinha)));
  host.querySelectorAll("[data-desativar]").forEach((b) =>
    b.addEventListener("click", () => mudarStatusCadastro(b.dataset.desativar, false)));
  host.querySelectorAll("[data-reativar]").forEach((b) =>
    b.addEventListener("click", () => mudarStatusCadastro(b.dataset.reativar, true)));
}

async function mudarPapel(contaId, novoRole) {
  const conta = cad.contas.find((c) => c.id === contaId);
  if (!conta) return;
  if (contaId === cad.perfil.id && novoRole !== "admin") {
    alert("Você não pode rebaixar a própria conta enquanto está logado como administrador.");
    return;
  }
  const frase = novoRole === "admin"
    ? `Tornar ${conta.nome || conta.email} administrador? Essa conta passa a gerenciar provas, contas e aprovações.`
    : `Voltar ${conta.nome || conta.email} para o perfil de aluno?`;
  if (!confirm(frase)) return;

  const { error } = await sb.from("profiles")
    .update({ role: novoRole })
    .eq("id", contaId)
    .eq("area", cad.perfil.area);
  if (error) { alert("Não consegui alterar o papel: " + error.message); return; }
  await recarregar();
}

async function mudarStatusCadastro(cadastroId, ativo) {
  const c = cad.cadastros.find((x) => x.id === cadastroId);
  if (!c) return;
  if (!ativo && !confirm(`Desativar ${c.nome || c.email}? Ele não conseguirá entrar nem registrar provas até ser reativado.`)) return;
  const { error } = await sb.from("alunos_cadastrados")
    .update({ ativo, criado_por: c.criado_por || cad.perfil.id })
    .eq("id", cadastroId);
  if (error) { alert("Erro ao alterar o status: " + error.message); return; }
  await recarregar();
}

// ------------------------------------------------------------- formulário
async function salvarConta(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector("[data-btn-salvar]");
  const status = form.querySelector("[data-status-form]");
  const editando = Boolean(cad.editandoEmail);

  const nome = form.nome.value.trim();
  const matricula = form.matricula.value.trim() || null;
  const email = form.email.value.trim();
  const empresa = form.empresa.value.trim() || null;
  const ativo = form.ativo.value === "true";
  const senha = form.senha.value || "";
  const senha2 = form.senha2.value || "";

  if (!nome) { status.textContent = "Informe o nome."; form.nome.focus(); return; }
  if (!email || !email.includes("@")) { status.textContent = "Informe um e-mail válido."; form.email.focus(); return; }
  if (!editando && senha.length < 6) { status.textContent = "Para conta nova, informe uma senha inicial com pelo menos 6 caracteres."; form.senha.focus(); return; }
  if (senha && senha.length < 6) { status.textContent = "A senha precisa ter pelo menos 6 caracteres."; form.senha.focus(); return; }
  if (senha !== senha2) { status.textContent = "As senhas não conferem."; form.senha2.focus(); return; }

  travarBtn(btn, true, editando ? "Salvando…" : "Criando conta…");
  status.textContent = "";

  const resposta = await chamarFuncaoAdminCriarAluno({
    area: cad.perfil.area,
    nome,
    matricula,
    email,
    empresa,
    funcao: form.funcao.value.trim(),
    local: form.local.value.trim(),
    gerencia: form.gerencia.value.trim(),
    modalidade: form.modalidade.value,
    instrutor: form.instrutor.value.trim(),
    especificacao: form.especificacao.value,
    senha: senha || null,
    ativo,
  });

  if (resposta.error) {
    console.error(resposta.error);
    status.textContent = resposta.error;
    travarBtn(btn, false, editando ? "Salvar alterações" : "Criar conta");
    return;
  }

  limparFormulario();
  status.textContent = resposta.data?.message || "Conta salva com sucesso.";
  await recarregar();
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
        "Não consegui acessar o Supabase Auth. Confira se a Edge Function admin-criar-aluno está publicada. Detalhe: " +
        (err?.message || String(err)),
    };
  }
}

function preencherFormulario(chaveEmail) {
  const conta = cad.contas.find(
    (p) => (p.email_normalizado || String(p.email || "").trim().toLowerCase()) === chaveEmail
  );
  const cadastro = cad.cadastros.find((c) => c.email_normalizado === chaveEmail);
  const dono = conta || cadastro;
  if (!dono) return;

  cad.editandoEmail = chaveEmail;
  const host = document.querySelector("[data-cadastro-alunos]");
  const form = host.querySelector("[data-form-conta]");
  host.querySelector("[data-form-titulo]").textContent = "Editar conta";
  host.querySelector("[data-form-descricao]").innerHTML =
    `Alterando os dados de <b>${escaparHtml(dono.nome || dono.email)}</b>. O papel (aluno/administrador) muda pelos botões da tabela.`;
  form.nome.value = dono.nome || "";
  form.matricula.value = dono.matricula || "";
  form.email.value = dono.email || "";
  form.email.readOnly = true;
  form.empresa.value = dono.empresa || cadastro?.empresa || "";
  form.funcao.value = cadastro?.funcao || "";
  form.local.value = cadastro?.local || "";
  form.gerencia.value = cadastro?.gerencia || "";
  form.modalidade.value = cadastro?.modalidade === "PRÁTICO" ? "PRÁTICO" : "TEÓRICO";
  form.instrutor.value = cadastro?.instrutor || "";
  if (cadastro?.especificacao && (window.ESPECIFICACOES_ATT || []).includes(cadastro.especificacao)) {
    form.especificacao.value = cadastro.especificacao;
  }
  form.ativo.value = (cadastro ? cadastro.ativo : true) ? "true" : "false";
  form.senha.value = "";
  form.senha2.value = "";
  host.querySelector("[data-hint-email]").textContent = "Para trocar o e-mail, crie uma conta nova.";
  host.querySelector("[data-hint-senha]").textContent = "Deixe em branco para manter a senha atual. Preencha para redefinir.";
  host.querySelector("[data-btn-salvar]").textContent = "Salvar alterações";
  host.querySelector("[data-btn-cancelar]").classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function limparFormulario() {
  cad.editandoEmail = null;
  const host = document.querySelector("[data-cadastro-alunos]");
  const form = host.querySelector("[data-form-conta]");
  form.reset();
  form.email.readOnly = false;
  host.querySelector("[data-form-titulo]").textContent = "Criar conta de aluno";
  host.querySelector("[data-form-descricao]").innerHTML =
    "Cadastre um aluno do zero com senha inicial: ele já sai aprovado e pode entrar direto pela aba <b>Entrar</b> do login, sem passar pela solicitação.";
  host.querySelector("[data-btn-salvar]").textContent = "Criar conta";
  host.querySelector("[data-btn-cancelar]").classList.add("hidden");
  host.querySelector("[data-status-form]").textContent = "";
  host.querySelector("[data-hint-email]").textContent = "";
  host.querySelector("[data-hint-senha]").textContent = "Obrigatória para conta nova. Em edição, preencha apenas para trocar a senha.";
}

async function recarregar() {
  await carregarDados();
  render();
}

function travarBtn(btn, on, txt) {
  if (!btn) return;
  if (!btn.dataset.textoOriginal) btn.dataset.textoOriginal = btn.textContent;
  btn.disabled = on;
  btn.textContent = txt || (on ? btn.textContent : btn.dataset.textoOriginal);
}
