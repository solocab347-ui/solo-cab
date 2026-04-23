import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartnerOrderDocumentData {
  document_number: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  distance_km: number | null;
  passengers_count: number;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  receiver_earnings: number;
  payment_method_used: string | null;
  completed_at: string | null;
  // Sender info
  sender_name: string;
  sender_company: string | null;
  sender_siret: string | null;
  sender_phone: string | null;
  sender_sharing_number: number | null;
  // Receiver info
  receiver_name: string;
  receiver_company: string | null;
  receiver_siret: string | null;
  receiver_phone: string | null;
  receiver_sharing_number: number | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire',
  cash: 'Espèces',
  transfer: 'Virement',
};

export async function generatePartnerOrderDocumentPDF(
  data: PartnerOrderDocumentData,
  viewerType: 'sender' | 'receiver'
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Colors
  const primaryColor: [number, number, number] = [139, 92, 246]; // Purple
  const successColor: [number, number, number] = [34, 197, 94]; // Green
  const dangerColor: [number, number, number] = [239, 68, 68]; // Red

  // Header with purple background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("BON DE COMMANDE PARTENAIRE", pageWidth / 2, 22, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`Référence: ${data.document_number}`, pageWidth / 2, 32, { align: "center" });
  doc.text(`Émis le: ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, pageWidth / 2, 40, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  let yPos = 65;

  // Sender info (left side)
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("CHAUFFEUR EXPÉDITEUR", 20, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  yPos += 6;
  doc.text(data.sender_name, 20, yPos);
  yPos += 5;
  if (data.sender_company) {
    doc.text(data.sender_company, 20, yPos);
    yPos += 5;
  }
  if (data.sender_siret) {
    doc.text(`SIRET: ${data.sender_siret}`, 20, yPos);
    yPos += 5;
  }
  if (data.sender_sharing_number) {
    doc.text(`Code: SOLO-${String(data.sender_sharing_number).padStart(6, '0')}`, 20, yPos);
    yPos += 5;
  }
  if (data.sender_phone) {
    doc.text(`Tél: ${data.sender_phone}`, 20, yPos);
  }

  // Receiver info (right side)
  yPos = 65;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("CHAUFFEUR PARTENAIRE", 120, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  yPos += 6;
  doc.text(data.receiver_name, 120, yPos);
  yPos += 5;
  if (data.receiver_company) {
    doc.text(data.receiver_company, 120, yPos);
    yPos += 5;
  }
  if (data.receiver_siret) {
    doc.text(`SIRET: ${data.receiver_siret}`, 120, yPos);
    yPos += 5;
  }
  if (data.receiver_sharing_number) {
    doc.text(`Code: SOLO-${String(data.receiver_sharing_number).padStart(6, '0')}`, 120, yPos);
    yPos += 5;
  }
  if (data.receiver_phone) {
    doc.text(`Tél: ${data.receiver_phone}`, 120, yPos);
  }

  // Course details box
  yPos = 115;
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos, 170, 50);
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("DÉTAILS DE LA COURSE", 25, yPos + 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  
  const pickupLines = doc.splitTextToSize(data.pickup_address, 140);
  const destLines = doc.splitTextToSize(data.destination_address, 140);
  
  let detailY = yPos + 16;
  doc.text("Départ:", 25, detailY);
  doc.text(pickupLines, 50, detailY);
  
  detailY += (pickupLines.length * 5) + 3;
  doc.text("Arrivée:", 25, detailY);
  doc.text(destLines, 50, detailY);
  
  detailY += (destLines.length * 5) + 3;
  doc.text(`Date: ${format(new Date(data.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, detailY);
  
  detailY += 5;
  doc.text(`Passagers: ${data.passengers_count}`, 25, detailY);
  if (data.distance_km) {
    doc.text(`Distance: ${data.distance_km.toFixed(1)} km`, 105, detailY);
  }

  // Financial details table
  yPos = 175;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("RÉCAPITULATIF FINANCIER", 20, yPos);
  yPos += 8;

  // Table header
  doc.setFillColor(...primaryColor);
  doc.rect(20, yPos, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Description", 25, yPos + 5.5);
  doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
  
  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  // Course amount
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPos, 170, 7, 'F');
  doc.text("Montant de la course encaissé", 25, yPos + 5);
  doc.text(`${data.course_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
  yPos += 7;

  // Payment method
  if (data.payment_method_used) {
    doc.text(`Moyen de paiement: ${PAYMENT_METHOD_LABELS[data.payment_method_used] || data.payment_method_used}`, 25, yPos + 5);
    yPos += 7;
  }

  // Commission (different perspective based on viewer)
  if (viewerType === 'receiver') {
    // Receiver sees commission as what they owe
    doc.setFillColor(255, 235, 235);
    doc.rect(20, yPos, 170, 7, 'F');
    doc.setTextColor(...dangerColor);
    doc.text(`Rétribution à verser (${data.frais de transaction_percentage}%)`, 25, yPos + 5);
    doc.text(`-${data.frais de transaction_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    yPos += 9;
    
    // Net earnings for receiver
    doc.setFillColor(...successColor);
    doc.rect(20, yPos, 170, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text("VOTRE GAIN NET", 25, yPos + 6);
    doc.text(`${data.receiver_earnings.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
  } else {
    // Sender sees commission as what they will receive
    doc.setFillColor(235, 255, 235);
    doc.rect(20, yPos, 170, 7, 'F');
    doc.setTextColor(...successColor);
    doc.text(`Rétribution à recevoir (${data.frais de transaction_percentage}%)`, 25, yPos + 5);
    doc.text(`+${data.frais de transaction_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    yPos += 9;
    
    // Commission due for sender
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPos, 170, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text("RÉTRIBUTION À RECEVOIR", 25, yPos + 6);
    doc.text(`${data.frais de transaction_amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
  }

  yPos += 20;

  // Completion info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont(undefined, 'italic');
  if (data.completed_at) {
    doc.text(`Course terminée le ${format(new Date(data.completed_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 20, yPos);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text("Ce bon de commande atteste de la réalisation d'une course partagée entre partenaires.", pageWidth / 2, pageHeight - 12, { align: "center" });
  doc.text("Document généré automatiquement par SoloCab", pageWidth / 2, pageHeight - 6, { align: "center" });

  // Save
  const suffix = viewerType === 'sender' ? 'expediteur' : 'partenaire';
  doc.save(`bon-commande-${data.document_number}-${suffix}.pdf`);
}
