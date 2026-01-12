import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const CONGRESS_REGISTRATION_URL = 'https://solocab.lovable.app/register';

export const generateCongressNfcFlyer = async (): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Générer le QR code en base64
  const qrCodeDataUrl = await QRCode.toDataURL(CONGRESS_REGISTRATION_URL, {
    width: 200,
    margin: 1,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff'
    }
  });
  
  // Dimensions A4: 210 x 297 mm
  // 4 flyers: 2 colonnes x 2 lignes
  const flyerWidth = 105;
  const flyerHeight = 148.5;
  
  const positions = [
    { x: 0, y: 0 },
    { x: flyerWidth, y: 0 },
    { x: 0, y: flyerHeight },
    { x: flyerWidth, y: flyerHeight }
  ];
  
  for (const pos of positions) {
    await drawSingleFlyer(doc, pos.x, pos.y, flyerWidth, flyerHeight, qrCodeDataUrl);
  }
  
  // Lignes de découpe
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(flyerWidth, 0, flyerWidth, 297);
  doc.line(0, flyerHeight, 210, flyerHeight);
  
  doc.save('SoloCab_Congress_NFC_Gratuit.pdf');
};

async function drawSingleFlyer(
  doc: jsPDF, 
  offsetX: number, 
  offsetY: number, 
  width: number, 
  height: number,
  qrCodeDataUrl: string
): Promise<void> {
  const centerX = offsetX + width / 2;
  const margin = 5;
  
  // Colors
  const darkBlue: [number, number, number] = [26, 26, 46];
  const accentBlue: [number, number, number] = [0, 122, 255];
  const white: [number, number, number] = [255, 255, 255];
  const darkText: [number, number, number] = [40, 40, 50];
  const gold: [number, number, number] = [255, 193, 7];
  const green: [number, number, number] = [34, 197, 94];
  
  // Fond blanc
  doc.setFillColor(255, 255, 255);
  doc.rect(offsetX, offsetY, width, height, 'F');
  
  // Bandeau supérieur avec dégradé simulé
  doc.setFillColor(...darkBlue);
  doc.rect(offsetX, offsetY, width, 22, 'F');
  
  // Accent doré pour congrès
  doc.setFillColor(...gold);
  doc.rect(offsetX, offsetY + 22, width, 3, 'F');
  
  // Logo SoloCab
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', offsetX + margin, offsetY + 8);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Votre partenaire VTC', offsetX + margin, offsetY + 12);
  
  // Titre congrès
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CONGRES VTC 2026', centerX, offsetY + 19, { align: 'center' });
  
  // ========== GRAND BANDEAU GRATUIT ==========
  let currentY = offsetY + 29;
  
  doc.setFillColor(...green);
  doc.roundedRect(offsetX + margin, currentY, width - margin * 2, 16, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.text('100% GRATUIT', centerX, currentY + 8, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFERT A CHAQUE VTC', centerX, currentY + 13, { align: 'center' });
  
  // Titre produits
  currentY += 21;
  doc.setTextColor(...darkBlue);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Plaque NFC + Carte NFC', centerX, currentY, { align: 'center' });
  
  // Sous-titre
  currentY += 5;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Connectez vos clients en un scan !', centerX, currentY, { align: 'center' });
  
  // ========== ILLUSTRATIONS NFC ==========
  currentY += 6;
  
  // Plaque NFC (rectangle)
  const plateWidth = 36;
  const plateHeight = 22;
  const plateX = offsetX + margin + 5;
  
  // Ombre de la plaque
  doc.setFillColor(200, 200, 200);
  doc.roundedRect(plateX + 1, currentY + 1, plateWidth, plateHeight, 2, 2, 'F');
  
  // Plaque
  doc.setFillColor(...darkBlue);
  doc.roundedRect(plateX, currentY, plateWidth, plateHeight, 2, 2, 'F');
  
  // Texte sur plaque
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', plateX + plateWidth / 2, currentY + 8, { align: 'center' });
  
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text('Scannez-moi', plateX + plateWidth / 2, currentY + 12, { align: 'center' });
  
  // Icône NFC simulée
  doc.setDrawColor(...accentBlue);
  doc.setLineWidth(0.5);
  doc.circle(plateX + plateWidth / 2, currentY + 17, 2);
  doc.circle(plateX + plateWidth / 2, currentY + 17, 3);
  
  // Carte NFC (plus petite, format carte)
  const cardWidth = 32;
  const cardHeight = 20;
  const cardX = offsetX + width - margin - cardWidth - 5;
  
  // Ombre
  doc.setFillColor(200, 200, 200);
  doc.roundedRect(cardX + 1, currentY + 1, cardWidth, cardHeight, 2, 2, 'F');
  
  // Carte
  doc.setFillColor(...accentBlue);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'F');
  
  // Texte sur carte
  doc.setTextColor(...white);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', cardX + cardWidth / 2, currentY + 7, { align: 'center' });
  
  doc.setFontSize(3.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Carte NFC', cardX + cardWidth / 2, currentY + 11, { align: 'center' });
  
  // Icône NFC
  doc.setDrawColor(...white);
  doc.setLineWidth(0.4);
  doc.circle(cardX + cardWidth / 2, currentY + 15, 1.5);
  doc.circle(cardX + cardWidth / 2, currentY + 15, 2.5);
  
  // Labels sous les illustrations
  currentY += plateHeight + 3;
  doc.setTextColor(...darkText);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAQUE NFC', plateX + plateWidth / 2, currentY, { align: 'center' });
  doc.text('CARTE NFC', cardX + cardWidth / 2, currentY, { align: 'center' });
  
  // ========== AVANTAGES ==========
  currentY += 6;
  
  const advantages = [
    { text: 'Clients scannent = acces profil direct' },
    { text: 'Inscription en 1 clic depuis le scan' },
    { text: 'Plaque a poser dans votre vehicule' },
    { text: 'Carte a garder sur vous toujours' },
    { text: 'Fidelisez votre clientele facilement' }
  ];
  
  for (const advantage of advantages) {
    // Icône checkmark
    doc.setFillColor(...green);
    doc.circle(offsetX + margin + 3, currentY + 0.8, 1.8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(...white);
    doc.text('V', offsetX + margin + 3, currentY + 1.5, { align: 'center' });
    
    // Texte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...darkText);
    doc.text(advantage.text, offsetX + margin + 8, currentY + 1.2);
    
    currentY += 5;
  }
  
  // QR Code
  currentY += 1;
  const qrSize = 18;
  const qrX = centerX - qrSize / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);
  
  // Texte sous QR code
  currentY += qrSize + 2;
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentBlue);
  doc.text('Scannez pour vous inscrire', centerX, currentY, { align: 'center' });
  
  // Bandeau inférieur
  doc.setFillColor(...darkBlue);
  doc.rect(offsetX, offsetY + height - 10, width, 10, 'F');
  
  doc.setTextColor(...gold);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('STAND SOLOCAB', centerX, offsetY + height - 6, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...white);
  doc.setFontSize(4.5);
  doc.text('Venez recuperer votre kit NFC gratuit !', centerX, offsetY + height - 2.5, { align: 'center' });
}
