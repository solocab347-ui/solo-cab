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
  
  // Fond blanc avec bordure subtile
  doc.setFillColor(255, 255, 255);
  doc.rect(offsetX, offsetY, width, height, 'F');
  
  // Bandeau supérieur avec dégradé simulé
  doc.setFillColor(26, 26, 46);
  doc.rect(offsetX, offsetY, width, 22, 'F');
  
  // Accent coloré
  doc.setFillColor(0, 122, 255);
  doc.rect(offsetX, offsetY + 22, width, 2, 'F');
  
  // Logo SoloCab (texte stylisé)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLOCAB', offsetX + margin, offsetY + 8);
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Votre partenaire VTC', offsetX + margin, offsetY + 12);
  
  // Titre principal
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMINAL DE PAIEMENT', centerX, offsetY + 18, { align: 'center' });
  
  // Sous-titre avec icône
  let currentY = offsetY + 30;
  
  doc.setTextColor(26, 26, 46);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SumUp Solo Lite', centerX, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Encaissez vos clients facilement', centerX, currentY, { align: 'center' });
  
  // Avantages avec icônes textuelles
  currentY += 8;
  const advantages = [
    { icon: '[CB]', text: 'Acceptez CB, Visa, Mastercard, sans contact' },
    { icon: '[%]', text: 'Frais transparents : 1.75% par transaction' },
    { icon: '[EUR]', text: 'Argent sur votre compte en 1-2 jours' },
    { icon: '[OK]', text: 'Sans engagement, sans abonnement' },
    { icon: '[4G]', text: 'Fonctionne en 4G ou WiFi partout' },
    { icon: '[BAT]', text: 'Batterie longue duree (500+ transactions)' }
  ];
  
  doc.setFontSize(6.5);
  
  for (const advantage of advantages) {
    // Icône
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 122, 255);
    doc.text(advantage.icon, offsetX + margin, currentY);
    
    // Texte
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(advantage.text, offsetX + margin + 10, currentY);
    
    currentY += 5.5;
  }
  
  // Section prix indicatif
  currentY += 2;
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(offsetX + margin, currentY - 3, width - margin * 2, 10, 2, 2, 'F');
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 46);
  doc.text('Prix indicatif : a partir de 39EUR', centerX, currentY + 1, { align: 'center' });
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('(offres et reductions disponibles sur le site)', centerX, currentY + 5, { align: 'center' });
  
  // QR Code
  currentY += 14;
  const qrSize = 28;
  const qrX = centerX - qrSize / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);
  
  // Texte sous QR code
  currentY += qrSize + 3;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 46);
  doc.text('Scannez pour commander', centerX, currentY, { align: 'center' });
  
  currentY += 4;
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('ou visitez : join.sumup.com', centerX, currentY, { align: 'center' });
  
  // Bandeau inférieur avec mention affiliation
  doc.setFillColor(26, 26, 46);
  doc.rect(offsetX, offsetY + height - 12, width, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('LIEN D\'AFFILIATION SOLOCAB', centerX, offsetY + height - 8, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text('En utilisant ce lien, vous soutenez le developpement', centerX, offsetY + height - 5, { align: 'center' });
  doc.text('de la plateforme SoloCab. Merci !', centerX, offsetY + height - 2.5, { align: 'center' });
}
