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
  addPartie9,
  addPartie10,
  addPartie11,
  addPartie12,
  addPartie13,
  addPartie14,
  addPartie15,
  addPartie16,
  addClosingPages,
} from "./solocabEbookPages";

export const generateSolocabEbook = async () => {
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
  page = addPartie9(doc, page + 1);
  page = addPartie10(doc, page + 1);
  page = addPartie11(doc, page + 1);
  page = addPartie12(doc, page + 1);
  page = addPartie13(doc, page + 1);
  page = addPartie14(doc, page + 1);
  page = addPartie15(doc, page + 1);
  page = addPartie16(doc, page + 1);
  addClosingPages(doc, page + 1);

  doc.save("LIllusion_des_Applications_SoloCab_2026.pdf");
};
