import jsPDF from "jspdf";

const REVOLUT_AFFILIATE_LINK = "https://business.revolut.com/signup?promo=referabusiness&ext=84126ab0-866f-e281-00c0-413e57ca5f58&context=B2B_REFERRAL";

// Draw a single flyer in a quadrant
const drawFlyer = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const margin = 4;
  const innerWidth = width - margin * 2;
  const innerX = x + margin;
  const innerY = y + margin;

  // Colors
  const revolutBlue: [number, number, number] = [0, 50, 100];
  const revolutLight: [number, number, number] = [0, 120, 200];
  const accentGold: [number, number, number] = [218, 165, 32];
  const white: [number, number, number] = [255, 255, 255];
  const darkText: [number, number, number] = [30, 30, 40];
  const lightBg: [number, number, number] = [240, 248, 255];

  // Background gradient effect
  doc.setFillColor(...revolutBlue);
  doc.rect(x, y, width, 30, "F");
  
  // Decorative element
  doc.setDrawColor(...accentGold);
  doc.setLineWidth(1.5);
  doc.line(x, y + 30, x + width, y + 30);

  // Header title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accentGold);
  doc.text("✨ RECOMMANDATION SOLOCAB", innerX + innerWidth / 2, innerY + 6, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...white);
  doc.text("COMPTE PRO REVOLUT", innerX + innerWidth / 2, innerY + 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Outils bancaires modernes pour chauffeurs VTC", innerX + innerWidth / 2, innerY + 23, { align: "center" });

  // Main content area
  let yPos = y + 35;
  
  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...revolutBlue);
  doc.text("Pourquoi ouvrir un compte Revolut Business ?", innerX + innerWidth / 2, yPos, { align: "center" });
  yPos += 6;

  // Benefits list
  const benefits = [
    { icon: "💳", text: "Compte professionnel 100% en ligne" },
    { icon: "🔗", text: "Liens de paiement pour vos clients" },
    { icon: "📊", text: "Comptabilité simplifiée intégrée" },
    { icon: "💰", text: "Cartes virtuelles et physiques" },
    { icon: "🌍", text: "Paiements internationaux" },
    { icon: "📱", text: "Application mobile intuitive" },
  ];

  benefits.forEach((benefit) => {
    doc.setFillColor(...lightBg);
    doc.roundedRect(innerX, yPos, innerWidth, 7, 1.5, 1.5, "F");
    
    doc.setFontSize(6);
    doc.text(benefit.icon, innerX + 3, yPos + 4.5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...darkText);
    doc.text(benefit.text, innerX + 10, yPos + 4.5);
    
    yPos += 8;
  });

  // Highlight box - Payment links
  yPos += 2;
  doc.setFillColor(...revolutLight);
  doc.roundedRect(innerX, yPos, innerWidth, 14, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...white);
  doc.text("✓ LIENS DE PAIEMENT", innerX + innerWidth / 2, yPos + 5, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("Envoyez un lien par SMS à vos clients", innerX + innerWidth / 2, yPos + 10, { align: "center" });

  // CTA section
  yPos = y + height - 26;
  doc.setFillColor(...revolutBlue);
  doc.rect(x, yPos, width, 26, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...accentGold);
  doc.text("INSCRIVEZ-VOUS MAINTENANT", innerX + innerWidth / 2, yPos + 6, { align: "center" });
  
  // Dotted box for link
  doc.setDrawColor(...white);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(innerX + 2, yPos + 9, innerWidth - 4, 8, 1, 1, "S");
  doc.setLineDashPattern([], 0);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(...white);
  doc.text("Scannez le QR code ou rendez-vous sur :", innerX + innerWidth / 2, yPos + 13, { align: "center" });
  
  doc.setFontSize(4);
  doc.text("business.revolut.com (lien affilié SoloCab)", innerX + innerWidth / 2, yPos + 16, { align: "center" });

  // SoloCab footer
  doc.setFontSize(4);
  doc.setTextColor(...accentGold);
  doc.text("Recommandé par SoloCab - solocab.fr", innerX + innerWidth / 2, yPos + 23, { align: "center" });

  // Border around the flyer
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height, "S");
};

export const generateRevolutFlyer = async () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  
  // 4 flyers in a 2x2 grid
  const flyerWidth = pageWidth / 2; // 105mm
  const flyerHeight = pageHeight / 2; // 148.5mm (A6 size)
  
  // Draw 4 flyers
  // Top-left
  drawFlyer(doc, 0, 0, flyerWidth, flyerHeight);
  // Top-right
  drawFlyer(doc, flyerWidth, 0, flyerWidth, flyerHeight);
  // Bottom-left
  drawFlyer(doc, 0, flyerHeight, flyerWidth, flyerHeight);
  // Bottom-right
  drawFlyer(doc, flyerWidth, flyerHeight, flyerWidth, flyerHeight);

  // Add cut lines (dashed)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  
  // Vertical center line
  doc.line(flyerWidth, 0, flyerWidth, pageHeight);
  // Horizontal center line
  doc.line(0, flyerHeight, pageWidth, flyerHeight);
  
  doc.setLineDashPattern([], 0);

  // Save
  doc.save("Flyer_Revolut_Business_SoloCab.pdf");
};
