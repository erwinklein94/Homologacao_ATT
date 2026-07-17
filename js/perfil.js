// =====================================================================
// perfil.js — área do aluno: seus dados (editáveis) + histórico de provas
// =====================================================================

let _perfilAtual = null;
let _tentativas = [];

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina();
  if (!perfil) return;
  _perfilAtual = perfil;

  const { data, error } = await sb
    .from("tentativas")
    .select("*, provas(nota_minima)")
    .eq("aluno_id", perfil.id)
    .eq("area", perfil.area)
    .order("realizado_em", { ascending: false });

  _tentativas = error ? [] : (data || []);
  renderResumo(perfil, _tentativas);
  renderEditarCadastro(perfil);
  renderHistorico(perfil, _tentativas);
});

// ---------------------------------------------------------- editar cadastro
function renderEditarCadastro(perfil) {
  const host = document.querySelector("[data-perfil-editar]");
  if (!host) return;

  host.innerHTML = `
    <h2 style="margin-top:1.6rem">Meus dados</h2>
    <div class="card card--chanfro">
      <form data-editar-form class="perfil-editar-form" novalidate>
        <div class="row">
          <div class="field" style="flex:2;min-width:220px">
            <label for="pe-nome">Nome completo</label>
            <input id="pe-nome" class="input" name="nome" required value="${escaparHtml(perfil.nome || "")}" />
          </div>
          <div class="field" style="min-width:170px">
            <label for="pe-matricula">Matrícula</label>
            <input id="pe-matricula" class="input" name="matricula" value="${escaparHtml(perfil.matricula || "")}" />
          </div>
          <div class="field" style="min-width:170px">
            <label for="pe-empresa">Empresa</label>
            <input id="pe-empresa" class="input" name="empresa" value="${escaparHtml(perfil.empresa || "")}" placeholder="Ex.: Rumo" />
          </div>
        </div>
        <div class="row">
          <div class="field" style="min-width:210px">
            <label for="pe-senha">Nova senha (opcional)</label>
            <input id="pe-senha" class="input" type="password" name="senha" minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
          </div>
          <div class="field" style="min-width:210px">
            <label for="pe-senha2">Confirmar nova senha</label>
            <input id="pe-senha2" class="input" type="password" name="senha2" autocomplete="new-password" placeholder="Repita a nova senha" />
          </div>
        </div>
        <p class="muted small" style="margin:.2rem 0 .8rem">
          O e-mail de acesso (${escaparHtml(perfil.email)}) não pode ser alterado por aqui — fale com o administrador.
        </p>
        <div class="toolbar">
          <button class="btn btn--primary" type="submit" data-editar-salvar>Salvar meus dados</button>
          <span class="muted small" data-editar-status></span>
        </div>
      </form>
    </div>`;

  host.querySelector("[data-editar-form]").addEventListener("submit", salvarCadastro);
}

async function salvarCadastro(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const status = form.querySelector("[data-editar-status]");
  const btn = form.querySelector("[data-editar-salvar]");

  const nome = form.nome.value.trim();
  const matricula = form.matricula.value.trim();
  const empresa = form.empresa.value.trim();
  const senha = form.senha.value;
  const senha2 = form.senha2.value;

  if (!nome) { status.textContent = "Informe o nome completo."; form.nome.focus(); return; }
  if (senha || senha2) {
    if (senha.length < 8) { status.textContent = "A nova senha precisa de pelo menos 8 caracteres."; form.senha.focus(); return; }
    if (senha !== senha2) { status.textContent = "As senhas não conferem."; form.senha2.focus(); return; }
  }

  travar(btn, true, "Salvando…");
  status.textContent = "";

  // Atualiza o perfil e o cadastro de aluno (Histórico) numa única RPC.
  const { error } = await sb.rpc("atualizar_meu_cadastro", {
    p_nome: nome, p_matricula: matricula, p_empresa: empresa,
  });
  if (error) {
    travar(btn, false, "Salvar meus dados");
    status.textContent = "Erro ao salvar: " + error.message;
    return;
  }

  if (senha) {
    const { error: e2 } = await sb.auth.updateUser({ password: senha });
    if (e2) {
      travar(btn, false, "Salvar meus dados");
      status.textContent = "Dados salvos, mas a senha não foi alterada: " + e2.message;
      return;
    }
    form.senha.value = "";
    form.senha2.value = "";
  }

  // Recarrega o perfil para refletir o novo nome no cabeçalho e no resumo.
  window.limparPerfilCache();
  const novo = await getPerfil();
  if (novo) {
    _perfilAtual = novo;
    montarCabecalho(novo);
    renderResumo(novo, _tentativas);
  }
  travar(btn, false, "Salvar meus dados");
  status.textContent = senha ? "Dados e senha atualizados!" : "Dados atualizados!";
}

function renderResumo(perfil, tentativas) {
  const host = document.querySelector("[data-perfil-resumo]");
  const total = tentativas.length;
  const melhor = total ? Math.max(...tentativas.map((t) => Number(t.nota))) : null;
  const homologado = tentativas.some((t) => t.aprovado);
  const ultima = total ? tentativas[0] : null;

  host.innerHTML = `
    <div class="page__head">
      <div class="eyebrow">Meu perfil</div>
      <h1>${escaparHtml(perfil.nome || perfil.email)}</h1>
      <p class="muted">
        ${perfil.matricula ? "Matrícula " + escaparHtml(perfil.matricula) + " · " : ""}${escaparHtml(perfil.email)}
      </p>
    </div>
    <div class="kpis">
      <div class="kpi">
        <div class="kpi__label">Situação</div>
        <div class="kpi__value" style="font-size:1.5rem;color:${homologado ? "var(--rumo-verde)" : "var(--rumo-texto)"}">
          ${homologado ? "Homologado" : "Pendente"}
        </div>
        <div class="kpi__sub">${homologado ? "Você já tem ao menos uma aprovação." : "Faça uma prova e tire 7,0+."}</div>
      </div>
      <div class="kpi kpi--verde">
        <div class="kpi__label">Melhor nota</div>
        <div class="kpi__value">${melhor === null ? "—" : fmtNota(melhor)}</div>
        <div class="kpi__sub">em ${total} prova(s)</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Provas realizadas</div>
        <div class="kpi__value">${total}</div>
        <div class="kpi__sub">total de tentativas</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Última prova</div>
        <div class="kpi__value" style="font-size:1.3rem">${ultima ? fmtData(ultima.realizado_em, false) : "—"}</div>
        <div class="kpi__sub">${ultima ? escaparHtml(ultima.prova_titulo).slice(0, 28) : "nenhuma ainda"}</div>
      </div>
    </div>`;
}

function renderHistorico(perfil, tentativas) {
  const host = document.querySelector("[data-perfil-historico]");
  if (tentativas.length === 0) {
    host.innerHTML = `
      <div class="card center">
        <h3>Você ainda não fez nenhuma prova</h3>
        <p class="muted">Quando fizer, seu histórico e os certificados aparecem aqui.</p>
        <a class="btn btn--primary" href="prova.html">Fazer prova agora</a>
      </div>`;
    return;
  }

  const linhas = tentativas.map((t) => {
    const badge = t.aprovado
      ? '<span class="badge badge--ok badge--dot">Aprovado</span>'
      : '<span class="badge badge--erro badge--dot">Reprovado</span>';
    // O certificado só é emitido para provas aprovadas (nota mínima atingida).
    const pdf = t.aprovado
      ? `<button class="btn btn--ghost btn--sm" data-pdf="${t.id}">PDF</button>`
      : '<span class="muted small">—</span>';
    return `<tr>
      <td>${escaparHtml(t.prova_titulo)}</td>
      <td><b>${fmtNota(t.nota)}</b> <span class="muted small">(${t.acertos}/${t.total})</span></td>
      <td>${badge}</td>
      <td>${escaparHtml(t.instrutor_nome)}</td>
      <td class="nowrap">${fmtData(t.realizado_em)}</td>
      <td>${pdf}</td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <h2 style="margin-top:1.6rem">Histórico de provas</h2>
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Prova</th><th>Nota</th><th>Resultado</th><th>Instrutor</th><th>Data</th><th>Certificado</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  host.querySelectorAll("[data-pdf]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const t = tentativas.find((x) => x.id === btn.dataset.pdf);
      travar(btn, true, "…");
      await gerarCertificadoPDF({
        aluno_nome: t.aluno_nome, matricula: perfil.matricula,
        prova_titulo: t.prova_titulo, nota: t.nota, acertos: t.acertos, total: t.total,
        aprovado: t.aprovado, instrutor_nome: t.instrutor_nome, realizado_em: t.realizado_em,
        nota_minima: t.provas?.nota_minima ?? 7, codigo: gerarCodigoCert(t.id), area: perfil.area,
      });
      travar(btn, false, "PDF");
    });
  });
}

function travar(btn, on, txt) { btn.disabled = on; if (txt) btn.textContent = txt; }
