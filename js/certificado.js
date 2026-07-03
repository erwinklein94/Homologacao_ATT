// =====================================================================
// certificado.js — gera o certificado/comprovante em PDF (jsPDF UMD)
// Aprovado  -> "Certificado de Homologação"
// Reprovado -> "Comprovante de Avaliação" (registra a nota mesmo assim)
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
  azulClaro: [50, 166, 230],
  verde: [30, 159, 127],
  erro: [216, 69, 69],
  texto: [40, 43, 53],
  cinza: [109, 131, 142],
};

async function gerarCertificadoPDF(d) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // ~297
  const H = doc.internal.pageSize.getHeight();  // ~210
  const aprovado = !!d.aprovado;
  const tema = "Alívio de Tensões Térmicas em Trilhos";
  const procedimento = "MAN-VP-L-PRO-TR-0036-01";
  const avaliacao = "avaliação teórica de alívio de tensões térmicas em trilhos";
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
    // proporção ~ 800x215 -> largura 46mm
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
  doc.text(aprovado ? "CERTIFICADO DE HOMOLOGAÇÃO" : "COMPROVANTE DE AVALIAÇÃO", W / 2, 58, { align: "center" });

  // Corpo
  doc.setFont("helvetica", "normal"); doc.setTextColor(...RGB.texto); doc.setFontSize(12);
  doc.text("Certificamos que", W / 2, 74, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...RGB.azul);
  doc.text((d.aluno_nome || "—").toUpperCase(), W / 2, 86, { align: "center" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...RGB.texto);
  const matr = d.matricula ? `matrícula ${d.matricula}, ` : "";
  const linha = `${matr}realizou a ${avaliacao}`;
  doc.text(linha, W / 2, 95, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(`“${d.prova_titulo || ""}”.`, W / 2, 102, { align: "center" });

  // Bloco da nota
  const cx = W / 2;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(aprovado ? RGB.verde : RGB.erro));
  doc.setFontSize(46);
  doc.text(fmtNota(d.nota), cx, 126, { align: "center" });
  doc.setFontSize(12); doc.setTextColor(...RGB.cinza);
  doc.text(`Nota final  ·  ${d.acertos}/${d.total} acertos  ·  mínimo ${fmtNota(d.nota_minima ?? 7)}`, cx, 134, { align: "center" });

  // Selo de status
  const txt = aprovado ? "HOMOLOGADO" : "NÃO HOMOLOGADO";
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  const tw = doc.getTextWidth(txt) + 16;
  const bx = cx - tw / 2;
  if (aprovado) { doc.setFillColor(...RGB.verde); doc.setTextColor(255, 255, 255); }
  else { doc.setFillColor(229, 235, 238); doc.setTextColor(...RGB.texto); }
  doc.roundedRect(bx, 139, tw, 9, 4.5, 4.5, "F");
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
  doc.text(`Código de verificação: ${d.codigo}`, W / 2, H - 16, { align: "center" });
  doc.text(`Documento gerado pelo portal de ${portal} — Rumo.`, W / 2, H - 12, { align: "center" });

  const nomeArq = `certificado-${(d.aluno_nome || "aluno").toLowerCase().replace(/\s+/g, "-")}-${d.codigo}.pdf`;
  doc.save(nomeArq);
}
window.gerarCertificadoPDF = gerarCertificadoPDF;
