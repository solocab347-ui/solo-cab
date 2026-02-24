import jsPDF from "jspdf";
import { guideChapters, guideMetadata } from "@/lib/ebooks/guideIndependantContent";

function san(t: string): string {
  return t
    .replace(/€/g, "EUR")
    .replace(/«\s?/g, '"').replace(/\s?»/g, '"')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...").replace(/\u2013/g, "-").replace(/\u2014/g, " - ")
    .replace(/[\u00A0]/g, " ")
    .replace(/[^\x20-\x7E\u00C0-\u00FF\n]/g, "");
}

export async function generateGuideIndependantRawTextPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 18, mr = 18, mt = 22, mb = 18;
  const cw = pw - ml - mr;
  let y = mt;

  const footer = () => {
    const p = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SoloCab — ${san(guideMetadata.title)} — Page ${p}`, pw / 2, ph - 10, { align: "center" });
  };

  const check = (need: number) => {
    if (y + need > ph - mb) { footer(); doc.addPage(); y = mt; }
  };

  // Cover
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pw, ph, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(san(guideMetadata.title), cw);
  let cy = 75;
  for (const l of titleLines) { doc.text(l, pw / 2, cy, { align: "center" }); cy += 10; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(san(guideMetadata.subtitle), pw / 2, cy + 5, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(170, 170, 170);
  doc.text(`Par ${san(guideMetadata.author)}`, pw / 2, cy + 18, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Texte integral — Version podcast", pw / 2, cy + 32, { align: "center" });
  footer();
  doc.addPage();
  y = mt;

  // Chapters
  for (const ch of guideChapters) {
    // Chapter title
    check(18);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    const cht = doc.splitTextToSize(san(`Partie ${ch.partNumber} — ${ch.title}`), cw);
    for (const l of cht) { check(7); doc.text(l, ml, y); y += 7; }

    // Subtitle
    if (ch.subtitle) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(80, 80, 80);
      const st = doc.splitTextToSize(san(ch.subtitle), cw);
      for (const l of st) { check(5.5); doc.text(l, ml, y); y += 5.5; }
    }
    y += 4;

    // Introduction
    if (ch.introduction) {
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      const intro = doc.splitTextToSize(san(ch.introduction), cw);
      for (const l of intro) { check(5); doc.text(l, ml, y); y += 5; }
      y += 3;
    }

    // Sections
    for (const sec of ch.sections) {
      check(12);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const sh = doc.splitTextToSize(san(sec.heading), cw);
      for (const l of sh) { check(6); doc.text(l, ml, y); y += 6; }
      y += 2;

      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);

      for (const p of sec.paragraphs) {
        const lines = doc.splitTextToSize(san(p), cw);
        for (const l of lines) { check(5); doc.text(l, ml, y); y += 5; }
        y += 2.5;
      }

      if (sec.bulletPoints) {
        for (const bp of sec.bulletPoints) {
          const bpText = doc.splitTextToSize(`- ${san(bp)}`, cw - 4);
          for (const l of bpText) { check(5); doc.text(l, ml + 4, y); y += 5; }
        }
        y += 2;
      }

      if (sec.highlight) {
        doc.setFont("helvetica", "italic");
        const hl = doc.splitTextToSize(san(sec.highlight), cw);
        for (const l of hl) { check(5); doc.text(l, ml, y); y += 5; }
        doc.setFont("helvetica", "normal");
        y += 2;
      }

      if (sec.example) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(60, 60, 60);
        const ex = doc.splitTextToSize(`Exemple : ${san(sec.example)}`, cw);
        for (const l of ex) { check(5); doc.text(l, ml, y); y += 5; }
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        y += 2;
      }
    }

    // Action box
    if (ch.actionBox) {
      check(8);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const ab = doc.splitTextToSize(san(ch.actionBox.title), cw);
      for (const l of ab) { check(5.5); doc.text(l, ml, y); y += 5.5; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      for (const step of ch.actionBox.steps) {
        const sl = doc.splitTextToSize(`- ${san(step)}`, cw - 4);
        for (const l of sl) { check(5); doc.text(l, ml + 4, y); y += 5; }
      }
      y += 3;
    }

    // Tool box
    if (ch.toolBox) {
      check(8);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const tb = doc.splitTextToSize(san(ch.toolBox.title), cw);
      for (const l of tb) { check(5.5); doc.text(l, ml, y); y += 5.5; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      for (const tool of ch.toolBox.tools) {
        const tl = doc.splitTextToSize(`${san(tool.name)} : ${san(tool.description)}`, cw - 4);
        for (const l of tl) { check(5); doc.text(l, ml + 4, y); y += 5; }
      }
      y += 3;
    }

    y += 8;
  }

  footer();
  doc.save("SoloCab-Guide-Independant-Texte-Podcast.pdf");
}
