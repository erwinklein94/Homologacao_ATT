// =====================================================================
// verificar.js — validação pública do código do certificado (HSA-XXXXXXXX)
// Consulta a RPC verificar_certificado (aberta a anon) e mostra apenas os
// dados que já constam no próprio PDF do certificado.
// =====================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!window.exigeConfig()) return;

  const form = document.querySelector("[data-form-verificar]");
  const resultado = document.querySelector("[data-resultado-verificar]");

  // Permite abrir já com o código na URL: verificar.html?codigo=HSA-XXXXXXXX
  const params = new URLSearchParams(window.location.search);
  const codigoUrl = (params.get("codigo") || "").trim();
  if (codigoUrl) {
    form.codigo.value = codigoUrl;
    verificar(codigoUrl);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    verificar(form.codigo.value);
  });

  async function verificar(codigoBruto) {
    const codigo = String(codigoBruto || "").trim().toUpperCase();
    resultado.innerHTML = "";
    if (!/^HSA-[0-9A-F]{8}$/.test(codigo)) {
      return msgVerif("erro", "Código inválido. O formato é HSA- seguido de 8 letras/números (ex.: HSA-1A2B3C4D).");
    }
    msgVerif(null);

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Verificando…";

    const { data, error } = await sb.rpc("verificar_certificado", { p_codigo: codigo });

    btn.disabled = false; btn.textContent = "Verificar";

    if (error) {
      console.error(error);
      return msgVerif("erro", "Não foi possível consultar agora. Tente novamente. Detalhe: " + error.message);
    }
    const linhas = Array.isArray(data) ? data : (data ? [data] : []);
    if (!linhas.length) {
      resultado.innerHTML = `
        <div class="alerta alerta--erro">
          <b>Certificado não encontrado.</b><br>
          Nenhum registro corresponde ao código <b>${escaparHtml(codigo)}</b>. Confira a digitação; se o código estiver correto, o documento pode não ser autêntico.
        </div>`;
      return;
    }

    resultado.innerHTML = linhas.map((r) => {
      const badge = r.aprovado
        ? '<span class="badge badge--ok badge--dot">Homologado</span>'
        : '<span class="badge badge--erro badge--dot">Não homologado</span>';
      return `
        <div class="card stack" style="border-left:4px solid ${r.aprovado ? "var(--rumo-verde)" : "var(--rumo-erro)"}">
          <div>
            <div class="eyebrow">Registro autêntico · ${escaparHtml(r.codigo)}</div>
            <h3 style="margin:.2rem 0">${escaparHtml(r.aluno_nome || "—")}</h3>
            <p class="muted" style="margin:0">${escaparHtml(r.prova_titulo || "—")}</p>
          </div>
          <div class="row" style="gap:1.4rem;flex-wrap:wrap">
            <div><span class="muted small">Nota</span><br><b>${fmtNota(r.nota)}</b> <span class="muted small">(${r.acertos}/${r.total})</span></div>
            <div><span class="muted small">Resultado</span><br>${badge}</div>
            <div><span class="muted small">Data da avaliação</span><br><b>${fmtData(r.realizado_em, false)}</b></div>
          </div>
        </div>`;
    }).join("");
  }

  function msgVerif(tipo, texto) {
    const el = document.querySelector("[data-msg-verificar]");
    if (!tipo) { el.className = "hidden"; el.textContent = ""; return; }
    el.className = "alerta alerta--" + tipo;
    el.style.marginTop = ".8rem";
    el.textContent = texto;
  }
});
