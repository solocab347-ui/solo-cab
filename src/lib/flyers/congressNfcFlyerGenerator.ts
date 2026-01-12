import jsPDF from 'jspdf';
import logoSolocab from '@/assets/logo-solocab.png';

// Helper function to load image as base64
const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const generateCongressNfcFlyer = async (): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Charger le logo
  const logoBase64 = await loadImageAsBase64(logoSolocab);
  
  // Dimensions A4: 210 x 297 mm
  await drawFullPageFlyer(doc, logoBase64);
  
  doc.save('SoloCab_Congress_NFC_Gratuit.pdf');
};

async function drawFullPageFlyer(
  doc: jsPDF, 
  logoBase64: string
): Promise<void> {
  const pageWidth = 210;
  const pageHeight = 297;
  const centerX = pageWidth / 2;
  const margin = 12;
  
  // Couleurs SoloCab - Indépendance, Confiance, Liberté
  const darkBlue: [number, number, number] = [26, 26, 46];
  const accentBlue: [number, number, number] = [59, 130, 246]; // Confiance
  const violet: [number, number, number] = [139, 92, 246]; // Indépendance
  const orange: [number, number, number] = [249, 115, 22]; // Énergie, Action
  const white: [number, number, number] = [255, 255, 255];
  const lightGray: [number, number, number] = [248, 250, 252];
  const darkText: [number, number, number] = [30, 30, 40];
  const mutedText: [number, number, number] = [100, 100, 115];
  
  // ========== FOND BLANC ==========
  doc.setFillColor(...white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // ========== EN-TÊTE PREMIUM ==========
  doc.setFillColor(...darkBlue);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Bandes décoratives - couleurs de l'indépendance
  doc.setFillColor(...violet);
  doc.rect(0, 50, pageWidth, 2.5, 'F');
  
  doc.setFillColor(...orange);
  doc.rect(0, 52.5, pageWidth, 2, 'F');
  
  // Logo SoloCab
  try {
    doc.addImage(logoBase64, 'PNG', margin, 8, 48, 24);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin, 24);
  }
  
  // Slogan
  doc.setTextColor(180, 180, 200);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text("L'independance au service de l'excellence", margin, 38);
  
  // Badge Congrès VTC
  doc.setFillColor(...orange);
  doc.roundedRect(pageWidth - margin - 52, 10, 52, 28, 4, 4, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONGRES VTC', pageWidth - margin - 26, 22, { align: 'center' });
  doc.setFontSize(16);
  doc.text('2026', pageWidth - margin - 26, 33, { align: 'center' });
  
  // ========== BANDEAU GRATUIT - VERT ==========
  let currentY = 62;
  
  const green: [number, number, number] = [34, 197, 94];
  const lightGreen: [number, number, number] = [74, 222, 128];
  
  doc.setFillColor(...green);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 32, 5, 5, 'F');
  
  // Effet lumineux
  doc.setFillColor(...lightGreen);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 5, 0, 'F');
  doc.rect(margin, currentY + 5, pageWidth - margin * 2, 5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...white);
  doc.text('100% GRATUIT', centerX, currentY + 17, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('OFFERT A CHAQUE CHAUFFEUR VTC AU CONGRES', centerX, currentY + 27, { align: 'center' });
  
  // ========== TITRE PRINCIPAL ==========
  currentY += 40;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Votre Kit NFC Professionnel Gratuit', centerX, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('Connectez vos clients en un simple scan !', centerX, currentY, { align: 'center' });
  
  // ========== ZONE ILLUSTRATIONS NFC ==========
  currentY += 10;
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 55, 6, 6, 'F');
  
  // ===== PLAQUE NFC (gauche) =====
  const plateWidth = 72;
  const plateHeight = 42;
  const plateX = margin + 12;
  const plateY = currentY + 6;
  
  // Ombre
  doc.setFillColor(170, 170, 190);
  doc.roundedRect(plateX + 2, plateY + 2, plateWidth, plateHeight, 4, 4, 'F');
  
  // Plaque - Bleu foncé
  doc.setFillColor(...darkBlue);
  doc.roundedRect(plateX, plateY, plateWidth, plateHeight, 4, 4, 'F');
  
  // Bandeau violet
  doc.setFillColor(...violet);
  doc.roundedRect(plateX, plateY, plateWidth, 8, 4, 0, 'F');
  doc.rect(plateX, plateY + 4, plateWidth, 4, 'F');
  
  // Logo sur plaque
  try {
    doc.addImage(logoBase64, 'PNG', plateX + plateWidth / 2 - 15, plateY + 11, 30, 15);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', plateX + plateWidth / 2, plateY + 20, { align: 'center' });
  }
  
  // Texte
  doc.setTextColor(180, 180, 200);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez pour me contacter', plateX + plateWidth / 2, plateY + 32, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(1);
  doc.circle(plateX + plateWidth / 2, plateY + 38, 2.5);
  doc.setLineWidth(0.7);
  doc.circle(plateX + plateWidth / 2, plateY + 38, 4);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAQUE NFC', plateX + plateWidth / 2, currentY + 52, { align: 'center' });
  
  // ===== CARTE NFC (droite) =====
  const cardWidth = 64;
  const cardHeight = 38;
  const cardX = pageWidth - margin - cardWidth - 12;
  const cardY = currentY + 8;
  
  // Ombre
  doc.setFillColor(170, 170, 190);
  doc.roundedRect(cardX + 2, cardY + 2, cardWidth, cardHeight, 3, 3, 'F');
  
  // Carte - Bleu accentué
  doc.setFillColor(...accentBlue);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
  
  // Bande orange
  doc.setFillColor(...orange);
  doc.roundedRect(cardX, cardY, cardWidth, 7, 3, 0, 'F');
  doc.rect(cardX, cardY + 3, cardWidth, 4, 'F');
  
  // Logo sur carte
  try {
    doc.addImage(logoBase64, 'PNG', cardX + cardWidth / 2 - 12, cardY + 10, 24, 12);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', cardX + cardWidth / 2, cardY + 18, { align: 'center' });
  }
  
  // Texte
  doc.setTextColor(220, 220, 240);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Carte NFC Pro', cardX + cardWidth / 2, cardY + 27, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...white);
  doc.setLineWidth(0.7);
  doc.circle(cardX + cardWidth / 2, cardY + 32, 2);
  doc.circle(cardX + cardWidth / 2, cardY + 32, 3.5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTE NFC', cardX + cardWidth / 2, currentY + 52, { align: 'center' });
  
  // ========== SECTION AVANTAGES ==========
  currentY += 62;
  
  // Titre section - Orange
  doc.setFillColor(...orange);
  doc.roundedRect(centerX - 68, currentY, 136, 10, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Pourquoi prendre votre kit NFC ?', centerX, currentY + 7, { align: 'center' });
  
  currentY += 15;
  
  const advantages = [
    { text: 'Vos clients scannent et accedent a votre profil', color: accentBlue },
    { text: 'Inscription client en 1 clic depuis leur telephone', color: violet },
    { text: 'Plaque a poser dans votre vehicule', color: orange },
    { text: 'Carte a garder sur vous pour vos rencontres pro', color: accentBlue },
    { text: 'Fidelisez votre clientele sans effort', color: violet },
    { text: 'Reprenez le controle de votre relation client !', color: orange },
  ];
  
  for (const advantage of advantages) {
    // Cercle coloré
    doc.setFillColor(...advantage.color);
    doc.circle(margin + 6, currentY + 1, 3.5, 'F');
    
    // Checkmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.text('V', margin + 6, currentY + 2.8, { align: 'center' });
    
    // Texte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.text(advantage.text, margin + 14, currentY + 2.5);
    
    currentY += 9;
  }
  
  // ========== PIED DE PAGE ==========
  const footerY = pageHeight - 30;
  
  doc.setFillColor(...darkBlue);
  doc.rect(0, footerY, pageWidth, 30, 'F');
  
  // Bandes décoratives
  doc.setFillColor(...orange);
  doc.rect(0, footerY, pageWidth, 3, 'F');
  
  doc.setFillColor(...violet);
  doc.rect(0, footerY + 3, pageWidth, 2, 'F');
  
  // Logo pied de page
  try {
    doc.addImage(logoBase64, 'PNG', margin, footerY + 9, 38, 19);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin + 20, footerY + 20);
  }
  
  // Texte pied de page
  doc.setTextColor(...white);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('STAND SOLOCAB - CONGRES VTC 2026', pageWidth - margin, footerY + 15, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Venez recuperer votre kit NFC 100% gratuit !', pageWidth - margin, footerY + 25, { align: 'right' });
}
