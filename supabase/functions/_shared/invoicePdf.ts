/**
 * Version Deno du générateur de facture PDF unifié.
 *
 * Mirror exact de `src/lib/invoice/generateUnifiedInvoicePDF.ts` pour usage
 * dans les Edge Functions Supabase. La logique métier doit rester identique.
 *
 * Utilisé par : `create-facture-auto` pour attacher le PDF à l'email guest.
 */

// @ts-ignore — esm.sh fournit un build CDN compatible Deno
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

export type InvoiceVariant = "driver" | "client";

export interface UnifiedInvoiceInput {
  facture: any;
  course: any;
  driver: any;
  client?: any;
  variant: InvoiceVariant;
}

function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (!withTime) return `${dd}/${mm}/${yyyy}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} à ${hh}:${mi}`;
}

export function generateUnifiedInvoicePDFBuffer(
  input: UnifiedInvoiceInput
): { base64: string; fileName: string; uint8: Uint8Array } {
  const { facture, course, driver, client, variant } = input;
  const forClient = variant === "client";

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const headerColor: [number, number, number] = [46, 204, 113];

  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, pageWidth, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(10);
  const invoiceNumber =
    facture.invoice_number_generated || facture.invoice_number || "—";
  doc.text(`N°: ${invoiceNumber}`, pageWidth / 2, 35, { align: "center" });
  doc.text(`Date: ${formatDate(facture.created_at)}`, pageWidth / 2, 42, {
    align: "center",
  });

  // DRIVER
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CHAUFFEUR VTC", 20, 65);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const driverName = driver?.profiles?.full_name || driver?.company_name || "N/A";
  doc.text(driverName, 20, 71);
  if (driver?.company_name && driver.company_name !== driverName) {
    doc.text(driver.company_name, 20, 76);
  }
  let infoY = 81;
  if (driver?.siret) {
    doc.text(`SIRET: ${driver.siret}`, 20, infoY);
    infoY += 5;
  } else if (driver?.siren) {
    doc.text(`SIREN: ${driver.siren}`, 20, infoY);
    infoY += 5;
  }
  if (driver?.tva_number) {
    doc.text(`TVA: ${driver.tva_number}`, 20, infoY);
    infoY += 5;
  }
  doc.text(`Tél: ${driver?.profiles?.phone || "N/A"}`, 20, infoY);
  if (driver?.company_address) {
    const addressLines = doc.splitTextToSize(driver.company_address, 75);
    doc.text(addressLines, 20, infoY + 5);
  }

  // CLIENT
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT", pageWidth - 20, 65, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const clientName = client?.profiles?.full_name || course?.guest_name || "N/A";
  doc.text(clientName, pageWidth - 20, 71, { align: "right" });
  const clientEmail = client?.profiles?.email || course?.guest_email;
  if (clientEmail) {
    doc.text(clientEmail, pageWidth - 20, 76, { align: "right" });
  }
  const clientPhone = client?.profiles?.phone || course?.guest_phone;
  if (clientPhone) {
    doc.text(`Tél: ${clientPhone}`, pageWidth - 20, 81, { align: "right" });
  }

  // SERVICE
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, 110, 170, 55);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
  const destLines = doc.splitTextToSize(course.destination_address, 140);
  doc.text("Départ:", 25, 126);
  doc.text(pickupLines, 50, 126);
  let cY = 126 + pickupLines.length * 5;
  doc.text("Arrivée:", 25, cY);
  doc.text(destLines, 50, cY);
  cY += destLines.length * 5;
  doc.text(`Date: ${formatDate(course.scheduled_date, true)}`, 25, cY);
  if (course.passengers_count) {
    doc.text(`Passagers: ${course.passengers_count}`, 25, cY + 5);
  }
  if (course.distance_km) {
    doc.text(`Distance: ${course.distance_km} km`, 105, cY + 5);
  }

  // PAYMENT + TARIFICATION
  let yPos = 175;
  doc.text(`Mode de paiement: ${facture.payment_method || "N/A"}`, 20, yPos);
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TARIFICATION", 20, yPos);
  yPos += 8;

  const amount = Number(facture.amount) || 0;
  const isMiseADisposition =
    facture.devis?.time_price &&
    facture.devis.time_price > 0 &&
    (!facture.devis?.distance_price || facture.devis.distance_price === 0);
  const tvaRate =
    facture.tva_rate ||
    facture.devis?.tva_rate ||
    (isMiseADisposition ? 20 : 10);
  const subtotalHT = amount / (1 + tvaRate / 100);
  const tvaAmount =
    facture.tva_amount || facture.devis?.tva_amount || amount - subtotalHT;

  // Version client (simplifiée) — utilisée pour les emails guests
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(20, yPos, 170, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 25, yPos + 5.5);
  doc.text("Montant", 175, yPos + 5.5, { align: "right" });
  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPos, 170, 7, "F");
  doc.text("Sous-total HT", 25, yPos + 5);
  doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
  yPos += 7;
  doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
  doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
  yPos += 9;
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(20, yPos, 170, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL TTC", 25, yPos + 6);
  doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: "right" });

  // FOOTER
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Merci de votre confiance — SoloCab",
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  // Output
  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  const uint8 = new Uint8Array(arrayBuffer);
  // Base64 sans utiliser Buffer (Deno-friendly)
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  return {
    base64,
    fileName: `facture-${invoiceNumber}-client.pdf`,
    uint8,
  };
}
