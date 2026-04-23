/**
 * Générateur de facture PDF unifié — UNE SEULE source de vérité
 *
 * Utilisé par :
 *  - Espace chauffeur (DriverFacturesList) → version "driver" détaillée
 *  - Espace client / guest tracking         → version "client" simplifiée
 *  - CoursesList, ClientCoursesList, ClientFacturesList
 *  - Edge function `create-facture-auto`    → version "client" attachée à l'email guest
 *
 * RÈGLE : ne jamais dupliquer ce code dans un composant. Importer cette fonction.
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type InvoiceVariant = "driver" | "client";

export interface UnifiedInvoiceInput {
  facture: {
    id: string;
    invoice_number?: string | null;
    invoice_number_generated?: string | null;
    amount: number;
    payment_method?: string | null;
    payment_status?: string | null;
    created_at: string;
    tva_rate?: number | null;
    tva_amount?: number | null;
    airport_fee?: number | null;
    distance_km?: number | null;
    promo_code?: string | null;
    discount_amount?: number | null;
    solocab_fee_amount?: number | null;
    stripe_fee_amount?: number | null;
    total_fees_amount?: number | null;
    net_amount_to_driver?: number | null;
    devis?: any;
    companyInfo?: {
      company_name?: string | null;
      siret?: string | null;
      siren?: string | null;
      tva_number?: string | null;
      billing_address?: string | null;
      address?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
    } | null;
    employeeName?: string | null;
    employeePhone?: string | null;
  };
  course: {
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    passengers_count?: number | null;
    distance_km?: number | null;
    duration_minutes?: number | null;
    guest_name?: string | null;
    guest_email?: string | null;
    guest_phone?: string | null;
  };
  driver: {
    company_name?: string | null;
    company_address?: string | null;
    siret?: string | null;
    siren?: string | null;
    tva_number?: string | null;
    profiles?: {
      full_name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  };
  client?: {
    profiles?: {
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;
  variant: InvoiceVariant;
}

/**
 * Génère le PDF et le retourne sous forme de blob (téléchargement) OU de Uint8Array (edge function).
 * Si `download` est true, déclenche directement le téléchargement dans le navigateur.
 */
export interface UnifiedInvoiceOutput {
  blob: Blob;
  fileName: string;
  base64: string;
}

export async function generateUnifiedInvoicePDF(
  input: UnifiedInvoiceInput,
  options: { download?: boolean } = {}
): Promise<UnifiedInvoiceOutput> {
  const { facture, course, driver, client, variant } = input;
  const forClient = variant === "client";

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const headerColor: [number, number, number] = [46, 204, 113];

  // ===== HEADER =====
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, pageWidth, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(10);
  const invoiceNumber = facture.invoice_number_generated || facture.invoice_number || "—";
  doc.text(`N°: ${invoiceNumber}`, pageWidth / 2, 35, { align: "center" });
  doc.text(
    `Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`,
    pageWidth / 2,
    42,
    { align: "center" }
  );

  // ===== DRIVER (left) =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CHAUFFEUR VTC", 20, 65);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const driverName = driver.profiles?.full_name || driver.company_name || "N/A";
  doc.text(driverName, 20, 71);
  if (driver.company_name && driver.company_name !== driverName) {
    doc.text(driver.company_name, 20, 76);
  }
  let infoY = 81;
  if (driver.siret) {
    doc.text(`SIRET: ${driver.siret}`, 20, infoY);
    infoY += 5;
  } else if (driver.siren) {
    doc.text(`SIREN: ${driver.siren}`, 20, infoY);
    infoY += 5;
  }
  if (driver.tva_number) {
    doc.text(`TVA: ${driver.tva_number}`, 20, infoY);
    infoY += 5;
  }
  doc.text(`Tél: ${driver.profiles?.phone || "N/A"}`, 20, infoY);
  if (driver.company_address) {
    const addressLines = doc.splitTextToSize(driver.company_address, 75);
    doc.text(addressLines, 20, infoY + 5);
  }

  // ===== CLIENT / COMPANY (right) =====
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const isCompanyCourse = !!facture.companyInfo;

  if (isCompanyCourse && facture.companyInfo) {
    const co = facture.companyInfo;
    doc.text("ENTREPRISE", pageWidth - 20, 65, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(co.company_name || "N/A", pageWidth - 20, 71, { align: "right" });
    let cy = 76;
    if (co.siret) {
      doc.text(`SIRET: ${co.siret}`, pageWidth - 20, cy, { align: "right" });
      cy += 5;
    } else if (co.siren) {
      doc.text(`SIREN: ${co.siren}`, pageWidth - 20, cy, { align: "right" });
      cy += 5;
    }
    if (co.tva_number) {
      doc.text(`TVA: ${co.tva_number}`, pageWidth - 20, cy, { align: "right" });
      cy += 5;
    }
    const addr = co.billing_address || co.address;
    if (addr) {
      const lines = doc.splitTextToSize(addr, 75);
      lines.forEach((l: string, i: number) => {
        doc.text(l, pageWidth - 20, cy + i * 4, { align: "right" });
      });
      cy += lines.length * 4;
    }
    if (co.contact_email) {
      doc.text(co.contact_email, pageWidth - 20, cy, { align: "right" });
      cy += 5;
    }
    if (co.contact_phone) {
      doc.text(`Tél: ${co.contact_phone}`, pageWidth - 20, cy, { align: "right" });
      cy += 5;
    }
    if (facture.employeeName) {
      cy += 2;
      doc.setFont("helvetica", "bold");
      doc.text("COLLABORATEUR", pageWidth - 20, cy, { align: "right" });
      doc.setFont("helvetica", "normal");
      cy += 5;
      doc.text(facture.employeeName, pageWidth - 20, cy, { align: "right" });
      if (facture.employeePhone) {
        cy += 4;
        doc.text(`Tél: ${facture.employeePhone}`, pageWidth - 20, cy, { align: "right" });
      }
    }
  } else {
    doc.text("CLIENT", pageWidth - 20, 65, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const clientName =
      client?.profiles?.full_name || course.guest_name || "N/A";
    doc.text(clientName, pageWidth - 20, 71, { align: "right" });
    const clientEmail = client?.profiles?.email || course.guest_email;
    if (clientEmail) {
      doc.text(clientEmail, pageWidth - 20, 76, { align: "right" });
    }
    const clientPhone = client?.profiles?.phone || course.guest_phone;
    if (clientPhone) {
      doc.text(`Tél: ${clientPhone}`, pageWidth - 20, 81, { align: "right" });
    }
  }

  // ===== SERVICE BOX =====
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
  doc.text(
    `Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
    25,
    cY
  );
  if (course.passengers_count) {
    doc.text(`Passagers: ${course.passengers_count}`, 25, cY + 5);
  }
  if (course.distance_km) {
    doc.text(`Distance: ${course.distance_km} km`, 105, cY + 5);
  }

  // ===== PAYMENT INFO =====
  let yPos = 175;
  doc.text(`Mode de paiement: ${facture.payment_method || "N/A"}`, 20, yPos);

  // ===== TARIFICATION =====
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TARIFICATION", 20, yPos);
  yPos += 8;

  const amount = facture.amount;
  const isMiseADisposition =
    facture.devis?.time_price &&
    facture.devis.time_price > 0 &&
    (!facture.devis?.distance_price || facture.devis.distance_price === 0);
  const tvaRate =
    facture.tva_rate || facture.devis?.tva_rate || (isMiseADisposition ? 20 : 10);
  const subtotalHT = amount / (1 + tvaRate / 100);
  const tvaAmount =
    facture.tva_amount || facture.devis?.tva_amount || amount - subtotalHT;
  const airportFee = facture.airport_fee || facture.devis?.airport_fee || 0;

  if (!forClient) {
    // ===== Version chauffeur =====
    if (facture.devis?.pricing_source === "city" && facture.devis?.city_pricing_name) {
      doc.setFillColor(230, 245, 255);
      doc.rect(20, yPos, 170, 7, "F");
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(8);
      doc.text(`📍 Tarification appliquée: ${facture.devis.city_pricing_name}`, 25, yPos + 5);
      yPos += 9;
    }

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

    if (isMiseADisposition && course.duration_minutes) {
      const hours = course.duration_minutes / 60;
      const hourlyRate = facture.devis.time_price / hours;
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, "F");
      doc.text(
        `Mise à disposition (${hours.toFixed(1)}h à ${hourlyRate.toFixed(2)}€/h)`,
        25,
        yPos + 5
      );
      doc.text(`${facture.devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 9;
    } else if (facture.devis) {
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, "F");
      doc.text("Forfait de base", 25, yPos + 5);
      doc.text(`${(facture.devis.base_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 7;
      const distanceKm = facture.distance_km || course.distance_km || 0;
      const perKmRate =
        distanceKm > 0 ? (facture.devis.distance_price || 0) / distanceKm : 0;
      const priceLabel =
        distanceKm > 0 && perKmRate > 0
          ? `Prix au kilomètre (${distanceKm.toFixed(2)} km × ${perKmRate.toFixed(2)} €/km)`
          : "Prix au kilomètre";
      doc.text(priceLabel, 25, yPos + 5);
      doc.text(`${(facture.devis.distance_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 9;
    } else {
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, "F");
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 9;
    }

    const surchargeRows: Array<[string, number]> = [
      ["Augmentation Heures de pointe", facture.devis?.peak_hours_surcharge_amount || 0],
      ["Augmentation Soir", facture.devis?.evening_surcharge_amount || 0],
      ["Augmentation Weekend", facture.devis?.weekend_surcharge_amount || 0],
    ];
    surchargeRows.forEach(([label, value]) => {
      if (value > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, "F");
        doc.setTextColor(204, 102, 0);
        doc.text(label, 25, yPos + 5);
        doc.text(`+${value.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
    });

    if (airportFee > 0) {
      doc.setFillColor(240, 248, 255);
      doc.rect(20, yPos, 170, 7, "F");
      doc.setTextColor(30, 144, 255);
      doc.text("Forfait Aéroport", 25, yPos + 5);
      doc.text(`+${airportFee.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 7;
      doc.setTextColor(0, 0, 0);
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, 170, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Sous-total HT", 25, yPos + 5);
    doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
    yPos += 7;

    if (
      (facture.promo_code || facture.devis?.promo_code) &&
      ((facture.discount_amount || 0) > 0 || (facture.devis?.discount_amount || 0) > 0)
    ) {
      doc.setFont("helvetica", "normal");
      const discountAmount = facture.discount_amount || facture.devis?.discount_amount || 0;
      const promoCode = facture.promo_code || facture.devis?.promo_code || "";
      doc.setTextColor(46, 125, 50);
      doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
      doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 7;
      doc.setTextColor(0, 0, 0);
    }

    doc.setFont("helvetica", "normal");
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

    yPos += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Note : Le client reçoit une version simplifiée.", 20, yPos);
  } else {
    // ===== Version client / guest =====
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

    if (
      (facture.promo_code || facture.devis?.promo_code) &&
      ((facture.discount_amount || 0) > 0 || (facture.devis?.discount_amount || 0) > 0)
    ) {
      const discountAmount = facture.discount_amount || facture.devis?.discount_amount || 0;
      const promoCode = facture.promo_code || facture.devis?.promo_code || "";
      doc.setTextColor(46, 125, 50);
      doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
      doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: "right" });
      yPos += 7;
      doc.setTextColor(0, 0, 0);
    }

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
  }

  // ===== FOOTER =====
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Merci de votre confiance — SoloCab", pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `facture-${invoiceNumber}${forClient ? "-client" : ""}.pdf`;
  const blob = doc.output("blob");
  const base64 = doc.output("datauristring").split(",")[1] || "";

  if (options.download) {
    doc.save(fileName);
  }

  return { blob, fileName, base64 };
}
