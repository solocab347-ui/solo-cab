import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartnerInvoice {
  id: string;
  order_document_id: string;
  invoice_type: 'sender' | 'receiver';
  invoice_number: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  tva_rate: number;
  tva_amount: number;
  invoice_amount: number;
  payment_status: 'pending' | 'paid' | 'disputed';
  paid_at: string | null;
  payment_schedule: string | null;
  created_at: string;
  partner_name: string;
  partner_company: string | null;
  partner_siret: string | null;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  driver_name: string;
  driver_company: string | null;
  driver_siret: string | null;
}

const PAYMENT_SCHEDULE_LABELS: Record<string, string> = {
  per_course: 'Par course',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

export async function generatePartnerInvoicePDF(invoice: PartnerInvoice): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const isSender = invoice.invoice_type === 'sender';
  
  // Colors
  const primaryColor: [number, number, number] = [139, 92, 246]; // Purple
  const successColor: [number, number, number] = [34, 197, 94]; // Green
  const blueColor: [number, number, number] = [59, 130, 246]; // Blue

  const accentColor = isSender ? successColor : blueColor;

  // Header with colored background
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("FACTURE PARTENAIRE", pageWidth / 2, 22, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`N° ${invoice.invoice_number}`, pageWidth / 2, 32, { align: "center" });
  doc.text(`Émise le: ${format(new Date(invoice.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 40, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  let yPos = 65;

  // Invoice type indicator
  doc.setFillColor(...accentColor);
  doc.roundedRect(20, yPos, 170, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const typeLabel = isSender 
    ? "FRAIS DE TRANSACTION À RECEVOIR - Vous êtes l'expéditeur de la course"
    : "GAIN NET - Vous avez réalisé cette course";
  doc.text(typeLabel, pageWidth / 2, yPos + 8, { align: "center" });
  
  yPos += 25;
  doc.setTextColor(0, 0, 0);

  // Driver info (left side)
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("DESTINATAIRE", 20, yPos);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  yPos += 6;
  doc.text(invoice.driver_name, 20, yPos);
  yPos += 5;
  if (invoice.driver_company) {
    doc.text(invoice.driver_company, 20, yPos);
    yPos += 5;
  }
  if (invoice.driver_siret) {
    doc.text(`SIRET: ${invoice.driver_siret}`, 20, yPos);
  }

  // Partner info (right side)
  let rightY = 90;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("PARTENAIRE", 120, rightY);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  rightY += 6;
  doc.text(invoice.partner_name, 120, rightY);
  rightY += 5;
  if (invoice.partner_company) {
    doc.text(invoice.partner_company, 120, rightY);
    rightY += 5;
  }
  if (invoice.partner_siret) {
    doc.text(`SIRET: ${invoice.partner_siret}`, 120, rightY);
  }

  // Course details box
  yPos = 130;
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos, 170, 40);
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("DÉTAILS DE LA COURSE", 25, yPos + 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  
  const pickupLines = doc.splitTextToSize(`Départ: ${invoice.pickup_address}`, 160);
  const destLines = doc.splitTextToSize(`Arrivée: ${invoice.destination_address}`, 160);
  
  let detailY = yPos + 16;
  doc.text(pickupLines, 25, detailY);
  detailY += (pickupLines.length * 5) + 2;
  doc.text(destLines, 25, detailY);
  detailY += (destLines.length * 5) + 2;
  doc.text(`Date: ${format(new Date(invoice.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, detailY);

  // Financial details table
  yPos = 180;
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
  doc.text("Montant total de la course", 25, yPos + 5);
  doc.text(`${invoice.course_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
  yPos += 7;

  // Commission
  doc.text(`Frais de transaction partenariat (${invoice.commission_percentage}%)`, 25, yPos + 5);
  doc.text(`${invoice.commission_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
  yPos += 7;

  if (isSender) {
    // Sender invoice: commission they receive
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, 170, 7, 'F');
    doc.text("Gain net du partenaire (course réalisée)", 25, yPos + 5);
    doc.text(`${(invoice.course_amount - invoice.commission_amount).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    yPos += 9;
    
    // TVA
    if (invoice.tva_rate > 0) {
      doc.text(`TVA sur frais de transaction (${invoice.tva_rate}%)`, 25, yPos + 5);
      doc.text(`${invoice.tva_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      yPos += 9;
    }

    // Total for sender
    doc.setFillColor(...successColor);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text("FRAIS DE TRANSACTION À RECEVOIR", 25, yPos + 7);
    doc.text(`${invoice.invoice_amount.toFixed(2)} €`, 175, yPos + 7, { align: 'right' });
  } else {
    // Receiver invoice: net amount they keep
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, 170, 7, 'F');
    doc.text("Frais de transaction due à l'expéditeur", 25, yPos + 5);
    doc.setTextColor(200, 0, 0);
    doc.text(`-${invoice.commission_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 9;

    // TVA
    if (invoice.tva_rate > 0) {
      doc.text(`TVA sur gain net (${invoice.tva_rate}%)`, 25, yPos + 5);
      doc.text(`${invoice.tva_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      yPos += 9;
    }

    // Total for receiver
    doc.setFillColor(...blueColor);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text("VOTRE GAIN NET", 25, yPos + 7);
    doc.text(`${invoice.invoice_amount.toFixed(2)} €`, 175, yPos + 7, { align: 'right' });
  }

  yPos += 20;

  // Payment info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  
  const scheduleLabel = invoice.payment_schedule 
    ? PAYMENT_SCHEDULE_LABELS[invoice.payment_schedule] || invoice.payment_schedule 
    : 'Par course';
  doc.text(`Fréquence de paiement: ${scheduleLabel}`, 20, yPos);
  yPos += 5;
  
  if (invoice.payment_status === 'paid' && invoice.paid_at) {
    doc.setTextColor(...successColor);
    doc.text(`✓ Payée le ${format(new Date(invoice.paid_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 20, yPos);
  } else {
    doc.setTextColor(200, 150, 0);
    doc.text(`⏳ En attente de paiement`, 20, yPos);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text("Cette facture est émise dans le cadre d'un partenariat entre chauffeurs VTC.", pageWidth / 2, pageHeight - 16, { align: "center" });
  doc.text("La frais de transaction est calculée automatiquement selon les termes du partenariat.", pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.text("Document généré par SoloCab", pageWidth / 2, pageHeight - 4, { align: "center" });

  // Save
  const typePrefix = isSender ? 'frais de transaction' : 'gain-net';
  doc.save(`${invoice.invoice_number}-${typePrefix}.pdf`);
}
