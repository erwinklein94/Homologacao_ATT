// =====================================================================
// certificado.js — gera o certificado/comprovante em PDF (jsPDF UMD)
// Aprovado  -> Certificado no modelo oficial (Certificado_Treinamentos.docx):
//              arte de fundo azul/dourado, "Certificamos que NOME, concluiu o
//              treinamento de X no dia Y no modelo Z, com vencimento na data W",
//              duas assinaturas e logo Rumo no canto inferior direito.
// Reprovado -> "Comprovante de Avaliação" sóbrio (registra a nota mesmo assim).
// =====================================================================

// Carrega uma imagem do projeto como dataURL (para embutir no PDF).
async function _imgDataURL(url) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Cores Rumo em RGB (jsPDF trabalha em 0–255).
const RGB = {
  azul: [0, 56, 101],
  azulEscuro: [23, 42, 76],   // azul da arte do certificado
  azulClaro: [50, 166, 230],
  verde: [30, 159, 127],
  erro: [216, 69, 69],
  texto: [40, 43, 53],
  cinza: [109, 131, 142],
};

// Desenha uma linha com trechos normais e em negrito, centralizada em cx.
function _linhaMista(doc, segmentos, cx, y, tamanho) {
  doc.setFontSize(tamanho);
  let total = 0;
  segmentos.forEach((s) => {
    doc.setFont("helvetica", s.bold ? "bold" : "normal");
    total += doc.getTextWidth(s.t);
  });
  let x = cx - total / 2;
  segmentos.forEach((s) => {
    doc.setFont("helvetica", s.bold ? "bold" : "normal");
    doc.text(s.t, x, y);
    x += doc.getTextWidth(s.t);
  });
}

// Data + n meses em dd/mm/aaaa (vencimento da homologação).
function _dataMaisMeses(iso, meses) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  d.setMonth(d.getMonth() + meses);
  return d.toLocaleDateString("pt-BR");
}

async function gerarCertificadoPDF(d) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // ~297
  const H = doc.internal.pageSize.getHeight();  // ~210
  const aprovado = !!d.aprovado;

  if (aprovado) {
    await _certificadoModeloOficial(doc, d, W, H);
  } else {
    await _comprovanteReprovacao(doc, d, W, H);
  }

  const nomeArq = `certificado-${(d.aluno_nome || "aluno").toLowerCase().replace(/\s+/g, "-")}-${d.codigo}.pdf`;
  doc.save(nomeArq);
}

// ------------------------------------------------- certificado (aprovado)
async function _certificadoModeloOficial(doc, d, W, H) {
  // Fundo: arte oficial (já traz a medalha e o título "CERTIFICADO").
  const fundo = await _imgDataURL("assets/certificado-fundo.jpg");
  if (fundo) {
    doc.addImage(fundo, "JPEG", 0, 0, W, H);
  } else {
    // Sem a arte (offline?): mantém título equivalente para não sair em branco.
    doc.setFont("helvetica", "bold"); doc.setFontSize(34); doc.setTextColor(...RGB.azulEscuro);
    doc.text("CERTIFICADO", W / 2, 55, { align: "center" });
  }

  const cx = W / 2;
  const nome = (d.aluno_nome || "—").toUpperCase();
  const treinamento = d.prova_titulo || "Alívio de Tensões Térmicas em Trilhos";
  const dataAval = fmtData(d.realizado_em, false);
  const modelo = "Teórico";
  const vencimento = _dataMaisMeses(d.realizado_em, 12);

  // Frase do modelo oficial, com os campos preenchidos.
  doc.setTextColor(...RGB.texto);
  doc.setFont("helvetica", "normal"); doc.setFontSize(13);
  doc.text("Certificamos que", cx, 97, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(...RGB.azulEscuro);
  doc.text(nome, cx, 109, { align: "center" });

  doc.setTextColor(...RGB.texto);
  _linhaMista(doc, [
    { t: "concluiu o treinamento de " },
    { t: `“${treinamento}”`, bold: true },
  ], cx, 120, 13);
  _linhaMista(doc, [
    { t: "no dia " },
    { t: dataAval, bold: true },
    { t: " no modelo " },
    { t: modelo, bold: true },
    { t: ", com vencimento na data " },
    { t: vencimento, bold: true },
    { t: "." },
  ], cx, 128, 13);

  // Registro da avaliação (discreto, mantém o valor de comprovante).
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...RGB.cinza);
  doc.text(
    `Nota final ${fmtNota(d.nota)} (mínimo ${fmtNota(d.nota_minima ?? 7)}) · ${d.acertos}/${d.total} acertos · HOMOLOGADO`,
    cx, 137, { align: "center" }
  );

  // Assinaturas (duas, como no modelo — deslocadas à direita, longe da arte).
  const assEsqCx = 144, assDirCx = 236, yLinha = 168;
  doc.setDrawColor(...RGB.texto); doc.setLineWidth(0.3);
  doc.line(assEsqCx - 32, yLinha, assEsqCx + 32, yLinha);
  doc.line(assDirCx - 32, yLinha, assDirCx + 32, yLinha);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...RGB.texto);
  doc.text(d.instrutor_nome || "—", assEsqCx, yLinha + 5.2, { align: "center" });
  doc.text(d.aluno_nome || "—", assDirCx, yLinha + 5.2, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...RGB.cinza);
  doc.text("Instrutor responsável", assEsqCx, yLinha + 10, { align: "center" });
  doc.text("Participante", assDirCx, yLinha + 10, { align: "center" });

  // Logo Rumo no canto inferior direito (posição do modelo).
  const logo = await _imgDataURL("assets/rumo-logo-azul.png");
  if (logo) doc.addImage(logo, "PNG", 240, 190, 46, 12.4);

  // Código de verificação (autenticidade em verificar.html).
  const urlVerif = d.url_verificacao || new URL("verificar.html", window.location.href).href;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...RGB.cinza);
  doc.text(`Código de verificação: ${d.codigo}`, 190, 197, { align: "center" });
  doc.text(`Valide em: ${urlVerif}?codigo=${d.codigo}`, 190, 201.5, { align: "center" });
}

// --------------------------------------------- comprovante (reprovado)
async function _comprovanteReprovacao(doc, d, W, H) {
  const tema = "Alívio de Tensões Térmicas em Trilhos";
  const procedimento = "MAN-VP-L-PRO-TR-0036-01";
  const portal = "Homologação Alívio de Tensão";

  // Moldura
  doc.setDrawColor(...RGB.azul);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setDrawColor(...RGB.azulClaro);
  doc.setLineWidth(0.4);
  doc.rect(13, 13, W - 26, H - 26);

  // Faixa de topo (trilho duplo)
  doc.setDrawColor(...RGB.azul);
  doc.setLineWidth(0.8);
  doc.line(20, 38, W - 20, 38);
  doc.line(20, 40, W - 20, 40);

  // Logo
  const logo = await _imgDataURL("assets/rumo-logo-azul.png");
  if (logo) {
    doc.addImage(logo, "PNG", 20, 20, 46, 12.4);
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...RGB.azul);
    doc.text("rumo", 20, 30);
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...RGB.cinza);
  doc.text(tema, W - 20, 26, { align: "right" });
  doc.text(procedimento, W - 20, 31, { align: "right" });

  // Título
  doc.setFont("helvetica", "bold"); doc.setTextColor(...RGB.azul);
  doc.setFontSize(26);
  doc.text("COMPROVANTE DE AVALIAÇÃO", W / 2, 58, { align: "center" });

  // Corpo
  doc.setFont("helvetica", "normal"); doc.setTextColor(...RGB.texto); doc.setFontSize(12);
  doc.text("Certificamos que", W / 2, 74, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...RGB.azul);
  doc.text((d.aluno_nome || "—").toUpperCase(), W / 2, 86, { align: "center" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...RGB.texto);
  const matr = d.matricula ? `matrícula ${d.matricula}, ` : "";
  doc.text(`${matr}realizou a avaliação teórica de alívio de tensões térmicas em trilhos`, W / 2, 95, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(`“${d.prova_titulo || ""}”.`, W / 2, 102, { align: "center" });

  // Bloco da nota
  const cx = W / 2;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...RGB.erro);
  doc.setFontSize(46);
  doc.text(fmtNota(d.nota), cx, 126, { align: "center" });
  doc.setFontSize(12); doc.setTextColor(...RGB.cinza);
  doc.text(`Nota final  ·  ${d.acertos}/${d.total} acertos  ·  mínimo ${fmtNota(d.nota_minima ?? 7)}`, cx, 134, { align: "center" });

  // Selo de status
  const txt = "NÃO HOMOLOGADO";
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  const tw = doc.getTextWidth(txt) + 16;
  doc.setFillColor(229, 235, 238); doc.setTextColor(...RGB.texto);
  doc.roundedRect(cx - tw / 2, 139, tw, 9, 4.5, 4.5, "F");
  doc.text(txt, cx, 145.2, { align: "center" });

  // Rodapé: instrutor, data, código
  const yBase = 168;
  doc.setDrawColor(...RGB.cinza); doc.setLineWidth(0.3);
  doc.line(45, yBase, 110, yBase);
  doc.line(W - 110, yBase, W - 45, yBase);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...RGB.texto);
  doc.text(d.instrutor_nome || "—", 77.5, yBase + 5, { align: "center" });
  doc.text(fmtData(d.realizado_em, false), W - 77.5, yBase + 5, { align: "center" });
  doc.setFontSize(8); doc.setTextColor(...RGB.cinza);
  doc.text("Instrutor responsável", 77.5, yBase + 10, { align: "center" });
  doc.text("Data da avaliação", W - 77.5, yBase + 10, { align: "center" });

  doc.setFontSize(8); doc.setTextColor(...RGB.cinza);
  const urlVerif = d.url_verificacao || new URL("verificar.html", window.location.href).href;
  doc.text(`Código de verificação: ${d.codigo}  ·  Valide a autenticidade em: ${urlVerif}?codigo=${d.codigo}`, W / 2, H - 16, { align: "center" });
  doc.text(`Documento gerado pelo portal de ${portal} — Rumo.`, W / 2, H - 12, { align: "center" });
}

window.gerarCertificadoPDF = gerarCertificadoPDF;
