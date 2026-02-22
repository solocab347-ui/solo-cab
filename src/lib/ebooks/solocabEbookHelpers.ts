import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";

const c = ebookColors;

export const getPageDims = (doc: jsPDF) => ({
  w: doc.internal.pageSize.getWidth(),
  h: doc.internal.pageSize.getHeight(),
  margin: 28,
  contentW: doc.internal.pageSize.getWidth() - 56,
});

/** Adds a footer bar with page number */
export const addFooter = (doc: jsPDF, pageNum: number) => {
  const { w, h, margin } = getPageDims(doc);
  // Subtle line above footer
  doc.setDrawColor(...c.softBlue);
  doc.setLineWidth(0.3);
  doc.line(margin, h - 16, w - margin, h - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...c.grayText);
  doc.text("L'Illusion des Applications — Offert par SoloCab Academy", margin, h - 9);
  doc.text(`${pageNum}`, w - margin, h - 9, { align: "right" });
};

// ==========================================
// DocContext: auto-pagination helper — premium editorial style
// ==========================================
export class DocContext {
  doc: jsPDF;
  y: number;
  pageNum: number;
  maxY: number;

  constructor(doc: jsPDF, startPage: number, startY = 32) {
    this.doc = doc;
    this.y = startY;
    this.pageNum = startPage;
    const { h } = getPageDims(doc);
    this.maxY = h - 22;
  }

  /** Check if we need a new page, if so add one */
  checkPageBreak(neededHeight: number = 12) {
    if (this.y + neededHeight > this.maxY) {
      addFooter(this.doc, this.pageNum);
      this.doc.addPage();
      this.pageNum++;
      this.y = 32;
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
    this.y = 32;
  }

  /** Add a section title with violet underline — premium style */
  addTitle(text: string) {
    this.checkPageBreak(18);
    const { margin } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(17);
    this.doc.setTextColor(...c.deepBlue);
    this.doc.text(text, margin, this.y);
    // Soft violet underline
    this.doc.setDrawColor(...c.softViolet);
    this.doc.setLineWidth(1);
    this.doc.line(margin, this.y + 3, margin + this.doc.getTextWidth(text), this.y + 3);
    this.y += 14;
  }

  /** Add a sub-title — primary blue accent */
  addSubTitle(text: string) {
    this.checkPageBreak(14);
    const { margin } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(...c.primaryBlue);
    this.doc.text(text, margin, this.y);
    this.y += 10;
  }

  /** Add body paragraph — premium readable style (12.5pt, 1.6x line height) */
  addParagraph(text: string, fontSize = 12.5) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...c.bodyText);
    const lines: string[] = this.doc.splitTextToSize(text, contentW);
    const lineH = fontSize * 0.55; // ~1.6x line height for premium readability

    for (const line of lines) {
      this.checkPageBreak(lineH + 1);
      this.doc.text(line, margin, this.y);
      this.y += lineH;
    }
    this.y += 4; // generous paragraph spacing
  }

  /** Add multiple paragraphs from an array */
  addParagraphs(texts: string[], fontSize = 12.5) {
    for (const t of texts) {
      this.addParagraph(t, fontSize);
    }
  }

  /** Add bullet list with soft blue bullets */
  addBulletList(items: string[], fontSize = 11.5) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(fontSize);
    const lineH = fontSize * 0.52;

    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, contentW - 16);
      this.checkPageBreak(lines.length * lineH + 5);
      // Soft blue bullet
      this.doc.setFillColor(...c.lightBlue);
      this.doc.circle(margin + 3.5, this.y - 1.5, 1.5, "F");
      this.doc.setTextColor(...c.bodyText);
      this.doc.text(lines, margin + 12, this.y);
      this.y += lines.length * lineH + 4;
    }
    this.y += 2;
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
    this.doc.setFontSize(11);
    const lines: string[] = this.doc.splitTextToSize(text, contentW - 24);
    const boxH = 16 + lines.length * 5.2;

    this.checkPageBreak(boxH + 8);

    this.doc.setFillColor(...bgColor);
    this.doc.roundedRect(margin, this.y, contentW, boxH, 3, 3, "F");
    this.doc.setFillColor(...accentColor);
    this.doc.roundedRect(margin, this.y, 3.5, boxH, 1.5, 1.5, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11.5);
    this.doc.setTextColor(...accentColor);
    this.doc.text(title, margin + 12, this.y + 9);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...c.bodyText);
    this.doc.text(lines, margin + 12, this.y + 16);

    this.y += boxH + 8;
  }

  /** Add a quote/highlight block — soft violet accent */
  addQuote(text: string) {
    const { margin, contentW } = getPageDims(this.doc);
    this.doc.setFont("helvetica", "bolditalic");
    this.doc.setFontSize(13);
    const lines: string[] = this.doc.splitTextToSize(text, contentW - 24);
    const boxH = 14 + lines.length * 6.5;

    this.checkPageBreak(boxH + 8);

    this.doc.setFillColor(...c.lightGold);
    this.doc.roundedRect(margin, this.y, contentW, boxH, 4, 4, "F");
    this.doc.setFillColor(...c.softViolet);
    this.doc.roundedRect(margin, this.y, 4, boxH, 2, 2, "F");

    this.doc.setTextColor(...c.deepBlue);
    this.doc.text(lines, margin + 14, this.y + 9);
    this.y += boxH + 8;
  }

  /** Add a subtle visual separator between sections — three elegant dots */
  addSeparator() {
    this.checkPageBreak(14);
    const { w } = getPageDims(this.doc);
    const centerX = w / 2;
    this.y += 3;
    // Three elegant dots
    this.doc.setFillColor(...c.softBlue);
    this.doc.circle(centerX - 10, this.y + 3, 1.2, "F");
    this.doc.setFillColor(...c.softViolet);
    this.doc.circle(centerX, this.y + 3, 1.5, "F");
    this.doc.setFillColor(...c.softBlue);
    this.doc.circle(centerX + 10, this.y + 3, 1.2, "F");
    this.y += 12;
  }

  /** Add a decorative abstract element — subtle geometric shapes */
  addDecorativeElement() {
    this.checkPageBreak(20);
    const { w } = getPageDims(this.doc);
    const centerX = w / 2;
    // Subtle light blue horizontal line with violet accent
    this.doc.setDrawColor(...c.softBlue);
    this.doc.setLineWidth(0.4);
    this.doc.line(centerX - 40, this.y + 5, centerX - 6, this.y + 5);
    this.doc.line(centerX + 6, this.y + 5, centerX + 40, this.y + 5);
    // Central diamond
    this.doc.setFillColor(...c.softViolet);
    const dy = this.y + 5;
    this.doc.triangle(centerX, dy - 3, centerX - 3, dy, centerX, dy + 3, "F");
    this.doc.triangle(centerX, dy - 3, centerX + 3, dy, centerX, dy + 3, "F");
    this.y += 16;
  }

  /** Add vertical spacing */
  addSpace(mm = 6) {
    this.y += mm;
  }

  /** Fill remaining page space with decorative elements to avoid large white areas */
  fillRemainingSpace() {
    const { w, margin } = getPageDims(this.doc);
    const remaining = this.maxY - this.y;
    if (remaining < 40) return; // Not enough space to bother

    // Add a decorative separator
    this.addSeparator();

    // If still lots of space, add subtle decorative geometric elements
    const stillRemaining = this.maxY - this.y;
    if (stillRemaining > 80) {
      // Add a soft inspirational quote box to fill space
      this.doc.setFillColor(...c.lightBg);
      const boxH = Math.min(stillRemaining - 30, 50);
      this.doc.roundedRect(margin + 20, this.y, getPageDims(this.doc).contentW - 40, boxH, 4, 4, "F");
      this.doc.setFillColor(...c.softViolet);
      this.doc.roundedRect(margin + 20, this.y, 3, boxH, 1.5, 1.5, "F");
      
      this.doc.setFont("helvetica", "italic");
      this.doc.setFontSize(11);
      this.doc.setTextColor(...c.grayText);
      const quotes = [
        "« La compréhension est le premier pas vers la liberté. »",
        "« Celui qui comprend le système peut le transformer. »",
        "« L'indépendance se construit, elle ne se reçoit pas. »",
        "« La valeur appartient à ceux qui la créent. »",
        "« Comprendre pour choisir. Choisir pour construire. »",
      ];
      const quote = quotes[Math.floor(this.pageNum % quotes.length)];
      const lines = this.doc.splitTextToSize(quote, getPageDims(this.doc).contentW - 70);
      this.doc.text(lines, margin + 32, this.y + boxH / 2 + 2);
      this.y += boxH + 8;
    }

    // Add subtle decorative dots at bottom
    const finalRemaining = this.maxY - this.y;
    if (finalRemaining > 30) {
      this.y += finalRemaining / 2 - 5;
      this.addDecorativeElement();
    }
  }
}

/** Adds a chapter title page — premium minimalist dark blue with abstract art + logo */
export const addChapterPage = (doc: jsPDF, num: number, title: string, subtitle: string, pageNum: number, logoDataUrl?: string | null) => {
  doc.addPage();
  const { w, h, margin } = getPageDims(doc);

  // Dark blue background
  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  // Subtle abstract shapes — light geometric circles
  doc.setFillColor(25, 45, 88);
  doc.circle(-25, h * 0.25, 65, "F");
  doc.circle(w + 20, h * 0.65, 50, "F");
  doc.setFillColor(35, 58, 110);
  doc.circle(w * 0.8, h * 0.2, 20, "F");

  // Logo SoloCab Academy on chapter page
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", w / 2 - 14, h / 2 - 85, 28, 28);
    } catch { /* silent */ }
  }

  // Top decorative line — soft violet
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(margin + 15, h / 2 - 50, w - margin - 15, h / 2 - 50);

  // Chapter number — large, violet accent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(60);
  doc.setTextColor(...c.lightViolet);
  doc.text(`${num}`, w / 2, h / 2 - 15, { align: "center" });

  // Title — large, white
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), w - margin * 2 - 20);
  doc.text(titleLines, w / 2, h / 2 + 15, { align: "center" });

  // Subtitle — if provided
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...c.lightViolet);
    const subLines = doc.splitTextToSize(subtitle, w - margin * 2 - 20);
    doc.text(subLines, w / 2, h / 2 + 37, { align: "center" });
  }

  // Bottom decorative line
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(margin + 15, h / 2 + 53, w - margin - 15, h / 2 + 53);

  // Small decorative dot pattern at bottom
  const dotsY = h - 45;
  doc.setFillColor(40, 60, 115);
  for (let i = 0; i < 5; i++) {
    doc.circle(w / 2 - 20 + i * 10, dotsY, 1, "F");
  }

  addFooter(doc, pageNum);
};

// Keep legacy exports for backward compatibility
export const addSectionTitle = (doc: jsPDF, y: number, text: string): number => {
  const { margin } = getPageDims(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...c.deepBlue);
  doc.text(text, margin, y);
  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1);
  doc.line(margin, y + 3, margin + doc.getTextWidth(text), y + 3);
  return y + 14;
};

export const addParagraph = (doc: jsPDF, y: number, text: string, fontSize = 12.5): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...c.bodyText);
  const lines = doc.splitTextToSize(text, contentW);
  doc.text(lines, margin, y);
  return y + lines.length * (fontSize * 0.55) + 5;
};

export const addBulletList = (doc: jsPDF, y: number, items: string[], fontSize = 11.5): number => {
  const { margin, contentW } = getPageDims(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  items.forEach((item) => {
    doc.setFillColor(...c.lightBlue);
    doc.circle(margin + 3.5, y - 1.5, 1.5, "F");
    doc.setTextColor(...c.bodyText);
    const lines = doc.splitTextToSize(item, contentW - 16);
    doc.text(lines, margin + 12, y);
    y += lines.length * (fontSize * 0.52) + 4;
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
  const lines = doc.splitTextToSize(text, contentW - 24);
  const boxH = 16 + lines.length * 5.2;
  doc.setFillColor(...bgColor);
  doc.roundedRect(margin, y, contentW, boxH, 3, 3, "F");
  doc.setFillColor(...accentColor);
  doc.roundedRect(margin, y, 3.5, boxH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...accentColor);
  doc.text(title, margin + 12, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...c.bodyText);
  doc.text(lines, margin + 12, y + 16);
  return y + boxH + 8;
};

export const addStatBoxes = (
  doc: jsPDF,
  y: number,
  stats: { value: string; label: string }[]
): number => {
  const { margin, contentW } = getPageDims(doc);
  const boxW = (contentW - (stats.length - 1) * 5) / stats.length;
  stats.forEach((stat, i) => {
    const x = margin + i * (boxW + 5);
    doc.setFillColor(...c.lightBg);
    doc.roundedRect(x, y, boxW, 26, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...c.primaryBlue);
    doc.text(stat.value, x + boxW / 2, y + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...c.grayText);
    doc.text(stat.label, x + boxW / 2, y + 20, { align: "center" });
  });
  return y + 32;
};
