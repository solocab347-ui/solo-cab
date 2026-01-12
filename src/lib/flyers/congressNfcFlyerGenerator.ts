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
  const margin = 15;
  
  // Couleurs SoloCab - Indépendance & Reprise de contrôle
  const darkBlue: [number, number, number] = [26, 26, 46];
  const accentBlue: [number, number, number] = [59, 130, 246];
  const violet: [number, number, number] = [139, 92, 246];
  const orange: [number, number, number] = [249, 115, 22];
  const white: [number, number, number] = [255, 255, 255];
  const lightGray: [number, number, number] = [245, 247, 250];
  const darkText: [number, number, number] = [30, 30, 40];
  const mutedText: [number, number, number] = [100, 100, 115];
  const green: [number, number, number] = [16, 185, 129];
  
  // ========== FOND BLANC ==========
  doc.setFillColor(...white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // ========== EN-TÊTE PREMIUM ==========
  // Fond principal
  doc.setFillColor(...darkBlue);
  doc.rect(0, 0, pageWidth, 58, 'F');
  
  // Bandes décoratives
  doc.setFillColor(...violet);
  doc.rect(0, 58, pageWidth, 3, 'F');
  
  doc.setFillColor(...orange);
  doc.rect(0, 61, pageWidth, 2, 'F');
  
  // Logo SoloCab
  try {
    doc.addImage(logoBase64, 'PNG', margin, 12, 45, 22);
  } catch (e) {
    // Fallback texte si logo non chargé
    doc.setTextColor(...white);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin, 28);
  }
  
  // Slogan
  doc.setTextColor(200, 200, 220);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('L\'indépendance au service de l\'excellence', margin, 42);
  
  // Badge Congrès VTC élégant
  doc.setFillColor(...orange);
  doc.roundedRect(pageWidth - margin - 58, 10, 58, 28, 4, 4, 'F');
  
  // Bordure dorée simulée
  doc.setDrawColor(255, 215, 0);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - margin - 58, 10, 58, 28, 4, 4, 'S');
  
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONGRES VTC', pageWidth - margin - 29, 22, { align: 'center' });
  doc.setFontSize(16);
  doc.text('2026', pageWidth - margin - 29, 32, { align: 'center' });
  
  // ========== BANDEAU GRATUIT IMPACTANT ==========
  let currentY = 75;
  
  // Fond vert avec effet gradient simulé
  doc.setFillColor(...green);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 38, 6, 6, 'F');
  
  // Effet lumineux en haut
  doc.setFillColor(34, 197, 150);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 6, 0, 'F');
  doc.rect(margin, currentY + 6, pageWidth - margin * 2, 6, 'F');
  
  // Étoiles décoratives
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('★', margin + 12, currentY + 22);
  doc.text('★', pageWidth - margin - 12, currentY + 22, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...white);
  doc.text('100% GRATUIT', centerX, currentY + 22, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFERT A CHAQUE CHAUFFEUR VTC AU CONGRES', centerX, currentY + 33, { align: 'center' });
  
  // ========== TITRE PRINCIPAL ==========
  currentY += 52;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Votre Kit NFC Professionnel', centerX, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('Connectez vos clients en un simple scan !', centerX, currentY, { align: 'center' });
  
  // ========== ZONE ILLUSTRATIONS NFC ==========
  currentY += 15;
  
  // Fond élégant
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 68, 8, 8, 'F');
  
  // Bordure subtile
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 68, 8, 8, 'S');
  
  // ===== PLAQUE NFC (gauche) =====
  const plateWidth = 75;
  const plateHeight = 48;
  const plateX = margin + 12;
  const plateY = currentY + 8;
  
  // Ombre portée
  doc.setFillColor(160, 160, 180);
  doc.roundedRect(plateX + 3, plateY + 3, plateWidth, plateHeight, 5, 5, 'F');
  
  // Plaque principale
  doc.setFillColor(...darkBlue);
  doc.roundedRect(plateX, plateY, plateWidth, plateHeight, 5, 5, 'F');
  
  // Bandeau violet en haut
  doc.setFillColor(...violet);
  doc.roundedRect(plateX, plateY, plateWidth, 10, 5, 0, 'F');
  doc.rect(plateX, plateY + 5, plateWidth, 5, 'F');
  
  // Logo SoloCab miniature sur plaque
  try {
    doc.addImage(logoBase64, 'PNG', plateX + plateWidth / 2 - 15, plateY + 14, 30, 15);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', plateX + plateWidth / 2, plateY + 24, { align: 'center' });
  }
  
  // Texte
  doc.setTextColor(200, 200, 220);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez pour me contacter', plateX + plateWidth / 2, plateY + 35, { align: 'center' });
  
  // Icône NFC stylisée
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(1.2);
  doc.circle(plateX + plateWidth / 2, plateY + 42, 3);
  doc.setLineWidth(0.8);
  doc.circle(plateX + plateWidth / 2, plateY + 42, 5.5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAQUE NFC', plateX + plateWidth / 2, currentY + 63, { align: 'center' });
  
  // ===== CARTE NFC (droite) =====
  const cardWidth = 65;
  const cardHeight = 42;
  const cardX = pageWidth - margin - cardWidth - 12;
  const cardY = currentY + 11;
  
  // Ombre
  doc.setFillColor(160, 160, 180);
  doc.roundedRect(cardX + 3, cardY + 3, cardWidth, cardHeight, 4, 4, 'F');
  
  // Carte principale - bleu accentué
  doc.setFillColor(...accentBlue);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'F');
  
  // Bande orange en haut
  doc.setFillColor(...orange);
  doc.roundedRect(cardX, cardY, cardWidth, 8, 4, 0, 'F');
  doc.rect(cardX, cardY + 4, cardWidth, 4, 'F');
  
  // Logo sur carte
  try {
    doc.addImage(logoBase64, 'PNG', cardX + cardWidth / 2 - 12, cardY + 12, 24, 12);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', cardX + cardWidth / 2, cardY + 20, { align: 'center' });
  }
  
  // Texte carte
  doc.setTextColor(230, 230, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Carte NFC Pro', cardX + cardWidth / 2, cardY + 30, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...white);
  doc.setLineWidth(0.8);
  doc.circle(cardX + cardWidth / 2, cardY + 36, 2.5);
  doc.circle(cardX + cardWidth / 2, cardY + 36, 4.5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTE NFC', cardX + cardWidth / 2, currentY + 63, { align: 'center' });
  
  // ========== SECTION AVANTAGES ==========
  currentY += 78;
  
  // Titre section
  doc.setFillColor(...violet);
  doc.roundedRect(centerX - 70, currentY, 140, 12, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Pourquoi prendre votre kit NFC ?', centerX, currentY + 8.5, { align: 'center' });
  
  currentY += 20;
  
  const advantages = [
    { text: 'Vos clients scannent et accèdent directement à votre profil', color: accentBlue },
    { text: 'Inscription client en 1 clic depuis leur téléphone', color: violet },
    { text: 'Plaque à poser dans votre véhicule (pare-brise, appuie-tête)', color: orange },
    { text: 'Carte à garder sur vous pour vos rencontres professionnelles', color: accentBlue },
    { text: 'Fidélisez votre clientèle sans effort supplémentaire', color: violet },
    { text: 'Reprenez le contrôle de votre relation client !', color: orange },
  ];
  
  for (const advantage of advantages) {
    // Cercle coloré avec effet
    doc.setFillColor(...advantage.color);
    doc.circle(margin + 8, currentY + 1.5, 4.5, 'F');
    
    // Checkmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.text('✓', margin + 8, currentY + 3.5, { align: 'center' });
    
    // Texte avantage
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...darkText);
    doc.text(advantage.text, margin + 18, currentY + 3);
    
    currentY += 11;
  }
  
  // ========== QR CODE SECTION ==========
  currentY += 5;
  
  // Cadre QR code élégant
  doc.setFillColor(...white);
  doc.roundedRect(centerX - 50, currentY, 100, 55, 6, 6, 'F');
  
  // Double bordure
  doc.setDrawColor(...violet);
  doc.setLineWidth(2);
  doc.roundedRect(centerX - 50, currentY, 100, 55, 6, 6, 'S');
  
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(1);
  doc.roundedRect(centerX - 48, currentY + 2, 96, 51, 5, 5, 'S');
  
  const qrSize = 38;
  const qrX = centerX - qrSize / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY + 6, qrSize, qrSize);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentBlue);
  doc.text('Scannez pour vous inscrire sur SoloCab', centerX, currentY + 50, { align: 'center' });
  
  // ========== PIED DE PAGE PREMIUM ==========
  const footerY = pageHeight - 32;
  
  doc.setFillColor(...darkBlue);
  doc.rect(0, footerY, pageWidth, 32, 'F');
  
  // Bandes décoratives
  doc.setFillColor(...orange);
  doc.rect(0, footerY, pageWidth, 3, 'F');
  
  doc.setFillColor(...violet);
  doc.rect(0, footerY + 3, pageWidth, 2, 'F');
  
  // Logo en pied de page
  try {
    doc.addImage(logoBase64, 'PNG', margin, footerY + 10, 35, 17);
  } catch (e) {
    doc.setTextColor(...white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLOCAB', margin + 17, footerY + 20);
  }
  
  // Texte pied de page
  doc.setTextColor(...white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STAND SOLOCAB - CONGRES VTC 2026', pageWidth - margin, footerY + 14, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Venez récupérer votre kit NFC 100% gratuit !', pageWidth - margin, footerY + 24, { align: 'right' });
}
