// =====================================================================
// prova.js — execução da prova (perfil aluno)
// SEGURANÇA: as questões chegam SEM gabarito (RPC questoes_da_prova) e a
// correção acontece NO BANCO (RPC corrigir_prova). O navegador nunca vê
// a resposta correta antes de a prova ser corrigida no servidor.
// Também há rascunho local: um F5 ou queda de rede não perde a prova.
// =====================================================================

const estado = {
  perfil: null,
  provas: [],
  instrutores: [],
  prova: null,
  questoes: [],       // [{id, ordem, enunciado, alternativas}] — sem gabarito
  respostas: {},      // { questaoId: "b" }
  instrutorId: null,
  instrutorNome: "",
  ultimaTentativa: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina();
  if (!perfil) return;
  if (perfil.role === "admin") {
    window.location.replace("dashboard.html");
    return;
  }
  estado.perfil = perfil;

  await Promise.all([carregarProvas(), carregarInstrutores()]);
  renderInicio();
});

async function carregarProvas() {
  const { data, error } = await sb
    .from("provas")
    .select("*")
    .eq("area", estado.perfil.area)
    .eq("ativo", true)
    .order("codigo");
  if (error) { console.error(error); return; }
  estado.provas = data || [];
}

async function carregarInstrutores() {
  const { data } = await sb
    .from("profiles")
    .select("id, nome")
    .eq("area", estado.perfil.area)
    .eq("role", "admin")
    .order("nome");
  estado.instrutores = data || [];
}

// ------------------------------------------------------------- rascunho
// Guarda a prova em andamento no localStorage: se o aluno atualizar a
// página ou cair a conexão, ele retoma exatamente de onde parou.
function chaveRascunho() {
  return `rascunho_prova:${estado.perfil.id}`;
}

function salvarRascunho() {
  if (!estado.prova) return;
  try {
    localStorage.setItem(chaveRascunho(), JSON.stringify({
      provaId: estado.prova.id,
      provaTitulo: estado.prova.titulo,
      instrutorId: estado.instrutorId,
      instrutorNome: estado.instrutorNome,
      questoes: estado.questoes,
      respostas: estado.respostas,
      salvoEm: new Date().toISOString(),
    }));
  } catch (e) { console.warn("Não foi possível salvar o rascunho:", e); }
}

function lerRascunho() {
  try {
    const raw = localStorage.getItem(chaveRascunho());
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || !r.provaId || !Array.isArray(r.questoes) || !r.questoes.length) return null;
    // O rascunho só vale se a prova ainda existir e estiver ativa.
    if (!estado.provas.some((p) => p.id === r.provaId)) return null;
    return r;
  } catch { return null; }
}

function limparRascunho() {
  try { localStorage.removeItem(chaveRascunho()); } catch { /* ignora */ }
}

function retomarRascunho(r) {
  estado.prova = estado.provas.find((p) => p.id === r.provaId);
  estado.questoes = r.questoes;
  estado.respostas = r.respostas || {};
  estado.instrutorId = r.instrutorId || null;
  estado.instrutorNome = r.instrutorNome || "";
  renderExecucao();
}

// ---------------------------------------------------------------- início
function renderInicio() {
  mostrarTela("inicio");
  const host = document.querySelector("[data-tela='inicio']");

  if (estado.provas.length === 0) {
    host.innerHTML = `
      <div class="card">
        <h1>Nenhuma prova disponível</h1>
        <p class="muted">Ainda não há provas ativas. Procure o administrador para liberar uma avaliação.</p>
      </div>`;
    return;
  }

  if (estado.instrutores.length === 0) {
    host.innerHTML = `
      <div class="card">
        <h1>Sem instrutor disponível</h1>
        <p class="muted">Nenhum administrador desta área foi encontrado para registrar a aplicação da prova. Procure o especialista responsável.</p>
      </div>`;
    return;
  }

  const rascunho = lerRascunho();
  const avisoRascunho = rascunho ? `
    <div class="alerta alerta--info" style="margin-bottom:1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <b>Você tem uma prova em andamento:</b> ${escaparHtml(rascunho.provaTitulo)}<br>
        <span class="small">${Object.keys(rascunho.respostas || {}).length} de ${rascunho.questoes.length} questões respondidas.</span>
      </div>
      <button class="btn btn--primary btn--sm" data-retomar>Continuar prova</button>
      <button class="btn btn--ghost btn--sm" data-descartar>Descartar</button>
    </div>` : "";

  const ehAlivio = estado.perfil.area === "alivio_tensao";
  let opcoesProva;
  if (ehAlivio) {
    // Agrupa as provas pelos 4 treinamentos de Alívio de Tensão.
    let primeira = true;
    opcoesProva = Object.values(window.SUBAREAS_ALIVIO).map((s) => {
      const doGrupo = estado.provas.filter((p) => subareaDoRegistro(p) === s.id);
      if (!doGrupo.length) return "";
      const opts = doGrupo.map((p) => {
        const sel = primeira ? " selected" : "";
        primeira = false;
        return `<option value="${p.id}"${sel}>${escaparHtml(p.titulo)}</option>`;
      }).join("");
      return `<optgroup label="${escaparHtml(s.nome)}">${opts}</optgroup>`;
    }).join("");
  } else {
    opcoesProva = estado.provas
      .map((p, i) => `<option value="${p.id}"${i === 0 ? " selected" : ""}>${escaparHtml(p.titulo)}</option>`)
      .join("");
  }

  // Instrutor obrigatório e sempre um administrador da área (sem texto livre):
  // o servidor rejeita qualquer instrutor que não seja admin desta área.
  const opcoesInstrutor = estado.instrutores
    .map((a) => `<option value="${a.id}">${escaparHtml(a.nome)}</option>`)
    .join("");

  const area = window.getAreaMeta ? window.getAreaMeta(estado.perfil.area) : null;
  const tituloArea = "Alívio de Tensão em Trilhos";
  document.title = `Prova · ${area?.titulo || tituloArea} · Rumo`;

  host.innerHTML = `
    <div class="page__head">
      <div class="eyebrow">Avaliação teórica</div>
      <h1>${escaparHtml(tituloArea)}</h1>
      <p class="muted">Você precisa de nota <b>7,0</b> ou mais para ser homologado. Ao final, baixe seu certificado em PDF.</p>
    </div>
    <hr class="trilho" />
    ${avisoRascunho}
    <div class="card card--chanfro stack">
      <div class="field">
        <label for="sel-prova">Prova</label>
        <select id="sel-prova" class="select" data-sel-prova>${opcoesProva}</select>
        <div class="field__hint" data-prova-desc></div>
      </div>

      <div class="row">
        <div class="field">
          <label>Aluno</label>
          <input class="input" value="${escaparHtml(estado.perfil.nome || estado.perfil.email)}" disabled />
        </div>
        <div class="field">
          <label>Matrícula</label>
          <input class="input" value="${escaparHtml(estado.perfil.matricula || "—")}" disabled />
        </div>
      </div>

      <div class="field">
        <label for="sel-instrutor">Instrutor que aplica a prova</label>
        <select id="sel-instrutor" class="select" data-sel-instrutor>${opcoesInstrutor}</select>
        <div class="field__hint">O instrutor precisa ser um administrador desta área.</div>
      </div>

      <div class="toolbar">
        <button class="btn btn--primary" data-iniciar>Iniciar prova</button>
        <span class="muted small">As questões e alternativas são embaralhadas a cada tentativa. Suas respostas ficam salvas neste aparelho até você enviar.</span>
      </div>
    </div>`;

  if (rascunho) {
    host.querySelector("[data-retomar]").addEventListener("click", () => retomarRascunho(rascunho));
    host.querySelector("[data-descartar]").addEventListener("click", () => {
      if (confirm("Descartar a prova em andamento? As respostas salvas serão apagadas.")) {
        limparRascunho();
        renderInicio();
      }
    });
  }

  const selProva = host.querySelector("[data-sel-prova]");
  const atualizaDesc = () => {
    const p = estado.provas.find((x) => x.id === selProva.value);
    host.querySelector("[data-prova-desc]").textContent = p ? (p.descricao || "") : "";
  };
  selProva.addEventListener("change", atualizaDesc);
  atualizaDesc();

  host.querySelector("[data-iniciar]").addEventListener("click", iniciarProva);
}

// ---------------------------------------------------------------- execução
async function iniciarProva() {
  const host = document.querySelector("[data-tela='inicio']");
  const provaId = host.querySelector("[data-sel-prova]").value;
  const selInstr = host.querySelector("[data-sel-instrutor]");

  if (!selInstr.value) {
    selInstr.focus();
    selInstr.style.borderColor = "var(--rumo-erro)";
    return;
  }
  estado.instrutorId = selInstr.value;
  estado.instrutorNome = selInstr.options[selInstr.selectedIndex].text;

  estado.prova = estado.provas.find((p) => p.id === provaId);
  const btn = host.querySelector("[data-iniciar]");
  travarBtn(btn, true, "Carregando…");

  // Questões SEM gabarito (a coluna "correta" não sai do banco aqui).
  const { data, error } = await sb.rpc("questoes_da_prova", { p_prova_id: provaId });
  if (error || !data || data.length === 0) {
    travarBtn(btn, false, "Iniciar prova");
    console.error(error);
    alert("Não foi possível carregar as questões desta prova." +
      (error ? " Detalhe: " + error.message : ""));
    return;
  }

  // Embaralha as questões E as alternativas de cada questão.
  estado.questoes = embaralhar(data.slice()).map((q) => ({
    ...q,
    alternativas: embaralhar((q.alternativas || []).slice()),
  }));
  estado.respostas = {};
  salvarRascunho();
  renderExecucao();
}

function renderTextoQuestao(texto) {
  const raw = String(texto || "");
  const partes = [];
  const re = /\[imagem:([^\]\s]+)\]/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    partes.push(escaparHtml(raw.slice(ultimo, m.index)).replace(/\n/g, "<br>"));
    const src = m[1];
    if (/^assets\/provas-att4\/[a-z0-9_.-]+\.png$/i.test(src)) {
      const nome = src.split("/").pop().replace(/\.png$/i, "").replace(/-/g, " ");
      partes.push(`<span class="questao-midia"><img src="${src}" alt="${escaparHtml(nome)}" loading="lazy" /></span>`);
    } else {
      partes.push(escaparHtml(m[0]));
    }
    ultimo = re.lastIndex;
  }
  partes.push(escaparHtml(raw.slice(ultimo)).replace(/\n/g, "<br>"));
  return partes.join("");
}

function renderExecucao() {
  mostrarTela("prova");
  const host = document.querySelector("[data-tela='prova']");
  const total = estado.questoes.length;

  const questoesHtml = estado.questoes.map((q, idx) => {
    const alts = q.alternativas.map((a) => `
      <label class="alt${estado.respostas[q.id] === a.id ? " is-selected" : ""}" data-alt data-questao="${q.id}" data-valor="${a.id}">
        <input type="radio" name="q-${q.id}" value="${a.id}" ${estado.respostas[q.id] === a.id ? "checked" : ""} />
        <span class="alt__key">${a.id})</span>
        <span>${escaparHtml(a.texto)}</span>
      </label>`).join("");
    return `
      <article class="questao" data-questao-card="${q.id}">
        <p class="questao__enunciado"><span class="questao__num">${idx + 1}</span>${renderTextoQuestao(q.enunciado)}</p>
        <div class="alts">${alts}</div>
      </article>`;
  }).join("");

  host.innerHTML = `
    <div class="prova-progress">
      <div class="progress-track"><div class="progress-fill" data-fill></div></div>
      <div class="progress-meta">
        <span>${escaparHtml(estado.prova.titulo)}</span>
        <span data-contador>0 de ${total} respondidas</span>
      </div>
    </div>
    ${questoesHtml}
    <div class="card center stack">
      <p class="muted" data-aviso-faltam></p>
      <div><button class="btn btn--success" data-enviar>Enviar e ver resultado</button></div>
      <p class="muted small">Suas respostas ficam salvas neste aparelho: se a página recarregar, você pode continuar de onde parou.</p>
    </div>`;

  host.querySelectorAll("[data-alt]").forEach((el) =>
    el.addEventListener("click", () => selecionar(el)));
  host.querySelector("[data-enviar]").addEventListener("click", enviarProva);
  atualizarProgresso();
  window.scrollTo({ top: 0 });
}

function selecionar(el) {
  const qid = el.dataset.questao;
  estado.respostas[qid] = el.dataset.valor;
  el.querySelector("input").checked = true;
  document.querySelectorAll(`[data-questao-card="${qid}"] .alt`)
    .forEach((a) => a.classList.toggle("is-selected", a === el));
  salvarRascunho();
  atualizarProgresso();
}

function atualizarProgresso() {
  const total = estado.questoes.length;
  const feitas = Object.keys(estado.respostas).length;
  const host = document.querySelector("[data-tela='prova']");
  host.querySelector("[data-fill]").style.width = (feitas / total * 100) + "%";
  host.querySelector("[data-contador]").textContent = `${feitas} de ${total} respondidas`;
  const faltam = total - feitas;
  host.querySelector("[data-aviso-faltam]").textContent =
    faltam > 0 ? `Faltam ${faltam} questão(ões). Itens em branco contam como erro.` : "Tudo respondido. Pode enviar!";
}

// ---------------------------------------------------------------- correção
async function enviarProva() {
  const total = estado.questoes.length;
  const feitas = Object.keys(estado.respostas).length;
  if (feitas < total && !confirm(`Há ${total - feitas} questão(ões) sem resposta. Deseja enviar mesmo assim?`)) return;

  const btn = document.querySelector("[data-enviar]");
  travarBtn(btn, true, "Corrigindo no servidor…");

  // A nota, os acertos e o aprovado são calculados NO BANCO.
  const { data, error } = await sb.rpc("corrigir_prova", {
    p_prova_id: estado.prova.id,
    p_respostas: estado.respostas,
    p_instrutor_id: estado.instrutorId,
  });

  if (error || !data || !data.tentativa) {
    console.error(error);
    travarBtn(btn, false, "Enviar e ver resultado");
    alert("Não foi possível registrar a tentativa. " +
      (error?.message ? "Detalhe: " + error.message : "Tente novamente."));
    return;
  }

  limparRascunho();
  estado.ultimaTentativa = data.tentativa;

  // Mapa questaoId -> {correta, justificativa} para a tela de revisão.
  const gabarito = {};
  (data.gabarito || []).forEach((g) => { gabarito[g.questao_id] = g; });
  renderResultado(data.tentativa, gabarito);
}

function renderResultado(t, gabarito) {
  mostrarTela("resultado");
  const host = document.querySelector("[data-tela='resultado']");
  const aprovado = t.aprovado;
  const codigo = t.codigo_cert || gerarCodigoCert(t.id);
  const urlVerificacao = new URL("verificar.html", window.location.href).href;

  // Revisão: para cada questão, mostra a marcada e a correta (o gabarito
  // só chegou ao navegador DEPOIS da correção no servidor).
  const revisao = estado.questoes.map((q, idx) => {
    const marcada = (t.respostas || {})[q.id];
    const correta = gabarito[q.id]?.correta;
    const alts = q.alternativas.map((a) => {
      let cls = "alt", tag = "";
      if (a.id === correta) { cls += " is-correct"; tag = '<span class="alt__tag">Correta</span>'; }
      else if (a.id === marcada) { cls += " is-wrong"; tag = '<span class="alt__tag">Sua resposta</span>'; }
      return `<div class="${cls}"><span class="alt__key">${a.id})</span><span>${escaparHtml(a.texto)}</span>${tag}</div>`;
    }).join("");
    return `<article class="questao">
      <p class="questao__enunciado"><span class="questao__num">${idx + 1}</span>${renderTextoQuestao(q.enunciado)}</p>
      <div class="alts">${alts}</div></article>`;
  }).join("");

  host.innerHTML = `
    <div class="card resultado ${aprovado ? "resultado--ok" : "resultado--reprovado"}">
      <div class="eyebrow">${escaparHtml(t.prova_titulo)}</div>
      <div class="resultado__nota">${fmtNota(t.nota)}</div>
      <div class="resultado__faixa">${t.acertos} de ${t.total} acertos</div>
      <div class="${aprovado ? "selo selo--ok" : "selo selo--reprovado"}">
        ${aprovado ? "✓ Homologado" : "Não atingiu a nota mínima (7,0)"}
      </div>
      <hr class="trilho" />
      <div class="toolbar" style="justify-content:center">
        <button class="btn btn--primary" data-pdf>Baixar certificado (PDF)</button>
        <a class="btn btn--ghost" href="perfil.html">Ver meu histórico</a>
      </div>
      <p class="muted small" style="margin-top:1rem">
        Código de verificação: <b>${escaparHtml(codigo)}</b><br>
        Qualquer pessoa pode validar este certificado em <a href="verificar.html">${escaparHtml(urlVerificacao)}</a>
      </p>
    </div>
    <h2 style="margin-top:1.6rem">Revisão da prova</h2>
    <p class="muted">Confira o gabarito de cada questão.</p>
    ${revisao}`;

  host.querySelector("[data-pdf]").addEventListener("click", async (e) => {
    travarBtn(e.target, true, "Gerando…");
    await gerarCertificadoPDF({
      aluno_nome: t.aluno_nome, matricula: estado.perfil.matricula,
      prova_titulo: t.prova_titulo, nota: t.nota, acertos: t.acertos, total: t.total,
      aprovado: t.aprovado, instrutor_nome: t.instrutor_nome, realizado_em: t.realizado_em,
      nota_minima: estado.prova.nota_minima ?? 7, codigo, area: estado.perfil.area,
      url_verificacao: urlVerificacao,
    });
    travarBtn(e.target, false, "Baixar certificado (PDF)");
  });
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- util
function mostrarTela(nome) {
  document.querySelectorAll("[data-tela]").forEach((s) =>
    s.classList.toggle("hidden", s.dataset.tela !== nome));
}
function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function travarBtn(btn, on, txt) { if (btn) { btn.disabled = on; if (txt) btn.textContent = txt; } }
