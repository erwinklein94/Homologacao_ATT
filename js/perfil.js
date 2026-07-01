// =====================================================================
// perfil.js — área do aluno: seus dados + histórico de provas
// =====================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const perfil = await protegerPagina();
  if (!perfil) return;

  const { data, error } = await sb
    .from("tentativas")
    .select("*, provas(nota_minima)")
    .eq("aluno_id", perfil.id)
    .eq("area", perfil.area)
    .order("realizado_em", { ascending: false });

  const tentativas = error ? [] : (data || []);
  renderResumo(perfil, tentativas);
  renderHistorico(perfil, tentativas);
});

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
    return `<tr>
      <td>${escaparHtml(t.prova_titulo)}</td>
      <td><b>${fmtNota(t.nota)}</b> <span class="muted small">(${t.acertos}/${t.total})</span></td>
      <td>${badge}</td>
      <td>${escaparHtml(t.instrutor_nome)}</td>
      <td class="nowrap">${fmtData(t.realizado_em)}</td>
      <td><button class="btn btn--ghost btn--sm" data-pdf="${t.id}">PDF</button></td>
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
