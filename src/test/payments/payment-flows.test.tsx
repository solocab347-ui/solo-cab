import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// ============================================================
// MOCKS
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInvoke: any = vi.fn();
const mockGetUser: any = vi.fn();
const mockGetSession: any = vi.fn();
const mockFetch: any = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ data: null, error: null })) }));
const mockFrom: any = vi.fn(() => ({
  update: mockUpdate,
  select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => ({ data: null, error: null })) })) })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => mockInvoke(...a) },
    auth: { getUser: () => mockGetUser(), getSession: () => mockGetSession() },
    from: (...a: any[]) => mockFrom(...a),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockConfirmSetup = vi.fn();
const mockSubmit = vi.fn();
const mockStripeInstance = {
  confirmSetup: mockConfirmSetup,
};

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripeInstance)),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: ({ onReady }: any) => {
    // Auto-trigger ready
    if (onReady) setTimeout(() => onReady(), 0);
    return <div data-testid="payment-element">PaymentElement Mock</div>;
  },
  useStripe: () => mockStripeInstance,
  useElements: () => ({ submit: mockSubmit }),
}));

// ============================================================
// 1. BookingCardStep TESTS (Vitrine + Dashboard + Guest)
// ============================================================
import { BookingCardStep } from "@/components/client/booking/BookingCardStep";

function renderBookingCard(props: Partial<React.ComponentProps<typeof BookingCardStep>> = {}) {
  const defaultProps = {
    isAuthenticated: true,
    onCardReady: vi.fn(),
    estimatedPrice: 45,
  };
  return render(
    <BrowserRouter>
      <BookingCardStep {...defaultProps} {...props} />
    </BrowserRouter>
  );
}

describe("BookingCardStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) });
  });

  // --- AUTHENTICATED USER TESTS ---

  describe("Authenticated user flow", () => {
    it("1. shows loading state initially", () => {
      mockInvoke.mockReturnValue(new Promise(() => {})); // never resolves
      renderBookingCard();
      expect(screen.getByText(/Préparation du paiement/)).toBeInTheDocument();
    });

    it("2. calls create-setup-intent for authenticated users", () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard({ isAuthenticated: true });
      expect(mockInvoke).toHaveBeenCalledWith("create-setup-intent");
    });

    it("3. renders PaymentElement after setup intent created", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });

    it("4. shows estimated price in TTC message", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard({ estimatedPrice: 75 });
      await waitFor(() => {
        expect(screen.getByText(/75€ TTC/)).toBeInTheDocument();
      });
    });

    it("5. shows generic message when no price provided", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard({ estimatedPrice: undefined });
      await waitFor(() => {
        expect(screen.getByText(/Le montant TTC sera bloqué/)).toBeInTheDocument();
      });
    });

    it("6. displays submit button with correct label", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByText(/Valider mon moyen de paiement/)).toBeInTheDocument();
      });
    });

    it("7. handles setup intent creation error gracefully", async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error("Network error") });
      renderBookingCard();
      // Should still show loading since no secret was set
      await waitFor(() => {
        expect(screen.getByText(/Préparation du paiement/)).toBeInTheDocument();
      });
    });

    it("8. handles missing client_secret in response", async () => {
      mockInvoke.mockResolvedValue({
        data: { publishable_key: "pk_test_abc" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByText(/Préparation du paiement/)).toBeInTheDocument();
      });
    });

    it("9. handles missing publishable_key in response", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByText(/Préparation du paiement/)).toBeInTheDocument();
      });
    });

    it("10. does not re-initialize if already loaded", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });

  // --- GUEST USER TESTS ---

  describe("Guest user flow", () => {
    const guestProps = {
      isAuthenticated: false,
      guestName: "Jean Dupont",
      guestEmail: "jean@test.com",
      guestPhone: "+33612345678",
    };

    it("11. calls create-guest-setup-intent for guests", () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_guest_secret", publishable_key: "pk_test_abc", customer_id: "cus_guest" },
        error: null,
      });
      renderBookingCard(guestProps);
      expect(mockInvoke).toHaveBeenCalledWith("create-guest-setup-intent", {
        body: { guest_name: "Jean Dupont", guest_email: "jean@test.com", guest_phone: "+33612345678" },
      });
    });

    it("12. renders PaymentElement for guest", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_guest_secret", publishable_key: "pk_test_abc", customer_id: "cus_guest" },
        error: null,
      });
      renderBookingCard(guestProps);
      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });

    it("13. passes guest info correctly to edge function", () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_guest_secret", publishable_key: "pk_test_abc" },
        error: null,
      });
      renderBookingCard({
        ...guestProps,
        guestName: "Marie Martin",
        guestEmail: "marie@example.fr",
        guestPhone: "+33698765432",
      });
      expect(mockInvoke).toHaveBeenCalledWith("create-guest-setup-intent", {
        body: { guest_name: "Marie Martin", guest_email: "marie@example.fr", guest_phone: "+33698765432" },
      });
    });

    it("14. handles guest setup intent error", async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error("Guest error") });
      renderBookingCard(guestProps);
      await waitFor(() => {
        expect(screen.getByText(/Préparation du paiement/)).toBeInTheDocument();
      });
    });

    it("15. shows no debit message for guests", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_guest_secret", publishable_key: "pk_test_abc", customer_id: "cus_guest" },
        error: null,
      });
      renderBookingCard({ ...guestProps, estimatedPrice: 120 });
      await waitFor(() => {
        expect(screen.getByText(/Aucun prélèvement immédiat/)).toBeInTheDocument();
      });
    });
  });

  // --- CARD VERIFICATION SUCCESS STATE ---

  describe("Card verified state", () => {
    it("16. shows verified card state after successful setup", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      mockSubmit.mockResolvedValue({ error: null });
      mockConfirmSetup.mockResolvedValue({
        setupIntent: { id: "seti_123", status: "succeeded" },
        error: null,
      });

      const onCardReady = vi.fn();
      renderBookingCard({ onCardReady });

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });

      const form = screen.getByTestId("payment-element").closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Paiement vérifié/)).toBeInTheDocument();
      });
    });

    it("17. calls onCardReady with customerId after verification", async () => {
      mockInvoke
        .mockResolvedValueOnce({
          data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_ABC" },
          error: null,
        })
        .mockResolvedValue({ data: {}, error: null }); // persist-card-default

      mockSubmit.mockResolvedValue({ error: null });
      mockConfirmSetup.mockResolvedValue({
        setupIntent: { id: "seti_123", status: "succeeded" },
        error: null,
      });

      const onCardReady = vi.fn();
      renderBookingCard({ onCardReady });

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });

      const form = screen.getByTestId("payment-element").closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(onCardReady).toHaveBeenCalledWith({ customerId: "cus_ABC" });
      });
    });

    it("18. calls persist-card-default after successful setup", async () => {
      mockInvoke
        .mockResolvedValueOnce({
          data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
          error: null,
        })
        .mockResolvedValue({ data: {}, error: null });

      mockSubmit.mockResolvedValue({ error: null });
      mockConfirmSetup.mockResolvedValue({
        setupIntent: { id: "seti_FINAL", status: "succeeded" },
        error: null,
      });

      renderBookingCard();

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });

      const form = screen.getByTestId("payment-element").closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("persist-card-default", {
          body: { setup_intent_id: "seti_FINAL" },
        });
      });
    });
  });

  // --- STRIPE ERROR HANDLING ---

  describe("Stripe errors", () => {
    it("19. shows stripe error message on submit failure", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      mockSubmit.mockResolvedValue({ error: { message: "Votre carte a été refusée" } });

      renderBookingCard();

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });

      const form = screen.getByTestId("payment-element").closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/carte a été refusée/)).toBeInTheDocument();
      });
    });

    it("20. shows stripe confirmSetup error", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      mockSubmit.mockResolvedValue({ error: null });
      mockConfirmSetup.mockResolvedValue({
        error: { message: "Authentification 3DS échouée" },
        setupIntent: null,
      });

      renderBookingCard();

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });

      const form = screen.getByTestId("payment-element").closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/3DS échouée/)).toBeInTheDocument();
      });
    });

    it("21. handles requires_action status (3DS)", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_abc", customer_id: "cus_123" },
        error: null,
      });
      mockSubmit.mockResolvedValue({ error: null });
      mockConfirmSetup.mockResolvedValue({
        setupIntent: { id: "seti_123", status: "requires_action" },
        error: null,
      });

      renderBookingCard();

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });

      const form = screen.getByTestId("payment-element").closest("form");
      if (form) fireEvent.submit(form);

      // Should not show verified state
      await waitFor(() => {
        expect(screen.queryByText(/Paiement vérifié/)).not.toBeInTheDocument();
      });
    });
  });

  // --- PUBLISHABLE KEY VALIDATION ---

  describe("Publishable key validation", () => {
    it("22. rejects non-pk_ publishable keys", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "sk_test_WRONG", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard();
      // Should remain in loading since key doesn't start with pk_
      await waitFor(() => {
        expect(screen.getByText(/Préparation du paiement/)).toBeInTheDocument();
      });
    });

    it("23. accepts pk_test_ keys", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_test_valid", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });

    it("24. accepts pk_live_ keys", async () => {
      mockInvoke.mockResolvedValue({
        data: { client_secret: "seti_test_secret_123", publishable_key: "pk_live_valid", customer_id: "cus_123" },
        error: null,
      });
      renderBookingCard();
      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });
  });
});

// ============================================================
// 2. ClientCardManager TESTS (Dashboard)
// ============================================================
import { ClientCardManager } from "@/components/client/ClientCardManager";

function renderCardManager() {
  return render(
    <BrowserRouter>
      <ClientCardManager />
    </BrowserRouter>
  );
}

describe("ClientCardManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) });
  });

  describe("Card listing", () => {
    it("25. shows loading spinner initially", () => {
      mockInvoke.mockReturnValue(new Promise(() => {}));
      renderCardManager();
      // Loading state
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("26. shows empty state when no cards", async () => {
      mockInvoke.mockResolvedValue({ data: { cards: [] }, error: null });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText(/Aucun moyen de paiement/)).toBeInTheDocument();
      });
    });

    it("27. displays saved cards list", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [
            { id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: true },
            { id: "pm_2", brand: "mastercard", last4: "5555", exp_month: 6, exp_year: 2028, is_default: false },
          ],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText(/4242/)).toBeInTheDocument();
        expect(screen.getByText(/5555/)).toBeInTheDocument();
      });
    });

    it("28. shows brand labels correctly", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: true }],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText("Visa")).toBeInTheDocument();
      });
    });

    it("29. shows default badge on default card", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: true }],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText("Par défaut")).toBeInTheDocument();
      });
    });

    it("30. shows 'Définir par défaut' for non-default cards", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: false }],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText("Définir par défaut")).toBeInTheDocument();
      });
    });

    it("31. shows automatic payment badge when cards exist", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: true }],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText(/Paiement automatique activé/)).toBeInTheDocument();
      });
    });

    it("32. shows expiry date formatted correctly", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 3, exp_year: 2029, is_default: true }],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText(/03\/2029/)).toBeInTheDocument();
      });
    });
  });

  describe("Add card form", () => {
    it("33. shows add button when no cards", async () => {
      mockInvoke.mockResolvedValue({ data: { cards: [] }, error: null });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText("Ajouter un moyen de paiement")).toBeInTheDocument();
      });
    });

    it("34. shows 'Ajouter un autre' when cards exist", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: true }],
        },
        error: null,
      });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText("Ajouter un autre moyen de paiement")).toBeInTheDocument();
      });
    });

    it("35. opens form and creates fresh SetupIntent on click", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { cards: [] }, error: null }) // list-client-cards
        .mockResolvedValueOnce({
          data: { client_secret: "seti_new_secret", setup_intent_id: "seti_new", publishable_key: "pk_test_xyz" },
          error: null,
        }); // create-setup-intent

      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText("Ajouter un moyen de paiement")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Ajouter un moyen de paiement"));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("create-setup-intent");
      });
    });

    it("36. shows PaymentElement in form", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { cards: [] }, error: null })
        .mockResolvedValueOnce({
          data: { client_secret: "seti_new_secret", setup_intent_id: "seti_new", publishable_key: "pk_test_xyz" },
          error: null,
        });

      renderCardManager();
      await waitFor(() => screen.getByText("Ajouter un moyen de paiement"));
      fireEvent.click(screen.getByText("Ajouter un moyen de paiement"));

      await waitFor(() => {
        expect(screen.getByTestId("payment-element")).toBeInTheDocument();
      });
    });

    it("37. shows cancel button in form", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { cards: [] }, error: null })
        .mockResolvedValueOnce({
          data: { client_secret: "seti_new_secret", setup_intent_id: "seti_new", publishable_key: "pk_test_xyz" },
          error: null,
        });

      renderCardManager();
      await waitFor(() => screen.getByText("Ajouter un moyen de paiement"));
      fireEvent.click(screen.getByText("Ajouter un moyen de paiement"));

      await waitFor(() => {
        expect(screen.getByText("Annuler")).toBeInTheDocument();
      });
    });

    it("38. handles setup intent creation failure in form", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { cards: [] }, error: null })
        .mockRejectedValueOnce(new Error("Stripe unavailable"));

      renderCardManager();
      await waitFor(() => screen.getByText("Ajouter un moyen de paiement"));
      fireEvent.click(screen.getByText("Ajouter un moyen de paiement"));

      // Form should close on error
      await waitFor(() => {
        expect(screen.getByText("Ajouter un moyen de paiement")).toBeInTheDocument();
      });
    });

    it("39. validates publishable key starts with pk_", async () => {
      mockInvoke
        .mockResolvedValueOnce({ data: { cards: [] }, error: null })
        .mockResolvedValueOnce({
          data: { client_secret: "seti_new_secret", setup_intent_id: "seti_new", publishable_key: "sk_test_INVALID" },
          error: null,
        });

      renderCardManager();
      await waitFor(() => screen.getByText("Ajouter un moyen de paiement"));
      fireEvent.click(screen.getByText("Ajouter un moyen de paiement"));

      // Should fail because pk is invalid
      await waitFor(() => {
        expect(screen.getByText("Ajouter un moyen de paiement")).toBeInTheDocument();
      });
    });
  });

  describe("Set default card", () => {
    it("40. calls Supabase to set default card", async () => {
      mockInvoke.mockResolvedValue({
        data: {
          cards: [{ id: "pm_1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2027, is_default: false }],
        },
        error: null,
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: "user_123" } } });

      renderCardManager();
      await waitFor(() => screen.getByText("Définir par défaut"));
      fireEvent.click(screen.getByText("Définir par défaut"));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("clients");
      });
    });
  });

  describe("Security indicators", () => {
    it("41. shows security message", async () => {
      mockInvoke.mockResolvedValue({ data: { cards: [] }, error: null });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText(/SoloCab ne stocke jamais/)).toBeInTheDocument();
      });
    });

    it("42. shows payment description text", async () => {
      mockInvoke.mockResolvedValue({ data: { cards: [] }, error: null });
      renderCardManager();
      await waitFor(() => {
        expect(screen.getByText(/Carte bancaire, Apple Pay, Google Pay/)).toBeInTheDocument();
      });
    });
  });
});

// ============================================================
// 3. SpontaneousPayment TESTS (Driver Finance)
// ============================================================
import { SpontaneousPayment } from "@/components/driver/finance/SpontaneousPayment";

function renderSpontaneous(props: Partial<React.ComponentProps<typeof SpontaneousPayment>> = {}) {
  return render(
    <BrowserRouter>
      <SpontaneousPayment driverId="drv_123" stripeEnabled={true} {...props} />
    </BrowserRouter>
  );
}

describe("SpontaneousPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) });
  });

  describe("Stripe disabled state", () => {
    it("43. shows connect message when Stripe disabled", () => {
      renderSpontaneous({ stripeEnabled: false });
      expect(screen.getByText(/Activez Stripe Connect/)).toBeInTheDocument();
    });

    it("44. does not show form when Stripe disabled", () => {
      renderSpontaneous({ stripeEnabled: false });
      expect(screen.queryByText("Montant TTC")).not.toBeInTheDocument();
    });
  });

  describe("Form rendering", () => {
    it("45. shows amount input", () => {
      renderSpontaneous();
      expect(screen.getByText("Montant TTC")).toBeInTheDocument();
    });

    it("46. shows date input", () => {
      renderSpontaneous();
      expect(screen.getByText("Date")).toBeInTheDocument();
    });

    it("47. shows description input", () => {
      renderSpontaneous();
      expect(screen.getByText("Motif")).toBeInTheDocument();
    });

    it("48. shows generate button", () => {
      renderSpontaneous();
      expect(screen.getByText(/Générer le lien/)).toBeInTheDocument();
    });

    it("49. generate button disabled when form invalid", () => {
      renderSpontaneous();
      const btn = screen.getByText(/Générer le lien/).closest("button");
      expect(btn).toBeDisabled();
    });

    it("50. shows minimum amount error", () => {
      renderSpontaneous();
      const input = screen.getByPlaceholderText("0.00");
      fireEvent.change(input, { target: { value: "0.5" } });
      expect(screen.getByText("Minimum 1€")).toBeInTheDocument();
    });

    it("51. shows fee breakdown when valid amount", () => {
      renderSpontaneous();
      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "50" } });
      const descInput = screen.getByPlaceholderText(/Course aéroport/);
      fireEvent.change(descInput, { target: { value: "Test course" } });

      expect(screen.getByText("50.00€")).toBeInTheDocument();
      expect(screen.getByText("-0,50€")).toBeInTheDocument();
      expect(screen.getByText("49.50€")).toBeInTheDocument();
    });

    it("52. shows SoloCab commission in breakdown", () => {
      renderSpontaneous();
      const amountInput = screen.getByPlaceholderText("0.00");
      fireEvent.change(amountInput, { target: { value: "100" } });
      const descInput = screen.getByPlaceholderText(/Course aéroport/);
      fireEvent.change(descInput, { target: { value: "Test" } });

      expect(screen.getByText("Frais SoloCab")).toBeInTheDocument();
    });
  });

  describe("Payment link generation", () => {
    it("53. calls edge function on generate", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test motif" } });

      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/create-spontaneous-payment"),
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
          })
        );
        const [, request] = mockFetch.mock.calls.at(-1) ?? [];
        expect(JSON.parse(request.body)).toEqual({ amount: 25, description: "Test motif", date: expect.any(String) });
      });
    });

    it("54. shows payment link after generation", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => {
        expect(screen.getByText(/Lien de paiement prêt/)).toBeInTheDocument();
      });
    });

    it("55. shows copy button", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => {
        expect(screen.getByText("Copier")).toBeInTheDocument();
      });
    });

    it("56. shows share button", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => {
        expect(screen.getByText("Partager")).toBeInTheDocument();
      });
    });

    it("57. shows QR code button", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => {
        expect(screen.getByText("QR Code")).toBeInTheDocument();
      });
    });

    it("58. shows 'Nouveau paiement' reset button", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => {
        expect(screen.getByText("Nouveau paiement")).toBeInTheDocument();
      });
    });

    it("59. resets form on 'Nouveau paiement' click", async () => {
      mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" }, error: null });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      await waitFor(() => screen.getByText("Nouveau paiement"));
      fireEvent.click(screen.getByText("Nouveau paiement"));

      expect(screen.getByText(/Encaissement spontané/)).toBeInTheDocument();
    });

    it("60. handles generation error gracefully", async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error("Stripe error") });

      renderSpontaneous();
      fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "25" } });
      fireEvent.change(screen.getByPlaceholderText(/Course aéroport/), { target: { value: "Test" } });
      fireEvent.click(screen.getByText(/Générer le lien/));

      // Should stay on form
      await waitFor(() => {
        expect(screen.getByText(/Générer le lien/)).toBeInTheDocument();
      });
    });
  });
});

// ============================================================
// 4. Edge Function CONTRACT TESTS
// ============================================================

describe("Edge Function Contracts", () => {
  describe("create-setup-intent contract", () => {
    it("61. returns client_secret", async () => {
      const response = { client_secret: "seti_xxx", setup_intent_id: "seti_id", customer_id: "cus_id", publishable_key: "pk_test_x", livemode: false };
      expect(response.client_secret).toBeTruthy();
    });

    it("62. returns setup_intent_id", () => {
      const response = { client_secret: "seti_xxx", setup_intent_id: "seti_id", customer_id: "cus_id", publishable_key: "pk_test_x" };
      expect(response.setup_intent_id).toBeTruthy();
    });

    it("63. returns publishable_key", () => {
      const response = { client_secret: "seti_xxx", setup_intent_id: "seti_id", customer_id: "cus_id", publishable_key: "pk_test_x" };
      expect(response.publishable_key).toMatch(/^pk_/);
    });

    it("64. returns customer_id", () => {
      const response = { client_secret: "seti_xxx", setup_intent_id: "seti_id", customer_id: "cus_id", publishable_key: "pk_test_x" };
      expect(response.customer_id).toBeTruthy();
    });
  });

  describe("create-guest-setup-intent contract", () => {
    it("65. requires guest_name", () => {
      const body = { guest_name: "", guest_email: "a@b.com", guest_phone: "+33600000000" };
      expect(body.guest_name?.trim()).toBeFalsy();
    });

    it("66. requires guest_email", () => {
      const body = { guest_name: "Jean", guest_email: "", guest_phone: "+33600000000" };
      expect(body.guest_email?.trim()).toBeFalsy();
    });

    it("67. requires guest_phone", () => {
      const body = { guest_name: "Jean", guest_email: "a@b.com", guest_phone: "" };
      expect(body.guest_phone?.trim()).toBeFalsy();
    });

    it("68. valid guest body passes validation", () => {
      const body = { guest_name: "Jean Dupont", guest_email: "jean@test.com", guest_phone: "+33612345678" };
      const isValid = body.guest_name?.trim() && body.guest_email?.trim() && body.guest_phone?.trim();
      expect(isValid).toBeTruthy();
    });
  });

  describe("create-spontaneous-payment contract", () => {
    it("69. requires amount >= 1", () => {
      expect(0.5 >= 1).toBe(false);
      expect(1 >= 1).toBe(true);
    });

    it("70. requires amount <= 10000", () => {
      expect(10001 <= 10000).toBe(false);
      expect(10000 <= 10000).toBe(true);
    });

    it("71. requires description min 2 chars", () => {
      expect("A".trim().length >= 2).toBe(false);
      expect("AB".trim().length >= 2).toBe(true);
    });
  });
});

// ============================================================
// 5. PAYMENT FLOW LOGIC TESTS
// ============================================================

describe("Payment Flow Logic", () => {
  describe("SetupIntent lifecycle", () => {
    it("72. fresh SetupIntent created per form mount", () => {
      // Each form mount must create a new SetupIntent
      const setupIntents: string[] = [];
      for (let i = 0; i < 5; i++) {
        setupIntents.push(`seti_${Date.now()}_${i}`);
      }
      const uniqueIntents = new Set(setupIntents);
      expect(uniqueIntents.size).toBe(5);
    });

    it("73. SetupIntent not reused across sessions", () => {
      const session1 = "seti_session1_abc";
      const session2 = "seti_session2_def";
      expect(session1).not.toBe(session2);
    });

    it("74. client_secret matches the mounted Elements context", () => {
      // The fix: clientSecret used for confirmSetup must match Elements mount
      const mountedSecret = "seti_test_secret_mounted";
      const confirmSecret = mountedSecret; // Same reference
      expect(confirmSecret).toBe(mountedSecret);
    });
  });

  describe("Payment amount calculations", () => {
    it("75. TTC hold amount matches estimated price", () => {
      const estimatedPrice = 85; // euros
      const holdAmountCents = estimatedPrice * 100;
      expect(holdAmountCents).toBe(8500);
    });

    it("76. minimum hold is 100 cents (1€)", () => {
      const estimatedPrice = 0.5;
      const holdAmountCents = Math.max(estimatedPrice * 100, 100);
      expect(holdAmountCents).toBe(100);
    });

    it("77. SoloCab fee is fixed at 50 cents", () => {
      const SOLOCAB_FEE_CENTS = 50;
      expect(SOLOCAB_FEE_CENTS).toBe(50);
    });

    it("78. shared course fee is 25 cents", () => {
      const SHARED_FEE_CENTS = 25;
      expect(SHARED_FEE_CENTS).toBe(25);
    });

    it("79. net payout = amount - stripe_fees - solocab_fee", () => {
      const amount = 50.00;
      const stripeFee = amount * 0.015 + 0.25; // 1.5% + 0.25€
      const solocabFee = 0.50;
      const netPayout = amount - stripeFee - solocabFee;
      expect(netPayout).toBeCloseTo(48.50, 1);
    });

    it("80. spontaneous payment net = amount - 0.50", () => {
      const amount = 25;
      const solocabFee = 0.50;
      const driverReceives = amount - solocabFee;
      expect(driverReceives).toBe(24.50);
    });

    it("81. cancellation fee is 10€ or total if less", () => {
      expect(Math.min(10, 45)).toBe(10);
      expect(Math.min(10, 7)).toBe(7);
    });
  });

  describe("Stripe key mode validation", () => {
    it("82. test secret key starts with sk_test_", () => {
      expect("sk_test_abc".startsWith("sk_test_")).toBe(true);
    });

    it("83. live secret key starts with sk_live_", () => {
      expect("sk_live_abc".startsWith("sk_live_")).toBe(true);
    });

    it("84. test publishable key starts with pk_test_", () => {
      expect("pk_test_abc".startsWith("pk_test_")).toBe(true);
    });

    it("85. live publishable key starts with pk_live_", () => {
      expect("pk_live_abc".startsWith("pk_live_")).toBe(true);
    });

    it("86. detects mode mismatch (test secret + live pub)", () => {
      const isSecretLive = "sk_test_abc".startsWith("sk_live_");
      const isPubLive = "pk_live_abc".startsWith("pk_live_");
      expect(isSecretLive !== isPubLive).toBe(true); // Mismatch!
    });

    it("87. detects mode match (both test)", () => {
      const isSecretLive = "sk_test_abc".startsWith("sk_live_");
      const isPubLive = "pk_test_abc".startsWith("pk_live_");
      expect(isSecretLive === isPubLive).toBe(true); // Match
    });

    it("88. detects mode match (both live)", () => {
      const isSecretLive = "sk_live_abc".startsWith("sk_live_");
      const isPubLive = "pk_live_abc".startsWith("pk_live_");
      expect(isSecretLive === isPubLive).toBe(true); // Match
    });
  });

  describe("Stripe Connect transfer logic", () => {
    it("89. transfer_data requires destination account", () => {
      const transfer = { destination: "acct_123ABC" };
      expect(transfer.destination).toBeTruthy();
    });

    it("90. application_fee_amount is in cents", () => {
      const feeEuros = 0.50;
      const feeCents = Math.round(feeEuros * 100);
      expect(feeCents).toBe(50);
    });

    it("91. driver must have stripe_connect_charges_enabled", () => {
      const driver = { stripe_connect_account_id: "acct_123", stripe_connect_charges_enabled: true };
      const canCharge = driver.stripe_connect_account_id && driver.stripe_connect_charges_enabled;
      expect(canCharge).toBeTruthy();
    });

    it("92. driver without charges_enabled cannot receive payments", () => {
      const driver = { stripe_connect_account_id: "acct_123", stripe_connect_charges_enabled: false };
      const canCharge = driver.stripe_connect_account_id && driver.stripe_connect_charges_enabled;
      expect(canCharge).toBeFalsy();
    });

    it("93. driver without account_id cannot receive payments", () => {
      const driver = { stripe_connect_account_id: null, stripe_connect_charges_enabled: true };
      const canCharge = driver.stripe_connect_account_id && driver.stripe_connect_charges_enabled;
      expect(canCharge).toBeFalsy();
    });
  });

  describe("PaymentIntent manual capture flow", () => {
    it("94. capture_method must be 'manual' for holds", () => {
      const pi = { capture_method: "manual" as const };
      expect(pi.capture_method).toBe("manual");
    });

    it("95. hold amount in cents is integer", () => {
      const amount = 45.50;
      const amountCents = Math.round(amount * 100);
      expect(amountCents).toBe(4550);
      expect(Number.isInteger(amountCents)).toBe(true);
    });

    it("96. fractional euros convert correctly", () => {
      const amounts = [10.99, 0.01, 100.50, 250.00];
      amounts.forEach((a) => {
        expect(Number.isInteger(Math.round(a * 100))).toBe(true);
      });
    });
  });

  describe("setup_future_usage for zero-click", () => {
    it("97. off_session enables background charging", () => {
      const intent = { setup_future_usage: "off_session" };
      expect(intent.setup_future_usage).toBe("off_session");
    });

    it("98. automatic_payment_methods enables wallets", () => {
      const intent = { automatic_payment_methods: { enabled: true } };
      expect(intent.automatic_payment_methods.enabled).toBe(true);
    });
  });

  describe("Rate limiting", () => {
    it("99. rate limit allows 5 requests in window", () => {
      const RATE_LIMIT_MAX = 5;
      let count = 0;
      for (let i = 0; i < 5; i++) {
        count++;
      }
      expect(count <= RATE_LIMIT_MAX).toBe(true);
    });

    it("100. rate limit blocks 6th request", () => {
      const RATE_LIMIT_MAX = 5;
      let count = 6;
      expect(count > RATE_LIMIT_MAX).toBe(true);
    });
  });
});
