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

// ==========================================
// DocContext: auto-pagination helper
// ==========================================
export class DocContext {
  doc: jsPDF;
  y: number;
  pageNum: number;
  maxY: number;

  constructor(doc: jsPDF, startPage: number, startY = 20) {
    this.doc = doc;
    this.y = startY;
    this.pageNum = startPage;
    const { h } = getPageDims(doc);
    this.maxY = h - 20; // leave space for footer
  }

  /** Check if we need a new page, if so add one */
  checkPageBreak(neededHeight: number = 10) {
    if (this.y + neededHeight > this.maxY) {
      addFooter(this.doc, this.pageNum);
      this.doc.addPage();
      this.pageNum++;
      this.y = 20;
    }
  }

  /** Finish current page with footer */
  finishPage() {
    addFooter(this.doc, this.pageNum);
  }

  /** Start a new page */
  newPage() {
    this.finishPage();
    this.doc.addPage();
    this.pageNum++;
    this.y = 20;
  }

  /** Add a section title with gold underline */
  addTitle(text: string) {
    this.checkPageBreak(15);
    const { margin } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor(...c.primaryBlue);
    this.doc.text(text, margin, this.y);
    this.doc.setDrawColor(...c.accentGold);
    this.doc.setLineWidth(1);
    this.doc.line(margin, this.y + 2, margin + this.doc.getTextWidth(text), this.y + 2);
    this.y += 10;
  }

  /** Add a sub-title (smaller, bold, dark) */
  addSubTitle(text: string) {
    this.checkPageBreak(12);
    const { margin } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...c.darkText);
    this.doc.text(text, margin, this.y);
    this.y += 7;
  }

  /** Add body paragraph with auto-wrap and page breaks */
  addParagraph(text: string, fontSize = 9.5) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...c.darkText);
    const lines: string[] = this.doc.splitTextToSize(text, contentW);
    const lineH = fontSize * 0.42;

    for (const line of lines) {
      this.checkPageBreak(lineH + 1);
      this.doc.text(line, margin, this.y);
      this.y += lineH;
    }
    this.y += 3;
  }

  /** Add multiple paragraphs from an array */
  addParagraphs(texts: string[], fontSize = 9.5) {
    for (const t of texts) {
      this.addParagraph(t, fontSize);
    }
  }

  /** Add bullet list with auto page breaks */
  addBulletList(items: string[], fontSize = 9) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(fontSize);
    const lineH = fontSize * 0.42;

    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, contentW - 12);
      this.checkPageBreak(lines.length * lineH + 3);
      this.doc.setTextColor(...c.orange);
      this.doc.text("●", margin + 2, this.y);
      this.doc.setTextColor(...c.darkText);
      this.doc.text(lines, margin + 8, this.y);
      this.y += lines.length * lineH + 3;
    }
  }

  /** Add an info card */
  addInfoCard(
    title: string,
    text: string,
    bgColor: [number, number, number] = c.lightBg,
    accentColor: [number, number, number] = c.primaryBlue
  ) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    const lines: string[] = this.doc.splitTextToSize(text, contentW - 20);
    const boxH = 12 + lines.length * 4.2;

    this.checkPageBreak(boxH + 5);

    this.doc.setFillColor(...bgColor);
    this.doc.roundedRect(margin, this.y, contentW, boxH, 3, 3, "F");
    this.doc.setFillColor(...accentColor);
    this.doc.rect(margin, this.y, 3, boxH, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(...accentColor);
    this.doc.text(title, margin + 8, this.y + 7);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...c.darkText);
    this.doc.text(lines, margin + 8, this.y + 13);

    this.y += boxH + 5;
  }

  /** Add a quote/highlight block */
  addQuote(text: string) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    const lines: string[] = this.doc.splitTextToSize(text, contentW - 16);
    const boxH = 8 + lines.length * 5;

    this.checkPageBreak(boxH + 5);

    this.doc.setFillColor(...c.lightGold);
    this.doc.roundedRect(margin, this.y, contentW, boxH, 3, 3, "F");
    this.doc.setFillColor(...c.accentGold);
    this.doc.rect(margin, this.y, 3, boxH, "F");

    this.doc.setTextColor(...c.darkBlue);
    this.doc.text(lines, margin + 10, this.y + 6);
    this.y += boxH + 5;
  }

  /** Add vertical spacing */
  addSpace(mm = 5) {
    this.y += mm;
  }
}

/** Adds a chapter title page (full-page dark blue) */
export const addChapterPage = (doc: jsPDF, num: number, title: string, subtitle: string, pageNum: number) => {
  doc.addPage();
  const { w, h, margin } = getPageDims(doc);

  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  doc.setFillColor(0, 70, 140);
  doc.circle(-30, h / 2, 80, "F");
  doc.circle(w + 30, h / 3, 60, "F");

  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(2);
  doc.line(margin, h / 2 - 40, w - margin, h / 2 - 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(60);
  doc.setTextColor(...c.accentGold);
  doc.text(`${num}`, w / 2, h / 2 - 15, { align: "center" });

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), w - margin * 2);
  doc.text(titleLines, w / 2, h / 2 + 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...c.accentGold);
  const subLines = doc.splitTextToSize(subtitle, w - margin * 2);
  doc.text(subLines, w / 2, h / 2 + 30, { align: "center" });

  doc.setDrawColor(...c.accentGold);
  doc.line(margin, h / 2 + 45, w - margin, h / 2 + 45);

  addFooter(doc, pageNum);
};

// Keep legacy exports for backward compatibility
export const addSectionTitle = (doc: jsPDF, y: number, text: string): number => {
  const { margin } = getPageDims(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...c.primaryBlue);
  doc.text(text, margin, y);
  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(1);
  doc.line(margin, y + 2, margin + doc.getTextWidth(text), y + 2);
  return y + 10;
};

export const addParagraph = (doc: jsPDF, y: number, text: string, fontSize = 10): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...c.darkText);
  const lines = doc.splitTextToSize(text, contentW);
  doc.text(lines, margin, y);
  return y + lines.length * (fontSize * 0.45) + 4;
};

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
