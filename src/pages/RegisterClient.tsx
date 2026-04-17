import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ---------- Inline Stripe Card Form ----------
function CardRegistrationForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) { setError(submitError.message || "Erreur"); return; }

      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });

      if (stripeError) { setError(stripeError.message || "Erreur de validation"); return; }

      if (setupIntent?.status === "succeeded") {
        try {
          await supabase.functions.invoke("persist-card-default", {
            body: { setup_intent_id: setupIntent.id },
          });
        } catch { /* non-blocking */ }
        toast.success("Carte enregistrée avec succès !");
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        🔒 Aucun prélèvement. Votre carte sera utilisée uniquement pour sécuriser vos futures réservations.
      </p>
      <Button type="submit" disabled={saving || !stripe || !ready} className="w-full h-11">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        Enregistrer ma carte
      </Button>
    </form>
  );
}

// ---------- Main Component ----------
const RegisterClient = () => {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { user, loading: authLoading } = useAuth();

  // Steps: 'form' | 'card' | 'done'
  const [step, setStep] = useState<"form" | "card" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [loadingCard, setLoadingCard] = useState(false);

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey.startsWith("pk_")) return null;
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  // If already logged in and on form step, move to card step
  useEffect(() => {
    if (!authLoading && user && step === "form") {
      checkAndCreateClient(user.id);
    }
  }, [user, authLoading]);

  const checkAndCreateClient = async (userId: string) => {
    try {
      setLoading(true);
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id, default_payment_method_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingClient?.default_payment_method_id) {
        // Already has card, go to dashboard
        navigate("/client-dashboard");
        return;
      }

      if (!existingClient) {
        await createClientRecord(userId);
      }

      // Move to card step
      setStep("card");
      await initializeCardForm();
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la vérification du compte");
    } finally {
      setLoading(false);
    }
  };

  const createClientRecord = async (userId: string) => {
    const { error: insertError } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        is_exclusive: false,
        driver_ids: [],
        driver_id: null,
        favorite_driver_id: null,
      })
      .select()
      .single();

    if (insertError && insertError.code !== "23505") throw insertError;

    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
  };

  const initializeCardForm = async () => {
    setLoadingCard(true);
    try {
      const res = await supabase.functions.invoke("create-setup-intent");
      if (res.error) throw res.error;
      const data = res.data;
      if (!data?.client_secret || !data?.publishable_key) throw new Error("Configuration Stripe manquante");
      setClientSecret(data.client_secret);
      setStripePublishableKey(data.publishable_key);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur de configuration paiement. Vous pourrez ajouter votre carte plus tard.");
      setStep("done");
    } finally {
      setLoadingCard(false);
    }
  };


  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur de création du compte");

      await new Promise((r) => setTimeout(r, 500));

      await supabase
        .from("profiles")
        .update({ phone: formData.phone, preferred_language: locale })
        .eq("id", authData.user.id);

      await createClientRecord(authData.user.id);

      toast.success("Compte créé ! Enregistrez votre carte pour réserver.");
      setStep("card");
      await initializeCardForm();
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("Cette adresse email est déjà utilisée");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- RENDER ----------

  if (authLoading || (user && loading && step === "form")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50"><LanguageSelector /></div>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="fixed top-4 left-4 z-50 gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>

      <Card className="w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="flex h-1">
          <div className={`flex-1 ${step !== "form" ? "bg-primary" : "bg-primary/30"} transition-colors`} />
          <div className={`flex-1 ${step === "done" ? "bg-primary" : "bg-muted"} transition-colors`} />
        </div>

        <CardContent className="p-6">
          {/* ============ STEP 1: SIGNUP ============ */}
          {step === "form" && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  <Sparkles className="w-3 h-3" /> 100% gratuit
                </div>
                <h1 className="text-2xl font-bold">Rejoignez SoloCab</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Réservez un VTC en quelques secondes
                </p>
              </div>




              {/* Minimal email form */}
              <form onSubmit={handleEmailSignup} className="space-y-3">
                <div>
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jean@exemple.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="6 caractères minimum"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Créer mon compte
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                Déjà un compte ?{" "}
                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/auth?redirect=/client-dashboard")}>
                  Se connecter
                </Button>
              </p>
            </div>
          )}

          {/* ============ STEP 2: CARD ============ */}
          {step === "card" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Enregistrez votre carte</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pour réserver instantanément sans ressaisir vos infos
                </p>
              </div>

              {loadingCard || !clientSecret || !stripePromise ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Préparation...</span>
                </div>
              ) : (
                <Elements
                  stripe={stripePromise}
                  key={clientSecret}
                  options={{
                    clientSecret,
                    locale: "fr",
                    appearance: {
                      theme: "stripe",
                      variables: { colorPrimary: "hsl(var(--primary))", borderRadius: "8px" },
                    },
                  }}
                >
                  <CardRegistrationForm
                    clientSecret={clientSecret}
                    onSuccess={() => setStep("done")}
                  />
                </Elements>
              )}

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setStep("done")}
              >
                Passer cette étape →
              </Button>
            </div>
          )}

          {/* ============ STEP 3: DONE ============ */}
          {step === "done" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bienvenue sur SoloCab !</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Votre compte est prêt. Trouvez votre premier chauffeur VTC.
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={() => navigate("/chauffeurs")} className="w-full h-11">
                  🔍 Trouver un chauffeur
                </Button>
                <Button variant="outline" onClick={() => navigate("/client-dashboard")} className="w-full">
                  Mon tableau de bord
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterClient;
