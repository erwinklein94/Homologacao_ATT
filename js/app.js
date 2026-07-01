// =====================================================================
// app.js — núcleo compartilhado por todas as páginas
// Cliente Supabase, sessão/perfil, guardas de acesso (admin/aluno),
// cabeçalho com navegação por papel e utilitários.
// =====================================================================

// ---- Cliente Supabase (UMD global vindo do CDN) ----
function criarCliente() {
  const cfg = window.SUPABASE_CONFIG || {};
  const url = cfg.url || "";
  // A chave "publishable" (sb_publishable_...) é pública; o RLS protege os dados.
  const key = cfg.publishableKey || cfg.anonKey || "";
  if (!url || url.includes("SEU-PROJETO") || !key || key.includes("COLE-AQUI")) {
    return null; // ainda não configurado
  }
  return window.supabase.createClient(url, key);
}
const sb = criarCliente();
window.sb = sb;

// Este site atende UMA área de homologação (repositório dedicado).
const AREA_FIXA = "alivio_tensao";
const AREAS_HOMOLOGACAO = {
  alivio_tensao: {
    id: "alivio_tensao",
    titulo: "Homologação Alívio de Tensão",
    subtitulo: "Alívio de Tensão",
    alunoLabel: "Aluno",
    descricao: "Ambiente interno para avaliação, homologação e acompanhamento de alunos em Alívio de Tensão.",
    rodape: "Rumo · Uso interno — Homologação Alívio de Tensão",
  },
};

// Treinamentos (sub-áreas) dentro de Alívio de Tensão.
// As provas e tentativas de alivio_tensao pertencem a um destes treinamentos.
const SUBAREAS_ALIVIO = {
  alivio_termico: { id: "alivio_termico", nome: "Alívio de tensão térmica" },
  prospeccao_trilhos: { id: "prospeccao_trilhos", nome: "Prospecção de trilhos" },
  operacao_verse: { id: "operacao_verse", nome: "Operação com verse" },
  temperaturas_neutras: { id: "temperaturas_neutras", nome: "Temperaturas neutras" },
};
const SUBAREA_PADRAO = "alivio_termico";

function subareaValida(sub) {
  return Object.prototype.hasOwnProperty.call(SUBAREAS_ALIVIO, sub);
}

function getSubareaEscolhida() {
  const salva = localStorage.getItem("homologacao_subarea");
  return subareaValida(salva) ? salva : SUBAREA_PADRAO;
}

function setSubareaEscolhida(sub) {
  if (subareaValida(sub)) localStorage.setItem("homologacao_subarea", sub);
}

function getSubareaMeta(sub) {
  return SUBAREAS_ALIVIO[sub] || SUBAREAS_ALIVIO[SUBAREA_PADRAO];
}

window.SUBAREAS_ALIVIO = SUBAREAS_ALIVIO;
window.getSubareaEscolhida = getSubareaEscolhida;
window.setSubareaEscolhida = setSubareaEscolhida;
window.getSubareaMeta = getSubareaMeta;

// Classifica um registro (prova/tentativa) de alivio_tensao pelo treinamento.
// Registros antigos sem coluna preenchida contam como Alívio de tensão térmica.
function subareaDoRegistro(r) {
  return subareaValida(r?.subarea) ? r.subarea : SUBAREA_PADRAO;
}
window.subareaDoRegistro = subareaDoRegistro;

function areaValida(area) {
  return area === AREA_FIXA;
}

function getAreaEscolhida() {
  return AREA_FIXA;
}

function setAreaEscolhida() { /* área fixa neste repositório */ }

function getAreaMeta() {
  return AREAS_HOMOLOGACAO[AREA_FIXA];
}

function urlLoginArea() {
  return "login.html";
}

window.AREAS_HOMOLOGACAO = AREAS_HOMOLOGACAO;
window.getAreaEscolhida = getAreaEscolhida;
window.setAreaEscolhida = setAreaEscolhida;
window.getAreaMeta = getAreaMeta;

// Banner amigável quando o config.js não foi preenchido.
function exigeConfig() {
  if (sb) return true;
  const alvo = document.querySelector("[data-config-aviso]") || document.body;
  const box = document.createElement("div");
  box.className = "alerta alerta--aviso";
  box.style.margin = "1rem auto";
  box.style.maxWidth = "680px";
  box.innerHTML =
    "<div><b>Falta configurar o Supabase.</b><br>" +
    "Abra <code>js/config.js</code> e preencha <code>url</code> e <code>publishableKey</code> " +
    "com os dados do projeto (Supabase &gt; Project Settings &gt; API Keys). Depois recarregue a página.</div>";
  alvo.prepend(box);
  return false;
}
window.exigeConfig = exigeConfig;

// ---- Sessão e perfil ----
async function getSessao() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session || null;
}

let _perfilCache = null;
let _perfilCacheKey = null;

function dadosPerfilPadrao(sessao, area, dados = {}) {
  const meta = sessao.user.user_metadata || {};
  return {
    id: sessao.user.id,
    nome: (dados.nome || meta.nome || (sessao.user.email || "").split("@")[0] || "").trim(),
    matricula: (dados.matricula || meta.matricula || null),
    area,
    role: "aluno",
  };
}

// Garante um perfil separado para a área escolhida.
// O projeto Supabase deste site é exclusivo de Alívio de Tensão.
async function garantirPerfilArea(areaPreferida = null, dados = {}) {
  const sessao = await getSessao();
  if (!sessao) return null;

  const area = areaValida(areaPreferida) ? areaPreferida : (getAreaEscolhida() || "solda");
  const cacheKey = `${sessao.user.id}:${area}`;
  if (_perfilCache && _perfilCacheKey === cacheKey) return _perfilCache;

  let { data, error } = await sb
    .from("profiles")
    .select("id, nome, matricula, role, area")
    .eq("id", sessao.user.id)
    .eq("area", area)
    .maybeSingle();

  if (error) { console.error("Erro ao carregar perfil:", error.message); return null; }

  // Autodefesa: a conta existe no Auth, mas ainda não tem perfil nesta área.
  // Cria o vínculo como aluno apenas para a área atual.
  if (!data) {
    const novo = dadosPerfilPadrao(sessao, area, dados);
    const ins = await sb
      .from("profiles")
      .insert(novo)
      .select("id, nome, matricula, role, area")
      .single();

    if (ins.error) {
      console.error("Falha ao criar perfil da área:", ins.error.message);
      return null;
    }
    data = ins.data;
  }

  _perfilCache = { ...data, email: sessao.user.email };
  _perfilCacheKey = cacheKey;
  return _perfilCache;
}

async function getPerfil(areaPreferida = null) {
  return garantirPerfilArea(areaPreferida || getAreaEscolhida());
}
window.getSessao = getSessao;
window.getPerfil = getPerfil;
window.garantirPerfilArea = garantirPerfilArea;
window.limparPerfilCache = function limparPerfilCache() {
  _perfilCache = null;
  _perfilCacheKey = null;
};

// ---- Guardas de acesso ----
// Em toda página protegida: sem sessão -> volta ao login.
// requerAdmin: além de logado, precisa ser admin; senão é mandado para a área do aluno.
async function protegerPagina({ requerAdmin = false } = {}) {
  if (!exigeConfig()) return null;
  const perfil = await getPerfil();
  if (!perfil) { window.location.replace(urlLoginArea(getAreaEscolhida())); return null; }
  setAreaEscolhida(perfil.area);
  if (requerAdmin && perfil.role !== "admin") {
    window.location.replace("prova.html");
    return null;
  }
  montarCabecalho(perfil);
  return perfil;
}
window.protegerPagina = protegerPagina;

// ---- Cabeçalho com navegação por papel ----
// Alunos NÃO recebem (nem veem referência a) páginas de administrador.
function montarCabecalho(perfil) {
  const host = document.querySelector("[data-topbar]");
  if (!host) return;
  const atual = location.pathname.split("/").pop() || "index.html";
  const ehAdmin = perfil.role === "admin";
  const area = getAreaMeta(perfil.area);

  const linksAdmin = [
    ["dashboard.html", "Painel"],
    ["admin.html", "Dados &amp; provas"],
    ["prova.html", "Aplicar prova"],
  ];
  const linksAluno = [
    ["prova.html", "Fazer prova"],
    ["perfil.html", "Meu perfil"],
  ];
  const links = (ehAdmin ? linksAdmin : linksAluno)
    .map(([href, txt]) => `<a href="${href}"${href === atual ? ' class="is-active"' : ""}>${txt}</a>`)
    .join("");

  const inicial = (perfil.nome || perfil.email || "?").trim().charAt(0).toUpperCase();
  const papel = ehAdmin
    ? '<span class="badge-role badge-role--admin">Administrador</span>'
    : '<span class="badge-role">Aluno</span>';

  // Menu de treinamentos: só para o administrador de Alívio de Tensão.
  // Define qual treinamento os painéis, o histórico e o editor de provas mostram.
  const mostrarSubareas = ehAdmin && perfil.area === "alivio_tensao";
  const subAtual = getSubareaEscolhida();
  const subnav = mostrarSubareas
    ? `<div class="subnav" aria-label="Treinamentos de Alívio de Tensão">
        <div class="subnav__inner">
          <span class="subnav__label">Treinamento:</span>
          ${Object.values(SUBAREAS_ALIVIO).map((s) =>
            `<button type="button" data-subarea-btn="${s.id}"${s.id === subAtual ? ' class="is-active"' : ""}>${escaparHtml(s.nome)}</button>`
          ).join("")}
        </div>
      </div>`
    : "";

  host.innerHTML = `
    <div class="topbar__inner">
      <a class="brand" href="${ehAdmin ? "dashboard.html" : "prova.html"}">
        <img src="assets/rumo-logo-branco.png" alt="Rumo" />
        <span class="brand__sep"></span>
        <span class="brand__app">${escaparHtml(area.titulo)}<span>${escaparHtml(area.subtitulo)}</span></span>
      </a>
      <nav class="nav" aria-label="Navegação principal">${links}</nav>
      <div class="user-chip">
        <div class="user-chip__name">
          <b>${escaparHtml(perfil.nome || perfil.email)}</b>
          ${papel}
        </div>
        <button class="btn btn--ghost btn--sm" data-sair>Sair</button>
      </div>
    </div>${subnav}`;

  host.querySelector("[data-sair]").addEventListener("click", sair);
  host.querySelectorAll("[data-subarea-btn]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.subareaBtn === getSubareaEscolhida()) return;
      setSubareaEscolhida(b.dataset.subareaBtn);
      window.location.reload();
    }));
}
window.montarCabecalho = montarCabecalho;

async function sair() {
  if (sb) await sb.auth.signOut();
  window.limparPerfilCache();
  window.location.replace("index.html");
}
window.sair = sair;

// ---- Utilitários ----
function escaparHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
window.escaparHtml = escaparHtml;

function fmtData(iso, comHora = true) {
  if (!iso) return "—";
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR");
  if (!comHora) return data;
  return data + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
window.fmtData = fmtData;

function fmtNota(n) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
window.fmtNota = fmtNota;

// Identificador curto e legível para o certificado.
function gerarCodigoCert(tentativaId) {
  const base = (tentativaId || crypto.randomUUID()).replace(/-/g, "").toUpperCase();
  return "HSA-" + base.slice(0, 8);
}
window.gerarCodigoCert = gerarCodigoCert;
