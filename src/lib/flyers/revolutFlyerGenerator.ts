import jsPDF from "jspdf";
import QRCode from "qrcode";
import logoSolocab from "@/assets/logo-solocab.png";

const REVOLUT_AFFILIATE_LINK = "https://business.revolut.com/signup?promo=referabusiness&ext=84126ab0-866f-e281-00c0-413e57ca5f58&context=B2B_REFERRAL";

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

// Generate QR code as base64
const generateQRCode = async (url: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: "#003264",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Draw a single flyer in a quadrant
const drawFlyer = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  logoBase64: string,
  qrCodeBase64: string
) => {
  const margin = 6;
  const innerWidth = width - margin * 2;
  const innerX = x + margin;
  const innerY = y + margin;

  // Colors
  const revolutBlue: [number, number, number] = [0, 50, 100];
  const revolutLight: [number, number, number] = [0, 100, 170];
  const accentGold: [number, number, number] = [218, 165, 32];
  const white: [number, number, number] = [255, 255, 255];
  const darkText: [number, number, number] = [40, 40, 50];
  const lightBg: [number, number, number] = [245, 250, 255];

  // ========== HEADER SECTION ==========
  doc.setFillColor(...revolutBlue);
  doc.rect(x, y, width, 38, "F");

  // SoloCab logo top left
  try {
    doc.addImage(logoBase64, "PNG", innerX + 2, innerY + 2, 20, 10);
  } catch (e) {
    console.log("Logo not loaded");
  }

  // Gold decorative line
  doc.setDrawColor(...accentGold);
  doc.setLineWidth(1.5);
  doc.line(x, y + 38, x + width, y + 38);

  // Header text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accentGold);
  doc.text("RECOMMANDATION SOLOCAB", innerX + innerWidth / 2, innerY + 6, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(...white);
  doc.text("COMPTE PRO REVOLUT", innerX + innerWidth / 2, innerY + 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Outils bancaires modernes pour chauffeurs VTC", innerX + innerWidth / 2, innerY + 26, { align: "center" });

  doc.setFontSize(6);
  doc.setTextColor(...accentGold);
  doc.text("Lien d'affiliation - Soutenez SoloCab", innerX + innerWidth / 2, innerY + 32, { align: "center" });

  // ========== MAIN CONTENT ==========
  let yPos = y + 44;

  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...revolutBlue);
  doc.text("Pourquoi choisir Revolut Business ?", innerX + innerWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Benefits list with proper icons (no emojis)
  const benefits = [
    { icon: "+", text: "Compte professionnel 100% en ligne" },
    { icon: "+", text: "Envoyez des liens de paiement par SMS" },
    { icon: "+", text: "Comptabilite simplifiee integree" },
    { icon: "+", text: "Cartes virtuelles et physiques gratuites" },
    { icon: "+", text: "Paiements internationaux sans frais caches" },
    { icon: "+", text: "Application mobile intuitive" },
  ];

  benefits.forEach((benefit, index) => {
    // Alternating background
    if (index % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.roundedRect(innerX, yPos - 1, innerWidth, 8, 1, 1, "F");
    }

    // Icon circle
    doc.setFillColor(...revolutLight);
    doc.circle(innerX + 5, yPos + 2.5, 2.5, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text(benefit.icon, innerX + 5, yPos + 4, { align: "center" });

    // Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...darkText);
    doc.text(benefit.text, innerX + 12, yPos + 4);

    yPos += 9;
  });

  // ========== HIGHLIGHT BOX ==========
  yPos += 2;
  doc.setFillColor(...revolutLight);
  doc.roundedRect(innerX, yPos, innerWidth, 16, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.text("LIENS DE PAIEMENT", innerX + innerWidth / 2, yPos + 6, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Demandez le paiement directement a vos clients", innerX + innerWidth / 2, yPos + 11, { align: "center" });
  doc.text("par SMS ou email - Simple et rapide !", innerX + innerWidth / 2, yPos + 14.5, { align: "center" });

  // ========== QR CODE SECTION ==========
  yPos = y + height - 48;
  doc.setFillColor(...revolutBlue);
  doc.rect(x, yPos, width, 48, "F");

  // QR Code
  const qrSize = 28;
  const qrX = innerX + (innerWidth - qrSize) / 2;
  try {
    doc.addImage(qrCodeBase64, "PNG", qrX, yPos + 4, qrSize, qrSize);
  } catch (e) {
    console.log("QR code not loaded");
  }

  // Text below QR
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...accentGold);
  doc.text("SCANNEZ POUR VOUS INSCRIRE", innerX + innerWidth / 2, yPos + 35, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(...white);
  doc.text("business.revolut.com", innerX + innerWidth / 2, yPos + 39.5, { align: "center" });

  // Affiliate notice
  doc.setFontSize(5);
  doc.setTextColor(...accentGold);
  doc.text("Lien d'affiliation SoloCab - Votre inscription nous soutient !", innerX + innerWidth / 2, yPos + 44, { align: "center" });

  // Border around the flyer
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height, "S");
};

export const generateRevolutFlyer = async () => {
  // Load assets
  const [logoBase64, qrCodeBase64] = await Promise.all([
    loadImageAsBase64(logoSolocab),
    generateQRCode(REVOLUT_AFFILIATE_LINK),
  ]);

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
  drawFlyer(doc, 0, 0, flyerWidth, flyerHeight, logoBase64, qrCodeBase64);
  drawFlyer(doc, flyerWidth, 0, flyerWidth, flyerHeight, logoBase64, qrCodeBase64);
  drawFlyer(doc, 0, flyerHeight, flyerWidth, flyerHeight, logoBase64, qrCodeBase64);
  drawFlyer(doc, flyerWidth, flyerHeight, flyerWidth, flyerHeight, logoBase64, qrCodeBase64);

  // Add cut lines (dashed)
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);

  // Vertical center line
  doc.line(flyerWidth, 0, flyerWidth, pageHeight);
  // Horizontal center line
  doc.line(0, flyerHeight, pageWidth, flyerHeight);

  doc.setLineDashPattern([], 0);

  // Save
  doc.save("Flyer_Revolut_Business_SoloCab.pdf");
};
