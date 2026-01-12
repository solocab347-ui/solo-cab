import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import logoSolocab from '@/assets/logo-solocab.png';

const CONGRESS_REGISTRATION_URL = 'https://solocab.lovable.app/register';

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
  
  // Charger les assets
  const [logoBase64, qrCodeDataUrl] = await Promise.all([
    loadImageAsBase64(logoSolocab),
    QRCode.toDataURL(CONGRESS_REGISTRATION_URL, {
      width: 400,
      margin: 1,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      }
    })
  ]);
  
  // Dimensions A4: 210 x 297 mm
  await drawFullPageFlyer(doc, logoBase64, qrCodeDataUrl);
  
  doc.save('SoloCab_Congress_NFC_Gratuit.pdf');
};

async function drawFullPageFlyer(
  doc: jsPDF, 
  logoBase64: string,
  qrCodeDataUrl: string
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
  doc.rect(0, 0, pageWidth, 52, 'F');
  
  // Bandes décoratives - couleurs de l'indépendance
  doc.setFillColor(...violet);
  doc.rect(0, 52, pageWidth, 2.5, 'F');
  
  doc.setFillColor(...orange);
  doc.rect(0, 54.5, pageWidth, 2, 'F');
  
  // Logo SoloCab
  try {
    doc.addImage(logoBase64, 'PNG', margin, 10, 42, 21);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin, 25);
  }
  
  // Slogan
  doc.setTextColor(180, 180, 200);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('L\'independance au service de l\'excellence', margin, 38);
  
  // Badge Congrès VTC
  doc.setFillColor(...orange);
  doc.roundedRect(pageWidth - margin - 52, 10, 52, 26, 4, 4, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONGRES VTC', pageWidth - margin - 26, 21, { align: 'center' });
  doc.setFontSize(15);
  doc.text('2026', pageWidth - margin - 26, 31, { align: 'center' });
  
  // ========== BANDEAU GRATUIT - VIOLET (Indépendance) ==========
  let currentY = 66;
  
  doc.setFillColor(...violet);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 32, 5, 5, 'F');
  
  // Effet lumineux
  doc.setFillColor(159, 112, 255);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 5, 0, 'F');
  doc.rect(margin, currentY + 5, pageWidth - margin * 2, 5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...white);
  doc.text('100% GRATUIT', centerX, currentY + 18, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text('OFFERT A CHAQUE CHAUFFEUR VTC AU CONGRES', centerX, currentY + 27, { align: 'center' });
  
  // ========== TITRE PRINCIPAL ==========
  currentY += 42;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Votre Kit NFC Professionnel', centerX, currentY, { align: 'center' });
  
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
  const plateWidth = 70;
  const plateHeight = 40;
  const plateX = margin + 12;
  const plateY = currentY + 6;
  
  // Ombre
  doc.setFillColor(180, 180, 195);
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
    doc.addImage(logoBase64, 'PNG', plateX + plateWidth / 2 - 14, plateY + 11, 28, 14);
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
  doc.text('Scannez pour me contacter', plateX + plateWidth / 2, plateY + 30, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(1);
  doc.circle(plateX + plateWidth / 2, plateY + 36, 2.5);
  doc.setLineWidth(0.7);
  doc.circle(plateX + plateWidth / 2, plateY + 36, 4.5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAQUE NFC', plateX + plateWidth / 2, currentY + 51, { align: 'center' });
  
  // ===== CARTE NFC (droite) =====
  const cardWidth = 60;
  const cardHeight = 36;
  const cardX = pageWidth - margin - cardWidth - 12;
  const cardY = currentY + 8;
  
  // Ombre
  doc.setFillColor(180, 180, 195);
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
    doc.addImage(logoBase64, 'PNG', cardX + cardWidth / 2 - 11, cardY + 10, 22, 11);
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
  doc.text('Carte NFC Pro', cardX + cardWidth / 2, cardY + 26, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...white);
  doc.setLineWidth(0.7);
  doc.circle(cardX + cardWidth / 2, cardY + 31, 2);
  doc.circle(cardX + cardWidth / 2, cardY + 31, 3.5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTE NFC', cardX + cardWidth / 2, currentY + 51, { align: 'center' });
  
  // ========== SECTION AVANTAGES ==========
  currentY += 62;
  
  // Titre section - Orange
  doc.setFillColor(...orange);
  doc.roundedRect(centerX - 65, currentY, 130, 10, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Pourquoi prendre votre kit NFC ?', centerX, currentY + 7, { align: 'center' });
  
  currentY += 16;
  
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
    doc.circle(margin + 6, currentY + 1.2, 3.5, 'F');
    
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
  
  // ========== QR CODE SECTION ==========
  currentY += 4;
  
  // Cadre QR code
  doc.setFillColor(...white);
  doc.roundedRect(centerX - 42, currentY, 84, 45, 5, 5, 'F');
  
  // Bordure violet
  doc.setDrawColor(...violet);
  doc.setLineWidth(1.5);
  doc.roundedRect(centerX - 42, currentY, 84, 45, 5, 5, 'S');
  
  const qrSize = 32;
  const qrX = centerX - qrSize / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY + 4, qrSize, qrSize);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentBlue);
  doc.text('Scannez pour vous inscrire sur SoloCab', centerX, currentY + 41, { align: 'center' });
  
  // ========== PIED DE PAGE ==========
  const footerY = pageHeight - 26;
  
  doc.setFillColor(...darkBlue);
  doc.rect(0, footerY, pageWidth, 26, 'F');
  
  // Bandes décoratives
  doc.setFillColor(...orange);
  doc.rect(0, footerY, pageWidth, 2.5, 'F');
  
  doc.setFillColor(...violet);
  doc.rect(0, footerY + 2.5, pageWidth, 1.5, 'F');
  
  // Logo pied de page
  try {
    doc.addImage(logoBase64, 'PNG', margin, footerY + 7, 30, 15);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin + 15, footerY + 16);
  }
  
  // Texte pied de page
  doc.setTextColor(...white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('STAND SOLOCAB - CONGRES VTC 2026', pageWidth - margin, footerY + 12, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Venez recuperer votre kit NFC 100% gratuit !', pageWidth - margin, footerY + 21, { align: 'right' });
}
