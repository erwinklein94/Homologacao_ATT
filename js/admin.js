// =====================================================================
// admin.js — página exclusiva do Administrador (admin.html)
// 1) Atividades: todas as tentativas dos alunos (nota, data, instrutor) com filtros.
// 2) Provas & questões: editor para criar/alterar provas e suas questões.
// Inclui o botão que carrega as provas padrão da área (window.PROVAS_SEEDS).
// =====================================================================

const adm = {
  perfil: null,
  subarea: null,       // treinamento selecionado (só em alivio_tensao)
  provas: [],          // lista de provas (id, codigo, titulo, ...)
  historico: [],       // histórico unificado (tabela historico_alivio_tensao)
  provaSel: null,      // prova aberta no editor
  questoes: [],        // questões da prova aberta (estado editável em memória)
};

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina({ requerAdmin: true });
  if (!perfil) return;
  adm.perfil = perfil;
  adm.subarea = perfil.area === "alivio_tensao" ? getSubareaEscolhida() : null;

  if (adm.subarea) {
    const titulo = document.querySelector(".page__head h1");
    if (titulo) titulo.textContent = `Dados & provas — ${getSubareaMeta(adm.subarea).nome}`;
  }

  ligarAbas();
  await Promise.all([carregarProvas(), carregarHistoricoAlivio()]);

  conferirSeed();
  renderListaProvas();
  configurarHistorico();
});

// --------------------------------------------------------------- carga
async function carregarProvas() {
  const { data, error } = await sb
    .from("provas")
    .select("*")
    .eq("area", adm.perfil.area)
    .order("codigo");
  if (error) { console.error(error); adm.provas = []; return; }
  // Em Alívio de Tensão, mostra só as provas do treinamento selecionado.
  adm.provas = (data || []).filter((p) => !adm.subarea || subareaDoRegistro(p) === adm.subarea);
}

// Histórico importado da planilha, mantido no Supabase e editável pelo
// administrador (tabela public.historico_alivio_tensao).
// Cada registro pertence a um dos 4 treinamentos (coluna subarea); a aba
// Histórico mostra o treinamento selecionado no menu do topo.
async function carregarHistoricoAlivio() {
  if (adm.perfil?.area !== "alivio_tensao" || !adm.subarea) { adm.historico = []; return; }

  const { data, error } = await sb
    .from("historico_alivio_tensao")
    .select("*")
    .eq("subarea", adm.subarea)
    .order("data_inicio", { ascending: false });
  if (error) {
    console.error("Erro ao carregar o histórico (rode sql/historico-alivio-tensao.sql):", error.message);
    adm.historico = [];
    return;
  }
  // O PostgREST pode devolver numeric como texto; garante nota numérica.
  adm.historico = (data || [])
    .map((r) => ({ ...r, nota: (r.nota === null || r.nota === undefined || r.nota === "") ? null : Number(r.nota) }));
}

// --------------------------------------------------------------- abas
function ligarAbas() {
  const abas = document.querySelectorAll("[data-aba]");
  abas.forEach((b) => b.addEventListener("click", () => {
    abas.forEach((x) => x.classList.toggle("is-active", x === b));
    const alvo = b.dataset.aba;
    document.querySelectorAll("[data-painel-aba]").forEach((p) =>
      p.classList.toggle("hidden", p.dataset.painelAba !== alvo));
  }));
}

// =====================================================================
// 1) HISTÓRICO — fonte única de registros
// A tabela historico_alivio_tensao guarda tanto os registros importados
// da planilha quanto as provas aplicadas no sistema (um gatilho no banco
// grava cada tentativa nova aqui automaticamente). Tudo é editável.
// =====================================================================
function configurarHistorico() {
  if (adm.perfil?.area !== "alivio_tensao") return;
  renderHistorico();
}

// dd/mm/aaaa sem depender de fuso (as datas legadas são só data, sem hora).
function fmtDataHist(v) {
  if (!v) return "—";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fmtData(v, false);
}

function renderHistorico() {
  const host = document.querySelector("[data-historico]");
  if (!host) return;
  // Fonte única: a tabela do banco (planilha + provas do sistema, sem distinção).
  const dados = adm.historico || [];

  // Empresas (deduplicadas por maiúsculas) para o filtro.
  const empresasMap = new Map();
  dados.forEach((r) => {
    const e = (r.empresa || "").trim();
    if (e && e !== "—") { const u = e.toUpperCase(); if (!empresasMap.has(u)) empresasMap.set(u, u); }
  });
  const opcoesEmpresa = ['<option value="">Todas as empresas</option>']
    .concat([...empresasMap.keys()].sort().map((e) => `<option value="${escaparHtml(e)}">${escaparHtml(e)}</option>`))
    .join("");

  host.innerHTML = `
    <div class="card stack">
      <div>
        <p class="muted" style="margin:0 0 1rem">
          Histórico do treinamento <b>${escaparHtml(getSubareaMeta(adm.subarea).nome)}</b>: todos os registros em um só lugar —
          as provas feitas pelos alunos no site entram aqui automaticamente e tudo pode ser editado.
        </p>
        <div class="kpis" data-hist-kpis></div>
      </div>

      <div class="card card--chanfro stack hidden" data-hist-form-card>
        <h2 style="margin:0" data-hist-form-titulo>Novo registro do histórico</h2>
        <form data-hist-form novalidate>
          <div class="row">
            <div class="field" style="flex:2;min-width:240px">
              <label for="hf-participante">Participante</label>
              <input id="hf-participante" class="input" name="participante" required placeholder="Nome do participante" />
            </div>
            <div class="field" style="flex:1;min-width:220px">
              <label for="hf-email">E-mail</label>
              <input id="hf-email" class="input" type="email" name="email" placeholder="email@empresa.com" />
            </div>
            <div class="field" style="min-width:170px">
              <label for="hf-matricula">Matrícula / CPF</label>
              <input id="hf-matricula" class="input" name="matricula" placeholder="Matrícula ou CPF" />
            </div>
            <div class="field" style="flex:1;min-width:170px">
              <label for="hf-funcao">Função</label>
              <input id="hf-funcao" class="input" name="funcao" placeholder="Ex.: Encarregado" />
            </div>
            <div class="field" style="min-width:150px">
              <label for="hf-empresa">Empresa</label>
              <input id="hf-empresa" class="input" name="empresa" placeholder="Ex.: Rumo" />
            </div>
          </div>
          <div class="row">
            <div class="field" style="flex:2;min-width:280px">
              <label for="hf-especificacao">Especificação técnica / orientação</label>
              <input id="hf-especificacao" class="input" name="especificacao" placeholder="Ex.: MAN-VP-L-PRO-TR-0036-01 – ALÍVIO DE TENSÕES…" />
            </div>
            <div class="field" style="min-width:140px">
              <label for="hf-modalidade">Modalidade</label>
              <select id="hf-modalidade" class="select" name="modalidade">
                <option value="TEÓRICO">Teórico</option>
                <option value="PRÁTICO">Prático</option>
              </select>
            </div>
            <div class="field" style="min-width:160px">
              <label for="hf-categoria">Categoria</label>
              <select id="hf-categoria" class="select" name="categoria">
                <option value="HOMOLOGAÇÃO">Homologação</option>
                <option value="CAPACITAÇÃO">Capacitação</option>
              </select>
            </div>
            <div class="field" style="min-width:210px">
              <label for="hf-subarea">Treinamento</label>
              <select id="hf-subarea" class="select" name="subarea">
                ${Object.values(window.SUBAREAS_ALIVIO).map((s) =>
                  `<option value="${s.id}">${escaparHtml(s.nome)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="row">
            <div class="field" style="min-width:160px">
              <label for="hf-data-inicio">Data início</label>
              <input id="hf-data-inicio" class="input" type="date" name="data_inicio" required />
            </div>
            <div class="field" style="min-width:160px">
              <label for="hf-data-fim">Data fim</label>
              <input id="hf-data-fim" class="input" type="date" name="data_fim" />
            </div>
            <div class="field" style="min-width:120px">
              <label for="hf-carga">Carga horária</label>
              <input id="hf-carga" class="input" name="carga_horaria" placeholder="Ex.: 8h" />
            </div>
            <div class="field" style="flex:1;min-width:170px">
              <label for="hf-local">Local</label>
              <input id="hf-local" class="input" name="local" placeholder="Ex.: ARARAQUARA/SP" />
            </div>
            <div class="field" style="min-width:140px">
              <label for="hf-gerencia">Gerência</label>
              <input id="hf-gerencia" class="input" name="gerencia" placeholder="Ex.: SP NORTE" />
            </div>
          </div>
          <div class="row">
            <div class="field" style="min-width:120px">
              <label for="hf-nota">Nota</label>
              <input id="hf-nota" class="input" type="number" step="0.01" min="0" max="10" name="nota" required placeholder="0 a 10" />
            </div>
            <div class="field" style="min-width:160px">
              <label for="hf-aprovacao">Resultado</label>
              <select id="hf-aprovacao" class="select" name="aprovacao">
                <option value="APROVADO">Aprovado</option>
                <option value="REPROVADO">Reprovado</option>
              </select>
            </div>
            <div class="field" style="flex:1;min-width:200px">
              <label for="hf-instrutor">Instrutor / Fiscal</label>
              <input id="hf-instrutor" class="input" name="instrutor" placeholder="Nome do instrutor" />
            </div>
          </div>
          <div class="toolbar">
            <button class="btn btn--success" type="submit" data-hist-salvar>Salvar registro</button>
            <button class="btn btn--ghost" type="button" data-hist-cancelar>Cancelar</button>
            <span class="spacer"></span>
            <span class="muted small" data-hist-status></span>
          </div>
        </form>
      </div>

      <div class="toolbar">
        <div class="field" style="margin:0;flex:1;min-width:200px">
          <label for="h-part">Buscar participante</label>
          <input id="h-part" class="input" placeholder="Nome do participante…" data-h-part />
        </div>
        <div class="field" style="margin:0;min-width:190px">
          <label for="h-empresa">Empresa</label>
          <select id="h-empresa" class="select" data-h-empresa>${opcoesEmpresa}</select>
        </div>
        <div class="field" style="margin:0;min-width:150px">
          <label for="h-modalidade">Modalidade</label>
          <select id="h-modalidade" class="select" data-h-modalidade>
            <option value="">Todas</option>
            <option value="TEÓRICO">Teórico</option>
            <option value="PRÁTICO">Prático</option>
          </select>
        </div>
        <div class="field" style="margin:0;min-width:160px">
          <label for="h-result">Resultado</label>
          <select id="h-result" class="select" data-h-result>
            <option value="">Todos</option>
            <option value="ok">Aprovados</option>
            <option value="reprov">Reprovados</option>
          </select>
        </div>
        <div class="field" style="margin:0;align-self:flex-end;display:flex;gap:.5rem">
          <button class="btn btn--ghost" type="button" data-hist-exportar>⬇ Exportar Excel</button>
          <button class="btn btn--primary" type="button" data-hist-novo>Adicionar registro</button>
        </div>
      </div>
      <div data-hist-tabela></div>
    </div>`;

  const aplicar = () => desenharTabelaHistorico(dados, {
    part: host.querySelector("[data-h-part]").value.trim().toLowerCase(),
    empresa: host.querySelector("[data-h-empresa]").value,
    modalidade: host.querySelector("[data-h-modalidade]").value,
    result: host.querySelector("[data-h-result]").value,
  });
  host.querySelector("[data-h-part]").addEventListener("input", aplicar);
  host.querySelector("[data-h-empresa]").addEventListener("change", aplicar);
  host.querySelector("[data-h-modalidade]").addEventListener("change", aplicar);
  host.querySelector("[data-h-result]").addEventListener("change", aplicar);

  host.querySelector("[data-hist-novo]").addEventListener("click", () => abrirFormHistorico(null));
  host.querySelector("[data-hist-exportar]").addEventListener("click", exportarHistoricoExcel);
  host.querySelector("[data-hist-cancelar]").addEventListener("click", fecharFormHistorico);
  host.querySelector("[data-hist-form]").addEventListener("submit", salvarRegistroHistorico);
  aplicar();
}

// Exporta o recorte atual do histórico (respeitando os filtros) para .xlsx.
function exportarHistoricoExcel() {
  const linhas = adm.historicoFiltrado || [];
  if (!linhas.length) {
    alert("Não há registros para exportar com os filtros atuais.");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("Não foi possível carregar a biblioteca de exportação. Verifique sua conexão e recarregue a página.");
    return;
  }

  const capitalizar = (s) => (s && s !== "—") ? s.charAt(0) + s.slice(1).toLowerCase() : "";
  const dados = linhas.map((r) => ({
    "Data": fmtDataHist(r.data_inicio),
    "Participante": r.participante || "",
    "E-mail": r.email || "",
    "Especificação técnica / orientação": r.especificacao || "",
    "Função": r.funcao || "",
    "Empresa": r.empresa || "",
    "Matrícula/CPF": r.matricula || "",
    "Local": r.local || "",
    "Gerência": r.gerencia || "",
    "Modalidade": capitalizar(r.modalidade),
    "Categoria": capitalizar(r.categoria),
    "Instrutor/Fiscal": r.instrutor || "",
    "Nota": (typeof r.nota === "number" && !isNaN(r.nota)) ? r.nota : "",
    "Resultado": r.aprovacao || "",
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  // Larguras de coluna aproximadas para o arquivo abrir legível.
  ws["!cols"] = [
    { wch: 11 }, { wch: 26 }, { wch: 26 }, { wch: 46 }, { wch: 24 }, { wch: 14 },
    { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 11 }, { wch: 13 }, { wch: 22 },
    { wch: 7 }, { wch: 11 },
  ];
  const wb = XLSX.utils.book_new();
  const nomeTreino = (window.getSubareaMeta ? getSubareaMeta(adm.subarea).nome : "Histórico").slice(0, 28);
  XLSX.utils.book_append_sheet(wb, ws, nomeTreino);

  const hoje = new Date().toISOString().slice(0, 10);
  // O id da subárea já é um slug ASCII (ex.: alivio_termico), evita lidar com acentos.
  const slug = (adm.subarea || "historico").replace(/_/g, "-");
  XLSX.writeFile(wb, `historico-${slug}-${hoje}.xlsx`);
}

// ------------------------- edição do histórico (registros da planilha) ----
let histEditandoId = null;

function abrirFormHistorico(id) {
  histEditandoId = id || null;
  const card = document.querySelector("[data-hist-form-card]");
  const form = document.querySelector("[data-hist-form]");
  const titulo = document.querySelector("[data-hist-form-titulo]");
  if (!card || !form) return;

  form.reset();
  document.querySelector("[data-hist-status]").textContent = "";

  if (id) {
    const r = (adm.historico || []).find((x) => x.id === id);
    if (!r) return;
    titulo.textContent = `Editar registro — ${r.participante || ""}`;
    form.participante.value = r.participante || "";
    form.email.value = r.email || "";
    form.matricula.value = r.matricula || "";
    form.funcao.value = r.funcao || "";
    form.empresa.value = r.empresa || "";
    form.instrutor.value = r.instrutor || "";
    form.especificacao.value = r.especificacao || "";
    form.modalidade.value = (r.modalidade || "TEÓRICO").toUpperCase();
    form.categoria.value = (r.categoria || "HOMOLOGAÇÃO").toUpperCase();
    form.data_inicio.value = (r.data_inicio || "").slice(0, 10);
    form.data_fim.value = (r.data_fim || "").slice(0, 10);
    form.carga_horaria.value = r.carga_horaria || "";
    form.local.value = r.local || "";
    form.gerencia.value = r.gerencia || "";
    form.nota.value = (r.nota === null || r.nota === undefined) ? "" : r.nota;
    form.aprovacao.value = r.aprovacao === "REPROVADO" ? "REPROVADO" : "APROVADO";
    form.subarea.value = subareaValida(r.subarea) ? r.subarea : adm.subarea;
  } else {
    titulo.textContent = "Novo registro do histórico";
    form.subarea.value = adm.subarea;
  }

  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharFormHistorico() {
  histEditandoId = null;
  const card = document.querySelector("[data-hist-form-card]");
  if (card) card.classList.add("hidden");
}

async function salvarRegistroHistorico(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const status = document.querySelector("[data-hist-status]");
  const btn = form.querySelector("[data-hist-salvar]");

  const participante = form.participante.value.trim();
  const dataInicio = form.data_inicio.value;
  const nota = parseFloat(form.nota.value);

  if (!participante) { status.textContent = "Informe o participante."; form.participante.focus(); return; }
  if (!dataInicio) { status.textContent = "Informe a data de início."; form.data_inicio.focus(); return; }
  if (isNaN(nota) || nota < 0 || nota > 10) { status.textContent = "Informe uma nota entre 0 e 10."; form.nota.focus(); return; }

  const registro = {
    participante,
    email: form.email.value.trim(),
    matricula: form.matricula.value.trim(),
    funcao: form.funcao.value.trim(),
    empresa: form.empresa.value.trim(),
    instrutor: form.instrutor.value.trim(),
    especificacao: form.especificacao.value.trim(),
    modalidade: form.modalidade.value,
    categoria: form.categoria.value,
    data_inicio: dataInicio,
    data_fim: form.data_fim.value || dataInicio,
    carga_horaria: form.carga_horaria.value.trim(),
    local: form.local.value.trim(),
    gerencia: form.gerencia.value.trim(),
    nota,
    aprovacao: form.aprovacao.value,
    subarea: subareaValida(form.subarea.value) ? form.subarea.value : adm.subarea,
  };

  btn.disabled = true;
  status.textContent = "Salvando…";

  const q = histEditandoId
    ? sb.from("historico_alivio_tensao").update({ ...registro, atualizado_em: new Date().toISOString() }).eq("id", histEditandoId)
    : sb.from("historico_alivio_tensao").insert(registro);
  const { error } = await q;

  btn.disabled = false;
  if (error) {
    status.textContent = "Erro ao salvar: " + error.message;
    return;
  }

  fecharFormHistorico();
  await carregarHistoricoAlivio();
  renderHistorico();
}

async function excluirRegistroHistorico(id) {
  const r = (adm.historico || []).find((x) => x.id === id);
  if (!r) return;
  const ok = confirm(`Excluir do histórico o registro de ${r.participante || "participante"} (${fmtDataHist(r.data_inicio)})? Essa ação não pode ser desfeita.`);
  if (!ok) return;
  const { error } = await sb.from("historico_alivio_tensao").delete().eq("id", id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  await carregarHistoricoAlivio();
  renderHistorico();
}

function desenharTabelaHistorico(dados, f) {
  const linhas = dados.filter((r) => {
    if (f.part && !(r.participante || "").toLowerCase().includes(f.part)) return false;
    if (f.empresa && (r.empresa || "").toUpperCase() !== f.empresa) return false;
    if (f.modalidade && (r.modalidade || "").toUpperCase() !== f.modalidade) return false;
    if (f.result === "ok" && r.aprovacao !== "APROVADO") return false;
    if (f.result === "reprov" && r.aprovacao !== "REPROVADO") return false;
    return true;
  });

  // Guarda o recorte atual para o botão "Exportar Excel" usar os mesmos filtros.
  adm.historicoFiltrado = linhas;

  // KPIs sobre o recorte filtrado.
  const kpis = document.querySelector("[data-hist-kpis]");
  if (kpis) {
    const notas = linhas.map((r) => r.nota).filter((n) => typeof n === "number" && !isNaN(n));
    const aprov = linhas.filter((r) => r.aprovacao === "APROVADO").length;
    const reprov = linhas.filter((r) => r.aprovacao === "REPROVADO").length;
    const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    kpis.innerHTML = `
      <div class="kpi"><div class="kpi__label">Registros</div><div class="kpi__value">${linhas.length}</div></div>
      <div class="kpi kpi--verde"><div class="kpi__label">Aprovados</div><div class="kpi__value">${aprov}</div></div>
      <div class="kpi"><div class="kpi__label">Reprovados</div><div class="kpi__value">${reprov}</div></div>
      <div class="kpi"><div class="kpi__label">Média das notas</div><div class="kpi__value">${media === null ? "—" : fmtNota(media)}</div><div class="kpi__sub">${notas.length} com nota lançada</div></div>`;
  }

  const host = document.querySelector("[data-hist-tabela]");
  if (linhas.length === 0) {
    host.innerHTML = `<p class="muted center" style="padding:1.4rem 0">Nenhum registro encontrado com esses filtros.</p>`;
    return;
  }

  const corpo = linhas.map((r) => {
    const badgeRes =
      r.aprovacao === "APROVADO" ? '<span class="badge badge--ok badge--dot">Aprovado</span>' :
      r.aprovacao === "REPROVADO" ? '<span class="badge badge--erro badge--dot">Reprovado</span>' :
      '<span class="badge badge--dot">—</span>';
    const nota = (typeof r.nota === "number" && !isNaN(r.nota)) ? `<b>${fmtNota(r.nota)}</b>` : '<span class="muted">—</span>';
    const modalidade = r.modalidade && r.modalidade !== "—"
      ? r.modalidade.charAt(0) + r.modalidade.slice(1).toLowerCase() : "—";
    return `<tr>
      <td class="nowrap">${fmtDataHist(r.data_inicio)}</td>
      <td>${escaparHtml(r.participante)}</td>
      <td>${escaparHtml(r.email || "—")}</td>
      <td style="max-width:260px">${escaparHtml(r.especificacao || "—")}</td>
      <td>${escaparHtml(r.funcao || "—")}</td>
      <td>${escaparHtml(r.empresa || "—")}</td>
      <td class="nowrap">${escaparHtml(r.matricula || "—")}</td>
      <td>${escaparHtml(r.local || "—")}</td>
      <td>${escaparHtml(r.gerencia || "—")}</td>
      <td>${escaparHtml(modalidade)}</td>
      <td>${escaparHtml(r.instrutor || "—")}</td>
      <td class="nowrap">${nota}</td>
      <td>${badgeRes}</td>
      <td class="nowrap">
        <button class="btn btn--ghost btn--sm" data-hist-editar="${r.id}">Editar</button>
        <button class="btn btn--danger btn--sm" data-hist-excluir="${r.id}">Excluir</button>
      </td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <p class="muted small" style="margin:.2rem 0 .6rem">${linhas.length} registro(s)</p>
    <div class="tabela-wrap tabela-wrap--compacta">
      <table class="tabela">
        <thead><tr>
          <th>Data</th><th>Participante</th><th>E-mail</th><th>Especificação técnica / orientação</th><th>Função</th><th>Empresa</th>
          <th>Matrícula/CPF</th><th>Local</th><th>Gerência</th><th>Modalidade</th>
          <th>Instrutor/Fiscal</th><th>Nota</th><th>Resultado</th><th>Ações</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;

  host.querySelectorAll("[data-hist-editar]").forEach((b) =>
    b.addEventListener("click", () => abrirFormHistorico(b.dataset.histEditar)));
  host.querySelectorAll("[data-hist-excluir]").forEach((b) =>
    b.addEventListener("click", () => excluirRegistroHistorico(b.dataset.histExcluir)));
}

// =====================================================================
// 2) PROVAS & QUESTÕES (editor)
// =====================================================================
function obterSeedArea() {
  let seeds = [];
  if (typeof window.getProvasSeed === "function") seeds = window.getProvasSeed(adm.perfil?.area) || [];
  else if (window.PROVAS_SEEDS && Array.isArray(window.PROVAS_SEEDS[adm.perfil?.area])) seeds = window.PROVAS_SEEDS[adm.perfil.area];
  else if (Array.isArray(window.PROVAS_SEED)) seeds = window.PROVAS_SEED;
  // Em Alívio de Tensão, só oferece as provas padrão do treinamento selecionado.
  return seeds.filter((p) => !adm.subarea || subareaDoRegistro(p) === adm.subarea);
}

function nomeAreaAtual() {
  const meta = window.getAreaMeta ? window.getAreaMeta(adm.perfil?.area) : null;
  return meta?.titulo || "esta área";
}

function conferirSeed() {
  const banner = document.querySelector("[data-seed-banner]");
  if (!banner) return;
  const semProvas = adm.provas.length === 0;
  const seedArea = obterSeedArea();
  const temSeed = Array.isArray(seedArea) && seedArea.length > 0;
  banner.classList.toggle("hidden", !(semProvas && temSeed));
  if (semProvas && temSeed) {
    banner.innerHTML = `
      <div class="alerta alerta--info" style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <b>Nenhuma prova cadastrada em ${escaparHtml(nomeAreaAtual())}.</b><br>
          Carregue as ${seedArea.length} provas padrão desta área no Supabase (você poderá editar tudo depois).
        </div>
        <button class="btn btn--primary" data-btn-seed>Carregar provas padrão da área</button>
      </div>`;
    banner.querySelector("[data-btn-seed]").addEventListener("click", (evt) => carregarSeed(evt));
  }
}

async function carregarSeed(e, opcoes = {}) {
  const btn = e?.target;
  const substituirArea = !!opcoes.substituirArea;
  const seedArea = obterSeedArea();
  if (!seedArea.length) {
    alert("Não há provas padrão configuradas para " + nomeAreaAtual() + ".");
    return;
  }
  travarBtn(btn, true, substituirArea ? "Substituindo…" : "Carregando…");
  try {
    if (substituirArea) {
      let del = sb.from("provas").delete().eq("area", adm.perfil.area);
      if (adm.subarea) del = del.eq("subarea", adm.subarea); // não apaga provas dos outros treinamentos
      const { error: e0 } = await del;
      if (e0) throw e0;
    }

    for (const p of seedArea) {
      // Cria/atualiza a prova pelo código (único por área) e devolve o id.
      const registroProva = { area: adm.perfil.area, codigo: p.codigo, titulo: p.titulo, descricao: p.descricao, nota_minima: p.nota_minima, ativo: true, atualizado_em: new Date().toISOString() };
      if (adm.subarea) registroProva.subarea = p.subarea || adm.subarea;
      const { data: prova, error: e1 } = await sb
        .from("provas")
        .upsert(registroProva, { onConflict: "area,codigo" })
        .select().single();
      if (e1) throw e1;

      // Substitui as questões dessa prova em UMA transação (RPC).
      const { error: e2 } = await sb.rpc("salvar_prova_completa", {
        p_prova_id: prova.id,
        p_titulo: prova.titulo,
        p_descricao: prova.descricao,
        p_nota_minima: prova.nota_minima,
        p_ativo: true,
        p_questoes: p.questoes.map((q) => ({
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          correta: q.correta,
          justificativa: q.justificativa || "",
        })),
      });
      if (e2) throw e2;
    }
    await carregarProvas();
    conferirSeed();
    renderListaProvas();
    alert(substituirArea ? "Provas da área substituídas com sucesso!" : "Provas carregadas com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Não foi possível carregar as provas: " + (err.message || err));
    travarBtn(btn, false, substituirArea ? "Substituir provas da área" : "Carregar provas padrão da área");
  }
}

function renderListaProvas() {
  const host = document.querySelector("[data-editor]");
  if (adm.provas.length === 0) {
    host.innerHTML = `
      <div class="card center">
        <h3>Nenhuma prova cadastrada</h3>
        <p class="muted">Use o botão acima para carregar as provas padrão da área, ou crie uma nova.</p>
        <button class="btn btn--primary" data-nova-prova>Criar prova em branco</button>
      </div>`;
    host.querySelector("[data-nova-prova]").addEventListener("click", criarProvaVazia);
    return;
  }

  const cards = adm.provas.map((p) => `
    <div class="row" style="align-items:center;justify-content:space-between;border:1px solid var(--borda);border-radius:var(--rumo-raio-sm);padding:.8rem 1rem">
      <div>
        <b>${escaparHtml(p.titulo)}</b>
        ${p.ativo ? '<span class="badge badge--ok badge--dot">Ativa</span>' : '<span class="badge badge--dot">Inativa</span>'}
        <div class="muted small">${escaparHtml(p.descricao || "")}</div>
      </div>
      <button class="btn btn--ghost btn--sm" data-editar="${p.id}">Editar</button>
    </div>`).join("");

  host.innerHTML = `
    <div class="stack">
      <div class="toolbar">
        <h2 style="margin:0">Provas cadastradas</h2>
        <span class="spacer"></span>
        ${adm.perfil?.area === "alivio_tensao" && obterSeedArea().length ? '<button class="btn btn--ghost btn--sm" data-reset-seed>Substituir provas do treinamento</button>' : ''}
        <button class="btn btn--ghost btn--sm" data-nova-prova>+ Nova prova</button>
      </div>
      ${cards}
    </div>
    <div data-editor-prova style="margin-top:1.2rem"></div>`;

  host.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => abrirEditor(b.dataset.editar)));
  const btnReset = host.querySelector("[data-reset-seed]");
  if (btnReset) {
    btnReset.addEventListener("click", (evt) => {
      const qtd = obterSeedArea().length;
      const ok = confirm(`Isso vai excluir as provas atuais do treinamento "${getSubareaMeta(adm.subarea).nome}" e carregar ${qtd} prova(s) padrão. As provas dos outros treinamentos e o histórico de tentativas já realizadas serão mantidos. Deseja continuar?`);
      if (ok) carregarSeed(evt, { substituirArea: true });
    });
  }
  host.querySelector("[data-nova-prova]").addEventListener("click", criarProvaVazia);
}

async function criarProvaVazia() {
  const titulo = prompt("Título da nova prova:", `Nova prova de ${getSubareaMeta(adm.subarea).nome.toLowerCase()}`);
  if (!titulo) return;
  const codigo = prompt("Código curto e único (ex.: D):", "");
  if (!codigo) return;
  const registro = { area: adm.perfil.area, codigo: codigo.trim(), titulo: titulo.trim(), descricao: "", nota_minima: 7, ativo: true };
  if (adm.subarea) registro.subarea = adm.subarea;
  const { data, error } = await sb.from("provas")
    .insert(registro)
    .select().single();
  if (error) { alert("Erro ao criar prova: " + error.message); return; }
  await carregarProvas();
  renderListaProvas();
  abrirEditor(data.id);
}

async function abrirEditor(provaId) {
  adm.provaSel = adm.provas.find((p) => p.id === provaId);
  const { data, error } = await sb
    .from("questoes").select("*").eq("prova_id", provaId).order("ordem");
  adm.questoes = error ? [] : (data || []).map((q) => ({
    id: q.id, ordem: q.ordem, enunciado: q.enunciado,
    alternativas: normalizarAlts(q.alternativas), correta: q.correta, justificativa: q.justificativa || "",
  }));
  desenharEditor();
}

// Garante sempre 5 alternativas a–e com a estrutura {id, texto}.
function normalizarAlts(alts) {
  const base = ["a", "b", "c", "d", "e"];
  const map = {};
  (alts || []).forEach((a) => { map[a.id] = a.texto; });
  return base.map((id) => ({ id, texto: map[id] || "" }));
}

function desenharEditor() {
  const host = document.querySelector("[data-editor-prova]");
  const p = adm.provaSel;

  const questoesHtml = adm.questoes.map((q, i) => bloEditorQuestao(q, i)).join("");

  host.innerHTML = `
    <div class="card card--chanfro stack">
      <div class="toolbar">
        <h2 style="margin:0">Editar: ${escaparHtml(p.titulo)}</h2>
        <span class="spacer"></span>
        <button class="btn btn--ghost btn--sm" data-fechar-editor>Fechar</button>
      </div>

      <div class="row">
        <div class="field" style="flex:2">
          <label>Título</label>
          <input class="input" data-p-titulo value="${escaparHtml(p.titulo)}" />
        </div>
        <div class="field" style="max-width:140px">
          <label>Nota mínima</label>
          <input class="input" type="number" step="0.5" min="0" max="10" data-p-nota value="${p.nota_minima}" />
        </div>
      </div>
      <div class="field">
        <label>Descrição</label>
        <textarea class="textarea" data-p-desc rows="2">${escaparHtml(p.descricao || "")}</textarea>
      </div>
      <label class="row" style="gap:.5rem;align-items:center;cursor:pointer">
        <input type="checkbox" data-p-ativo ${p.ativo ? "checked" : ""} style="width:18px;height:18px" />
        <span>Prova ativa (aparece para os alunos)</span>
      </label>

      <hr class="trilho" />
      <div class="toolbar">
        <h3 style="margin:0">Questões (${adm.questoes.length})</h3>
        <span class="spacer"></span>
        <button class="btn btn--ghost btn--sm" data-add-questao>+ Adicionar questão</button>
      </div>
      <div data-questoes>${questoesHtml}</div>

      <hr class="trilho" />
      <div class="toolbar">
        <button class="btn btn--success" data-salvar>Salvar alterações</button>
        <button class="btn btn--danger" data-excluir-prova>Excluir prova</button>
        <span class="spacer"></span>
        <span class="muted small" data-status-editor></span>
      </div>
    </div>`;

  ligarEditor(host);
}

function bloEditorQuestao(q, i) {
  const alts = q.alternativas.map((a) => `
    <div class="editor-alt">
      <input type="radio" name="correta-${i}" value="${a.id}" ${a.id === q.correta ? "checked" : ""} title="Marcar como correta" />
      <span class="alt__key">${a.id})</span>
      <input class="input" data-alt-texto="${i}" data-alt-id="${a.id}" value="${escaparHtml(a.texto)}" placeholder="Texto da alternativa ${a.id}" />
    </div>`).join("");

  return `
    <div class="editor-questao" data-q-card="${i}">
      <div class="editor-questao__head">
        <b>Questão ${i + 1}</b>
        <button class="btn btn--danger btn--sm" data-rm-questao="${i}">Remover</button>
      </div>
      <div class="field">
        <label>Enunciado</label>
        <textarea class="textarea" data-q-enunciado="${i}" rows="2">${escaparHtml(q.enunciado)}</textarea>
      </div>
      <div class="field__hint" style="margin-bottom:.4rem">Marque o círculo da alternativa correta.</div>
      ${alts}
      <div class="field" style="margin-top:.5rem">
        <label>Justificativa (opcional)</label>
        <input class="input" data-q-justif="${i}" value="${escaparHtml(q.justificativa || "")}" placeholder="Ex.: Item 7.1 do procedimento" />
      </div>
    </div>`;
}

function ligarEditor(host) {
  host.querySelector("[data-fechar-editor]").addEventListener("click", () => {
    host.innerHTML = "";
    adm.provaSel = null;
  });
  host.querySelector("[data-add-questao]").addEventListener("click", () => {
    lerEditorParaEstado(host);
    adm.questoes.push({
      id: null, ordem: adm.questoes.length + 1, enunciado: "",
      alternativas: normalizarAlts([]), correta: "a", justificativa: "",
    });
    desenharEditor();
  });
  host.querySelectorAll("[data-rm-questao]").forEach((b) =>
    b.addEventListener("click", () => {
      lerEditorParaEstado(host);
      adm.questoes.splice(Number(b.dataset.rmQuestao), 1);
      desenharEditor();
    }));
  host.querySelector("[data-salvar]").addEventListener("click", () => salvarProva(host));
  host.querySelector("[data-excluir-prova]").addEventListener("click", excluirProva);
}

// Lê os campos atuais do DOM para o estado em memória (antes de re-renderizar).
function lerEditorParaEstado(host) {
  const p = adm.provaSel;
  p.titulo = host.querySelector("[data-p-titulo]").value.trim();
  p.descricao = host.querySelector("[data-p-desc]").value.trim();
  p.nota_minima = Number(host.querySelector("[data-p-nota]").value) || 7;
  p.ativo = host.querySelector("[data-p-ativo]").checked;

  adm.questoes = adm.questoes.map((q, i) => {
    const card = host.querySelector(`[data-q-card="${i}"]`);
    if (!card) return q;
    const enun = card.querySelector(`[data-q-enunciado="${i}"]`).value.trim();
    const justif = card.querySelector(`[data-q-justif="${i}"]`).value.trim();
    const alts = ["a", "b", "c", "d", "e"].map((id) => ({
      id, texto: card.querySelector(`[data-alt-texto="${i}"][data-alt-id="${id}"]`).value.trim(),
    }));
    const sel = card.querySelector(`input[name="correta-${i}"]:checked`);
    return { ...q, enunciado: enun, justificativa: justif, alternativas: alts, correta: sel ? sel.value : "a" };
  });
}

async function salvarProva(host) {
  lerEditorParaEstado(host);
  const p = adm.provaSel;
  const status = host.querySelector("[data-status-editor]");

  // Validação simples e clara.
  for (let i = 0; i < adm.questoes.length; i++) {
    const q = adm.questoes[i];
    if (!q.enunciado) { status.textContent = `A questão ${i + 1} está sem enunciado.`; return; }
    if (q.alternativas.some((a) => !a.texto)) { status.textContent = `Preencha todas as alternativas da questão ${i + 1}.`; return; }
  }

  const btn = host.querySelector("[data-salvar]");
  travarBtn(btn, true, "Salvando…");
  status.textContent = "";
  try {
    // Prova + questões salvas em UMA transação no banco (RPC).
    // Se qualquer parte falhar, nada é alterado — a prova nunca fica
    // sem questões por queda de conexão no meio do salvamento.
    const { error: e1 } = await sb.rpc("salvar_prova_completa", {
      p_prova_id: p.id,
      p_titulo: p.titulo,
      p_descricao: p.descricao,
      p_nota_minima: p.nota_minima,
      p_ativo: p.ativo,
      p_questoes: adm.questoes.map((q) => ({
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        correta: q.correta,
        justificativa: q.justificativa || "",
      })),
    });
    if (e1) throw e1;
    await carregarProvas();
    adm.provaSel = adm.provas.find((x) => x.id === p.id);
    status.textContent = "Salvo!";
    renderListaProvas();
  } catch (err) {
    console.error(err);
    status.textContent = "Erro ao salvar: " + (err.message || err);
    travarBtn(btn, false, "Salvar alterações");
  }
}

async function excluirProva() {
  const p = adm.provaSel;
  if (!confirm(`Excluir a prova "${p.titulo}" e suas questões? As tentativas já realizadas continuam no histórico.`)) return;
  const { error } = await sb.from("provas").delete().eq("id", p.id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  adm.provaSel = null;
  await carregarProvas();
  renderListaProvas();
}

function travarBtn(btn, on, txt) { if (btn) { btn.disabled = on; if (txt) btn.textContent = txt; } }
