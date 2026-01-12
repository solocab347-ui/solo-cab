import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const CONGRESS_REGISTRATION_URL = 'https://solocab.lovable.app/register';

export const generateCongressNfcFlyer = async (): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Générer le QR code en base64
  const qrCodeDataUrl = await QRCode.toDataURL(CONGRESS_REGISTRATION_URL, {
    width: 300,
    margin: 1,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff'
    }
  });
  
  // Dimensions A4: 210 x 297 mm
  await drawFullPageFlyer(doc, qrCodeDataUrl);
  
  doc.save('SoloCab_Congress_NFC_Gratuit.pdf');
};

async function drawFullPageFlyer(
  doc: jsPDF, 
  qrCodeDataUrl: string
): Promise<void> {
  const pageWidth = 210;
  const pageHeight = 297;
  const centerX = pageWidth / 2;
  const margin = 15;
  
  // Couleurs SoloCab - Indépendance & Reprise de contrôle
  const darkBlue: [number, number, number] = [26, 26, 46];
  const accentBlue: [number, number, number] = [59, 130, 246]; // Bleu vif
  const violet: [number, number, number] = [139, 92, 246]; // Violet
  const orange: [number, number, number] = [249, 115, 22]; // Orange
  const white: [number, number, number] = [255, 255, 255];
  const lightGray: [number, number, number] = [248, 250, 252];
  const darkText: [number, number, number] = [30, 30, 40];
  const mutedText: [number, number, number] = [100, 100, 115];
  const green: [number, number, number] = [34, 197, 94];
  
  // ========== FOND ==========
  doc.setFillColor(...white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // ========== EN-TÊTE AVEC DÉGRADÉ SIMULÉ ==========
  // Bande principale bleu foncé
  doc.setFillColor(...darkBlue);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Accent violet en bas de l'en-tête
  doc.setFillColor(...violet);
  doc.rect(0, 55, pageWidth, 4, 'F');
  
  // Logo SOLOCAB
  doc.setTextColor(...white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', margin, 25);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Votre partenaire VTC', margin, 33);
  
  // Badge Congrès
  doc.setFillColor(...orange);
  doc.roundedRect(pageWidth - margin - 55, 12, 55, 22, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONGRES VTC', pageWidth - margin - 27.5, 21, { align: 'center' });
  doc.setFontSize(14);
  doc.text('2026', pageWidth - margin - 27.5, 30, { align: 'center' });
  
  // ========== GRAND BANDEAU GRATUIT ==========
  let currentY = 72;
  
  doc.setFillColor(...green);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 32, 5, 5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...white);
  doc.text('100% GRATUIT', centerX, currentY + 18, { align: 'center' });
  
  doc.setFontSize(13);
  doc.text('OFFERT A CHAQUE CHAUFFEUR VTC', centerX, currentY + 27, { align: 'center' });
  
  // ========== TITRE PRINCIPAL ==========
  currentY += 45;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('Plaque NFC + Carte NFC', centerX, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('Connectez vos clients en un simple scan !', centerX, currentY, { align: 'center' });
  
  // ========== ILLUSTRATIONS NFC ==========
  currentY += 18;
  
  // Fond léger pour la zone illustrations
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 60, 5, 5, 'F');
  
  // PLAQUE NFC (gauche)
  const plateWidth = 70;
  const plateHeight = 45;
  const plateX = margin + 15;
  const plateY = currentY + 7;
  
  // Ombre
  doc.setFillColor(180, 180, 190);
  doc.roundedRect(plateX + 2, plateY + 2, plateWidth, plateHeight, 4, 4, 'F');
  
  // Plaque principale - dégradé simulé bleu/violet
  doc.setFillColor(...darkBlue);
  doc.roundedRect(plateX, plateY, plateWidth, plateHeight, 4, 4, 'F');
  
  // Bande violet en haut
  doc.setFillColor(...violet);
  doc.roundedRect(plateX, plateY, plateWidth, 8, 4, 0, 'F');
  doc.rect(plateX, plateY + 4, plateWidth, 4, 'F');
  
  // Texte sur plaque
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', plateX + plateWidth / 2, plateY + 22, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez pour me contacter', plateX + plateWidth / 2, plateY + 30, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(1);
  doc.circle(plateX + plateWidth / 2, plateY + 38, 3);
  doc.circle(plateX + plateWidth / 2, plateY + 38, 5);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAQUE NFC', plateX + plateWidth / 2, currentY + 57, { align: 'center' });
  
  // CARTE NFC (droite)
  const cardWidth = 60;
  const cardHeight = 38;
  const cardX = pageWidth - margin - cardWidth - 15;
  const cardY = currentY + 10;
  
  // Ombre
  doc.setFillColor(180, 180, 190);
  doc.roundedRect(cardX + 2, cardY + 2, cardWidth, cardHeight, 3, 3, 'F');
  
  // Carte principale - bleu accentué
  doc.setFillColor(...accentBlue);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
  
  // Bande orange en haut
  doc.setFillColor(...orange);
  doc.roundedRect(cardX, cardY, cardWidth, 6, 3, 0, 'F');
  doc.rect(cardX, cardY + 3, cardWidth, 3, 'F');
  
  // Texte sur carte
  doc.setTextColor(...white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', cardX + cardWidth / 2, cardY + 18, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Carte NFC Pro', cardX + cardWidth / 2, cardY + 25, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...white);
  doc.setLineWidth(0.8);
  doc.circle(cardX + cardWidth / 2, cardY + 32, 2.5);
  doc.circle(cardX + cardWidth / 2, cardY + 32, 4);
  
  // Label
  doc.setTextColor(...darkText);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTE NFC', cardX + cardWidth / 2, currentY + 57, { align: 'center' });
  
  // ========== AVANTAGES ==========
  currentY += 70;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Pourquoi prendre votre kit NFC ?', centerX, currentY, { align: 'center' });
  
  currentY += 12;
  
  const advantages = [
    { text: 'Vos clients scannent et accèdent directement à votre profil', color: accentBlue },
    { text: 'Inscription client en 1 clic depuis leur téléphone', color: violet },
    { text: 'Plaque à poser dans votre véhicule (pare-brise, appuie-tête)', color: orange },
    { text: 'Carte à garder sur vous pour les rencontres professionnelles', color: accentBlue },
    { text: 'Fidélisez votre clientèle sans effort supplémentaire', color: violet },
    { text: 'Reprenez le contrôle de votre relation client !', color: orange },
  ];
  
  for (const advantage of advantages) {
    // Cercle coloré
    doc.setFillColor(...advantage.color);
    doc.circle(margin + 8, currentY + 1, 4, 'F');
    
    // Checkmark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.text('✓', margin + 8, currentY + 3, { align: 'center' });
    
    // Texte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...darkText);
    doc.text(advantage.text, margin + 18, currentY + 2);
    
    currentY += 12;
  }
  
  // ========== QR CODE ==========
  currentY += 8;
  
  // Cadre pour QR code
  doc.setFillColor(...lightGray);
  doc.roundedRect(centerX - 45, currentY, 90, 50, 5, 5, 'F');
  
  doc.setDrawColor(...violet);
  doc.setLineWidth(1.5);
  doc.roundedRect(centerX - 45, currentY, 90, 50, 5, 5, 'S');
  
  const qrSize = 35;
  const qrX = centerX - qrSize / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY + 5, qrSize, qrSize);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentBlue);
  doc.text('Scannez pour vous inscrire sur SoloCab', centerX, currentY + 46, { align: 'center' });
  
  // ========== PIED DE PAGE ==========
  doc.setFillColor(...darkBlue);
  doc.rect(0, pageHeight - 28, pageWidth, 28, 'F');
  
  // Ligne accent
  doc.setFillColor(...orange);
  doc.rect(0, pageHeight - 28, pageWidth, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('STAND SOLOCAB - CONGRES VTC 2026', centerX, pageHeight - 16, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Venez récupérer votre kit NFC 100% gratuit !', centerX, pageHeight - 8, { align: 'center' });
}
