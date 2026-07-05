// =====================================================================
// dashboard.js — painel exclusivo do Administrador (dashboard.html)
// Alívio de Tensão: KPIs + gráficos das tentativas + histórico legado,
// filtrados pelo treinamento selecionado no menu superior.
// =====================================================================

const CORES = {
  azul: "#003865",
  azulClaro: "#32A6E6",
  verde: "#1E9F7F",
  verdeClaro: "#7FE06C",
  erro: "#D84545",
  aviso: "#E0A824",
  cinza: "#6D838E",
};

const painel = {
  perfil: null,
  tentativas: [],
  alunos: [],
  historicoAlivio: [],
  charts: {},
};

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina({ requerAdmin: true });
  if (!perfil) return;
  painel.perfil = perfil;
  painel.subarea = perfil.area === "alivio_tensao" ? getSubareaEscolhida() : null;

  const [tentativas, alunos, historicoAlivio] = await Promise.all([
    carregarTentativas(perfil.area),
    carregarAlunos(perfil.area),
    carregarHistoricoAlivio(perfil.area, painel.subarea),
  ]);

  // Em Alívio de Tensão, o painel mostra só o treinamento selecionado no menu.
  painel.tentativas = painel.subarea
    ? tentativas.filter((t) => subareaDoRegistro(t) === painel.subarea)
    : tentativas;
  painel.alunos = alunos;
  painel.historicoAlivio = historicoAlivio;

  Chart.defaults.font.family = '"Cera Pro", Verdana, Geneva, Tahoma, sans-serif';
  Chart.defaults.color = "#282B35";

  if (perfil.area === "alivio_tensao") {
    renderPainelAlivioTensao();
  } else {
    renderPainelPadrao();
  }
});

// --------------------------------------------------------------- carga
async function carregarTentativas(area) {
  const { data, error } = await sb.from("tentativas").select("*").eq("area", area);
  if (error) { console.error(error); return []; }
  return data || [];
}
async function carregarAlunos(area) {
  const { data, error } = await sb
    .from("profiles").select("id, nome, criado_em, role, area").eq("area", area).eq("role", "aluno");
  if (error) { console.error(error); return []; }
  return data || [];
}

async function carregarHistoricoAlivio(area, subarea) {
  // Cada registro do histórico pertence a um treinamento (coluna subarea);
  // o painel mostra o treinamento selecionado no menu do topo.
  if (area !== "alivio_tensao" || !subarea) return [];
  const { data, error } = await sb
    .from("historico_alivio_tensao")
    .select("*")
    .eq("subarea", subarea)
    .not("nota", "is", null)
    .order("data_inicio", { ascending: false });

  if (error) {
    console.error("Erro ao carregar o histórico (rode sql/historico-alivio-tensao.sql):", error.message);
    return [];
  }
  return normalizarHistoricoLegado(data || []);
}

// =====================================================================
// PAINEL PADRÃO (reserva — o painel usado é o de histórico abaixo)
// =====================================================================
function renderPainelPadrao() {
  document.querySelector("[data-filtros-historico]")?.classList.add("hidden");
  renderGradePadrao();
  renderKPIs(painel.tentativas, painel.alunos);

  if (painel.tentativas.length === 0) {
    document.querySelector("[data-graficos]").innerHTML =
      `<div class="card center" style="grid-column:1/-1">
         <h3>Ainda não há provas realizadas</h3>
         <p class="muted">Os gráficos aparecem assim que os alunos começarem a fazer provas.</p>
       </div>`;
    return;
  }

  graficoDistribuicaoNotas(painel.tentativas);
  graficoTentativasPorMes(painel.tentativas);
  graficoAprovacao(painel.tentativas);
  graficoNovosAlunos(painel.alunos);
  graficoMediaPorProva(painel.tentativas);
}

function renderGradePadrao() {
  const host = document.querySelector("[data-graficos]");
  if (!host || host.dataset.tipo === "padrao") return;
  destruirGraficos();
  host.dataset.tipo = "padrao";
  host.innerHTML = `
    <div class="grafico-card">
      <h3>Distribuição de notas</h3>
      <div class="grafico-card__canvas"><canvas id="chart-notas"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Provas realizadas por mês</h3>
      <div class="grafico-card__canvas"><canvas id="chart-mes"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Aprovação x reprovação</h3>
      <div class="grafico-card__canvas"><canvas id="chart-aprovacao"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Novos alunos por mês</h3>
      <div class="grafico-card__canvas"><canvas id="chart-alunos"></canvas></div>
    </div>
    <div class="grafico-card" style="grid-column:1/-1">
      <h3>Média de nota por prova</h3>
      <div class="grafico-card__canvas"><canvas id="chart-prova"></canvas></div>
    </div>`;
}

// --------------------------------------------------------------- KPIs padrão
function renderKPIs(tentativas, alunos) {
  const host = document.querySelector("[data-kpis]");
  const total = tentativas.length;
  const aprovados = tentativas.filter((t) => t.aprovado).length;
  const taxa = total ? Math.round((aprovados / total) * 100) : 0;
  const media = total ? (tentativas.reduce((s, t) => s + Number(t.nota), 0) / total) : 0;

  host.innerHTML = `
    <div class="kpi">
      <div class="kpi__label">Alunos cadastrados</div>
      <div class="kpi__value">${alunos.length}</div>
      <div class="kpi__sub">no sistema</div>
    </div>
    <div class="kpi">
      <div class="kpi__label">Provas realizadas</div>
      <div class="kpi__value">${total}</div>
      <div class="kpi__sub">tentativas registradas</div>
    </div>
    <div class="kpi kpi--verde">
      <div class="kpi__label">Taxa de aprovação</div>
      <div class="kpi__value">${taxa}%</div>
      <div class="kpi__sub">${aprovados} de ${total} aprovados</div>
    </div>
    <div class="kpi">
      <div class="kpi__label">Média geral</div>
      <div class="kpi__value">${total ? fmtNota(media) : "—"}</div>
      <div class="kpi__sub">de todas as provas</div>
    </div>`;
}

// =====================================================================
// PAINEL ALÍVIO DE TENSÃO — tentativas + histórico
// =====================================================================
function renderPainelAlivioTensao() {
  const nomeTreinamento = getSubareaMeta(painel.subarea).nome;
  const cab = document.querySelector(".page__head");
  if (cab) {
    cab.innerHTML = `
      <div class="eyebrow">Área do administrador · Alívio de Tensão</div>
      <h1>Painel — ${escaparHtml(nomeTreinamento)}</h1>
      <p class="muted">Visão consolidada do histórico deste treinamento, com filtros para análise por empresa, gerência, local, modalidade, categoria, resultado e período.</p>`;
  }

  const dados = montarHistoricoAlivioCompleto();
  renderFiltrosHistorico(dados);
  aplicarFiltrosHistorico(dados);
}

function normalizarTexto(v) {
  return String(v ?? "").trim();
}
function chaveFiltro(v) {
  return normalizarTexto(v).toUpperCase();
}
function valorUtil(v) {
  const t = normalizarTexto(v);
  return t && t !== "—" ? t : "";
}
function notaNumero(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function aprovacaoNormalizada(v) {
  const s = chaveFiltro(v);
  if (s.includes("APROV")) return "APROVADO";
  if (s.includes("REPROV")) return "REPROVADO";
  return "NA";
}
function normalizarHistoricoLegado(registros) {
  return (registros || [])
  .map((r) => ({
    especificacao: normalizarTexto(r.especificacao),
    modalidade: normalizarTexto(r.modalidade),
    categoria: normalizarTexto(r.categoria),
    data_inicio: r.data_inicio || null,
    data_fim: r.data_fim || null,
    carga_horaria: normalizarTexto(r.carga_horaria),
    local: normalizarTexto(r.local),
    gerencia: normalizarTexto(r.gerencia),
    participante: normalizarTexto(r.participante),
    email: normalizarTexto(r.email),
    funcao: normalizarTexto(r.funcao),
    matricula: normalizarTexto(r.matricula),
    empresa: normalizarTexto(r.empresa),
    nota: notaNumero(r.nota),
    aprovacao: aprovacaoNormalizada(r.aprovacao),
    instrutor: normalizarTexto(r.instrutor || "—"),
  }))
  .filter((r) => r.nota !== null);
}

// Fonte única: a tabela historico_alivio_tensao já contém tanto os registros
// importados da planilha quanto as provas aplicadas no sistema (gatilho no banco).
function montarHistoricoAlivioCompleto() {
  const todos = normalizarHistoricoLegado(painel.historicoAlivio);
  todos.sort((a, b) => String(b.data_inicio || "").localeCompare(String(a.data_inicio || "")));
  return todos;
}

function opcoesUnicas(dados, campo, textoTodas) {
  const mapa = new Map();
  dados.forEach((r) => {
    const bruto = valorUtil(r[campo]);
    if (!bruto) return;
    const chave = chaveFiltro(bruto);
    if (!mapa.has(chave)) mapa.set(chave, bruto);
  });
  const itens = [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  return [`<option value="">${escaparHtml(textoTodas)}</option>`]
    .concat(itens.map(([chave, rotulo]) => `<option value="${escaparHtml(chave)}">${escaparHtml(rotulo)}</option>`))
    .join("");
}

function renderFiltrosHistorico(dados) {
  const host = document.querySelector("[data-filtros-historico]");
  if (!host) return;
  host.classList.remove("hidden");
  host.innerHTML = `
    <div class="card stack dashboard-filtros">
      <div class="card__title">
        <div>
          <h3>Filtros do histórico</h3>
          <p class="muted small" data-painel-resumo style="margin:.25rem 0 0"></p>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" data-limpar-filtros>Limpar filtros</button>
      </div>

      <div class="toolbar dashboard-filtros__grid">
        <div class="field dashboard-filtros__busca" style="margin:0">
          <label for="p-busca">Buscar</label>
          <input id="p-busca" class="input" placeholder="Participante, matrícula, função, local…" data-p-busca />
        </div>
        <div class="field" style="margin:0">
          <label for="p-empresa">Empresa</label>
          <select id="p-empresa" class="select" data-p-empresa>${opcoesUnicas(dados, "empresa", "Todas")}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-gerencia">Gerência</label>
          <select id="p-gerencia" class="select" data-p-gerencia>${opcoesUnicas(dados, "gerencia", "Todas")}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-local">Local</label>
          <select id="p-local" class="select" data-p-local>${opcoesUnicas(dados, "local", "Todos")}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-modalidade">Modalidade</label>
          <select id="p-modalidade" class="select" data-p-modalidade>${opcoesUnicas(dados, "modalidade", "Todas")}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-categoria">Categoria</label>
          <select id="p-categoria" class="select" data-p-categoria>${opcoesUnicas(dados, "categoria", "Todas")}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-resultado">Resultado</label>
          <select id="p-resultado" class="select" data-p-resultado>
            <option value="">Todos</option>
            <option value="APROVADO">Aprovados</option>
            <option value="REPROVADO">Reprovados</option>
            <option value="COM_NOTA">Com nota</option>
          </select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-especificacao">Especificação / prova</label>
          <select id="p-especificacao" class="select" data-p-especificacao>${opcoesUnicas(dados, "especificacao", "Todas")}</select>
        </div>
        <div class="field" style="margin:0">
          <label for="p-data-inicio">De</label>
          <input id="p-data-inicio" type="date" class="input" data-p-data-inicio />
        </div>
        <div class="field" style="margin:0">
          <label for="p-data-fim">Até</label>
          <input id="p-data-fim" type="date" class="input" data-p-data-fim />
        </div>
      </div>
    </div>`;

  const aplicar = () => aplicarFiltrosHistorico(dados);
  host.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener(el.tagName === "INPUT" && el.type === "text" ? "input" : "change", aplicar);
  });
  host.querySelector("[data-limpar-filtros]")?.addEventListener("click", () => {
    host.querySelectorAll("input, select").forEach((el) => { el.value = ""; });
    aplicar();
  });
}

function lerFiltrosHistorico() {
  const host = document.querySelector("[data-filtros-historico]");
  const val = (sel) => host?.querySelector(sel)?.value || "";
  return {
    busca: val("[data-p-busca]").trim().toLowerCase(),
    empresa: val("[data-p-empresa]"),
    gerencia: val("[data-p-gerencia]"),
    local: val("[data-p-local]"),
    modalidade: val("[data-p-modalidade]"),
    categoria: val("[data-p-categoria]"),
    resultado: val("[data-p-resultado]"),
    especificacao: val("[data-p-especificacao]"),
    dataInicio: val("[data-p-data-inicio]"),
    dataFim: val("[data-p-data-fim]"),
  };
}

function filtrarHistorico(dados, f) {
  return dados.filter((r) => {
    const textoBusca = [r.participante, r.email, r.matricula, r.funcao, r.local, r.gerencia, r.empresa, r.especificacao]
      .join(" ").toLowerCase();
    const data = String(r.data_inicio || "").slice(0, 10);

    if (f.busca && !textoBusca.includes(f.busca)) return false;
    if (f.empresa && chaveFiltro(r.empresa) !== f.empresa) return false;
    if (f.gerencia && chaveFiltro(r.gerencia) !== f.gerencia) return false;
    if (f.local && chaveFiltro(r.local) !== f.local) return false;
    if (f.modalidade && chaveFiltro(r.modalidade) !== f.modalidade) return false;
    if (f.categoria && chaveFiltro(r.categoria) !== f.categoria) return false;
    if (f.especificacao && chaveFiltro(r.especificacao) !== f.especificacao) return false;
    if (f.resultado === "COM_NOTA" && typeof r.nota !== "number") return false;
    if (["APROVADO", "REPROVADO"].includes(f.resultado) && r.aprovacao !== f.resultado) return false;
    if (f.dataInicio && (!data || data < f.dataInicio)) return false;
    if (f.dataFim && (!data || data > f.dataFim)) return false;
    return true;
  });
}

function aplicarFiltrosHistorico(dados) {
  const filtros = lerFiltrosHistorico();
  const linhas = filtrarHistorico(dados, filtros);
  const resumo = document.querySelector("[data-painel-resumo]");
  if (resumo) {
    const ativos = Object.values(filtros).filter(Boolean).length;
    resumo.textContent = `Exibindo ${linhas.length} de ${dados.length} registro(s)${ativos ? ` · ${ativos} filtro(s) ativo(s)` : ""}.`;
  }

  renderKPIsHistorico(linhas, dados);
  renderGraficosHistorico(linhas);
}

function renderKPIsHistorico(linhas, todos) {
  const host = document.querySelector("[data-kpis]");
  const notas = linhas.map((r) => r.nota).filter((n) => typeof n === "number" && Number.isFinite(n));
  const aprov = linhas.filter((r) => r.aprovacao === "APROVADO").length;
  const reprov = linhas.filter((r) => r.aprovacao === "REPROVADO").length;
  const avaliados = aprov + reprov;
  const taxa = avaliados ? Math.round((aprov / avaliados) * 100) : 0;
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const participantes = new Set(linhas.map((r) => chaveFiltro(r.participante)).filter(Boolean)).size;

  host.innerHTML = `
    <div class="kpi">
      <div class="kpi__label">Registros filtrados</div>
      <div class="kpi__value">${linhas.length}</div>
      <div class="kpi__sub">de ${todos.length} no histórico consolidado</div>
    </div>
    <div class="kpi">
      <div class="kpi__label">Participantes</div>
      <div class="kpi__value">${participantes}</div>
      <div class="kpi__sub">nomes únicos no recorte</div>
    </div>
    <div class="kpi kpi--verde">
      <div class="kpi__label">Taxa de aprovação</div>
      <div class="kpi__value">${avaliados ? `${taxa}%` : "—"}</div>
      <div class="kpi__sub">${aprov} aprovados · ${reprov} reprovados</div>
    </div>
    <div class="kpi">
      <div class="kpi__label">Média das notas</div>
      <div class="kpi__value">${media === null ? "—" : fmtNota(media)}</div>
      <div class="kpi__sub">${notas.length} registro(s) com nota</div>
    </div>`;
}

function renderGradeHistorico() {
  const host = document.querySelector("[data-graficos]");
  if (!host || host.dataset.tipo === "historico") return;
  destruirGraficos();
  host.dataset.tipo = "historico";
  host.innerHTML = `
    <div class="grafico-card">
      <h3>Registros por mês</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-mes"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Aprovação x reprovação</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-resultado"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Registros por empresa</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-empresa-qtd"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Média de nota por empresa</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-empresa-media"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Registros por gerência</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-gerencia"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Modalidade</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-modalidade"></canvas></div>
    </div>
    <div class="grafico-card">
      <h3>Categoria</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-categoria"></canvas></div>
    </div>
    <div class="grafico-card" style="grid-column:1/-1">
      <h3>Média por especificação / prova</h3>
      <div class="grafico-card__canvas"><canvas id="chart-hist-especificacao"></canvas></div>
    </div>`;
}

function renderGraficosHistorico(linhas) {
  if (!linhas.length) {
    destruirGraficos();
    const host = document.querySelector("[data-graficos]");
    host.dataset.tipo = "vazio";
    host.innerHTML = `<div class="card center" style="grid-column:1/-1">
      <h3>Nenhum registro encontrado</h3>
      <p class="muted">Altere ou limpe os filtros do histórico para voltar a exibir os gráficos.</p>
    </div>`;
    return;
  }

  renderGradeHistorico();
  graficoHistoricoPorMes(linhas);
  graficoHistoricoResultado(linhas);
  graficoHistoricoEmpresaQtd(linhas);
  graficoHistoricoEmpresaMedia(linhas);
  graficoHistoricoGerencia(linhas);
  graficoHistoricoModalidade(linhas);
  graficoHistoricoCategoria(linhas);
  graficoHistoricoEspecificacao(linhas);
}

// =====================================================================
// helpers gerais
// =====================================================================
function chaveMes(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sem data";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function rotuloMes(chave) {
  if (chave === "Sem data") return chave;
  const [a, m] = chave.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${a.slice(2)}`;
}
// Devolve as últimas N chaves de mês (inclui meses sem dados) terminando no mês atual.
function ultimosMeses(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
function novoGrafico(id, config) {
  const el = document.getElementById(id);
  if (!el) return;
  if (painel.charts[id]) painel.charts[id].destroy();
  painel.charts[id] = new Chart(el, config);
}
function destruirGraficos() {
  Object.values(painel.charts).forEach((chart) => chart?.destroy?.());
  painel.charts = {};
}
const eixoInteiro = { ticks: { precision: 0 }, beginAtZero: true };

function agruparContagem(linhas, campo, rotuloVazio = "Não informado") {
  const mapa = new Map();
  linhas.forEach((r) => {
    const rotulo = valorUtil(r[campo]) || rotuloVazio;
    mapa.set(rotulo, (mapa.get(rotulo) || 0) + 1);
  });
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}
function agruparMedia(linhas, campo, rotuloVazio = "Não informado") {
  const mapa = new Map();
  linhas.forEach((r) => {
    if (typeof r.nota !== "number" || !Number.isFinite(r.nota)) return;
    const rotulo = valorUtil(r[campo]) || rotuloVazio;
    if (!mapa.has(rotulo)) mapa.set(rotulo, []);
    mapa.get(rotulo).push(r.nota);
  });
  return [...mapa.entries()].map(([rotulo, notas]) => ({
    rotulo,
    qtd: notas.length,
    media: Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100,
  })).sort((a, b) => b.qtd - a.qtd);
}
function labelsCurtos(labels, tam = 22) {
  return labels.map((l) => String(l).length > tam ? String(l).slice(0, tam - 1) + "…" : String(l));
}
function mesesPresentes(linhas, limite = 18) {
  const meses = [...new Set(linhas.map((r) => chaveMes(r.data_inicio)).filter((m) => m !== "Sem data"))].sort();
  return meses.length > limite ? meses.slice(-limite) : meses;
}

// =====================================================================
// gráficos padrão
// =====================================================================
// 1) Distribuição de notas (faixas; destaque para o corte 7,0)
function graficoDistribuicaoNotas(tentativas) {
  const faixas = [
    { rotulo: "0–2", min: 0, max: 2 },
    { rotulo: "2–4", min: 2, max: 4 },
    { rotulo: "4–6", min: 4, max: 6 },
    { rotulo: "6–7", min: 6, max: 7 },
    { rotulo: "7–8", min: 7, max: 8 },
    { rotulo: "8–9", min: 8, max: 9 },
    { rotulo: "9–10", min: 9, max: 10.01 },
  ];
  const cont = faixas.map((f) => tentativas.filter((t) => {
    const n = Number(t.nota);
    return n >= f.min && n < f.max;
  }).length);
  const cores = faixas.map((f) => (f.min >= 7 ? CORES.verde : CORES.erro));

  novoGrafico("chart-notas", {
    type: "bar",
    data: {
      labels: faixas.map((f) => f.rotulo),
      datasets: [{ label: "Provas", data: cont, backgroundColor: cores, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: eixoInteiro },
    },
  });
}

// 2) Tentativas por mês (últimos 6 meses)
function graficoTentativasPorMes(tentativas) {
  const meses = ultimosMeses(6);
  const dados = meses.map((m) => tentativas.filter((t) => chaveMes(t.realizado_em) === m).length);
  novoGrafico("chart-mes", {
    type: "bar",
    data: {
      labels: meses.map(rotuloMes),
      datasets: [{ label: "Provas realizadas", data: dados, backgroundColor: CORES.azulClaro, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: eixoInteiro },
    },
  });
}

// 3) Aprovação x reprovação (doughnut)
function graficoAprovacao(tentativas) {
  const ap = tentativas.filter((t) => t.aprovado).length;
  const re = tentativas.length - ap;
  novoGrafico("chart-aprovacao", {
    type: "doughnut",
    data: {
      labels: ["Aprovados", "Reprovados"],
      datasets: [{ data: [ap, re], backgroundColor: [CORES.verde, CORES.erro], borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: { legend: { position: "bottom" } },
    },
  });
}

// 4) Novos alunos por mês (últimos 6 meses)
function graficoNovosAlunos(alunos) {
  const meses = ultimosMeses(6);
  const dados = meses.map((m) => alunos.filter((a) => chaveMes(a.criado_em) === m).length);
  novoGrafico("chart-alunos", {
    type: "line",
    data: {
      labels: meses.map(rotuloMes),
      datasets: [{
        label: "Novos alunos", data: dados, tension: .3,
        borderColor: CORES.azul, backgroundColor: "rgba(0,56,101,.12)",
        fill: true, pointBackgroundColor: CORES.azul, pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: eixoInteiro },
    },
  });
}

// 5) Média de nota por prova
function graficoMediaPorProva(tentativas) {
  const grupos = {};
  tentativas.forEach((t) => {
    (grupos[t.prova_titulo] = grupos[t.prova_titulo] || []).push(Number(t.nota));
  });
  const labels = Object.keys(grupos);
  const medias = labels.map((k) => {
    const arr = grupos[k];
    return Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 100) / 100;
  });

  novoGrafico("chart-prova", {
    type: "bar",
    data: {
      labels: labelsCurtos(labels),
      datasets: [{ label: "Média", data: medias, backgroundColor: CORES.azul, borderRadius: 6 }],
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, max: 10 } },
    },
  });
}

// =====================================================================
// gráficos do histórico de Alívio de Tensão
// =====================================================================
function graficoHistoricoPorMes(linhas) {
  const meses = mesesPresentes(linhas);
  const dados = meses.map((m) => linhas.filter((r) => chaveMes(r.data_inicio) === m).length);
  novoGrafico("chart-hist-mes", {
    type: "bar",
    data: {
      labels: meses.map(rotuloMes),
      datasets: [{ label: "Registros", data: dados, backgroundColor: CORES.azulClaro, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: eixoInteiro },
    },
  });
}

function graficoHistoricoResultado(linhas) {
  const ap = linhas.filter((r) => r.aprovacao === "APROVADO").length;
  const re = linhas.filter((r) => r.aprovacao === "REPROVADO").length;
  novoGrafico("chart-hist-resultado", {
    type: "doughnut",
    data: {
      labels: ["Aprovados", "Reprovados"],
      datasets: [{ data: [ap, re], backgroundColor: [CORES.verde, CORES.erro], borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: { legend: { position: "bottom" } },
    },
  });
}

function graficoHistoricoEmpresaQtd(linhas) {
  const itens = agruparContagem(linhas, "empresa").slice(0, 10);
  novoGrafico("chart-hist-empresa-qtd", {
    type: "bar",
    data: {
      labels: labelsCurtos(itens.map(([l]) => l), 18),
      datasets: [{ label: "Registros", data: itens.map(([, v]) => v), backgroundColor: CORES.azul, borderRadius: 6 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: eixoInteiro },
    },
  });
}

function graficoHistoricoEmpresaMedia(linhas) {
  const itens = agruparMedia(linhas, "empresa").slice(0, 10);
  novoGrafico("chart-hist-empresa-media", {
    type: "bar",
    data: {
      labels: labelsCurtos(itens.map((i) => i.rotulo), 18),
      datasets: [{ label: "Média", data: itens.map((i) => i.media), backgroundColor: CORES.verde, borderRadius: 6 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { afterLabel: (ctx) => `${itens[ctx.dataIndex]?.qtd || 0} nota(s)` } },
      },
      scales: { x: { beginAtZero: true, max: 10 } },
    },
  });
}

function graficoHistoricoGerencia(linhas) {
  const itens = agruparContagem(linhas, "gerencia").slice(0, 10);
  novoGrafico("chart-hist-gerencia", {
    type: "bar",
    data: {
      labels: labelsCurtos(itens.map(([l]) => l), 18),
      datasets: [{ label: "Registros", data: itens.map(([, v]) => v), backgroundColor: CORES.azulClaro, borderRadius: 6 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: eixoInteiro },
    },
  });
}

function graficoHistoricoModalidade(linhas) {
  const itens = agruparContagem(linhas, "modalidade").slice(0, 8);
  novoGrafico("chart-hist-modalidade", {
    type: "doughnut",
    data: {
      labels: itens.map(([l]) => l),
      datasets: [{ data: itens.map(([, v]) => v), backgroundColor: [CORES.azul, CORES.azulClaro, CORES.verde, CORES.aviso, CORES.cinza], borderWidth: 0 }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } },
  });
}

function graficoHistoricoCategoria(linhas) {
  const itens = agruparContagem(linhas, "categoria").slice(0, 10);
  novoGrafico("chart-hist-categoria", {
    type: "bar",
    data: {
      labels: labelsCurtos(itens.map(([l]) => l), 20),
      datasets: [{ label: "Registros", data: itens.map(([, v]) => v), backgroundColor: CORES.verdeClaro, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: eixoInteiro },
    },
  });
}

function graficoHistoricoEspecificacao(linhas) {
  const itens = agruparMedia(linhas, "especificacao").slice(0, 12);
  novoGrafico("chart-hist-especificacao", {
    type: "bar",
    data: {
      labels: labelsCurtos(itens.map((i) => i.rotulo), 52),
      datasets: [{ label: "Média", data: itens.map((i) => i.media), backgroundColor: CORES.azul, borderRadius: 6 }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { afterLabel: (ctx) => `${itens[ctx.dataIndex]?.qtd || 0} nota(s)` } },
      },
      scales: { x: { beginAtZero: true, max: 10 } },
    },
  });
}
