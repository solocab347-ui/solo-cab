import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  AlertTriangle, 
  Check, 
  Loader2,
  ArrowRight,
  Shield,
  Calendar,
  Percent
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LegacyMigration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [driver, setDriver] = useState<{
    id: string;
    is_legacy_stripe: boolean;
    migration_required: boolean;
    migrated_at: string | null;
  } | null>(null);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: driverData, error } = await supabase
        .from("drivers")
        .select("id, is_legacy_stripe, migration_required, migrated_at")
        .eq("user_id", user.id)
        .single();

      if (error || !driverData) {
        toast.error("Compte chauffeur non trouvé");
        navigate("/");
        return;
      }

      if (driverData.migrated_at) {
        toast.success("Votre compte a déjà été migré !");
        navigate("/chauffeur");
        return;
      }

      if (!driverData.is_legacy_stripe || !driverData.migration_required) {
        toast.info("Votre compte ne nécessite pas de migration");
        navigate("/chauffeur");
        return;
      }

      setDriver(driverData);
    } catch (err) {
      console.error("Error checking eligibility:", err);
      toast.error("Erreur lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke("create-legacy-migration-checkout", {
        body: { plan: selectedPlan },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Aucune URL de paiement reçue");
      }
    } catch (err: any) {
      console.error("Migration error:", err);
      toast.error(err.message || "Erreur lors de la migration");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  const plans = [
    {
      id: "monthly" as const,
      name: "Mensuel",
      price: 19.99,
      period: "/mois",
      description: "Facturation mensuelle, sans engagement",
      features: [
        "Accès complet à SoloCab",
        "Support prioritaire",
        "Annulation à tout moment",
      ],
    },
    {
      id: "annual" as const,
      name: "Annuel",
      price: 305.90,
      originalPrice: 359.88,
      period: "/an",
      description: "Économisez 15% avec le forfait annuel",
      badge: "-15%",
      features: [
        "Accès complet à SoloCab",
        "Support prioritaire",
        "2 mois offerts",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="mb-2">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Migration requise
          </Badge>
          <h1 className="text-3xl font-bold">Renouveler votre abonnement</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Suite à une mise à jour de notre système de paiement, nous avons besoin que vous 
            re-confirmiez vos informations de paiement pour continuer à utiliser SoloCab.
          </p>
        </div>

        {/* Alert */}
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Votre période d'essai est terminée</AlertTitle>
          <AlertDescription className="text-amber-600">
            Pour continuer à utiliser SoloCab et accéder à toutes vos fonctionnalités, 
            veuillez sélectionner un plan et procéder au paiement.
          </AlertDescription>
        </Alert>

        {/* Plan Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg relative",
                selectedPlan === plan.id 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "hover:border-primary/50"
              )}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.badge && (
                <Badge className="absolute -top-2 -right-2 bg-green-600">
                  <Percent className="h-3 w-3 mr-1" />
                  {plan.badge}
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedPlan === plan.id 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  )}>
                    {selectedPlan === plan.id && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  {plan.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      {plan.originalPrice.toFixed(2)}€
                    </span>
                  )}
                  <span className="text-3xl font-bold">{plan.price.toFixed(2)}€</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <Separator />
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Paiement sécurisé par Stripe</p>
                  <p className="text-sm text-muted-foreground">
                    Vos données bancaires sont protégées
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={handleMigration}
                disabled={processing}
                className="w-full md:w-auto"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    Procéder au paiement
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground">
          En procédant au paiement, vous acceptez nos conditions générales d'utilisation. 
          Vous pouvez annuler votre abonnement à tout moment depuis les paramètres de votre compte.
        </p>
      </div>
    </div>
  );
}
