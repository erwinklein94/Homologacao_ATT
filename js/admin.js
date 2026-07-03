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
  tentativas: [],      // todas as tentativas (admin enxerga tudo via RLS)
  historico: [],       // histórico legado de Alívio de Tensão (tabela historico_alivio_tensao)
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
  await Promise.all([carregarProvas(), carregarTentativas(), carregarHistoricoAlivio()]);

  conferirSeed();
  renderAtividades();
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

async function carregarTentativas() {
  const { data, error } = await sb
    .from("tentativas")
    .select("*")
    .eq("area", adm.perfil.area)
    .order("realizado_em", { ascending: false });
  if (error) { console.error(error); adm.tentativas = []; return; }
  adm.tentativas = (data || []).filter((t) => !adm.subarea || subareaDoRegistro(t) === adm.subarea);
}

// Histórico legado importado da planilha, agora servido pelo Supabase.
// Existe apenas na área de Alívio de Tensão (tabela public.historico_alivio_tensao).
async function carregarHistoricoAlivio() {
  // O histórico da planilha é de ATT (Alívio de Tensão Térmica); os demais
  // treinamentos começam sem legado e mostram só as provas do sistema.
  if (adm.perfil?.area !== "alivio_tensao" || adm.subarea !== "alivio_termico") { adm.historico = []; return; }

  // Remove do banco os registros legados sem nota, conforme solicitado.
  // Se a tabela ainda não existir, o erro será tratado no SELECT abaixo e o snapshot local será usado.
  await sb.from("historico_alivio_tensao").delete().is("nota", null);

  const { data, error } = await sb
    .from("historico_alivio_tensao")
    .select("*")
    .not("nota", "is", null)
    .order("data_inicio", { ascending: false });
  if (error) {
    // Tabela ainda não criada no Supabase → usa o snapshot embutido como fallback
    // (js/historico-alivio-tensao.js). Rode sql/historico-alivio-tensao.sql para usar o banco.
    console.warn("Histórico via Supabase indisponível, usando snapshot local:", error.message);
    adm.historico = (window.HISTORICO_ALIVIO_TENSAO || []).filter((r) => r.nota !== null && r.nota !== undefined && r.nota !== "");
    return;
  }
  // O PostgREST pode devolver numeric como texto; garante nota numérica e mantém apenas registros com nota.
  adm.historico = (data || [])
    .map((r) => ({ ...r, nota: (r.nota === null || r.nota === undefined || r.nota === "") ? null : Number(r.nota) }))
    .filter((r) => typeof r.nota === "number" && !isNaN(r.nota));
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
// 1) ATIVIDADES DOS ALUNOS
// =====================================================================
function renderAtividades() {
  const host = document.querySelector("[data-atividades]");
  const provasUnicas = [...new Set(adm.tentativas.map((t) => t.prova_titulo))].sort();
  const opcoesProva = ['<option value="">Todas as provas</option>']
    .concat(provasUnicas.map((p) => `<option value="${escaparHtml(p)}">${escaparHtml(p)}</option>`))
    .join("");

  host.innerHTML = `
    <div class="card stack">
      <div class="toolbar">
        <div class="field" style="margin:0;flex:1;min-width:200px">
          <label for="f-aluno">Buscar aluno</label>
          <input id="f-aluno" class="input" placeholder="Nome do aluno…" data-filtro-aluno />
        </div>
        <div class="field" style="margin:0;min-width:220px">
          <label for="f-prova">Prova</label>
          <select id="f-prova" class="select" data-filtro-prova>${opcoesProva}</select>
        </div>
        <div class="field" style="margin:0;min-width:170px">
          <label for="f-result">Resultado</label>
          <select id="f-result" class="select" data-filtro-result>
            <option value="">Todos</option>
            <option value="ok">Aprovados</option>
            <option value="reprov">Reprovados</option>
          </select>
        </div>
      </div>
      <div data-tabela-atividades></div>
    </div>`;

  const aplicar = () => desenharTabelaAtividades(
    host.querySelector("[data-filtro-aluno]").value.trim().toLowerCase(),
    host.querySelector("[data-filtro-prova]").value,
    host.querySelector("[data-filtro-result]").value
  );
  host.querySelector("[data-filtro-aluno]").addEventListener("input", aplicar);
  host.querySelector("[data-filtro-prova]").addEventListener("change", aplicar);
  host.querySelector("[data-filtro-result]").addEventListener("change", aplicar);
  aplicar();
}

function desenharTabelaAtividades(fAluno, fProva, fResult) {
  const host = document.querySelector("[data-tabela-atividades]");
  let linhas = adm.tentativas.filter((t) => {
    if (fAluno && !(t.aluno_nome || "").toLowerCase().includes(fAluno)) return false;
    if (fProva && t.prova_titulo !== fProva) return false;
    if (fResult === "ok" && !t.aprovado) return false;
    if (fResult === "reprov" && t.aprovado) return false;
    return true;
  });

  if (linhas.length === 0) {
    host.innerHTML = `<p class="muted center" style="padding:1.4rem 0">Nenhuma tentativa encontrada com esses filtros.</p>`;
    return;
  }

  const corpo = linhas.map((t) => {
    const badge = t.aprovado
      ? '<span class="badge badge--ok badge--dot">Aprovado</span>'
      : '<span class="badge badge--erro badge--dot">Reprovado</span>';
    return `<tr>
      <td>${escaparHtml(t.aluno_nome)}</td>
      <td>${escaparHtml(t.prova_titulo)}</td>
      <td><b>${fmtNota(t.nota)}</b> <span class="muted small">(${t.acertos}/${t.total})</span></td>
      <td>${badge}</td>
      <td>${escaparHtml(t.instrutor_nome)}</td>
      <td class="nowrap">${fmtData(t.realizado_em)}</td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <p class="muted small" style="margin:.2rem 0 .6rem">${linhas.length} registro(s)</p>
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Aluno</th><th>Prova</th><th>Nota</th><th>Resultado</th><th>Instrutor</th><th>Data</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;
}

// =====================================================================
// 1b) HISTÓRICO — somente Alívio de Tensão
// Reúne o histórico legado importado da planilha (window.HISTORICO_ALIVIO_TENSAO)
// com as provas novas aplicadas pelos fiscais aqui no sistema (adm.tentativas).
// =====================================================================
function configurarHistorico() {
  if (adm.perfil?.area !== "alivio_tensao") return;   // aba existe só nesta área
  const btn = document.querySelector("[data-aba-historico-btn]");
  if (btn) btn.classList.remove("hidden");
  renderHistorico();
}

// Converte uma tentativa do sistema para o mesmo formato do histórico da planilha.
function tentativaParaHistorico(t) {
  return {
    especificacao: t.prova_titulo || "—",
    modalidade: "—",
    categoria: "—",
    data_inicio: t.realizado_em || null,
    data_fim: t.realizado_em || null,
    carga_horaria: "—",
    local: "—",
    gerencia: "—",
    participante: t.aluno_nome || "—",
    funcao: "—",
    matricula: "—",
    empresa: "—",
    nota: (t.nota === null || t.nota === undefined) ? null : Number(t.nota),
    aprovacao: t.aprovado ? "APROVADO" : "REPROVADO",
    instrutor: t.instrutor_nome || "—",
    origem: "Sistema",
  };
}

function montarHistoricoCompleto() {
  const legado = (adm.historico || []).map((r) => ({
    ...r, instrutor: "—", origem: "Planilha",
  }));
  const doSistema = adm.tentativas.map(tentativaParaHistorico);
  const todos = legado.concat(doSistema);
  // Mais recentes primeiro (datas em ISO comparam corretamente como texto).
  todos.sort((a, b) => String(b.data_inicio || "").localeCompare(String(a.data_inicio || "")));
  return todos;
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
  const dados = montarHistoricoCompleto();

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
          Histórico do treinamento <b>${escaparHtml(getSubareaMeta(adm.subarea).nome)}</b>: os registros importados da planilha
          (quando existirem) e as provas aplicadas pelos fiscais aqui no sistema, reunidos em um só lugar.
        </p>
        <div class="kpis" data-hist-kpis></div>
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
        <div class="field" style="margin:0;min-width:170px">
          <label for="h-origem">Origem</label>
          <select id="h-origem" class="select" data-h-origem>
            <option value="">Todas</option>
            <option value="Planilha">Planilha histórica</option>
            <option value="Sistema">Sistema</option>
          </select>
        </div>
      </div>
      <div data-hist-tabela></div>
    </div>`;

  const aplicar = () => desenharTabelaHistorico(dados, {
    part: host.querySelector("[data-h-part]").value.trim().toLowerCase(),
    empresa: host.querySelector("[data-h-empresa]").value,
    modalidade: host.querySelector("[data-h-modalidade]").value,
    result: host.querySelector("[data-h-result]").value,
    origem: host.querySelector("[data-h-origem]").value,
  });
  host.querySelector("[data-h-part]").addEventListener("input", aplicar);
  host.querySelector("[data-h-empresa]").addEventListener("change", aplicar);
  host.querySelector("[data-h-modalidade]").addEventListener("change", aplicar);
  host.querySelector("[data-h-result]").addEventListener("change", aplicar);
  host.querySelector("[data-h-origem]").addEventListener("change", aplicar);
  aplicar();
}

function desenharTabelaHistorico(dados, f) {
  const linhas = dados.filter((r) => {
    if (f.part && !(r.participante || "").toLowerCase().includes(f.part)) return false;
    if (f.empresa && (r.empresa || "").toUpperCase() !== f.empresa) return false;
    if (f.modalidade && (r.modalidade || "").toUpperCase() !== f.modalidade) return false;
    if (f.result === "ok" && r.aprovacao !== "APROVADO") return false;
    if (f.result === "reprov" && r.aprovacao !== "REPROVADO") return false;
    if (f.origem && r.origem !== f.origem) return false;
    return true;
  });

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
    const badgeOrig = r.origem === "Sistema"
      ? '<span class="badge badge--ok badge--dot">Sistema</span>'
      : '<span class="badge badge--dot">Planilha</span>';
    const nota = (typeof r.nota === "number" && !isNaN(r.nota)) ? `<b>${fmtNota(r.nota)}</b>` : '<span class="muted">—</span>';
    const modalidade = r.modalidade && r.modalidade !== "—"
      ? r.modalidade.charAt(0) + r.modalidade.slice(1).toLowerCase() : "—";
    return `<tr>
      <td class="nowrap">${fmtDataHist(r.data_inicio)}</td>
      <td>${escaparHtml(r.participante)}</td>
      <td>${escaparHtml(r.funcao || "—")}</td>
      <td>${escaparHtml(r.empresa || "—")}</td>
      <td class="nowrap">${escaparHtml(r.matricula || "—")}</td>
      <td>${escaparHtml(r.local || "—")}</td>
      <td>${escaparHtml(r.gerencia || "—")}</td>
      <td>${escaparHtml(modalidade)}</td>
      <td>${escaparHtml(r.instrutor || "—")}</td>
      <td class="nowrap">${nota}</td>
      <td>${badgeRes}</td>
      <td>${badgeOrig}</td>
    </tr>`;
  }).join("");

  host.innerHTML = `
    <p class="muted small" style="margin:.2rem 0 .6rem">${linhas.length} registro(s)</p>
    <div class="tabela-wrap">
      <table class="tabela">
        <thead><tr>
          <th>Data</th><th>Participante</th><th>Função</th><th>Empresa</th>
          <th>Matrícula/CPF</th><th>Local</th><th>Gerência</th><th>Modalidade</th>
          <th>Instrutor/Fiscal</th><th>Nota</th><th>Resultado</th><th>Origem</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>`;
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

function diagnosticarSeedArea() {
  const seedArea = obterSeedArea();
  const porCodigo = new Map(adm.provas.map((p) => [p.codigo, p]));
  const faltando = seedArea.filter((p) => !porCodigo.has(p.codigo));
  const inativas = seedArea.filter((p) => porCodigo.has(p.codigo) && porCodigo.get(p.codigo)?.ativo !== true);
  return {
    seedArea,
    faltando,
    inativas,
    precisaAtualizar: seedArea.length > 0 && (adm.provas.length === 0 || faltando.length > 0 || inativas.length > 0),
  };
}

function conferirSeed() {
  const banner = document.querySelector("[data-seed-banner]");
  if (!banner) return;
  const diag = diagnosticarSeedArea();
  const { seedArea, faltando, inativas, precisaAtualizar } = diag;
  banner.classList.toggle("hidden", !precisaAtualizar);
  if (precisaAtualizar) {
    const titulo = adm.provas.length === 0
      ? `Nenhuma prova cadastrada em ${escaparHtml(nomeAreaAtual())}.`
      : `Há prova padrão faltando ou inativa em ${escaparHtml(nomeAreaAtual())}.`;
    const detalhe = adm.provas.length === 0
      ? `Carregue as ${seedArea.length} provas ATT 4 no Supabase e deixe tudo ativo para os alunos.`
      : `Faltando: ${faltando.length}. Inativas: ${inativas.length}. Use o botão para atualizar/ativar sem apagar histórico de tentativas.`;
    banner.innerHTML = `
      <div class="alerta alerta--info" style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <b>${titulo}</b><br>
          ${detalhe}
        </div>
      </div>`;
  }
}

async function carregarSeed(e, opcoes = {}) {
  const btn = e?.target;
  const textoOriginalBtn = btn?.textContent || "Carregar provas";
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

      // Substitui as questões dessa prova.
      const { error: eDel } = await sb.from("questoes").delete().eq("prova_id", prova.id);
      if (eDel) throw eDel;
      const questoes = p.questoes.map((q) => ({
        prova_id: prova.id, ordem: q.ordem, enunciado: q.enunciado,
        alternativas: q.alternativas, correta: q.correta, justificativa: q.justificativa || "",
      }));
      const { error: e2 } = await sb.from("questoes").insert(questoes);
      if (e2) throw e2;
    }
    await Promise.all([carregarProvas(), carregarTentativas()]);
    conferirSeed();
    renderAtividades();
    renderListaProvas();
    alert(substituirArea ? "Provas da área substituídas com sucesso!" : "Provas carregadas com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Não foi possível carregar as provas: " + (err.message || err));
    travarBtn(btn, false, substituirArea ? "Restaurar provas" : textoOriginalBtn);
  }
}

function renderListaProvas() {
  const host = document.querySelector("[data-editor]");
  if (adm.provas.length === 0) {
    host.innerHTML = `
      <div class="card center">
        <h3>Nenhuma prova cadastrada</h3>
        <p class="muted">Nenhuma prova foi encontrada para este treinamento. Crie uma nova prova ou carregue as provas pelo SQL no Supabase.</p>
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
        <button class="btn btn--ghost btn--sm" data-nova-prova>+ Nova prova</button>
      </div>
      ${cards}
    </div>
    <div data-editor-prova style="margin-top:1.2rem"></div>`;

  host.querySelectorAll("[data-editar]").forEach((b) =>
    b.addEventListener("click", () => abrirEditor(b.dataset.editar)));
  // Botões de carga/substituição das provas padrão removidos da interface.
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
    // 1) Atualiza dados da prova.
    const { error: e1 } = await sb.from("provas").update({
      titulo: p.titulo, descricao: p.descricao, nota_minima: p.nota_minima,
      ativo: p.ativo, atualizado_em: new Date().toISOString(),
    }).eq("id", p.id);
    if (e1) throw e1;

    // 2) Substitui o conjunto de questões (abordagem simples e previsível).
    const { error: e2 } = await sb.from("questoes").delete().eq("prova_id", p.id);
    if (e2) throw e2;
    if (adm.questoes.length > 0) {
      const novas = adm.questoes.map((q, i) => ({
        prova_id: p.id, ordem: i + 1, enunciado: q.enunciado,
        alternativas: q.alternativas, correta: q.correta, justificativa: q.justificativa,
      }));
      const { error: e3 } = await sb.from("questoes").insert(novas);
      if (e3) throw e3;
    }
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
