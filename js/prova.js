// =====================================================================
// prova.js — execução da prova (perfil aluno; admin usa para pré-visualizar)
// Seleciona prova -> confirma dados e instrutor -> responde -> correção
// -> grava tentativa -> resultado + certificado em PDF.
// =====================================================================

const estado = {
  perfil: null,
  provas: [],
  instrutores: [],
  prova: null,
  questoes: [],
  respostas: {},      // { questaoId: "b" }
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

  const opcoesInstrutor = estado.instrutores
    .map((a) => `<option value="${a.id}">${escaparHtml(a.nome)}</option>`)
    .join("") + `<option value="__outro">Outro (digitar)…</option>`;

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
        <label>Empresa</label>
        <input class="input" value="${escaparHtml(estado.perfil.empresa || "—")}" disabled />
      </div>

      <div class="field">
        <label for="sel-instrutor">Instrutor que aplica a prova</label>
        <select id="sel-instrutor" class="select" data-sel-instrutor>${opcoesInstrutor}</select>
        <input class="input hidden" data-instrutor-outro placeholder="Nome do instrutor" style="margin-top:.5rem" />
      </div>

      <div class="toolbar">
        <button class="btn btn--primary" data-iniciar>Iniciar prova</button>
        <span class="muted small">As questões são embaralhadas a cada tentativa.</span>
      </div>
    </div>`;

  const selProva = host.querySelector("[data-sel-prova]");
  const atualizaDesc = () => {
    const p = estado.provas.find((x) => x.id === selProva.value);
    host.querySelector("[data-prova-desc]").textContent = p ? (p.descricao || "") : "";
  };
  selProva.addEventListener("change", atualizaDesc);
  atualizaDesc();

  const selInstr = host.querySelector("[data-sel-instrutor]");
  const inpOutro = host.querySelector("[data-instrutor-outro]");
  selInstr.addEventListener("change", () => {
    inpOutro.classList.toggle("hidden", selInstr.value !== "__outro");
  });

  host.querySelector("[data-iniciar]").addEventListener("click", iniciarProva);
}

// ---------------------------------------------------------------- execução
async function iniciarProva() {
  const host = document.querySelector("[data-tela='inicio']");
  const provaId = host.querySelector("[data-sel-prova]").value;
  const selInstr = host.querySelector("[data-sel-instrutor]");
  const inpOutro = host.querySelector("[data-instrutor-outro]");

  // Define instrutor (selecionado ou digitado)
  let instrutorId = null, instrutorNome = "";
  if (selInstr.value === "__outro") {
    instrutorNome = inpOutro.value.trim();
    if (!instrutorNome) { inpOutro.focus(); inpOutro.style.borderColor = "var(--rumo-erro)"; return; }
  } else if (selInstr.value) {
    instrutorId = selInstr.value;
    instrutorNome = selInstr.options[selInstr.selectedIndex].text;
  }
  estado.instrutorId = instrutorId;
  estado.instrutorNome = instrutorNome;

  estado.prova = estado.provas.find((p) => p.id === provaId);
  const btn = host.querySelector("[data-iniciar]");
  travarBtn(btn, true, "Carregando…");

  // Questões SEM gabarito: a coluna "correta" não sai do banco antes da correção.
  const { data, error } = await sb.rpc("questoes_da_prova", { p_prova_id: provaId });
  if (error || !data || data.length === 0) {
    travarBtn(btn, false, "Iniciar prova");
    console.error(error);
    alert("Não foi possível carregar as questões desta prova." +
      (error ? " Detalhe: " + error.message : ""));
    return;
  }
  estado.questoes = embaralhar(data.slice());
  estado.respostas = {};
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
      <label class="alt" data-alt data-questao="${q.id}" data-valor="${a.id}">
        <input type="radio" name="q-${q.id}" value="${a.id}" />
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
  travarBtn(btn, true, "Corrigindo…");

  // A nota, os acertos e o aprovado são calculados NO BANCO (RPC corrigir_prova).
  // A tentativa gravada e o gabarito voltam na resposta.
  const { data, error } = await sb.rpc("corrigir_prova", {
    p_prova_id: estado.prova.id,
    p_respostas: estado.respostas,
    p_instrutor_id: estado.instrutorId || null,
    p_instrutor_nome: estado.instrutorNome || null,
  });

  if (error || !data || !data.tentativa) {
    console.error(error);
    travarBtn(btn, false, "Enviar e ver resultado");
    alert("Não foi possível registrar a tentativa. " +
      (error?.message ? "Detalhe: " + error.message : "Tente novamente."));
    return;
  }

  estado.ultimaTentativa = data.tentativa;
  const gabarito = {};
  (data.gabarito || []).forEach((g) => { gabarito[g.questao_id] = g; });
  renderResultado(data.tentativa, gabarito);
}

function renderResultado(t, gabarito) {
  mostrarTela("resultado");
  const host = document.querySelector("[data-tela='resultado']");
  const aprovado = t.aprovado;
  const codigo = t.codigo_cert || gerarCodigoCert(t.id);

  // Revisão: o gabarito só chegou ao navegador DEPOIS da correção no servidor.
  const revisao = estado.questoes.map((q, idx) => {
    const marcada = (t.respostas || {})[q.id];
    const correta = gabarito && gabarito[q.id] ? gabarito[q.id].correta : null;
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
        <a class="btn btn--ghost" href="${estado.perfil.role === "admin" ? "dashboard.html" : "perfil.html"}">
          ${estado.perfil.role === "admin" ? "Ir ao painel" : "Ver meu histórico"}
        </a>
      </div>
      <p class="muted small" style="margin-top:1rem">Código de verificação: ${codigo}</p>
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
