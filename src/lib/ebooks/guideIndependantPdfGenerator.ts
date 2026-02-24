import jsPDF from "jspdf";
import { guideChapters, guideMetadata, GuideChapter, GuideSection } from "./guideIndependantContent";

export async function generateGuideIndependantPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 20; // margin left
  const mr = 20;
  const mt = 28;
  const mb = 22;
  const cw = pw - ml - mr; // content width
  let y = mt;

  // ---- Helpers ----
  const footer = () => {
    const p = doc.getNumberOfPages();
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Le Guide du Chauffeur Indépendant — Page ${p}`, pw / 2, ph - 8, { align: "center" });
  };

  const check = (need: number) => {
    if (y + need > ph - mb) {
      footer();
      doc.addPage();
      y = mt;
    }
  };

  const writeParagraph = (text: string, fontSize = 10.5, lineH = 5.5, indent = 0) => {
    doc.setFontSize(fontSize);
    const lines: string[] = doc.splitTextToSize(text, cw - indent);
    for (const line of lines) {
      check(lineH);
      doc.text(line, ml + indent, y);
      y += lineH;
    }
    y += 2.5;
  };

  // ---- COVER ----
  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pw, ph, "F");

  // accent bar
  doc.setFillColor(234, 179, 8); // gold
  doc.rect(pw / 2 - 30, 55, 60, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  doc.text("Le Guide du Chauffeur", pw / 2, 72, { align: "center" });
  doc.text("Indépendant", pw / 2, 84, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(234, 179, 8);
  doc.text("Construire sa Clientèle Privée de A à Z", pw / 2, 100, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(180, 180, 180);
  doc.text(guideMetadata.tagline, pw / 2, 120, { align: "center", maxWidth: cw });

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Par ${guideMetadata.author} — ${guideMetadata.year}`, pw / 2, 145, { align: "center" });

  // dedication
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(`« ${guideMetadata.dedication} »`, pw / 2, 170, { align: "center", maxWidth: cw - 20 });

  // price badge
  doc.setFillColor(234, 179, 8);
  doc.roundedRect(pw / 2 - 18, 195, 36, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(12, 12, 12);
  doc.text(guideMetadata.price, pw / 2, 204, { align: "center" });

  footer();
  doc.addPage();
  y = mt;

  // ---- TABLE OF CONTENTS ----
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Sommaire", ml, y);
  y += 14;

  doc.setFontSize(11);
  for (const ch of guideChapters) {
    check(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(`${ch.icon}  Partie ${ch.partNumber} — ${ch.title}`, ml + 4, y);
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(ch.subtitle, ml + 12, y);
    y += 8;
    doc.setFontSize(11);
  }

  footer();
  doc.addPage();
  y = mt;

  // ---- CHAPTERS ----
  for (const chapter of guideChapters) {
    // Part title page
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pw, ph, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`PARTIE ${chapter.partNumber}`, pw / 2, 70, { align: "center" });

    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const titleLines: string[] = doc.splitTextToSize(chapter.title, cw);
    let ty = 85;
    for (const tl of titleLines) {
      doc.text(tl, pw / 2, ty, { align: "center" });
      ty += 12;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const stLines: string[] = doc.splitTextToSize(chapter.subtitle, cw - 10);
    for (const sl of stLines) {
      doc.text(sl, pw / 2, ty + 5, { align: "center" });
      ty += 7;
    }

    // Gold bar
    doc.setFillColor(234, 179, 8);
    doc.rect(pw / 2 - 20, ty + 12, 40, 1.5, "F");

    // Icon
    doc.setFontSize(40);
    doc.setTextColor(60, 60, 60);
    doc.text(chapter.icon, pw / 2, ty + 35, { align: "center" });

    footer();
    doc.addPage();
    y = mt;

    // Introduction
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    writeParagraph(chapter.introduction, 10.5, 5.5);
    y += 4;

    // Sections
    doc.setFont("helvetica", "normal");
    for (const section of chapter.sections) {
      // Section heading
      check(14);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 25, 25);
      const hLines: string[] = doc.splitTextToSize(section.heading, cw);
      for (const hl of hLines) {
        check(7);
        doc.text(hl, ml, y);
        y += 7;
      }
      // Gold underline
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(0.5);
      doc.line(ml, y, ml + 40, y);
      y += 6;

      // Paragraphs
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      for (const para of section.paragraphs) {
        writeParagraph(para);
      }

      // Bullet points
      if (section.bulletPoints) {
        for (const bp of section.bulletPoints) {
          check(6);
          doc.setFillColor(234, 179, 8);
          doc.circle(ml + 3, y - 1.5, 1.2, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 40);
          const bpLines: string[] = doc.splitTextToSize(bp, cw - 10);
          for (const bl of bpLines) {
            check(5);
            doc.text(bl, ml + 8, y);
            y += 5;
          }
          y += 2;
        }
        y += 2;
      }

      // Highlight box
      if (section.highlight) {
        check(20);
        const hlLines: string[] = doc.splitTextToSize(section.highlight, cw - 16);
        const hlHeight = hlLines.length * 6 + 10;
        check(hlHeight);
        doc.setFillColor(255, 250, 230);
        doc.setDrawColor(234, 179, 8);
        doc.setLineWidth(0.8);
        doc.roundedRect(ml, y - 2, cw, hlHeight, 2, 2, "FD");
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(120, 90, 0);
        for (const hl of hlLines) {
          doc.text(hl, ml + 8, y + 2);
          y += 6;
        }
        y += 6;
      }

      // Example box
      if (section.example) {
        check(18);
        const exLines: string[] = doc.splitTextToSize(section.example, cw - 16);
        const exH = exLines.length * 5 + 12;
        check(exH);
        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(100, 160, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(ml, y - 2, cw, exH, 2, 2, "FD");
        y += 2;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(40, 80, 130);
        for (const el of exLines) {
          doc.text(el, ml + 8, y + 2);
          y += 5;
        }
        y += 6;
      }

      y += 3;
    }

    // Action Box
    if (chapter.actionBox) {
      check(30);
      doc.setFillColor(235, 255, 235);
      doc.setDrawColor(50, 180, 80);
      doc.setLineWidth(0.8);
      const abSteps = chapter.actionBox.steps;
      const abH = abSteps.length * 7 + 18;
      check(abH);
      doc.roundedRect(ml, y - 2, cw, abH, 2, 2, "FD");
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 100, 40);
      doc.text(`Passage à l'action : ${chapter.actionBox.title}`, ml + 6, y + 2);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 80, 30);
      for (let i = 0; i < abSteps.length; i++) {
        const stepLines: string[] = doc.splitTextToSize(`${i + 1}. ${abSteps[i]}`, cw - 16);
        for (const sl of stepLines) {
          doc.text(sl, ml + 8, y + 2);
          y += 5.5;
        }
        y += 1.5;
      }
      y += 6;
    }

    // Tool Box
    if (chapter.toolBox) {
      check(20);
      doc.setFillColor(245, 240, 255);
      doc.setDrawColor(130, 100, 200);
      doc.setLineWidth(0.5);
      const tbTools = chapter.toolBox.tools;
      const tbH = tbTools.length * 12 + 18;
      check(tbH);
      doc.roundedRect(ml, y - 2, cw, tbH, 2, 2, "FD");
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(80, 50, 150);
      doc.text(`Boîte à outils : ${chapter.toolBox.title}`, ml + 6, y + 2);
      y += 9;
      doc.setFontSize(9.5);
      for (const tool of tbTools) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 40, 120);
        doc.text(`${tool.name} (${tool.type})`, ml + 8, y + 2);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 60, 140);
        doc.text(tool.description, ml + 8, y + 2);
        y += 7;
      }
      y += 4;
    }

    y += 8;
  }

  // ---- CLOSING PAGE ----
  footer();
  doc.addPage();
  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pw, ph, "F");

  doc.setFillColor(234, 179, 8);
  doc.rect(pw / 2 - 25, 70, 50, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Votre chemin commence ici.", pw / 2, 85, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const closingText = "Ce guide vous a donné la carte. Les outils. La méthode. Maintenant, c'est à vous de faire le premier pas. Chaque jour est une opportunité de construire quelque chose qui vous appartient.";
  const closingLines: string[] = doc.splitTextToSize(closingText, cw - 20);
  let cy = 100;
  for (const cl of closingLines) {
    doc.text(cl, pw / 2, cy, { align: "center" });
    cy += 7;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 179, 8);
  doc.text("solocab.com", pw / 2, cy + 15, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("14 jours d'essai gratuit — Sans engagement", pw / 2, cy + 25, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`© ${guideMetadata.year} SoloCab Academy — Tous droits réservés`, pw / 2, ph - 15, { align: "center" });

  footer();
  doc.save("Guide_Chauffeur_Independant_SoloCab.pdf");
}
