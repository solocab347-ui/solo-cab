import jsPDF from "jspdf";
import { guideChapters, guideMetadata } from "./guideIndependantContent";
import guideCoverImg from "@/assets/guide-cover-vtc.jpg";

// jsPDF helvetica cannot render: €, emojis, «, »
// We sanitize ALL text before rendering
function sanitize(text: string): string {
  return text
    .replace(/€/g, "EUR")
    .replace(/«\s*/g, '"')
    .replace(/\s*»/g, '"')
    .replace(/—/g, " - ")
    .replace(/…/g, "...");
}

// Part labels instead of emojis
const partLabels: Record<number, string> = {
  1: "PARTIE 1",
  2: "PARTIE 2",
  3: "PARTIE 3",
  4: "PARTIE 4",
  5: "PARTIE 5",
  6: "PARTIE 6",
  7: "PARTIE 7",
  8: "PARTIE 8",
};

export async function generateGuideIndependantPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const ml = 20;
  const mr = 20;
  const mt = 28;
  const mb = 24;
  const cw = pw - ml - mr;
  let y = mt;

  // ---- Helpers ----
  const addFooter = () => {
    const p = doc.getNumberOfPages();
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(sanitize("Le Guide du Chauffeur Independant - Page " + p), pw / 2, ph - 8, { align: "center" });
  };

  const needNewPage = (need: number) => {
    if (y + need > ph - mb) {
      addFooter();
      doc.addPage();
      y = mt;
      return true;
    }
    return false;
  };

  const writeLines = (text: string, fontSize: number, lineH: number, font: string, style: string, color: number[], indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont(font, style);
    doc.setTextColor(color[0], color[1], color[2]);
    const safe = sanitize(text);
    const lines: string[] = doc.splitTextToSize(safe, cw - indent);
    for (const line of lines) {
      needNewPage(lineH);
      doc.text(line, ml + indent, y);
      y += lineH;
    }
  };

  const writeParagraph = (text: string) => {
    writeLines(text, 10.5, 5.5, "helvetica", "normal", [40, 40, 40]);
    y += 2.5;
  };

  // =============================================
  // COVER PAGE with image
  // =============================================
  // Load image
  const img = new Image();
  img.src = guideCoverImg;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });

  // Dark background
  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pw, ph, "F");

  // Add cover image (centered, with opacity effect via dark overlay)
  try {
    const imgW = 120;
    const imgH = imgW * (img.height / img.width);
    const imgX = (pw - imgW) / 2;
    const imgY = 20;
    doc.addImage(img, "JPEG", imgX, imgY, imgW, Math.min(imgH, 140));
    // Dark gradient overlay on image
    doc.setFillColor(12, 12, 12);
    doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
    doc.rect(imgX, imgY, imgW, Math.min(imgH, 140), "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } catch (e) {
    // Fallback if image fails
  }

  // Gold accent bar
  doc.setFillColor(234, 179, 8);
  doc.rect(pw / 2 - 30, 165, 60, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Le Guide du Chauffeur", pw / 2, 180, { align: "center" });
  doc.text("Independant", pw / 2, 191, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(234, 179, 8);
  doc.text("Construire sa Clientele Privee de A a Z", pw / 2, 205, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  const tagSafe = sanitize(guideMetadata.tagline);
  const tagLines: string[] = doc.splitTextToSize(tagSafe, cw - 20);
  let tagY = 218;
  for (const tl of tagLines) {
    doc.text(tl, pw / 2, tagY, { align: "center" });
    tagY += 6;
  }

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("Par " + guideMetadata.author + " - " + guideMetadata.year, pw / 2, 245, { align: "center" });

  // Dedication
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  const dedSafe = sanitize('"' + guideMetadata.dedication + '"');
  const dedLines: string[] = doc.splitTextToSize(dedSafe, cw - 30);
  let dedY = 258;
  for (const dl of dedLines) {
    doc.text(dl, pw / 2, dedY, { align: "center" });
    dedY += 5;
  }

  // Price badge
  doc.setFillColor(234, 179, 8);
  doc.roundedRect(pw / 2 - 16, 275, 32, 12, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(12, 12, 12);
  doc.text("4,99 EUR", pw / 2, 283, { align: "center" });

  addFooter();
  doc.addPage();
  y = mt;

  // =============================================
  // TABLE OF CONTENTS
  // =============================================
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Sommaire", ml, y);
  y += 14;

  for (const ch of guideChapters) {
    needNewPage(16);

    // Part number badge
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(ml, y - 5, 8, 8, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(12, 12, 12);
    doc.text(String(ch.partNumber), ml + 4, y, { align: "center" });

    // Title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(sanitize(ch.title), ml + 12, y);
    y += 5;

    // Subtitle
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(sanitize(ch.subtitle), ml + 12, y);
    y += 10;
  }

  addFooter();
  doc.addPage();
  y = mt;

  // =============================================
  // CHAPTERS
  // =============================================
  for (const chapter of guideChapters) {
    // ---------- TRANSITION PAGE ----------
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pw, ph, "F");

    // Gold accent bar at top
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 0, pw, 4, "F");

    // Part number in large circle
    doc.setFillColor(234, 179, 8);
    doc.circle(pw / 2, 80, 16, "F");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(12, 12, 12);
    doc.text(String(chapter.partNumber), pw / 2, 86, { align: "center" });

    // "PARTIE X" label
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("PARTIE " + chapter.partNumber, pw / 2, 108, { align: "center" });

    // Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const titleSafe = sanitize(chapter.title);
    const titleLines: string[] = doc.splitTextToSize(titleSafe, cw - 10);
    let ty = 125;
    for (const tl of titleLines) {
      doc.text(tl, pw / 2, ty, { align: "center" });
      ty += 11;
    }

    // Subtitle
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const stSafe = sanitize(chapter.subtitle);
    const stLines: string[] = doc.splitTextToSize(stSafe, cw - 20);
    ty += 5;
    for (const sl of stLines) {
      doc.text(sl, pw / 2, ty, { align: "center" });
      ty += 7;
    }

    // Gold bar under subtitle
    doc.setFillColor(234, 179, 8);
    doc.rect(pw / 2 - 20, ty + 8, 40, 1.5, "F");

    addFooter();
    doc.addPage();
    y = mt;

    // ---------- INTRODUCTION ----------
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10.5);
    const introSafe = sanitize(chapter.introduction);
    const introLines: string[] = doc.splitTextToSize(introSafe, cw);
    for (const il of introLines) {
      needNewPage(5.5);
      doc.text(il, ml, y);
      y += 5.5;
    }
    y += 8;

    // ---------- SECTIONS ----------
    for (const section of chapter.sections) {
      // Section heading
      needNewPage(18);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 25, 25);
      const hSafe = sanitize(section.heading);
      const hLines: string[] = doc.splitTextToSize(hSafe, cw);
      for (const hl of hLines) {
        needNewPage(7);
        doc.text(hl, ml, y);
        y += 7;
      }
      // Gold underline
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(0.6);
      doc.line(ml, y + 1, ml + 35, y + 1);
      y += 7;

      // Paragraphs
      for (const para of section.paragraphs) {
        writeParagraph(para);
      }

      // Bullet points
      if (section.bulletPoints) {
        for (const bp of section.bulletPoints) {
          needNewPage(8);
          // Gold bullet
          doc.setFillColor(234, 179, 8);
          doc.circle(ml + 3, y - 1.5, 1.2, "F");
          writeLines(bp, 10, 5, "helvetica", "normal", [40, 40, 40], 8);
          y += 2;
        }
        y += 3;
      }

      // Highlight box
      if (section.highlight) {
        const hlSafe = sanitize(section.highlight);
        const hlLines: string[] = doc.splitTextToSize(hlSafe, cw - 18);
        const hlHeight = hlLines.length * 6 + 12;
        needNewPage(hlHeight + 4);

        doc.setFillColor(255, 250, 230);
        doc.setDrawColor(234, 179, 8);
        doc.setLineWidth(0.8);
        doc.roundedRect(ml, y, cw, hlHeight, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(120, 90, 0);
        let hlY = y + 7;
        for (const hl of hlLines) {
          doc.text(hl, ml + 9, hlY);
          hlY += 6;
        }
        y += hlHeight + 6;
      }

      // Example box
      if (section.example) {
        const exSafe = sanitize(section.example);
        const exLines: string[] = doc.splitTextToSize(exSafe, cw - 18);
        const exH = exLines.length * 5.5 + 12;
        needNewPage(exH + 4);

        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(100, 160, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(ml, y, cw, exH, 2, 2, "FD");

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(40, 80, 130);
        let exY = y + 7;
        for (const el of exLines) {
          doc.text(el, ml + 9, exY);
          exY += 5.5;
        }
        y += exH + 6;
      }

      y += 4;
    }

    // ---------- ACTION BOX ----------
    if (chapter.actionBox) {
      const abSteps = chapter.actionBox.steps;
      const abH = abSteps.length * 10 + 20;
      needNewPage(Math.min(abH, 60));

      doc.setFillColor(235, 255, 235);
      doc.setDrawColor(50, 180, 80);
      doc.setLineWidth(0.8);

      // Calculate actual height needed
      let tempH = 14;
      for (const step of abSteps) {
        const sl: string[] = doc.splitTextToSize(sanitize(step), cw - 20);
        tempH += sl.length * 5.5 + 3;
      }
      tempH += 4;

      needNewPage(tempH);
      const boxStartY = y;
      doc.roundedRect(ml, y, cw, tempH, 2, 2, "FD");

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 100, 40);
      doc.text(sanitize("PASSAGE A L'ACTION : " + chapter.actionBox.title), ml + 7, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 80, 30);
      for (let i = 0; i < abSteps.length; i++) {
        const stepSafe = sanitize((i + 1) + ". " + abSteps[i]);
        const stepLines: string[] = doc.splitTextToSize(stepSafe, cw - 20);
        for (const sl of stepLines) {
          doc.text(sl, ml + 9, y);
          y += 5.5;
        }
        y += 2;
      }
      y += 8;
    }

    // ---------- TOOL BOX ----------
    if (chapter.toolBox) {
      const tbTools = chapter.toolBox.tools;
      let tempH = 14;
      for (const tool of tbTools) {
        tempH += 12;
      }
      tempH += 4;

      needNewPage(tempH);
      doc.setFillColor(245, 240, 255);
      doc.setDrawColor(130, 100, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(ml, y, cw, tempH, 2, 2, "FD");

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(80, 50, 150);
      doc.text(sanitize("BOITE A OUTILS : " + chapter.toolBox.title), ml + 7, y);
      y += 9;

      doc.setFontSize(9.5);
      for (const tool of tbTools) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 40, 120);
        doc.text(sanitize(tool.name + " (" + tool.type + ")"), ml + 9, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 60, 140);
        doc.text(sanitize(tool.description), ml + 9, y);
        y += 7;
      }
      y += 8;
    }

    y += 10;
  }

  // =============================================
  // CLOSING PAGE
  // =============================================
  addFooter();
  doc.addPage();

  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pw, ph, "F");

  // Gold bar
  doc.setFillColor(234, 179, 8);
  doc.rect(pw / 2 - 25, 70, 50, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Votre chemin commence ici.", pw / 2, 88, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const closingSafe = sanitize("Ce guide vous a donne la carte. Les outils. La methode. Maintenant, c'est a vous de faire le premier pas. Chaque jour est une opportunite de construire quelque chose qui vous appartient.");
  const closingLines: string[] = doc.splitTextToSize(closingSafe, cw - 20);
  let cy = 105;
  for (const cl of closingLines) {
    doc.text(cl, pw / 2, cy, { align: "center" });
    cy += 7;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 179, 8);
  doc.text("solocab.com", pw / 2, cy + 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("14 jours d'essai gratuit - Sans engagement", pw / 2, cy + 30, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("(c) " + guideMetadata.year + " SoloCab Academy - Tous droits reserves", pw / 2, ph - 15, { align: "center" });

  addFooter();
  doc.save("Guide_Chauffeur_Independant_SoloCab.pdf");
}
