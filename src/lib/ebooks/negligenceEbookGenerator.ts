import jsPDF from "jspdf";
import {
  initLogo,
  addCover,
  addTableOfContents,
  addIntroduction,
  addPartie1,
  addPartie2,
  addPartie3,
  addPartie4,
  addPartie5,
  addPartie6,
  addPartie7,
  addPartie8,
  addSection9,
  addSection10,
  addSection11,
  addSection12,
  addClosingPages,
} from "./negligenceEbookPages";

export const generateNegligenceEbook = async () => {
  await initLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addCover(doc);
  addTableOfContents(doc);
  let page = addIntroduction(doc);
  page = addPartie1(doc, page + 1);
  page = addPartie2(doc, page + 1);
  page = addPartie3(doc, page + 1);
  page = addPartie4(doc, page + 1);
  page = addPartie5(doc, page + 1);
  page = addPartie6(doc, page + 1);
  page = addPartie7(doc, page + 1);
  page = addPartie8(doc, page + 1);
  page = addSection9(doc, page + 1);
  page = addSection10(doc, page + 1);
  page = addSection11(doc, page + 1);
  page = addSection12(doc, page + 1);
  addClosingPages(doc, page + 1);

  doc.save("Ce_Que_Les_Applications_Negligent_SoloCab_2026.pdf");
};
