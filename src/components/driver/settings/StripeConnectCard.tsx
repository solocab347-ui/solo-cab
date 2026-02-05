import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  CreditCard,
  FileText,
  Building2,
  ArrowRight,
  RefreshCw,
  Info,
  Clock,
  Shield,
  Receipt,
  Banknote,
  Timer,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StripeConnectCardProps {
  driverId: string;
  onStatusChange?: () => void;
  compact?: boolean;
}

const BENEFITS = [
  { icon: CreditCard, label: "Paiement CB sécurisé" },
  { icon: FileText, label: "Factures automatiques" },
  { icon: Building2, label: "Virements directs sur votre compte" },
  { icon: Shield, label: "Aucun abonnement supplémentaire" },
];

export function StripeConnectCard({ driverId, onStatusChange, compact = false }: StripeConnectCardProps) {
  const { status, loading, isReady, isPending, isNotConnected, refresh } = useStripeConnectStatus(driverId);
  const [connecting, setConnecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Redirection vers Stripe...", {
          description: "Complétez votre inscription dans le nouvel onglet"
        });
      }
    } catch (err: any) {
      console.error("Stripe Connect error:", err);
      toast.error(err.message || "Erreur lors de la connexion Stripe");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    await refresh();
    onStatusChange?.();
    toast.success("Statut mis à jour");
  };

  // État: Compte actif et prêt
  if (isReady) {
    return (
      <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700">Compte Stripe connecté</h3>
                <p className="text-sm text-green-600">
                  Vos clients peuvent payer par carte bancaire
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <p className="text-sm text-green-700">
              <strong>Les fonds sont versés directement sur votre compte.</strong>
              <br />
              <span className="text-green-600 text-xs">Virements automatiques sous 2 jours ouvrés</span>
            </p>
          </div>

          {/* Transparence */}
          <div className="mt-4 pt-4 border-t border-green-500/20">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Frais par transaction :</strong> 0,50€ SoloCab + ~1,5% + 0,25€ Stripe
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // État: Vérification en cours
  if (isPending) {
    return (
      <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-700">Vérification en cours</h3>
                <p className="text-sm text-amber-600">
                  Stripe vérifie vos informations
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 text-sm">
              La validation peut prendre jusqu'à 24h. Vous recevrez une notification dès que votre compte sera actif.
            </AlertDescription>
          </Alert>

          {status?.details_submitted === false && (
            <Button 
              onClick={handleConnectStripe}
              disabled={connecting}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Compléter mon inscription
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // État: Non connecté - CTA principal
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-0">
        {/* Header avec gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <Zap className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Encaissement en ligne via SoloCab</h3>
              <p className="text-white/90 text-sm">
                Permettez à vos clients de payer par carte bancaire<br />
                et automatisez la facturation de vos courses.
              </p>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="p-6 space-y-5">
          {/* Avantages - Bullet points clairs */}
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={idx}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="bg-green-500/10 p-1.5 rounded-full">
                    <Icon className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-muted-foreground">{benefit.label}</span>
                </div>
              );
            })}
          </div>

          {/* Frais - Mise en avant claire */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Receipt className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-700">Frais SoloCab : 0,50 € par transaction</p>
                <p className="text-xs text-emerald-600">+ frais Stripe standards (~1,5% + 0,25€)</p>
              </div>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Timer className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold">5 min</p>
              <p className="text-[10px] text-muted-foreground">d'inscription</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Banknote className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold">J+2</p>
              <p className="text-[10px] text-muted-foreground">virements</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-semibold">100%</p>
              <p className="text-[10px] text-muted-foreground">sécurisé</p>
            </div>
          </div>

          {/* CTA Principal - TRÈS visible */}
          <Button 
            onClick={handleConnectStripe}
            disabled={connecting || loading}
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
          >
            {connecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Redirection vers Stripe...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Connecter mon compte Stripe
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Vous serez redirigé vers Stripe.com (plateforme sécurisée)
          </p>

          {/* Détails supplémentaires (toggle) */}
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Masquer les détails
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Comment ça fonctionne ?
              </>
            )}
          </button>

          {showDetails && (
            <div className="space-y-4 pt-2">
              <Separator />
              
              {/* Étapes de fonctionnement */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Comment ça fonctionne
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</div>
                    <div>
                      <p className="text-xs font-medium">Votre client réserve en ligne</p>
                      <p className="text-[11px] text-muted-foreground">Il entre sa carte bancaire sur votre page de réservation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</div>
                    <div>
                      <p className="text-xs font-medium">Empreinte bancaire sécurisée</p>
                      <p className="text-[11px] text-muted-foreground">Le montant est réservé ou l'acompte prélevé</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</div>
                    <div>
                      <p className="text-xs font-medium">Course terminée = paiement capturé</p>
                      <p className="text-[11px] text-muted-foreground">Quand vous marquez la course comme terminée</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500/10 text-green-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">€</div>
                    <div>
                      <p className="text-xs font-medium text-green-700">Virement automatique</p>
                      <p className="text-[11px] text-muted-foreground">Les fonds arrivent sur votre compte en 2 jours ouvrés</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ce dont vous avez besoin */}
              <Alert className="border-blue-500/30 bg-blue-500/10">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-xs space-y-1">
                  <p className="font-medium">Ce dont vous aurez besoin :</p>
                  <p>✓ Une pièce d'identité valide</p>
                  <p>✓ Votre RIB (IBAN) pour les virements</p>
                  <p>✓ Les informations de votre entreprise (SIRET)</p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Footer - Message de transparence */}
        <div className="bg-muted/30 border-t p-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            <strong>SoloCab n'est pas une plateforme de réservation.</strong>
            <br />
            Vous encaissez vos clients. SoloCab fournit l'infrastructure et les outils.
            <br />
            <span className="text-primary font-medium">Les frais sont fixes, clairs et visibles.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StripeConnectCard;
