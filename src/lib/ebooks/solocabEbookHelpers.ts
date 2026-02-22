import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";

const c = ebookColors;

export const getPageDims = (doc: jsPDF) => ({
  w: doc.internal.pageSize.getWidth(),
  h: doc.internal.pageSize.getHeight(),
  margin: 18,
  contentW: doc.internal.pageSize.getWidth() - 36,
});

/** Adds a footer bar with page number */
export const addFooter = (doc: jsPDF, pageNum: number) => {
  const { w, h } = getPageDims(doc);
  doc.setFillColor(...c.primaryBlue);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("SASU SoloCab | RCS Paris 994 176 576 | www.solocab.fr", 18, h - 4.5);
  doc.text(`${pageNum}`, w - 18, h - 4.5, { align: "right" });
};

/** Adds a chapter title page */
export const addChapterPage = (doc: jsPDF, num: number, title: string, subtitle: string, pageNum: number) => {
  doc.addPage();
  const { w, h, margin } = getPageDims(doc);

  // Full page dark blue bg
  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  // Decorative circles
  doc.setFillColor(0, 70, 140);
  doc.circle(-30, h / 2, 80, "F");
  doc.circle(w + 30, h / 3, 60, "F");

  // Gold accent line
  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(2);
  doc.line(margin, h / 2 - 40, w - margin, h / 2 - 40);

  // Chapter number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(60);
  doc.setTextColor(...c.accentGold);
  doc.text(`${num}`, w / 2, h / 2 - 15, { align: "center" });

  // Title
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), w / 2, h / 2 + 10, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...c.accentGold);
  const subLines = doc.splitTextToSize(subtitle, w - margin * 2);
  doc.text(subLines, w / 2, h / 2 + 25, { align: "center" });

  // Bottom line
  doc.setDrawColor(...c.accentGold);
  doc.line(margin, h / 2 + 45, w - margin, h / 2 + 45);

  addFooter(doc, pageNum);
};

/** Section title within a page */
export const addSectionTitle = (doc: jsPDF, y: number, text: string): number => {
  const { margin } = getPageDims(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...c.primaryBlue);
  doc.text(text, margin, y);
  // underline
  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + doc.getTextWidth(text), y + 2);
  return y + 10;
};

/** Body paragraph that auto-wraps */
export const addParagraph = (doc: jsPDF, y: number, text: string, fontSize = 10): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...c.darkText);
  const lines = doc.splitTextToSize(text, contentW);
  doc.text(lines, margin, y);
  return y + lines.length * (fontSize * 0.45) + 4;
};

/** Bullet list */
export const addBulletList = (doc: jsPDF, y: number, items: string[], fontSize = 9): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...c.darkText);
  items.forEach((item) => {
    doc.setTextColor(...c.orange);
    doc.text("●", margin + 2, y);
    doc.setTextColor(...c.darkText);
    const lines = doc.splitTextToSize(item, contentW - 12);
    doc.text(lines, margin + 8, y);
    y += lines.length * (fontSize * 0.45) + 3;
  });
  return y;
};

/** Info card (colored box with title and text) */
export const addInfoCard = (
  doc: jsPDF,
  y: number,
  title: string,
  text: string,
  bgColor: [number, number, number] = c.lightBg,
  accentColor: [number, number, number] = c.primaryBlue
): number => {
  const { margin, contentW } = getPageDims(doc);
  const lines = doc.splitTextToSize(text, contentW - 20);
  const boxH = 12 + lines.length * 4.2;

  doc.setFillColor(...bgColor);
  doc.roundedRect(margin, y, contentW, boxH, 3, 3, "F");

  // Left accent bar
  doc.setFillColor(...accentColor);
  doc.rect(margin, y, 3, boxH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text(title, margin + 8, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...c.darkText);
  doc.text(lines, margin + 8, y + 13);

  return y + boxH + 5;
};

/** Stat box in a row */
export const addStatBoxes = (
  doc: jsPDF,
  y: number,
  stats: { value: string; label: string }[]
): number => {
  const { margin, contentW } = getPageDims(doc);
  const boxW = (contentW - (stats.length - 1) * 4) / stats.length;

  stats.forEach((stat, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(...c.lightBg);
    doc.roundedRect(x, y, boxW, 22, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...c.primaryBlue);
    doc.text(stat.value, x + boxW / 2, y + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...c.grayText);
    doc.text(stat.label, x + boxW / 2, y + 17, { align: "center" });
  });

  return y + 28;
};
