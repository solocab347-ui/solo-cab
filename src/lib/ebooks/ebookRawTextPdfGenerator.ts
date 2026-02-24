import jsPDF from "jspdf";
import { audiobookChapters } from "@/lib/audiobook/solocabAudiobookContent";

export async function generateEbookRawTextPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 25;
  const marginBottom = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = marginTop;

  const addPageFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SoloCab — L'Illusion des Applications — Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  };

  const checkNewPage = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      addPageFooter();
      doc.addPage();
      y = marginTop;
    }
  };

  // === Cover page ===
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("L'Illusion des Applications", pageWidth / 2, 80, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("Être indépendant dans le secteur du VTC", pageWidth / 2, 95, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text("Par SoloCab", pageWidth / 2, 115, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Texte intégral — Version brute", pageWidth / 2, 135, { align: "center" });

  addPageFooter();
  doc.addPage();
  y = marginTop;

  // === Chapters ===
  for (const chapter of audiobookChapters) {
    // Chapter title
    checkNewPage(20);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");

    const titleLines = doc.splitTextToSize(chapter.title, contentWidth);
    for (const line of titleLines) {
      checkNewPage(8);
      doc.text(line, marginLeft, y);
      y += 8;
    }

    if (chapter.subtitle) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(80, 80, 80);
      const subtitleLines = doc.splitTextToSize(chapter.subtitle, contentWidth);
      for (const line of subtitleLines) {
        checkNewPage(6);
        doc.text(line, marginLeft, y);
        y += 6;
      }
    }

    y += 6;

    // Paragraphs
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);

    for (const paragraph of chapter.paragraphs) {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      for (const line of lines) {
        checkNewPage(5.5);
        doc.text(line, marginLeft, y);
        y += 5.5;
      }
      y += 3; // inter-paragraph spacing
    }

    y += 10; // inter-chapter spacing
  }

  addPageFooter();
  doc.save("SoloCab-eBook-Texte-Integral.pdf");
}
