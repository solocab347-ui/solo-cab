import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";

const c = ebookColors;

export const getPageDims = (doc: jsPDF) => ({
  w: doc.internal.pageSize.getWidth(),
  h: doc.internal.pageSize.getHeight(),
  margin: 22,
  contentW: doc.internal.pageSize.getWidth() - 44,
});

/** Adds a footer bar with page number */
export const addFooter = (doc: jsPDF, pageNum: number) => {
  const { w, h } = getPageDims(doc);
  // Subtle line above footer
  doc.setDrawColor(...c.softBlue);
  doc.setLineWidth(0.3);
  doc.line(22, h - 14, w - 22, h - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...c.grayText);
  doc.text("L'Illusion des Applications — Offert par SoloCab Academy", 22, h - 8);
  doc.text(`${pageNum}`, w - 22, h - 8, { align: "right" });
};

// ==========================================
// DocContext: auto-pagination helper
// ==========================================
export class DocContext {
  doc: jsPDF;
  y: number;
  pageNum: number;
  maxY: number;

  constructor(doc: jsPDF, startPage: number, startY = 22) {
    this.doc = doc;
    this.y = startY;
    this.pageNum = startPage;
    const { h } = getPageDims(doc);
    this.maxY = h - 18;
  }

  /** Check if we need a new page, if so add one */
  checkPageBreak(neededHeight: number = 10) {
    if (this.y + neededHeight > this.maxY) {
      addFooter(this.doc, this.pageNum);
      this.doc.addPage();
      this.pageNum++;
      this.y = 22;
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
    this.y = 22;
  }

  /** Add a section title with violet underline — premium style */
  addTitle(text: string) {
    this.checkPageBreak(14);
    const { margin } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(15);
    this.doc.setTextColor(...c.deepBlue);
    this.doc.text(text, margin, this.y);
    // Soft violet underline
    this.doc.setDrawColor(...c.softViolet);
    this.doc.setLineWidth(0.8);
    this.doc.line(margin, this.y + 2.5, margin + this.doc.getTextWidth(text), this.y + 2.5);
    this.y += 10;
  }

  /** Add a sub-title — light blue accent */
  addSubTitle(text: string) {
    this.checkPageBreak(10);
    const { margin } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...c.primaryBlue);
    this.doc.text(text, margin, this.y);
    this.y += 7;
  }

  /** Add body paragraph — premium readable style */
  addParagraph(text: string, fontSize = 10.5) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...c.bodyText);
    const lines: string[] = this.doc.splitTextToSize(text, contentW);
    const lineH = fontSize * 0.48; // ~1.6x line height for readability

    for (const line of lines) {
      this.checkPageBreak(lineH + 1);
      this.doc.text(line, margin, this.y);
      this.y += lineH;
    }
    this.y += 2;
  }

  /** Add multiple paragraphs from an array */
  addParagraphs(texts: string[], fontSize = 10.5) {
    for (const t of texts) {
      this.addParagraph(t, fontSize);
    }
  }

  /** Add bullet list with soft blue bullets */
  addBulletList(items: string[], fontSize = 10) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(fontSize);
    const lineH = fontSize * 0.46;

    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, contentW - 14);
      this.checkPageBreak(lines.length * lineH + 3);
      // Soft blue bullet
      this.doc.setFillColor(...c.lightBlue);
      this.doc.circle(margin + 3, this.y - 1.2, 1.2, "F");
      this.doc.setTextColor(...c.bodyText);
      this.doc.text(lines, margin + 10, this.y);
      this.y += lines.length * lineH + 3;
    }
  }

  /** Add an info card with left accent border */
  addInfoCard(
    title: string,
    text: string,
    bgColor: [number, number, number] = c.lightBg,
    accentColor: [number, number, number] = c.primaryBlue
  ) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    const lines: string[] = this.doc.splitTextToSize(text, contentW - 22);
    const boxH = 14 + lines.length * 4.5;

    this.checkPageBreak(boxH + 6);

    this.doc.setFillColor(...bgColor);
    this.doc.roundedRect(margin, this.y, contentW, boxH, 3, 3, "F");
    this.doc.setFillColor(...accentColor);
    this.doc.roundedRect(margin, this.y, 3, boxH, 1.5, 1.5, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...accentColor);
    this.doc.text(title, margin + 10, this.y + 8);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...c.bodyText);
    this.doc.text(lines, margin + 10, this.y + 14);

    this.y += boxH + 6;
  }

  /** Add a quote/highlight block — soft violet accent */
  addQuote(text: string) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bolditalic");
    this.doc.setFontSize(11);
    const lines: string[] = this.doc.splitTextToSize(text, contentW - 20);
    const boxH = 10 + lines.length * 5.5;

    this.checkPageBreak(boxH + 6);

    this.doc.setFillColor(...c.lightGold);
    this.doc.roundedRect(margin, this.y, contentW, boxH, 3, 3, "F");
    this.doc.setFillColor(...c.softViolet);
    this.doc.roundedRect(margin, this.y, 3, boxH, 1.5, 1.5, "F");

    this.doc.setTextColor(...c.deepBlue);
    this.doc.text(lines, margin + 12, this.y + 7);
    this.y += boxH + 6;
  }

  /** Add a subtle visual separator between sections */
  addSeparator() {
    this.checkPageBreak(8);
    const { w } = getPageDims(this.doc);
    const centerX = w / 2;
    // Three small dots
    this.doc.setFillColor(...c.softBlue);
    this.doc.circle(centerX - 8, this.y + 2, 1, "F");
    this.doc.setFillColor(...c.softViolet);
    this.doc.circle(centerX, this.y + 2, 1.2, "F");
    this.doc.setFillColor(...c.softBlue);
    this.doc.circle(centerX + 8, this.y + 2, 1, "F");
    this.y += 8;
  }

  /** Add vertical spacing */
  addSpace(mm = 3) {
    this.y += mm;
  }
}

/** Adds a chapter title page — premium minimalist dark blue */
export const addChapterPage = (doc: jsPDF, num: number, title: string, subtitle: string, pageNum: number) => {
  doc.addPage();
  const { w, h, margin } = getPageDims(doc);

  // Dark blue background
  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  // Subtle abstract circles (very soft)
  doc.setFillColor(30, 50, 100);
  doc.circle(-20, h * 0.3, 60, "F");
  doc.circle(w + 15, h * 0.7, 45, "F");

  // Soft violet accent line
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(margin + 20, h / 2 - 45, w - margin - 20, h / 2 - 45);

  // Chapter number — large, violet accent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.setTextColor(...c.lightViolet);
  doc.text(`${num}`, w / 2, h / 2 - 18, { align: "center" });

  // Title
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), w - margin * 2 - 20);
  doc.text(titleLines, w / 2, h / 2 + 8, { align: "center" });

  // Subtitle
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...c.lightViolet);
    const subLines = doc.splitTextToSize(subtitle, w - margin * 2 - 20);
    doc.text(subLines, w / 2, h / 2 + 28, { align: "center" });
  }

  // Bottom accent line
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(margin + 20, h / 2 + 42, w - margin - 20, h / 2 + 42);

  addFooter(doc, pageNum);
};

// Keep legacy exports for backward compatibility
export const addSectionTitle = (doc: jsPDF, y: number, text: string): number => {
  const { margin } = getPageDims(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...c.deepBlue);
  doc.text(text, margin, y);
  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2.5, margin + doc.getTextWidth(text), y + 2.5);
  return y + 10;
};

export const addParagraph = (doc: jsPDF, y: number, text: string, fontSize = 10.5): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...c.bodyText);
  const lines = doc.splitTextToSize(text, contentW);
  doc.text(lines, margin, y);
  return y + lines.length * (fontSize * 0.48) + 4;
};

export const addBulletList = (doc: jsPDF, y: number, items: string[], fontSize = 10): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  items.forEach((item) => {
    doc.setFillColor(...c.lightBlue);
    doc.circle(margin + 3, y - 1.2, 1.2, "F");
    doc.setTextColor(...c.bodyText);
    const lines = doc.splitTextToSize(item, contentW - 14);
    doc.text(lines, margin + 10, y);
    y += lines.length * (fontSize * 0.46) + 3;
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
  const lines = doc.splitTextToSize(text, contentW - 22);
  const boxH = 14 + lines.length * 4.5;
  doc.setFillColor(...bgColor);
  doc.roundedRect(margin, y, contentW, boxH, 3, 3, "F");
  doc.setFillColor(...accentColor);
  doc.roundedRect(margin, y, 3, boxH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.text(title, margin + 10, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...c.bodyText);
  doc.text(lines, margin + 10, y + 14);
  return y + boxH + 6;
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
