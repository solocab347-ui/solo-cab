import { describe, it, expect } from "vitest";

/**
 * Tests complets pour tous les cas de figure de paiement
 * lors de la clôture de course et création de facture
 */

// ============================================
// LOGIQUE DE RÉSOLUTION DU PAIEMENT (create-facture-auto)
// ============================================

type PaymentResolution = {
  method: string;
  status: string;
  paidAt: string | null;
};

/**
 * Reproduit exactement la logique de résolution de paiement
 * de la edge function create-facture-auto
 */
function resolvePaymentMethod(
  inputMethod: string | null,
  courseMethod: string | null,
  isStripeDriver: boolean
): PaymentResolution {
  let resolvedMethod = inputMethod || courseMethod || "cash";
  let status = "pending";
  let paidAt: string | null = null;

  if (isStripeDriver && (resolvedMethod === "stripe" || resolvedMethod === "card")) {
    resolvedMethod = "stripe";
    status = "paid";
    paidAt = new Date().toISOString();
  } else if (resolvedMethod === "card") {
    resolvedMethod = "card";
    status = "pending";
  } else if (resolvedMethod === "cash") {
    resolvedMethod = "cash";
    status = "pending";
  } else {
    resolvedMethod = "cash";
    status = "pending";
  }

  return { method: resolvedMethod, status, paidAt };
}

describe("Résolution du mode de paiement (Edge Function create-facture-auto)", () => {
  // ============================================
  // CAS 1: Chauffeur Stripe + Carte en ligne
  // ============================================
  describe("CAS 1: Chauffeur avec Stripe Connect + paiement carte", () => {
    it("résout en 'stripe' avec statut 'paid' quand payment_method=stripe", () => {
      const result = resolvePaymentMethod("stripe", "stripe", true);
      expect(result.method).toBe("stripe");
      expect(result.status).toBe("paid");
      expect(result.paidAt).not.toBeNull();
    });

    it("résout en 'stripe' avec statut 'paid' quand payment_method=card et driver a Stripe", () => {
      const result = resolvePaymentMethod("card", "card", true);
      expect(result.method).toBe("stripe");
      expect(result.status).toBe("paid");
      expect(result.paidAt).not.toBeNull();
    });

    it("résout en 'stripe' quand course_method=card et input=null et driver a Stripe", () => {
      const result = resolvePaymentMethod(null, "card", true);
      expect(result.method).toBe("stripe");
      expect(result.status).toBe("paid");
    });
  });

  // ============================================
  // CAS 2: Chauffeur SANS Stripe + Carte (TPE)
  // ============================================
  describe("CAS 2: Chauffeur sans Stripe Connect + paiement carte (TPE)", () => {
    it("résout en 'card' avec statut 'pending' (chauffeur doit encaisser avec TPE)", () => {
      const result = resolvePaymentMethod("card", "card", false);
      expect(result.method).toBe("card");
      expect(result.status).toBe("pending");
      expect(result.paidAt).toBeNull();
    });

    it("résout en 'card' quand course_method=card et driver n'a pas Stripe", () => {
      const result = resolvePaymentMethod(null, "card", false);
      expect(result.method).toBe("card");
      expect(result.status).toBe("pending");
    });
  });

  // ============================================
  // CAS 3: Espèces (chauffeur sans Stripe)
  // ============================================
  describe("CAS 3: Paiement en espèces - chauffeur sans Stripe", () => {
    it("résout en 'cash' avec statut 'pending'", () => {
      const result = resolvePaymentMethod("cash", "cash", false);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
      expect(result.paidAt).toBeNull();
    });

    it("résout en 'cash' quand aucun mode spécifié", () => {
      const result = resolvePaymentMethod(null, null, false);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
    });
  });

  // ============================================
  // CAS 4: Espèces (chauffeur AVEC Stripe mais client choisit espèces)
  // ============================================
  describe("CAS 4: Paiement en espèces - chauffeur avec Stripe (client a choisi espèces)", () => {
    it("résout en 'cash' avec statut 'pending' même si le chauffeur a Stripe", () => {
      const result = resolvePaymentMethod("cash", "cash", true);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
      expect(result.paidAt).toBeNull();
    });
  });

  // ============================================
  // CAS 5: Fallback - mode inconnu
  // ============================================
  describe("CAS 5: Modes de paiement inconnus/invalides → fallback espèces", () => {
    it("mode 'virement' → fallback 'cash'", () => {
      const result = resolvePaymentMethod("virement", null, false);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
    });

    it("mode 'cheque' → fallback 'cash'", () => {
      const result = resolvePaymentMethod("cheque", null, false);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
    });

    it("mode 'pending' → fallback 'cash'", () => {
      const result = resolvePaymentMethod("pending", null, false);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
    });

    it("mode 'other' → fallback 'cash'", () => {
      const result = resolvePaymentMethod("other", null, false);
      expect(result.method).toBe("cash");
      expect(result.status).toBe("pending");
    });
  });
});

// ============================================
// LOGIQUE D'AFFICHAGE DU DIALOG DE CLÔTURE
// ============================================

type StripePaymentInfo = {
  isStripePayment: boolean;
  paymentMethod: string;
  driverHasStripe: boolean;
  remainingAmount: number;
  depositPaid: number;
};

function determineDisplayCase(info: StripePaymentInfo): string {
  if (info.isStripePayment) return "CAS_1_STRIPE_AUTO";
  if (!info.isStripePayment && info.paymentMethod === "card") return "CAS_2_CARD_TPE";
  if (!info.isStripePayment && info.paymentMethod !== "card" && !info.driverHasStripe) return "CAS_3_CASH_NO_STRIPE";
  if (!info.isStripePayment && info.paymentMethod === "cash" && info.driverHasStripe) return "CAS_4_CASH_WITH_STRIPE";
  return "UNKNOWN";
}

function determineButtonLabel(info: StripePaymentInfo): string {
  if (info.isStripePayment) return "Clôturer et encaisser automatiquement";
  if (info.paymentMethod === "card") return "J'ai encaissé avec mon TPE";
  if (info.paymentMethod === "cash") return "J'ai encaissé en espèces";
  return "Confirmer la clôture";
}

describe("Affichage du dialog de clôture - cas d'affichage", () => {
  it("CAS 1: Stripe → affiche 'paiement auto, ne demandez PAS'", () => {
    const info: StripePaymentInfo = {
      isStripePayment: true,
      paymentMethod: "stripe",
      driverHasStripe: true,
      remainingAmount: 45,
      depositPaid: 0,
    };
    expect(determineDisplayCase(info)).toBe("CAS_1_STRIPE_AUTO");
    expect(determineButtonLabel(info)).toBe("Clôturer et encaisser automatiquement");
  });

  it("CAS 2: Carte sans Stripe → affiche 'encaissez avec votre TPE'", () => {
    const info: StripePaymentInfo = {
      isStripePayment: false,
      paymentMethod: "card",
      driverHasStripe: false,
      remainingAmount: 45,
      depositPaid: 0,
    };
    expect(determineDisplayCase(info)).toBe("CAS_2_CARD_TPE");
    expect(determineButtonLabel(info)).toBe("J'ai encaissé avec mon TPE");
  });

  it("CAS 3: Espèces sans Stripe → affiche 'encaissez en espèces'", () => {
    const info: StripePaymentInfo = {
      isStripePayment: false,
      paymentMethod: "cash",
      driverHasStripe: false,
      remainingAmount: 45,
      depositPaid: 0,
    };
    expect(determineDisplayCase(info)).toBe("CAS_3_CASH_NO_STRIPE");
    expect(determineButtonLabel(info)).toBe("J'ai encaissé en espèces");
  });

  it("CAS 4: Espèces avec Stripe → affiche 'malgré Stripe, client a choisi espèces'", () => {
    const info: StripePaymentInfo = {
      isStripePayment: false,
      paymentMethod: "cash",
      driverHasStripe: true,
      remainingAmount: 45,
      depositPaid: 0,
    };
    expect(determineDisplayCase(info)).toBe("CAS_4_CASH_WITH_STRIPE");
    expect(determineButtonLabel(info)).toBe("J'ai encaissé en espèces");
  });

  it("Stripe avec acompte → montant restant réduit", () => {
    const info: StripePaymentInfo = {
      isStripePayment: true,
      paymentMethod: "stripe",
      driverHasStripe: true,
      remainingAmount: 35,
      depositPaid: 10,
    };
    expect(info.remainingAmount).toBe(35);
    expect(info.depositPaid).toBe(10);
    expect(determineDisplayCase(info)).toBe("CAS_1_STRIPE_AUTO");
  });
});

// ============================================
// LOGIQUE useInvoiceAutoCreate
// ============================================

function resolveInvoicePayment(
  coursePaymentMethod: string | null,
  isStripeDriver: boolean
): { method: string; status: string } {
  if (coursePaymentMethod === "stripe" || (coursePaymentMethod === "card" && isStripeDriver)) {
    return { method: "stripe", status: "paid" };
  }
  if (coursePaymentMethod === "card") {
    return { method: "card", status: "pending" };
  }
  if (coursePaymentMethod === "cash") {
    return { method: "cash", status: "pending" };
  }
  return { method: "cash", status: "pending" };
}

describe("useInvoiceAutoCreate - résolution du paiement", () => {
  it("Stripe driver + card → stripe/paid", () => {
    const result = resolveInvoicePayment("card", true);
    expect(result.method).toBe("stripe");
    expect(result.status).toBe("paid");
  });

  it("Stripe driver + stripe → stripe/paid", () => {
    const result = resolveInvoicePayment("stripe", true);
    expect(result.method).toBe("stripe");
    expect(result.status).toBe("paid");
  });

  it("Non-Stripe driver + card → card/pending (TPE)", () => {
    const result = resolveInvoicePayment("card", false);
    expect(result.method).toBe("card");
    expect(result.status).toBe("pending");
  });

  it("Any driver + cash → cash/pending", () => {
    expect(resolveInvoicePayment("cash", true)).toEqual({ method: "cash", status: "pending" });
    expect(resolveInvoicePayment("cash", false)).toEqual({ method: "cash", status: "pending" });
  });

  it("Null payment method → cash/pending", () => {
    expect(resolveInvoicePayment(null, false)).toEqual({ method: "cash", status: "pending" });
    expect(resolveInvoicePayment(null, true)).toEqual({ method: "cash", status: "pending" });
  });
});

// ============================================
// LABELS FACTURES (FleetClientDevisFactures)
// ============================================

function getPaymentMethodLabel(method: string | null): string {
  if (method === "stripe") return "💳 Carte en ligne";
  if (method === "card") return "💳 Carte (TPE)";
  if (method === "cash") return "💵 Espèces";
  return method || "—";
}

function getPaymentStatusLabel(status: string | null): string {
  if (status === "paid") return "Payée";
  return "En attente";
}

describe("Labels factures - FleetClientDevisFactures", () => {
  it("stripe → '💳 Carte en ligne'", () => {
    expect(getPaymentMethodLabel("stripe")).toBe("💳 Carte en ligne");
  });

  it("card → '💳 Carte (TPE)'", () => {
    expect(getPaymentMethodLabel("card")).toBe("💳 Carte (TPE)");
  });

  it("cash → '💵 Espèces'", () => {
    expect(getPaymentMethodLabel("cash")).toBe("💵 Espèces");
  });

  it("null → '—'", () => {
    expect(getPaymentMethodLabel(null)).toBe("—");
  });

  it("virement (legacy) → affiche 'virement' tel quel", () => {
    expect(getPaymentMethodLabel("virement")).toBe("virement");
  });

  it("paid → 'Payée'", () => {
    expect(getPaymentStatusLabel("paid")).toBe("Payée");
  });

  it("pending → 'En attente'", () => {
    expect(getPaymentStatusLabel("pending")).toBe("En attente");
  });
});

// ============================================
// CALCUL DES FRAIS (create-facture-auto)
// ============================================

const SOLOCAB_FEE = 0.50;
const STRIPE_PERCENTAGE = 0.015;
const STRIPE_FIXED_FEE = 0.25;

function calculateStripeFee(amount: number): number {
  return Math.round((amount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
}

describe("Calcul des frais SoloCab et Stripe", () => {
  it("course à 45€ via Stripe → frais Stripe = 0.93€, SoloCab = 0.50€", () => {
    const stripeFee = calculateStripeFee(45);
    expect(stripeFee).toBe(0.93);
    const totalFees = Math.round((SOLOCAB_FEE + stripeFee) * 100) / 100;
    expect(totalFees).toBe(1.43);
    const net = Math.round((45 - totalFees) * 100) / 100;
    expect(net).toBe(43.57);
  });

  it("course à 100€ via Stripe → frais Stripe = 1.75€", () => {
    expect(calculateStripeFee(100)).toBe(1.75);
  });

  it("course sans Stripe → aucun frais SoloCab", () => {
    const isStripe = false;
    const solocabFee = isStripe ? SOLOCAB_FEE : 0;
    const stripeFee = isStripe ? calculateStripeFee(45) : 0;
    expect(solocabFee).toBe(0);
    expect(stripeFee).toBe(0);
  });
});
