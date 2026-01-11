import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const SUMUP_AFFILIATE_URL = 'https://join.sumup.com/4oCL6MY3?share_id=t8pvlyP4ocl6my3';

export const generateSumupFlyer = async (): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Générer le QR code en base64
  const qrCodeDataUrl = await QRCode.toDataURL(SUMUP_AFFILIATE_URL, {
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
  
  doc.save('SoloCab_Terminal_SumUp.pdf');
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
  const orange: [number, number, number] = [255, 140, 0];
  
  // Fond blanc
  doc.setFillColor(255, 255, 255);
  doc.rect(offsetX, offsetY, width, height, 'F');
  
  // Bandeau supérieur
  doc.setFillColor(...darkBlue);
  doc.rect(offsetX, offsetY, width, 20, 'F');
  
  // Accent coloré
  doc.setFillColor(...accentBlue);
  doc.rect(offsetX, offsetY + 20, width, 2, 'F');
  
  // Logo SoloCab
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', offsetX + margin, offsetY + 7);
  
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Votre partenaire VTC', offsetX + margin, offsetY + 11);
  
  // Titre principal
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMINAL DE PAIEMENT', centerX, offsetY + 16, { align: 'center' });
  
  // Sous-titre
  let currentY = offsetY + 27;
  
  doc.setTextColor(...darkBlue);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SumUp Solo Lite', centerX, currentY, { align: 'center' });
  
  currentY += 4;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Encaissez vos clients par carte bancaire', centerX, currentY, { align: 'center' });
  
  // ========== HIGHLIGHT: REDUCTION 100€ ==========
  currentY += 5;
  doc.setFillColor(...orange);
  doc.roundedRect(offsetX + margin, currentY, width - margin * 2, 10, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.text('JUSQU\'A 100EUR DE REDUCTION', centerX, currentY + 5, { align: 'center' });
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('avec votre lien affilie SoloCab', centerX, currentY + 8.5, { align: 'center' });
  
  // Avantages
  currentY += 14;
  const advantages = [
    { icon: '+', text: 'Acceptez CB, Visa, Mastercard, sans contact' },
    { icon: '+', text: 'Frais : seulement 1.75% par transaction' },
    { icon: '+', text: 'Argent sur votre compte en 1-2 jours' },
    { icon: '+', text: 'Sans engagement, sans abonnement' },
    { icon: '+', text: 'Fonctionne en 4G ou WiFi partout' }
  ];
  
  for (const advantage of advantages) {
    // Icône cercle
    doc.setFillColor(...accentBlue);
    doc.circle(offsetX + margin + 3, currentY + 1, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...white);
    doc.text(advantage.icon, offsetX + margin + 3, currentY + 2.2, { align: 'center' });
    
    // Texte
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...darkText);
    doc.text(advantage.text, offsetX + margin + 9, currentY + 2);
    
    currentY += 5.5;
  }
  
  // QR Code
  currentY += 3;
  const qrSize = 24;
  const qrX = centerX - qrSize / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);
  
  // Texte sous QR code
  currentY += qrSize + 3;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentBlue);
  doc.text('Scannez pour commander', centerX, currentY, { align: 'center' });
  
  currentY += 3;
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('join.sumup.com', centerX, currentY, { align: 'center' });
  
  // Bandeau inférieur affiliation
  doc.setFillColor(...darkBlue);
  doc.rect(offsetX, offsetY + height - 10, width, 10, 'F');
  
  doc.setTextColor(...orange);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('LIEN D\'AFFILIATION SOLOCAB', centerX, offsetY + height - 6.5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...white);
  doc.setFontSize(4.5);
  doc.text('En utilisant ce lien, vous soutenez SoloCab. Merci !', centerX, offsetY + height - 3, { align: 'center' });
}
