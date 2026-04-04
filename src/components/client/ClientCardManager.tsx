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

function CardFormInner({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState({ number: false, expiry: false, cvc: false });

  const isComplete = cardComplete.number && cardComplete.expiry && cardComplete.cvc;

  const elementStyle = {
    base: {
      fontSize: "16px",
      color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, sans-serif",
      "::placeholder": { color: "#64748b" },
      iconColor: "#94a3b8",
    },
    invalid: { color: "#ef4444", iconColor: "#ef4444" },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error("Formulaire non chargé");

      const { data, error: fnError } = await supabase.functions.invoke("save-client-card");
      if (fnError) throw fnError;
      if (!data?.client_secret) throw new Error("Erreur de configuration");

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        data.client_secret,
        { payment_method: { card: cardNumberElement } }
      );

      if (stripeError) {
        setError(stripeError.message || "Erreur lors de l'enregistrement");
        return;
      }

      if (setupIntent?.status === "succeeded") {
        toast.success("✅ Carte enregistrée avec succès !");
        onSuccess();
      } else if (setupIntent?.status === "requires_action") {
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
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Numéro de carte</label>
          <div className="p-3 rounded-lg border bg-background/50 h-11 flex items-center">
            <CardNumberElement
              options={{ style: elementStyle, showIcon: true, placeholder: "1234 5678 9012 3456" }}
              onChange={(e) => setCardComplete(prev => ({ ...prev, number: e.complete }))}
              className="w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date d'expiration</label>
            <div className="p-3 rounded-lg border bg-background/50 h-11 flex items-center">
              <CardExpiryElement
                options={{ style: elementStyle, placeholder: "MM / AA" }}
                onChange={(e) => setCardComplete(prev => ({ ...prev, expiry: e.complete }))}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cryptogramme (CVV)</label>
            <div className="p-3 rounded-lg border bg-background/50 h-11 flex items-center">
              <CardCvcElement
                options={{ style: elementStyle, placeholder: "123" }}
                onChange={(e) => setCardComplete(prev => ({ ...prev, cvc: e.complete }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Aucun montant ne sera débité. Votre carte sera utilisée pour vos prochaines courses.
      </p>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !stripe || !isComplete} className="flex-1">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-2" />
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


// ========================
// MAIN COMPONENT
// ========================
export function ClientCardManager() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  const handleSetDefault = async (cardId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("clients")
        .update({ default_payment_method_id: cardId })
        .eq("user_id", user.id);

      setCards((prev) =>
        prev.map((c) => ({ ...c, is_default: c.id === cardId }))
      );
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
          <p className="text-sm text-muted-foreground">
            Enregistrez votre carte pour des paiements automatiques.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Saved Cards */}
          {cards.length > 0 && (
            <div className="space-y-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-14 rounded bg-muted flex items-center justify-center text-xs font-bold uppercase tracking-wide">
                      {BRAND_LABELS[card.brand] || card.brand}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        •••• •••• •••• {card.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Exp. {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {card.is_default ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Par défaut
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(card.id)}
                        className="text-xs"
                      >
                        Définir par défaut
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {cards.length === 0 && !showForm && (
            <div className="text-center py-6 space-y-3">
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">Aucune carte enregistrée</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutez une carte pour payer automatiquement vos courses sans aucune action.
                </p>
              </div>
            </div>
          )}

          {/* Add Card Form */}
          {showForm ? (
            <Elements stripe={stripePromise} options={{ locale: "fr" }}>
              <CardFormInner
                onSuccess={() => {
                  setShowForm(false);
                  setTimeout(loadCards, 2000);
                }}
                onCancel={() => setShowForm(false)}
              />
            </Elements>
          ) : (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full"
              variant={cards.length === 0 ? "default" : "outline"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {cards.length === 0 ? "Ajouter ma carte bancaire" : "Ajouter une autre carte"}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Données sécurisées par Stripe. SoloCab ne stocke jamais vos numéros.
          </p>
        </CardContent>
      </Card>

      {/* Info Card */}
      {cards.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Paiement automatique activé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vos prochaines courses seront débitées automatiquement à la fin du trajet. Aucune action de votre part.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
