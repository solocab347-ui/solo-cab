import jsPDF from "jspdf";
import { addCover, addTableOfContents, addIntroPage, addChapter1, addChapter2, addChapter3, addChapter4, addChapter5, addChapter6, addChapter7, addChapter8 } from "./solocabEbookPages";

export const generateSolocabEbook = async () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addCover(doc);
  addTableOfContents(doc);
  addIntroPage(doc);
  addChapter1(doc);
  addChapter2(doc);
  addChapter3(doc);
  addChapter4(doc);
  addChapter5(doc);
  addChapter6(doc);
  addChapter7(doc);
  addChapter8(doc);

  doc.save("SoloCab_Guide_Complet_2026.pdf");
};
