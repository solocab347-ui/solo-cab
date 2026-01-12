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
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // Bandes décoratives - couleurs de l'indépendance
  doc.setFillColor(...violet);
  doc.rect(0, 60, pageWidth, 3, 'F');
  
  doc.setFillColor(...orange);
  doc.rect(0, 63, pageWidth, 2.5, 'F');
  
  // Logo SoloCab - Plus grand
  try {
    doc.addImage(logoBase64, 'PNG', margin, 12, 55, 28);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin, 30);
  }
  
  // Slogan
  doc.setTextColor(180, 180, 200);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text("L'independance au service de l'excellence", margin, 48);
  
  // Badge Congrès VTC
  doc.setFillColor(...orange);
  doc.roundedRect(pageWidth - margin - 58, 14, 58, 32, 5, 5, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONGRES VTC', pageWidth - margin - 29, 27, { align: 'center' });
  doc.setFontSize(18);
  doc.text('2026', pageWidth - margin - 29, 40, { align: 'center' });
  
  // ========== BANDEAU GRATUIT - VIOLET (Indépendance) ==========
  let currentY = 76;
  
  doc.setFillColor(...violet);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 38, 6, 6, 'F');
  
  // Effet lumineux
  doc.setFillColor(159, 112, 255);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 6, 0, 'F');
  doc.rect(margin, currentY + 6, pageWidth - margin * 2, 6, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...white);
  doc.text('100% GRATUIT', centerX, currentY + 22, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('OFFERT A CHAQUE CHAUFFEUR VTC AU CONGRES', centerX, currentY + 33, { align: 'center' });
  
  // ========== TITRE PRINCIPAL ==========
  currentY += 50;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Votre Kit NFC Professionnel', centerX, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('Connectez vos clients en un simple scan !', centerX, currentY, { align: 'center' });
  
  // ========== ZONE ILLUSTRATIONS NFC ==========
  currentY += 14;
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 65, 8, 8, 'F');
  
  // ===== PLAQUE NFC (gauche) =====
  const plateWidth = 80;
  const plateHeight = 48;
  const plateX = margin + 14;
  const plateY = currentY + 8;
  
  // Ombre
  doc.setFillColor(170, 170, 190);
  doc.roundedRect(plateX + 3, plateY + 3, plateWidth, plateHeight, 5, 5, 'F');
  
  // Plaque - Bleu foncé
  doc.setFillColor(...darkBlue);
  doc.roundedRect(plateX, plateY, plateWidth, plateHeight, 5, 5, 'F');
  
  // Bandeau violet
  doc.setFillColor(...violet);
  doc.roundedRect(plateX, plateY, plateWidth, 10, 5, 0, 'F');
  doc.rect(plateX, plateY + 5, plateWidth, 5, 'F');
  
  // Logo sur plaque
  try {
    doc.addImage(logoBase64, 'PNG', plateX + plateWidth / 2 - 18, plateY + 14, 36, 18);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', plateX + plateWidth / 2, plateY + 24, { align: 'center' });
  }
  
  // Texte
  doc.setTextColor(180, 180, 200);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez pour me contacter', plateX + plateWidth / 2, plateY + 38, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(1.2);
  doc.circle(plateX + plateWidth / 2, plateY + 44, 3);
  doc.setLineWidth(0.8);
  doc.circle(plateX + plateWidth / 2, plateY + 44, 5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAQUE NFC', plateX + plateWidth / 2, currentY + 61, { align: 'center' });
  
  // ===== CARTE NFC (droite) =====
  const cardWidth = 72;
  const cardHeight = 44;
  const cardX = pageWidth - margin - cardWidth - 14;
  const cardY = currentY + 10;
  
  // Ombre
  doc.setFillColor(170, 170, 190);
  doc.roundedRect(cardX + 3, cardY + 3, cardWidth, cardHeight, 4, 4, 'F');
  
  // Carte - Bleu accentué
  doc.setFillColor(...accentBlue);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'F');
  
  // Bande orange
  doc.setFillColor(...orange);
  doc.roundedRect(cardX, cardY, cardWidth, 9, 4, 0, 'F');
  doc.rect(cardX, cardY + 4, cardWidth, 5, 'F');
  
  // Logo sur carte
  try {
    doc.addImage(logoBase64, 'PNG', cardX + cardWidth / 2 - 15, cardY + 13, 30, 15);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', cardX + cardWidth / 2, cardY + 22, { align: 'center' });
  }
  
  // Texte
  doc.setTextColor(220, 220, 240);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Carte NFC Pro', cardX + cardWidth / 2, cardY + 32, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...white);
  doc.setLineWidth(0.9);
  doc.circle(cardX + cardWidth / 2, cardY + 38, 2.5);
  doc.circle(cardX + cardWidth / 2, cardY + 38, 4.5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTE NFC', cardX + cardWidth / 2, currentY + 61, { align: 'center' });
  
  // ========== SECTION AVANTAGES ==========
  currentY += 75;
  
  // Titre section - Orange
  doc.setFillColor(...orange);
  doc.roundedRect(centerX - 72, currentY, 144, 12, 4, 4, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Pourquoi prendre votre kit NFC ?', centerX, currentY + 8.5, { align: 'center' });
  
  currentY += 20;
  
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
    doc.circle(margin + 8, currentY + 1.5, 4.5, 'F');
    
    // Checkmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.text('V', margin + 8, currentY + 3.5, { align: 'center' });
    
    // Texte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...darkText);
    doc.text(advantage.text, margin + 18, currentY + 3.5);
    
    currentY += 12;
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
