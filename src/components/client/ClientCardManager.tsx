import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Trash2, Star, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

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
  amex: "American Express",
  discover: "Discover",
};

export function ClientCardManager() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleAddCard = async () => {
    try {
      setSaving(true);

      // 1. Get SetupIntent from backend
      const { data, error } = await supabase.functions.invoke("save-client-card");
      if (error) throw error;
      if (!data?.client_secret) throw new Error("Erreur de configuration");

      // 2. Load Stripe
      const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (!stripePublicKey) {
        toast.error("Configuration Stripe manquante");
        return;
      }

      const stripe = await loadStripe(stripePublicKey);
      if (!stripe) throw new Error("Stripe non chargé");

      // 3. Redirect to Stripe for card setup (or use Elements)
      // Using confirmCardSetup with redirect
      const { error: stripeError } = await stripe.confirmCardSetup(data.client_secret, {
        payment_method: {
          card: { token: "" } as any, // Will be handled by redirect
        },
        return_url: `${window.location.origin}/client-dashboard?tab=paiement&card=saved`,
      });

      if (stripeError) {
        // If redirect-based, this won't fire
        toast.error(stripeError.message || "Erreur lors de l'enregistrement");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      await supabase
        .from("clients")
        .update({ default_payment_method_id: cardId })
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id!);

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          Mes cartes bancaires
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enregistrez votre carte pour des paiements automatiques sans ressaisie.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucune carte enregistrée. Ajoutez une carte pour des paiements automatiques.
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 rounded bg-muted flex items-center justify-center text-xs font-bold uppercase">
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
                  <Badge variant="default" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
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
          ))
        )}

        <Button
          onClick={handleAddCard}
          disabled={saving}
          className="w-full"
          variant={cards.length === 0 ? "default" : "outline"}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {cards.length === 0 ? "Ajouter ma carte bancaire" : "Ajouter une carte"}
        </Button>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Vos données bancaires sont sécurisées par Stripe. SoloCab ne stocke jamais vos numéros de carte.
        </p>
      </CardContent>
    </Card>
  );
}
