import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";
import {
  getPageDims,
  addFooter,
  DocContext,
} from "./solocabEbookHelpers";

const c = ebookColors;

// Logo loading helper
const loadImage = async (path: string): Promise<string | null> => {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

let logoDataUrl: string | null = null;
let coverImageDataUrl: string | null = null;

export const initLogo = async () => {
  logoDataUrl = await loadImage("/images/solocab-academy-logo.png");
  coverImageDataUrl = await loadImage("/images/ebook-negligence-cover.png");
};

const addLogo = (doc: jsPDF, x: number, y: number, size = 20) => {
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", x, y, size, size); } catch { /* silent */ }
  }
};

// Custom footer for this eBook
const addNegligenceFooter = (doc: jsPDF, pageNum: number) => {
  const { w, h, margin } = getPageDims(doc);
  doc.setDrawColor(...c.softBlue);
  doc.setLineWidth(0.3);
  doc.line(margin, h - 16, w - margin, h - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...c.grayText);
  doc.text("Ce que les Applications Negligent — SoloCab Academy", margin, h - 9);
  doc.text(`${pageNum}`, w - margin, h - 9, { align: "right" });
};

// Custom DocContext with different footer
class NegligenceDocContext extends DocContext {
  finishPage() {
    addNegligenceFooter(this.doc, this.pageNum);
  }

  checkPageBreak(neededHeight: number = 12) {
    if (this.y + neededHeight > this.maxY) {
      addNegligenceFooter(this.doc, this.pageNum);
      this.doc.addPage();
      this.pageNum++;
      this.y = 32;
    }
  }
}

/** Chapter title page — same premium dark blue style */
const addChapterPage = (doc: jsPDF, num: number, title: string, subtitle: string, pageNum: number) => {
  doc.addPage();
  const { w, h, margin } = getPageDims(doc);

  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  // Abstract shapes
  doc.setFillColor(25, 45, 88);
  doc.circle(-25, h * 0.25, 65, "F");
  doc.circle(w + 20, h * 0.65, 50, "F");
  doc.setFillColor(35, 58, 110);
  doc.circle(w * 0.8, h * 0.2, 20, "F");

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", w / 2 - 14, h / 2 - 85, 28, 28); } catch { /* silent */ }
  }

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(margin + 15, h / 2 - 50, w - margin - 15, h / 2 - 50);

  if (num > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.setTextColor(...c.lightViolet);
    doc.text(`${num}`, w / 2, h / 2 - 15, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(num > 0 ? 22 : 26);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), w - margin * 2 - 20);
  doc.text(titleLines, w / 2, h / 2 + (num > 0 ? 15 : 0), { align: "center" });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...c.lightViolet);
    const subLines = doc.splitTextToSize(subtitle, w - margin * 2 - 20);
    doc.text(subLines, w / 2, h / 2 + 37, { align: "center" });
  }

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(margin + 15, h / 2 + 53, w - margin - 15, h / 2 + 53);

  const dotsY = h - 45;
  doc.setFillColor(40, 60, 115);
  for (let i = 0; i < 5; i++) {
    doc.circle(w / 2 - 20 + i * 10, dotsY, 1, "F");
  }

  addNegligenceFooter(doc, pageNum);
};

// ========== COVER ==========
export const addCover = (doc: jsPDF) => {
  const { w, h } = getPageDims(doc);

  if (coverImageDataUrl) {
    // Full-page cover image
    try {
      doc.addImage(coverImageDataUrl, "PNG", 0, 0, w, h);
    } catch {
      // Fallback to dark background
      doc.setFillColor(...c.darkBlue);
      doc.rect(0, 0, w, h, "F");
    }
  } else {
    doc.setFillColor(...c.darkBlue);
    doc.rect(0, 0, w, h, "F");
  }

  // Subtle SoloCab Academy branding at very bottom
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 220);
  doc.text("SoloCab Academy — Edition 2026", w / 2, h - 8, { align: "center" });
  doc.link(0, 0, w, h, { url: "https://www.solocab.fr" });
};

// ========== TABLE OF CONTENTS ==========
export const addTableOfContents = (doc: jsPDF) => {
  doc.addPage();
  const { w, margin } = getPageDims(doc);

  addLogo(doc, w / 2 - 12, 18, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...c.deepBlue);
  doc.text("SOMMAIRE", w / 2, 55, { align: "center" });

  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 30, 60, w / 2 + 30, 60);

  const chapters = [
    { label: "Intro", title: "Comprendre le systeme avant de juger ses effets" },
    { label: "Partie I", title: "La maturation du modele : du partenariat a l'asymetrie" },
    { label: "Partie II", title: "L'abondance comme mecanisme de dilution du pouvoir" },
    { label: "Partie III", title: "La notation : evaluation ou levier de pression ?" },
    { label: "Partie IV", title: "La negligence indirecte du client" },
    { label: "Partie V", title: "La degradation du role professionnel" },
    { label: "Partie VI", title: "Les conflits et la protection asymetrique" },
    { label: "Partie VII", title: "Le choix structurel du volume sur la relation" },
    { label: "Partie VIII", title: "Comprendre pour sortir du cycle" },
    { label: "Section 9", title: "Les evolutions possibles du modele" },
    { label: "Section 10", title: "Reprendre le controle de la relation" },
    { label: "Section 11", title: "La rehumanisation du service" },
    { label: "Section 12", title: "SoloCab : l'outil structurel de transition" },
    { label: "", title: "Conclusion — Lucidite, pas revolte" },
  ];

  let y = 74;
  chapters.forEach((ch) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...c.softViolet);
    doc.text(ch.label, margin + 2, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...c.bodyText);
    doc.text(ch.title, margin + 32, y);

    doc.setDrawColor(...c.softBlue);
    doc.setLineWidth(0.2);
    const textEnd = margin + 32 + doc.getTextWidth(ch.title) + 4;
    doc.line(textEnd, y - 0.5, w - margin, y - 0.5);

    y += 12.5;
  });

  addNegligenceFooter(doc, 2);
};

// ========== INTRODUCTION ==========
export const addIntroduction = (doc: jsPDF): number => {
  addChapterPage(doc, 0, "Introduction", "Comprendre le systeme avant de juger ses effets", 3);

  doc.addPage();
  const ctx = new NegligenceDocContext(doc, 4);

  ctx.addParagraphs([
    "Avant d'analyser un dysfonctionnement, il faut comprendre l'architecture.",
    "Les plateformes VTC ne sont pas des entreprises traditionnelles. Ce sont des systemes technologiques scalables conçus pour :",
  ]);

  ctx.addBulletList([
    "Optimiser la mise en relation instantanee",
    "Maximiser le volume",
    "Reduire les frictions",
    "Industrialiser la mobilite",
    "Generer de la rentabilite a grande echelle",
  ]);

  ctx.addParagraphs([
    "Elles ne sont pas construites pour :",
  ]);

  ctx.addBulletList([
    "Stabiliser les revenus individuels",
    "Personnaliser la relation",
    "Proteger la dignite professionnelle",
    "Construire de la loyaute",
  ]);

  ctx.addQuote("Ce n'est pas une critique morale. C'est une realite structurelle.");

  ctx.addDecorativeElement();

  ctx.addSubTitle("Donnees economiques recentes (2024-2025)");

  ctx.addParagraphs([
    "Selon le rapport financier 2024 de Uber Technologies Inc. :",
  ]);

  ctx.addInfoCard("Chiffres Uber 2024", "156 millions d'utilisateurs actifs mensuels — 7,6 millions de chauffeurs et livreurs actifs — Plus de 40 milliards de dollars de chiffre d'affaires annuel — Rentabilite consolidee — Free Cash Flow record");

  ctx.addParagraphs([
    "Le marche mondial du ride-hailing est estime a plus de 220 milliards de dollars en 2024.",
  ]);

  ctx.addInfoCard("En France", "Plus de 110 000 cartes professionnelles VTC delivrees — Environ 40 % reellement actifs a plein temps — Forte saturation en Ile-de-France");

  ctx.addQuote("Le modele n'est plus en phase de conquete. Il est en phase de consolidation financiere.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 1 — LA MATURATION DU MODÈLE ==========
export const addPartie1 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 1, "La maturation du modele", "Du partenariat a l'asymetrie", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addSubTitle("Section 1 — Le cycle naturel d'une plateforme");

  ctx.addTitle("1.1 Phase d'expansion collaborative");
  ctx.addParagraphs([
    "Au depart, la plateforme a besoin des chauffeurs pour creer l'offre et des clients pour valider l'utilite.",
    "Elle propose :",
  ]);
  ctx.addBulletList(["Bonus eleves", "Frais de transaction incitatives", "Communication valorisant l'independance"]);
  ctx.addQuote("Le chauffeur est presente comme partenaire.");

  ctx.addSeparator();

  ctx.addTitle("1.2 Phase de masse critique");
  ctx.addParagraphs([
    "Une fois le reseau installe : les clients sont habitues, le volume est auto-entretenu, le nombre de chauffeurs depasse la demande.",
    "Le rapport de dependance change.",
  ]);
  ctx.addQuote("Ce n'est plus la plateforme qui depend du chauffeur. C'est le chauffeur qui depend du flux.");

  ctx.addSeparator();

  ctx.addTitle("1.3 Phase de rentabilite et centralisation");
  ctx.addParagraphs([
    "Depuis 2023-2024, la priorite est claire :",
  ]);
  ctx.addBulletList(["Optimisation du take rate", "Stabilisation des marges", "Reduction des incitations"]);
  ctx.addQuote("Le chauffeur devient une variable d'ajustement.");

  ctx.addInfoCard("Reformulation systemique", "Au depart : cooperation. A maturite : centralisation du pouvoir.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 2 — L'ABONDANCE ==========
export const addPartie2 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 2, "L'abondance comme mecanisme de dilution", "Le surnombre organise", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addTitle("2.1 Expansion massive du nombre de chauffeurs");
  ctx.addParagraphs(["Entre 2021 et 2024 :"]);
  ctx.addBulletList(["Augmentation continue des cartes VTC", "Formations accessibles", "Entree simplifiee"]);
  ctx.addQuote("Resultat : offre excedentaire.");

  ctx.addSeparator();

  ctx.addTitle("2.2 Effet economique sur le revenu");
  ctx.addInfoCard("Donnees terrain 2024-2025", "Revenu brut horaire : 18 a 28 euros selon zone — Revenu net reel apres charges : souvent 7 a 11 euros par heure — Inflation 2022-2024 impactant assurance et carburant");
  ctx.addParagraphs(["La rentabilite individuelle se compresse."]);

  ctx.addSeparator();

  ctx.addTitle("2.3 Consequence comportementale : la multi-application");
  ctx.addParagraphs(["Pour survivre economiquement :"]);
  ctx.addBulletList(["Chauffeurs connectes sur 2 ou 3 applications", "Arbitrage permanent des courses", "Annulations strategiques"]);
  ctx.addQuote("Ce n'est pas un manque d'ethique. C'est un mecanisme de survie economique.");

  ctx.addSeparator();

  ctx.addTitle("2.4 Effet domino sur la qualite client");
  ctx.addParagraphs(["Le client peut :"]);
  ctx.addBulletList(["Attendre", "Voir sa course annulee", "Perdre un rendez-vous", "Manquer un vol"]);
  ctx.addParagraphs([
    "La plateforme a choisi le volume. Le volume genere de l'optimisation individuelle. L'optimisation individuelle genere de l'instabilite.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 3 — LA NOTATION ==========
export const addPartie3 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 3, "La notation", "Mecanisme d'evaluation ou levier de pression ?", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addTitle("3.1 Apparence de symetrie");
  ctx.addParagraphs(["Client note chauffeur. Chauffeur note client. En apparence : equilibre."]);

  ctx.addSeparator();

  ctx.addTitle("3.2 Realite d'impact");
  ctx.addInfoCard("Un client mal note", "Continue d'utiliser la plateforme. Subit rarement exclusion definitive.");
  ctx.addInfoCard("Un chauffeur mal note", "Risque suspension. Perte immediate de revenu.", c.lightGold, c.softViolet);
  ctx.addQuote("L'asymetrie est economique.");

  ctx.addSeparator();

  ctx.addTitle("3.3 Les avis non verifies");
  ctx.addParagraphs(["Les problemes rencontres :"]);
  ctx.addBulletList(["Faux signalements", "Mauvaises notes emotionnelles", "Absence de contre-enquete humaine"]);
  ctx.addParagraphs(["Le chauffeur peut contester. Mais le traitement est algorithmique."]);

  ctx.addSeparator();

  ctx.addTitle("3.4 Management algorithmique");
  ctx.addParagraphs(["Les recherches 2023-2024 montrent :"]);
  ctx.addBulletList(["Hausse du stress lie a l'evaluation permanente", "Sentiment d'opacite decisionnelle", "Difficulte a comprendre les suspensions"]);
  ctx.addQuote("La donnee remplace le dialogue humain.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 4 — NÉGLIGENCE INDIRECTE DU CLIENT ==========
export const addPartie4 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 4, "La negligence indirecte du client", "Quand la pression sur le chauffeur devient un probleme client", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "On pourrait penser que les plateformes privilegient les clients. En realite, elles privilegient le volume de clients.",
  ]);
  ctx.addQuote("Ce n'est pas la meme chose.");

  ctx.addTitle("4.1 Volume contre qualite");
  ctx.addParagraphs(["Le modele economique repose sur :"]);
  ctx.addBulletList(["Promotions regulieres", "Reductions", "Acquisition massive", "Fidelisation par prix"]);
  ctx.addParagraphs(["Mais quand le chauffeur est sous pression, il optimise ses trajets, il refuse les courses peu rentables, il annule strategiquement.", "Le client devient victime d'un mecanisme indirect."]);

  ctx.addSeparator();

  ctx.addTitle("4.2 L'engrenage des annulations");
  ctx.addInfoCard("Scenario typique observe sur le terrain",
    "1. Le chauffeur reçoit une course peu rentable. 2. Il l'accepte pour ne pas penaliser son taux. 3. Il reste connecte sur une autre application. 4. Une meilleure course apparait. 5. Il annule la premiere. Le client attend. Il ne comprend pas le mecanisme."
  );
  ctx.addQuote("Le systeme genere de la defiance.");

  ctx.addSeparator();

  ctx.addTitle("4.3 Degradation de la confiance");
  ctx.addBulletList(["Retards a des rendez-vous professionnels", "Stress avant un vol", "Perte de credibilite pour le client"]);
  ctx.addParagraphs(["Les plateformes absorbent statistiquement ces incidents. Mais individuellement, ils marquent."]);

  ctx.addTitle("4.4 Satisfaction 2024");
  ctx.addBulletList(["Sensibilite accrue aux delais d'attente", "Tolerance reduite aux annulations", "Attente de personnalisation plus forte"]);
  ctx.addQuote("Le modele standardise entre en tension avec les attentes modernes.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 5 — DÉGRADATION DU RÔLE PROFESSIONNEL ==========
export const addPartie5 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 5, "La degradation du role professionnel", "De professionnel a operateur interchangeable", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addParagraphs(["Le chauffeur supporte :"]);
  ctx.addBulletList(["Le cout du vehicule", "L'entretien", "L'assurance", "Le carburant", "Les charges sociales"]);
  ctx.addQuote("Il cree la valeur reelle du service.");

  ctx.addParagraphs(["Mais il n'a :"]);
  ctx.addBulletList(["Aucun controle sur le prix", "Aucune maitrise de l'algorithme", "Aucun acces aux donnees globales"]);

  ctx.addParagraphs(["La plateforme detient :"]);
  ctx.addBulletList(["La donnee", "Le client", "Le pouvoir de suspension", "Le controle des flux"]);

  ctx.addDecorativeElement();

  ctx.addTitle("5.1 L'invisibilisation de la competence");
  ctx.addParagraphs([
    "Un chauffeur experimente et un debutant sont presentes de la meme maniere, evalues sur la meme base, traites comme interchangeables.",
  ]);
  ctx.addQuote("L'experience n'est pas monetisee. La fidelite n'est pas recompensee structurellement.");

  ctx.addSeparator();

  ctx.addTitle("5.2 Decisions sans consultation");
  ctx.addBulletList(["Ajustement des frais de transaction", "Changements d'algorithme", "Revision des conditions d'acceptation"]);
  ctx.addParagraphs(["Sans consultation collective reelle."]);
  ctx.addQuote("La masse remplace le dialogue.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 6 — CONFLITS ET PROTECTION ==========
export const addPartie6 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 6, "Les conflits et la protection asymetrique", "Les risques rencontres par les chauffeurs", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addParagraphs(["Les situations problematiques :"]);
  ctx.addBulletList(["Clients mal intentionnes", "Fausses accusations", "Conflits sur le prix", "Signalements abusifs"]);
  ctx.addParagraphs(["La protection doit etre bilaterale. Mais l'impact economique est asymetrique."]);

  ctx.addInfoCard("Un client mecontent", "Peut changer d'application.");
  ctx.addInfoCard("Un chauffeur suspendu", "Peut perdre 100 % de son revenu immediat.", c.lightGold, c.softViolet);

  ctx.addSeparator();

  ctx.addTitle("6.1 La peur permanente");
  ctx.addParagraphs(["Le chauffeur developpe :"]);
  ctx.addBulletList(["Hyper-vigilance", "Stress de la note", "Peur du signalement"]);
  ctx.addQuote("Ce climat altere la relation. Le service devient prudent, moins spontane.");

  ctx.addSeparator();

  ctx.addTitle("6.2 L'absence de mediation humaine rapide");
  ctx.addParagraphs([
    "Les contestations sont souvent traitees automatiquement, sans echange humain direct, sans contextualisation.",
  ]);
  ctx.addQuote("Le modele industriel reduit le dialogue.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 7 — CHOIX DU VOLUME ==========
export const addPartie7 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 7, "Le choix structurel du volume", "Sur la relation", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addParagraphs(["Les plateformes ont fait un choix rationnel :"]);
  ctx.addInfoCard("Preferer", "1 million de courses standardisees plutot que 100 000 relations fidelisees.");
  ctx.addQuote("La relation personnalisee n'est pas scalable. Le volume l'est.");

  ctx.addSeparator();

  ctx.addTitle("7.1 Rentabilite consolidee 2024-2025");
  ctx.addBulletList(["Amelioration des marges", "Stabilisation du modele", "Priorite a la rentabilite"]);
  ctx.addParagraphs(["Le systeme fonctionne. Mais il ne fonctionne pas pour stabiliser l'humain."]);

  ctx.addSeparator();

  ctx.addTitle("7.2 L'effet systemique global");
  ctx.addParagraphs([
    "Quand le chauffeur optimise, le client s'impatiente, la plateforme consolide. Le desequilibre devient structurel.",
  ]);
  ctx.addQuote("Ce n'est pas une faute individuelle. C'est un engrenage.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 8 — COMPRENDRE POUR SORTIR ==========
export const addPartie8 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 8, "Comprendre pour sortir du cycle", "Le desequilibre n'est pas accidentel", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Il est fondamental de comprendre ceci : le desequilibre observe n'est pas une erreur ponctuelle. Il est le produit logique d'un systeme arrive a maturite.",
    "Quand un modele atteint la masse critique, la rentabilite et la domination de marche, il n'a plus besoin d'optimiser l'humain. Il optimise la performance.",
  ]);

  ctx.addSeparator();

  ctx.addTitle("8.1 Reformulation systemique");
  ctx.addParagraphs([
    "Le systeme fonctionne parfaitement selon ses objectifs internes. Mais ses objectifs ne sont pas :",
  ]);
  ctx.addBulletList(["La stabilite des revenus chauffeurs", "La securisation emotionnelle", "La fidelisation humaine", "La reconnaissance individuelle"]);
  ctx.addParagraphs(["Il est conçu pour :"]);
  ctx.addBulletList(["Fluidifier", "Industrialiser", "Standardiser", "Maximiser"]);
  ctx.addQuote("Le conflit nait lorsque l'humain attend autre chose que ce pour quoi le systeme est conçu.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== SECTION 9 — ÉVOLUTIONS ==========
export const addSection9 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 9, "Les evolutions possibles du modele", "", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addTitle("9.1 Evolution reglementaire");
  ctx.addBulletList(["Pression reglementaire croissante en Europe", "Encadrement des conditions de travail", "Discussions sur le statut hybride"]);
  ctx.addQuote("La regulation ajuste. Elle ne transforme pas la structure profonde.");

  ctx.addSeparator();

  ctx.addTitle("9.2 Evolution par specialisation");
  ctx.addParagraphs(["On observe depuis 2023-2025 :"]);
  ctx.addBulletList(["Montee des chauffeurs premium independants", "Developpement du B2B direct", "Recherche de clientele privee recurrente", "Mise en place de forfaits personnalises"]);
  ctx.addQuote("Le marche commence a se segmenter.");

  ctx.addSeparator();

  ctx.addTitle("9.3 Evolution technologique alternative");
  ctx.addParagraphs(["Nouveaux outils SaaS dedies aux chauffeurs :"]);
  ctx.addBulletList(["CRM integre", "Facturation automatique", "Page de reservation directe", "Gestion planning autonome"]);
  ctx.addParagraphs(["Ces outils permettent de recuperer la relation client, de securiser les revenus, de professionnaliser l'activite."]);
  ctx.addQuote("La technologie qui a cree la dependance peut aussi creer l'independance.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== SECTION 10 — REPRENDRE LE CONTRÔLE ==========
export const addSection10 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 10, "Reprendre le controle de la relation", "Le point central", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addParagraphs(["Le pouvoir reel n'est pas dans l'application, l'algorithme ou la tarification dynamique."]);
  ctx.addParagraphs(["Le pouvoir reel est dans :"]);
  ctx.addBulletList(["La relation client directe", "La fidelisation", "La personnalisation", "La recurrence"]);

  ctx.addQuote("Un chauffeur dependant du flux subit. Un chauffeur avec portefeuille client choisit.");

  ctx.addDecorativeElement();

  ctx.addTitle("10.1 Le modele hybride intelligent");
  ctx.addParagraphs(["La sortie n'est pas forcement radicale. Elle peut etre progressive :"]);
  ctx.addInfoCard("Phase 1", "70 % plateformes — 30 % clientele privee");
  ctx.addInfoCard("Phase 2", "50 / 50 — Equilibre", c.softBg, c.primaryBlue);
  ctx.addInfoCard("Phase 3", "70 % clientele directe — Independance", c.lightGold, c.softViolet);
  ctx.addQuote("La transition est strategique, pas emotionnelle.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== SECTION 11 — RÉHUMANISATION ==========
export const addSection11 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 11, "La rehumanisation du service", "", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addInfoCard("Un client veut", "Confiance — Previsibilite — Confort — Stabilite");
  ctx.addInfoCard("Un chauffeur veut", "Revenus securises — Respect professionnel — Visibilite — Maitrise", c.lightGold, c.softViolet);

  ctx.addSeparator();

  ctx.addQuote("Le modele plateforme repond au volume. Le modele independant repond a la relation.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== SECTION 12 — SOLOCAB ==========
export const addSection12 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 12, "SoloCab : l'outil structurel de transition", "", startPage);
  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);

  ctx.addQuote("L'independance ne se decrete pas. Elle s'organise.");

  ctx.addParagraphs(["Pour construire une clientele privee, il faut :"]);
  ctx.addBulletList([
    "Une page de reservation professionnelle",
    "Un systeme de facturation fiable",
    "Un CRM pour suivre les preferences",
    "Un planning optimise",
    "Des indicateurs clairs",
  ]);

  ctx.addParagraphs(["C'est exactement la logique derriere SoloCab."]);

  ctx.addDecorativeElement();

  ctx.addParagraphs(["SoloCab ne remplace pas les plateformes. Il permet de :"]);
  ctx.addBulletList(["Centraliser", "Structurer", "Professionnaliser", "Automatiser"]);

  ctx.addParagraphs(["Il redonne au chauffeur :"]);
  ctx.addBulletList(["Le controle strategique", "La relation client", "La visibilite financiere"]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== CLOSING PAGES ==========
export const addClosingPages = (doc: jsPDF, startPage: number): number => {
  // ===== CONCLUSION PAGE =====
  addChapterPage(doc, 0, "Conclusion", "Lucidite, pas revolte", startPage);

  doc.addPage();
  const ctx = new NegligenceDocContext(doc, startPage + 1);
  const { w } = getPageDims(doc);

  ctx.addParagraphs([
    "Ce document n'est pas une attaque. Il est une analyse.",
    "Les plateformes ont transforme la mobilite. Mais tout systeme a maturite cree des zones negligees.",
    "Comprendre ces zones permet :",
  ]);
  ctx.addBulletList([
    "D'arreter de subir",
    "De sortir de l'emotion",
    "De penser strategiquement",
    "De construire progressivement autre chose",
  ]);

  ctx.addQuote("L'independance n'est pas une opposition. C'est une evolution.");

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Course apres course.",
    "Client apres client.",
    "Relation apres relation.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();

  // ========== PAGE INSCRIPTION ==========
  doc.addPage();
  const h = doc.internal.pageSize.getHeight();
  const inscPage = ctx.pageNum + 1;

  doc.setFillColor(...c.lightBg);
  doc.rect(0, 0, w, h, "F");

  doc.setFillColor(230, 235, 248);
  doc.circle(w + 10, 40, 50, "F");
  doc.circle(-15, h - 50, 40, "F");

  addLogo(doc, w / 2 - 16, 28, 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...c.primaryBlue);
  doc.text("REJOIGNEZ SOLOCAB", w / 2, 78, { align: "center" });

  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 35, 84, w / 2 + 35, 84);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12.5);
  doc.setTextColor(...c.darkText);
  const inscTexts = doc.splitTextToSize(
    "Vous souhaitez reprendre le controle de votre activite ? Construire votre propre clientele ? Developper une activite durable et independante ?",
    w - 60
  );
  doc.text(inscTexts, w / 2, 98, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...c.darkText);
  doc.text("Inscrivez-vous gratuitement sur :", w / 2, 128, { align: "center" });

  const ctaX = w / 2 - 70;
  const ctaY = 136;
  const ctaW = 140;
  const ctaH = 20;
  const registrationUrl = "https://solo-cab-to-lovable.lovable.app/register-driver-promo";
  doc.setFillColor(...c.primaryBlue);
  doc.roundedRect(ctaX, ctaY, ctaW, ctaH, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  const ctaLabel = "solocab.fr/chauffeur";
  const ctaTextW = doc.getTextWidth(ctaLabel);
  doc.textWithLink(ctaLabel, w / 2 - ctaTextW / 2, 149, { url: registrationUrl });
  doc.link(ctaX, ctaY, ctaW, ctaH, { url: registrationUrl });

  doc.setFillColor(34, 197, 94);
  doc.roundedRect(w / 2 - 55, 158, 110, 14, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("14 JOURS D'ESSAI GRATUIT", w / 2, 168, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...c.grayText);
  doc.text("Ou scannez le QR code de votre chauffeur partenaire", w / 2, 182, { align: "center" });

  const features = [
    "Gerez vos clients et vos courses en toute autonomie",
    "Fixez vos propres tarifs",
    "Fidelisez votre clientele avec vos outils",
    "Developpez votre chiffre d'affaires en direct",
  ];
  let fy = 198;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...c.primaryBlue);
  features.forEach((f) => {
    doc.setFillColor(...c.primaryBlue);
    doc.circle(w / 2 - 75, fy - 1.2, 1.5, "F");
    doc.text(f, w / 2 - 70, fy);
    fy += 11;
  });

  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1);
  doc.line(55, fy + 6, w - 55, fy + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...c.grayText);
  doc.text("Plateforme 100% dediee aux chauffeurs VTC independants", w / 2, fy + 18, { align: "center" });
  doc.text("Sans frais de transaction sur vos courses directes", w / 2, fy + 26, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...c.primaryBlue);
  const linkLabel = ">> Cliquez ici pour vous inscrire <<";
  const linkW = doc.getTextWidth(linkLabel);
  doc.textWithLink(linkLabel, w / 2 - linkW / 2, fy + 42, { url: registrationUrl });

  addNegligenceFooter(doc, inscPage);

  // ========== BACK COVER ==========
  doc.addPage();

  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  doc.setFillColor(30, 52, 110);
  doc.circle(w + 25, h / 4, 65, "F");
  doc.circle(-25, h * 0.75, 85, "F");
  doc.setFillColor(35, 58, 120);
  doc.circle(w * 0.2, h * 0.15, 20, "F");

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(2);
  doc.line(45, h / 2 - 75, w - 45, h / 2 - 75);

  addLogo(doc, w / 2 - 20, h / 2 - 70, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("SOLOCAB ACADEMY", w / 2, h / 2 - 12, { align: "center" });

  doc.setFontSize(15);
  doc.setTextColor(...c.lightViolet);
  doc.text("Comprendre pour choisir.", w / 2, h / 2 + 8, { align: "center" });
  doc.text("Choisir pour construire.", w / 2, h / 2 + 22, { align: "center" });

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(2);
  doc.line(55, h / 2 + 38, w - 55, h / 2 + 38);

  doc.setFillColor(45, 65, 125);
  for (let i = 0; i < 5; i++) {
    doc.circle(w / 2 - 20 + i * 10, h / 2 + 50, 1, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("www.solocab.fr", w / 2, h / 2 + 65, { align: "center" });
  doc.text("contact@solocab.fr", w / 2, h / 2 + 78, { align: "center" });
  doc.link(w / 2 - 35, h / 2 + 57, 70, 14, { url: "https://www.solocab.fr" });

  doc.setFontSize(9);
  doc.setTextColor(180, 190, 230);
  doc.text("SoloCab SASU", w / 2, h - 28, { align: "center" });

  return inscPage + 1;
};
