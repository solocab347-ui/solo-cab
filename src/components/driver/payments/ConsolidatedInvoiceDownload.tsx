import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Invoice {
  id: string;
  invoice_number?: string;
  invoice_number_generated?: string;
  amount: number;
  created_at: string;
  courses?: {
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    distance_km?: number;
    duration_minutes?: number;
  };
}

interface ConsolidatedInvoiceData {
  invoiceNumber: string;
  companyName: string;
  companyAddress?: string;
  companySiret?: string;
  driverName: string;
  driverCompany?: string;
  driverSiret?: string;
  driverAddress?: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  invoices: Invoice[];
  paymentMethod?: string;
  paymentReference?: string;
  receivedAt?: Date;
}

interface ConsolidatedInvoiceDownloadProps {
  data: ConsolidatedInvoiceData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ConsolidatedInvoiceDownload({ 
  data, 
  variant = "outline", 
  size = "sm" 
}: ConsolidatedInvoiceDownloadProps) {
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE CONSOLIDÉE", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(data.invoiceNumber, pageWidth / 2, 28, { align: "center" });
    
    doc.setFontSize(10);
    const periodLabel = `Période: ${format(data.periodStart, "d MMMM", { locale: fr })} - ${format(data.periodEnd, "d MMMM yyyy", { locale: fr })}`;
    doc.text(periodLabel, pageWidth / 2, 36, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 55;
    
    // Company info (left)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("ENTREPRISE", 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    yPos += 6;
    doc.text(data.companyName, 20, yPos);
    if (data.companyAddress) {
      yPos += 5;
      doc.text(data.companyAddress, 20, yPos);
    }
    if (data.companySiret) {
      yPos += 5;
      doc.text(`SIRET: ${data.companySiret}`, 20, yPos);
    }
    
    // Driver info (right)
    yPos = 55;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR", pageWidth - 20, yPos, { align: "right" });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    yPos += 6;
    doc.text(data.driverName, pageWidth - 20, yPos, { align: "right" });
    if (data.driverCompany) {
      yPos += 5;
      doc.text(data.driverCompany, pageWidth - 20, yPos, { align: "right" });
    }
    if (data.driverSiret) {
      yPos += 5;
      doc.text(`SIRET: ${data.driverSiret}`, pageWidth - 20, yPos, { align: "right" });
    }
    
    yPos = 95;
    
    // Courses table header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, pageWidth - 30, 10, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Date", 20, yPos);
    doc.text("Trajet", 50, yPos);
    doc.text("Distance", 130, yPos);
    doc.text("Montant", pageWidth - 25, yPos, { align: "right" });
    yPos += 10;
    
    // Courses list
    doc.setFont(undefined, 'normal');
    data.invoices.forEach((invoice, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      const date = invoice.courses?.scheduled_date 
        ? format(new Date(invoice.courses.scheduled_date), "dd/MM/yy", { locale: fr })
        : format(new Date(invoice.created_at), "dd/MM/yy", { locale: fr });
      
      const pickup = invoice.courses?.pickup_address?.split(",")[0] || "N/A";
      const dest = invoice.courses?.destination_address?.split(",")[0] || "N/A";
      const trajet = `${pickup.substring(0, 15)}... → ${dest.substring(0, 15)}...`;
      const distance = invoice.courses?.distance_km 
        ? `${invoice.courses.distance_km.toFixed(1)} km` 
        : "-";
      
      doc.text(date, 20, yPos);
      doc.text(trajet, 50, yPos);
      doc.text(distance, 130, yPos);
      doc.text(`${invoice.amount.toFixed(2)} €`, pageWidth - 25, yPos, { align: "right" });
      
      yPos += 7;
    });
    
    // Total
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos - 3, pageWidth - 15, yPos - 3);
    
    doc.setFillColor(30, 64, 175);
    doc.rect(pageWidth - 80, yPos, 65, 12, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL: ${data.totalAmount.toFixed(2)} €`, pageWidth - 20, yPos + 8, { align: "right" });
    
    yPos += 25;
    doc.setTextColor(0, 0, 0);
    
    // Payment info
    if (data.paymentMethod || data.paymentReference || data.receivedAt) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("PAIEMENT", 20, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 6;
      
      if (data.paymentMethod) {
        doc.text(`Mode: ${data.paymentMethod}`, 20, yPos);
        yPos += 5;
      }
      if (data.paymentReference) {
        doc.text(`Référence: ${data.paymentReference}`, 20, yPos);
        yPos += 5;
      }
      if (data.receivedAt) {
        doc.text(`Reçu le: ${format(data.receivedAt, "d MMMM yyyy", { locale: fr })}`, 20, yPos);
      }
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Document généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    
    // Download
    doc.save(`${data.invoiceNumber}.pdf`);
  };

  return (
    <Button variant={variant} size={size} onClick={generatePDF}>
      <Download className="w-4 h-4 mr-1" />
      {data.invoiceNumber}
    </Button>
  );
}
