import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
};

function CardFormInner({ onSuccess, onCancel, clientSecret }: { onSuccess: () => void; onCancel: () => void; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState({ number: false, expiry: false, cvc: false });

  const isFormComplete = cardComplete.number && cardComplete.expiry && cardComplete.cvc;

  const elementStyle = {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      fontFamily: "system-ui, sans-serif",
      "::placeholder": {
        color: "hsl(var(--muted-foreground))",
      },
      iconColor: "hsl(var(--muted-foreground))",
    },
    invalid: {
      color: "hsl(var(--destructive))",
      iconColor: "hsl(var(--destructive))",
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error("Le formulaire de carte n'est pas prêt.");
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (stripeError) {
        setError(stripeError.message || "Erreur lors de l'enregistrement");
        return;
      }

      if (setupIntent?.status === "succeeded") {
        toast.success("✅ Carte enregistrée avec succès !");
        onSuccess();
        return;
      }

      if (setupIntent?.status === "requires_action") {
        toast.info("Vérification 3D Secure en cours...");
      }
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Numéro de carte</label>
          <div className="flex h-11 items-center rounded-lg border bg-background/50 px-3">
            <CardNumberElement
              options={{ style: elementStyle, showIcon: true, placeholder: "1234 5678 9012 3456" }}
              onChange={(event) => setCardComplete((prev) => ({ ...prev, number: event.complete }))}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Expiration</label>
            <div className="flex h-11 items-center rounded-lg border bg-background/50 px-3">
              <CardExpiryElement
                options={{ style: elementStyle, placeholder: "MM / AA" }}
                onChange={(event) => setCardComplete((prev) => ({ ...prev, expiry: event.complete }))}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Cryptogramme</label>
            <div className="flex h-11 items-center rounded-lg border bg-background/50 px-3">
              <CardCvcElement
                options={{ style: elementStyle, placeholder: "123" }}
                onChange={(event) => setCardComplete((prev) => ({ ...prev, cvc: event.complete }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Aucun montant ne sera débité. Votre carte sera enregistrée pour vos prochaines courses.
      </p>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={saving || !stripe || !isFormComplete}
          className="flex-1"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Enregistrer ma carte
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function ClientCardManager() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("list-client-cards");
      if (error) throw error;
      setCards(data?.cards || []);
    } catch (err: any) {
      console.error("Error loading cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleShowForm = async () => {
    setSetupLoading(true);
    setShowForm(true);
    setClientSecret(null);

    try {
      const { data, error } = await supabase.functions.invoke("save-client-card");
      if (error) throw error;
      if (!data?.client_secret) throw new Error("Erreur de configuration");
      setClientSecret(data.client_secret);
    } catch (err: any) {
      toast.error(err.message || "Impossible de préparer le formulaire");
      setShowForm(false);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("clients").update({ default_payment_method_id: cardId }).eq("user_id", user.id);

      setCards((prev) => prev.map((card) => ({ ...card, is_default: card.id === cardId })));
      toast.success("Carte par défaut mise à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Mes cartes bancaires
          </CardTitle>
          <p className="text-sm text-muted-foreground">Enregistrez votre carte pour des paiements automatiques.</p>
        </CardHeader>

        <CardContent className="space-y-3">
          {cards.length > 0 && (
            <div className="space-y-2">
              {cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-muted text-xs font-bold uppercase tracking-wide">
                      {BRAND_LABELS[card.brand] || card.brand}
                    </div>
                    <div>
                      <p className="text-sm font-medium">•••• •••• •••• {card.last4}</p>
                      <p className="text-xs text-muted-foreground">
                        Exp. {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {card.is_default ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Par défaut
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleSetDefault(card.id)} className="text-xs">
                        Définir par défaut
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cards.length === 0 && !showForm && (
            <div className="space-y-3 py-6 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">Aucune carte enregistrée</p>
                <p className="mt-1 text-xs text-muted-foreground">Ajoutez une carte pour payer automatiquement vos courses.</p>
              </div>
            </div>
          )}

          {showForm ? (
            setupLoading || !clientSecret ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Préparation du formulaire...
              </div>
            ) : (
              <Elements
                key={clientSecret}
                stripe={stripePromise}
                options={{
                  locale: "fr",
                }}
              >
                <CardFormInner
                  clientSecret={clientSecret}
                  onSuccess={() => {
                    setShowForm(false);
                    setClientSecret(null);
                    setTimeout(loadCards, 1200);
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setClientSecret(null);
                  }}
                />
              </Elements>
            )
          ) : (
            <Button onClick={handleShowForm} className="w-full" variant={cards.length === 0 ? "default" : "outline"}>
              <Plus className="mr-2 h-4 w-4" />
              {cards.length === 0 ? "Ajouter ma carte bancaire" : "Ajouter une autre carte"}
            </Button>
          )}

          <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Données sécurisées. SoloCab ne stocke jamais vos numéros.
          </p>
        </CardContent>
      </Card>

      {cards.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pb-4 pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Paiement automatique activé</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vos prochaines courses seront débitées automatiquement à la fin du trajet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
