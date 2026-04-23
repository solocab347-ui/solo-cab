import jsPDF from "jspdf";
import logoSolocab from "@/assets/logo-solocab.png";

// Helper function to load image as base64
const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const generateValuesCharter = async (t: (key: string) => string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Corporate Colors - SoloCab brand
  const primaryBlue: [number, number, number] = [0, 82, 165]; // Corporate blue
  const goldColor: [number, number, number] = [180, 150, 80]; // Gold for elegance
  const darkColor: [number, number, number] = [25, 25, 35];
  const grayColor: [number, number, number] = [80, 80, 90];
  const lightGray: [number, number, number] = [240, 240, 245];

  // Load logo
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadImageAsBase64(logoSolocab);
  } catch (e) {
    console.error("Could not load logo:", e);
  }

  // ========== PAGE 1 - COVER PAGE ==========
  
  // Background gradient effect (subtle)
  doc.setFillColor(250, 250, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top decorative band
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 8, "F");
  
  // Gold accent line
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.line(0, 8, pageWidth, 8);

  // Company Logo area - Real logo
  const logoY = 40;
  if (logoBase64) {
    // Add the real logo image
    doc.addImage(logoBase64, "PNG", pageWidth / 2 - 20, logoY - 18, 40, 36);
  } else {
    // Fallback to text if logo fails to load
    doc.setFillColor(...primaryBlue);
    doc.circle(pageWidth / 2, logoY, 22, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, logoY, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryBlue);
    doc.text("SOLO", pageWidth / 2, logoY - 2, { align: "center" });
    doc.text("CAB", pageWidth / 2, logoY + 5, { align: "center" });
  }

  // Main Title with shadow effect
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(200, 200, 210);
  doc.text("CHARTE D'ENGAGEMENTS", pageWidth / 2 + 0.5, 82.5, { align: "center" });
  doc.setTextColor(...primaryBlue);
  doc.text("CHARTE D'ENGAGEMENTS", pageWidth / 2, 82, { align: "center" });

  // Decorative line under title
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(2);
  doc.line(margin + 20, 90, pageWidth - margin - 20, 90);
  
  doc.setLineWidth(0.5);
  doc.line(margin + 40, 93, pageWidth - margin - 40, 93);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.text("Document Officiel", pageWidth / 2, 105, { align: "center" });

  // Company name styled
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...primaryBlue);
  doc.text("SASU SOLOCAB", pageWidth / 2, 118, { align: "center" });

  // Legal info box - plus compact
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin + 15, 128, contentWidth - 30, 20, 3, 3, "F");
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 15, 128, contentWidth - 30, 20, 3, 3, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text("RCS Paris : 994 176 576 | SIRET : 994 176 576 00014", pageWidth / 2, 138, { align: "center" });
  doc.text("Siège social : 10 rue de Penthièvre, 75008 Paris", pageWidth / 2, 145, { align: "center" });

  // Vision statement - repositionné
  doc.setFont("helvetica", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...darkColor);
  const vision = "« Pour un monde VTC plus humain et solidaire »";
  doc.text(vision, pageWidth / 2, 162, { align: "center" });

  // Decorative corner elements
  const cornerSize = 15;
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  
  // Top left corner
  doc.line(margin, margin + 60, margin, margin + 60 + cornerSize);
  doc.line(margin, margin + 60, margin + cornerSize, margin + 60);
  
  // Top right corner
  doc.line(pageWidth - margin, margin + 60, pageWidth - margin, margin + 60 + cornerSize);
  doc.line(pageWidth - margin, margin + 60, pageWidth - margin - cornerSize, margin + 60);
  
  // Bottom left corner
  doc.line(margin, pageHeight - margin - 20, margin, pageHeight - margin - 20 - cornerSize);
  doc.line(margin, pageHeight - margin - 20, margin + cornerSize, pageHeight - margin - 20);
  
  // Bottom right corner
  doc.line(pageWidth - margin, pageHeight - margin - 20, pageWidth - margin, pageHeight - margin - 20 - cornerSize);
  doc.line(pageWidth - margin, pageHeight - margin - 20, pageWidth - margin - cornerSize, pageHeight - margin - 20);

  // Official stamp area - repositionné plus haut
  const stampX = pageWidth / 2;
  const stampY = 195;
  
  // Outer stamp circle
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(2);
  doc.circle(stampX, stampY, 28, "S");
  doc.setLineWidth(1);
  doc.circle(stampX, stampY, 25, "S");
  doc.circle(stampX, stampY, 22, "S");

  // Stamp text - circular
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...primaryBlue);
  doc.text("SASU SOLOCAB", stampX, stampY - 16, { align: "center" });
  doc.text("* DOCUMENT CERTIFIE *", stampX, stampY - 10, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("RCS PARIS", stampX, stampY + 12, { align: "center" });
  doc.text("994 176 576", stampX, stampY + 16, { align: "center" });

  // Center of stamp - checkmark (using simple V)
  doc.setFillColor(...primaryBlue);
  doc.circle(stampX, stampY, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("V", stampX, stampY + 3, { align: "center" });

  // Signature area - repositionnée
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text("Le Président,", pageWidth / 2, 235, { align: "center" });

  // Signature line simulation
  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.3);
  
  // Stylized signature "A. Kanouté"
  const sigX = pageWidth / 2 - 15;
  const sigY = 247;
  
  // "A" stylized
  doc.setDrawColor(40, 40, 60);
  doc.setLineWidth(0.5);
  
  // Simulated handwriting signature
  doc.line(sigX, sigY, sigX + 5, sigY - 8);
  doc.line(sigX + 5, sigY - 8, sigX + 10, sigY);
  doc.line(sigX + 2, sigY - 4, sigX + 8, sigY - 4);
  
  // Paraph/flourish
  doc.line(sigX + 12, sigY - 6, sigX + 35, sigY - 4);
  doc.line(sigX + 20, sigY - 2, sigX + 40, sigY);
  doc.line(sigX + 35, sigY - 4, sigX + 40, sigY - 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text("Abdallah KANOUTÉ", pageWidth / 2, 257, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text("Président de SASU SoloCab", pageWidth / 2, 263, { align: "center" });

  // Footer
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(2);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text("www.solocab.fr", pageWidth / 2, pageHeight - 6, { align: "center" });

  // ========== PAGE 2 - ENGAGEMENTS ==========
  doc.addPage();

  // Header band
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 8, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.line(0, 8, pageWidth, 8);

  // Page title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...primaryBlue);
  doc.text("NOS ENGAGEMENTS", pageWidth / 2, 25, { align: "center" });

  // Decorative line
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(margin + 50, 30, pageWidth - margin - 50, 30);

  let yPosition = 42;

  // Engagements with numbered boxes
  const engagements = [
    {
      title: "L'Humain Avant le Profit",
      text: "SoloCab s'engage à toujours placer les intérêts des chauffeurs indépendants, gestionnaires de flotte et clients avant la recherche du profit. Chaque décision est guidée par son impact sur les personnes.",
    },
    {
      title: "La Technologie au Service de l'Indépendant",
      text: "La technologie doit servir l'entrepreneur indépendant et non l'inverse. Nos outils sont conçus pour simplifier le quotidien des professionnels VTC indépendants, pas pour les asservir à des algorithmes opaques.",
    },
    {
      title: "Les Meilleurs Outils Technologiques",
      text: "SoloCab s'engage à mettre à disposition des chauffeurs indépendants et gestionnaires de flotte les outils les plus performants et innovants pour développer leur activité en toute autonomie.",
    },
    {
      title: "Visibilité pour les Indépendants",
      text: "Nous nous engageons à offrir une visibilité équitable à chaque chauffeur indépendant et gestionnaire de flotte, leur permettant d'acquérir de nouveaux clients et de développer leur activité librement.",
    },
    {
      title: "Relations Saines entre Partenaires Indépendants",
      text: "SoloCab s'engage à créer et maintenir des relations saines, équilibrées et transparentes entre tous les indépendants et partenaires de la plateforme, dans le respect mutuel et l'équité.",
    },
    {
      title: "L'Union Face à la Confusion",
      text: "Là où les grandes plateformes ont semé la confusion et la division, SoloCab s'engage à créer de l'union et de la solidarité entre les professionnels indépendants du VTC.",
    },
    {
      title: "Partenariats Gagnant-Gagnant",
      text: "Nos partenariats entre indépendants sont conçus pour bénéficier autant au chauffeur qui partage qu'à celui qui reçoit. Fini l'esprit de compétition déloyale, place à l'entraide et au partage équitable.",
    },
    {
      title: "Dialogue avec les Organisations Syndicales",
      text: "SoloCab s'engage à maintenir un dialogue permanent avec les organisations syndicales représentant les travailleurs indépendants du VTC. En concertation avec eux, nous garantissons des prix de course minimum dignes et des frais de transaction de partage plafonnées, pour ne jamais reproduire les dérives des grandes plateformes.",
    },
    {
      title: "Protection des Indépendants",
      text: "SoloCab s'engage à défendre les intérêts des chauffeurs indépendants face aux pratiques abusives du marché. Nous garantissons une transparence totale sur les tarifs et refusons toute course en dessous des seuils de rentabilité définis avec les représentants de la profession.",
    },
    {
      title: "Fidélité à Nos Valeurs",
      text: "SoloCab s'engage à rester fidèle à ces valeurs fondamentales, quelles que soient les pressions du marché. Cette charte constitue notre engagement solennel envers la communauté des indépendants du VTC.",
    },
  ];

  engagements.forEach((engagement, index) => {
    // Calculer la hauteur nécessaire pour cet engagement
    const tempSplitText = doc.splitTextToSize(engagement.text, contentWidth - 14);
    const engagementHeight = 8 + tempSplitText.length * 4.5 + 8;
    
    // Check if we need a new page (avec marge pour l'attestation si c'est le dernier)
    const isLast = index === engagements.length - 1;
    const neededSpace = isLast ? engagementHeight + 70 : engagementHeight;
    
    if (yPosition + neededSpace > pageHeight - 15) {
      doc.addPage();
      
      // Header band on new page
      doc.setFillColor(...primaryBlue);
      doc.rect(0, 0, pageWidth, 8, "F");
      doc.setDrawColor(...goldColor);
      doc.setLineWidth(1.5);
      doc.line(0, 8, pageWidth, 8);
      
      yPosition = 20;
    }

    // Number box
    doc.setFillColor(...primaryBlue);
    doc.roundedRect(margin, yPosition - 5, 10, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(String(index + 1), margin + 5, yPosition + 2, { align: "center" });

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryBlue);
    doc.text(engagement.title, margin + 14, yPosition + 2);

    yPosition += 8;

    // Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...darkColor);
    
    const splitText = doc.splitTextToSize(engagement.text, contentWidth - 14);
    doc.text(splitText, margin + 14, yPosition);
    
    yPosition += splitText.length * 4.5 + 8;
  });

  // ========== FINAL SECTION - ATTESTATION ==========
  // Ajouter un peu d'espace avant l'attestation
  yPosition += 5;
  
  // Vérifier si on a besoin d'une nouvelle page pour l'attestation
  if (yPosition + 60 > pageHeight - 15) {
    doc.addPage();
    
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, pageWidth, 8, "F");
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.line(0, 8, pageWidth, 8);
    
    yPosition = 25;
  }

  // Attestation box - positionnée juste après le dernier engagement
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(margin, yPosition, contentWidth, 50, 4, 4, "F");
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, yPosition, contentWidth, 50, 4, 4, "S");

  // Gold corners on attestation box
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(2);
  doc.line(margin, yPosition + 8, margin, yPosition);
  doc.line(margin, yPosition, margin + 8, yPosition);
  doc.line(pageWidth - margin, yPosition + 8, pageWidth - margin, yPosition);
  doc.line(pageWidth - margin, yPosition, pageWidth - margin - 8, yPosition);
  doc.line(margin, yPosition + 50 - 8, margin, yPosition + 50);
  doc.line(margin, yPosition + 50, margin + 8, yPosition + 50);
  doc.line(pageWidth - margin, yPosition + 50 - 8, pageWidth - margin, yPosition + 50);
  doc.line(pageWidth - margin, yPosition + 50, pageWidth - margin - 8, yPosition + 50);

  // Attestation title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryBlue);
  doc.text("ATTESTATION D'ENGAGEMENT", pageWidth / 2, yPosition + 10, { align: "center" });

  // Small stamp in attestation
  const miniStampX = margin + 25;
  const miniStampY = yPosition + 32;
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(1);
  doc.circle(miniStampX, miniStampY, 12, "S");
  doc.circle(miniStampX, miniStampY, 10, "S");
  doc.setFontSize(5);
  doc.setTextColor(...primaryBlue);
  doc.text("SOLOCAB", miniStampX, miniStampY - 3, { align: "center" });
  doc.text("CERTIFIÉ", miniStampX, miniStampY + 2, { align: "center" });
  doc.setFillColor(...primaryBlue);
  doc.circle(miniStampX, miniStampY + 6, 2, "F");

  // Attestation text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  const attestation = "Je soussigné, Abdallah KANOUTÉ, Président de la société SASU SoloCab, atteste par la présente que notre entreprise s'engage solennellement à respecter l'ensemble des engagements énoncés dans ce document.";
  const splitAttestation = doc.splitTextToSize(attestation, contentWidth - 60);
  doc.text(splitAttestation, margin + 45, yPosition + 22);

  // Signature in attestation
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("A. Kanouté", pageWidth - margin - 35, yPosition + 42);

  // Date
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Fait à Paris, le ${date}`, pageWidth / 2, yPosition + 58, { align: "center" });

  // Footer
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(2);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text("SASU SoloCab | RCS Paris 994 176 576 | www.solocab.fr", pageWidth / 2, pageHeight - 6, { align: "center" });

  // Save the PDF
  doc.save("Charte_Engagements_SoloCab.pdf");
};
