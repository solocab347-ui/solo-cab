/**
 * Tests de non-régression pour le générateur de facture unifié.
 *
 * Objectif : garantir qu'un changement de schéma `course` / `facture` / `driver`
 * ne casse pas le format de la facture (variant + calculs HT/TVA/total).
 *
 * Ces tests servent de "contract test" : si quelqu'un modifie la structure
 * de données ou les calculs, ces tests doivent l'attraper avant prod.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateUnifiedInvoicePDF,
  type UnifiedInvoiceInput,
} from "./generateUnifiedInvoicePDF";

// Mock jsPDF — on capture toutes les données injectées sans générer un vrai PDF binaire.
// Stocké au niveau module pour être inspecté après chaque appel.
const lastInstance: { current: any } = { current: null };

vi.mock("jspdf", () => {
  class MockJsPDF {
    _calls: Array<{ method: string; args: any[] }> = [];
    internal = { pageSize: { width: 210, height: 297 } };

    constructor() {
      lastInstance.current = this;
    }

    private push(method: string, args: any[]) {
      this._calls.push({ method, args });
    }

    setFillColor(...args: any[]) { this.push("setFillColor", args); }
    setTextColor(...args: any[]) { this.push("setTextColor", args); }
    setFontSize(...args: any[]) { this.push("setFontSize", args); }
    setFont(...args: any[]) { this.push("setFont", args); }
    setDrawColor(...args: any[]) { this.push("setDrawColor", args); }
    rect(...args: any[]) { this.push("rect", args); }
    text(...args: any[]) { this.push("text", args); }
    splitTextToSize(str: string) { return [str]; }
    save(...args: any[]) { this.push("save", args); }
    output(type: string) {
      if (type === "blob") return new Blob(["fake-pdf"], { type: "application/pdf" });
      if (type === "datauristring") return "data:application/pdf;base64,ZmFrZS1wZGY=";
      return "";
    }
  }

  return { default: MockJsPDF };
});

// Helper : récupère tous les textes injectés dans le PDF (concaténés).
function getAllTexts(): string {
  const inst = lastInstance.current;
  if (!inst) return "";
  return inst._calls
    .filter((c: any) => c.method === "text")
    .map((c: any) => (Array.isArray(c.args[0]) ? c.args[0].join(" ") : String(c.args[0])))
    .join("\n");
}

function getLastInstance() {
  return lastInstance.current;
}

const baseFacture: UnifiedInvoiceInput["facture"] = {
  id: "fact-1",
  invoice_number: "INV-001",
  amount: 110, // TTC
  payment_method: "Carte",
  created_at: "2026-01-15T10:00:00Z",
  tva_rate: 10,
};

const baseCourse: UnifiedInvoiceInput["course"] = {
  pickup_address: "1 rue de Paris, 75001 Paris",
  destination_address: "Aéroport CDG, 95700 Roissy",
  scheduled_date: "2026-01-15T08:30:00Z",
  passengers_count: 2,
  distance_km: 35,
};

const baseDriver: UnifiedInvoiceInput["driver"] = {
  company_name: "SoloDrive SARL",
  siret: "12345678900012",
  tva_number: "FR12345678900",
  profiles: { full_name: "Jean Dupont", phone: "+33600000000" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateUnifiedInvoicePDF — contrat de sortie", () => {
  it("retourne blob, fileName et base64", async () => {
    const out = await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });

    expect(out.blob).toBeInstanceOf(Blob);
    expect(out.fileName).toMatch(/^facture-INV-001-client\.pdf$/);
    expect(out.base64).toBeTruthy();
    expect(out.base64).not.toContain(",");
  });

  it("nomme le fichier sans suffixe -client en variant driver", async () => {
    const out = await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: baseCourse,
      driver: baseDriver,
      variant: "driver",
    });
    expect(out.fileName).toBe("facture-INV-001.pdf");
  });

  it("utilise invoice_number_generated en priorité sur invoice_number", async () => {
    const out = await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, invoice_number_generated: "GEN-999" },
      course: baseCourse,
      driver: baseDriver,
      variant: "driver",
    });
    expect(out.fileName).toContain("GEN-999");
  });

  it("ne déclenche save() que si options.download est true", async () => {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default as any;

    await generateUnifiedInvoicePDF(
      { facture: baseFacture, course: baseCourse, driver: baseDriver, variant: "client" },
      { download: false }
    );
    const inst1 = jsPDF.mock.results[jsPDF.mock.results.length - 1].value;
    expect(inst1.save).not.toHaveBeenCalled();

    await generateUnifiedInvoicePDF(
      { facture: baseFacture, course: baseCourse, driver: baseDriver, variant: "client" },
      { download: true }
    );
    const inst2 = jsPDF.mock.results[jsPDF.mock.results.length - 1].value;
    expect(inst2.save).toHaveBeenCalledWith("facture-INV-001-client.pdf");
  });
});

describe("generateUnifiedInvoicePDF — calculs HT / TVA / TTC", () => {
  it("calcule correctement HT et TVA à 10% (course standard)", async () => {
    await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, amount: 110, tva_rate: 10 },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    // 110 / 1.10 = 100 HT, TVA = 10
    expect(txt).toContain("100.00 €");
    expect(txt).toContain("10.00 €");
    expect(txt).toContain("110.00 €");
    expect(txt).toContain("TVA (10%)");
  });

  it("applique TVA 20% pour mise à disposition (time_price > 0, distance_price = 0)", async () => {
    await generateUnifiedInvoicePDF({
      facture: {
        ...baseFacture,
        amount: 120,
        tva_rate: undefined as any, // simule un cas où tva_rate n'est pas explicite
        devis: { time_price: 100, distance_price: 0 },
      },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).toContain("TVA (20%)");
    // 120 / 1.20 = 100 HT exact
    expect(txt).toContain("100.00 €");
  });

  it("respecte tva_amount fourni explicitement (priorité sur calcul)", async () => {
    await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, amount: 110, tva_rate: 10, tva_amount: 9.5 },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).toContain("9.50 €");
  });
});

describe("generateUnifiedInvoicePDF — variant driver vs client", () => {
  it("variant client n'affiche PAS les surcharges détaillées", async () => {
    await generateUnifiedInvoicePDF({
      facture: {
        ...baseFacture,
        devis: {
          peak_hours_surcharge_amount: 5,
          evening_surcharge_amount: 3,
          weekend_surcharge_amount: 2,
        },
      },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).not.toContain("Augmentation Heures de pointe");
    expect(txt).not.toContain("Augmentation Soir");
    expect(txt).not.toContain("Augmentation Weekend");
  });

  it("variant driver affiche les surcharges quand présentes", async () => {
    await generateUnifiedInvoicePDF({
      facture: {
        ...baseFacture,
        devis: {
          base_price: 10,
          distance_price: 50,
          peak_hours_surcharge_amount: 5,
          evening_surcharge_amount: 3,
          weekend_surcharge_amount: 2,
        },
      },
      course: baseCourse,
      driver: baseDriver,
      variant: "driver",
    });
    const txt = getAllTexts();
    expect(txt).toContain("Augmentation Heures de pointe");
    expect(txt).toContain("Augmentation Soir");
    expect(txt).toContain("Augmentation Weekend");
  });

  it("variant driver inclut le forfait aéroport", async () => {
    await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, airport_fee: 7 },
      course: baseCourse,
      driver: baseDriver,
      variant: "driver",
    });
    const txt = getAllTexts();
    expect(txt).toContain("Forfait Aéroport");
    expect(txt).toContain("+7.00 €");
  });

  it("variant driver ajoute la note 'client reçoit version simplifiée'", async () => {
    await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: baseCourse,
      driver: baseDriver,
      variant: "driver",
    });
    const txt = getAllTexts();
    expect(txt).toContain("version simplifiée");
  });
});

describe("generateUnifiedInvoicePDF — bloc CLIENT vs ENTREPRISE", () => {
  it("affiche le bloc CLIENT pour un guest sans companyInfo", async () => {
    await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: { ...baseCourse, guest_name: "Marie Curie", guest_email: "marie@x.fr" },
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).toContain("CLIENT");
    expect(txt).toContain("Marie Curie");
    expect(txt).toContain("marie@x.fr");
    expect(txt).not.toContain("ENTREPRISE");
  });

  it("affiche le bloc ENTREPRISE quand companyInfo est fourni", async () => {
    await generateUnifiedInvoicePDF({
      facture: {
        ...baseFacture,
        companyInfo: {
          company_name: "Acme Corp",
          siret: "98765432100018",
          contact_email: "billing@acme.com",
        },
        employeeName: "Bob Martin",
      },
      course: baseCourse,
      driver: baseDriver,
      variant: "driver",
    });
    const txt = getAllTexts();
    expect(txt).toContain("ENTREPRISE");
    expect(txt).toContain("Acme Corp");
    expect(txt).toContain("SIRET: 98765432100018");
    expect(txt).toContain("COLLABORATEUR");
    expect(txt).toContain("Bob Martin");
  });

  it("priorité client.profiles.full_name sur course.guest_name", async () => {
    await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: { ...baseCourse, guest_name: "Guest Name" },
      driver: baseDriver,
      client: { profiles: { full_name: "Registered Client", email: "r@c.fr" } },
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).toContain("Registered Client");
    expect(txt).not.toContain("Guest Name");
  });
});

describe("generateUnifiedInvoicePDF — robustesse aux données manquantes", () => {
  it("ne crash pas si invoice_number absent (fallback —)", async () => {
    const out = await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, invoice_number: null, invoice_number_generated: null },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    expect(out.fileName).toBe("facture-—-client.pdf");
  });

  it("ne crash pas si driver.profiles est null", async () => {
    const out = await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: baseCourse,
      driver: { company_name: "SoloDrive", profiles: null },
      variant: "driver",
    });
    expect(out.blob).toBeInstanceOf(Blob);
    const txt = getAllTexts();
    expect(txt).toContain("SoloDrive");
    expect(txt).toContain("Tél: N/A");
  });

  it("ne crash pas si course n'a ni passengers_count ni distance_km", async () => {
    const out = await generateUnifiedInvoicePDF({
      facture: baseFacture,
      course: {
        pickup_address: "A",
        destination_address: "B",
        scheduled_date: "2026-01-15T08:30:00Z",
      },
      driver: baseDriver,
      variant: "client",
    });
    expect(out.blob).toBeInstanceOf(Blob);
  });

  it("ne crash pas si payment_method est null", async () => {
    await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, payment_method: null },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).toContain("Mode de paiement: N/A");
  });
});

describe("generateUnifiedInvoicePDF — code promo / réduction", () => {
  it("affiche la réduction quand promo_code + discount_amount présents", async () => {
    await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, promo_code: "WELCOME10", discount_amount: 10 },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).toContain("Réduction (WELCOME10)");
    expect(txt).toContain("-10.00 €");
  });

  it("n'affiche pas la réduction si discount_amount = 0", async () => {
    await generateUnifiedInvoicePDF({
      facture: { ...baseFacture, promo_code: "WELCOME10", discount_amount: 0 },
      course: baseCourse,
      driver: baseDriver,
      variant: "client",
    });
    const txt = getAllTexts();
    expect(txt).not.toContain("Réduction");
  });
});
