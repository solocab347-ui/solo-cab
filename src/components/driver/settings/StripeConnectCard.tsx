import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ChevronUp,
  HelpCircle
} from "lucide-react";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StripeConnectSetupGuide } from "./StripeConnectSetupGuide";

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
  const [showGuide, setShowGuide] = useState(false);

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
      <Card className="border-2 border-success/30 bg-gradient-to-br from-success/10 to-success/5 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/20 p-2.5 sm:p-3 rounded-xl shrink-0">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-success text-sm sm:text-base">Compte Stripe connecté</h3>
                <p className="text-xs sm:text-sm text-success/80">
                  Paiements par carte activés
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Infos du compte Stripe */}
          <div className="bg-card/60 rounded-lg p-3 sm:p-4 border border-border/50 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Compte</span>
              <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            </div>
            {status?.email && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-xs font-medium truncate max-w-[200px]">{status.email}</span>
              </div>
            )}
            {status?.business_profile_name && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Entreprise</span>
                <span className="text-xs font-medium truncate max-w-[200px]">{status.business_profile_name}</span>
              </div>
            )}
            {status?.account_id && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">ID</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {status.account_id.slice(0, 12)}...
                </span>
              </div>
            )}
          </div>

          <div className="bg-success/10 rounded-lg p-3 border border-success/20 mb-4">
            <p className="text-xs sm:text-sm text-success">
              <strong>Virements automatiques sous 2 jours ouvrés</strong>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleConnectStripe}
              disabled={connecting}
              className="flex-1 text-xs"
            >
              {connecting ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3 mr-1.5" />
              )}
              Gérer mon compte Stripe
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                toast.info("Pour changer de compte Stripe, contactez le support SoloCab.", {
                  description: "Votre compte actuel sera dissocié puis un nouveau sera créé."
                });
              }}
              className="flex-1 text-xs text-muted-foreground"
            >
              Changer de compte
            </Button>
          </div>

          {/* Transparence frais */}
          <div className="mt-4 pt-3 border-t border-success/20">
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              <strong>Frais :</strong> 0,50€/course • Encaissement spontané : 0,80€
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // État: Vérification en cours
  if (isPending) {
    return (
      <Card className="border-2 border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/20 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-warning animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Vérification en cours</h3>
                <p className="text-sm text-warning/80">
                  Stripe vérifie vos informations
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning text-sm">
              La validation peut prendre jusqu'à 24h. Vous recevrez une notification dès que votre compte sera actif.
            </AlertDescription>
          </Alert>

          {status?.details_submitted === false && (
            <Button 
              onClick={handleConnectStripe}
              disabled={connecting}
              className="w-full mt-4 bg-warning hover:bg-warning/90 text-warning-foreground"
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
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden shadow-lg">
      <CardContent className="p-0">
        {/* Header avec gradient - Responsive */}
        <div className="bg-gradient-premium p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold mb-1">Encaissement en ligne</h3>
              <p className="text-white/90 text-xs leading-relaxed">
                Paiement CB et facturation automatique
              </p>
            </div>
          </div>
        </div>

        {/* Contenu principal - Mobile first */}
        <div className="p-4 space-y-4">
          {/* Avantages - Grille responsive */}
          <div className="grid grid-cols-1 gap-2">
            {BENEFITS.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={idx}
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="bg-success/10 p-1.5 rounded-full shrink-0">
                    <Icon className="h-3.5 w-3.5 text-success" />
                  </div>
                  <span className="text-muted-foreground text-xs">{benefit.label}</span>
                </div>
              );
            })}
          </div>

          {/* Frais - Compact */}
          <div className="bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="bg-success/20 p-1.5 rounded-lg shrink-0">
                <Receipt className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-success text-sm">0,50 € / transaction</p>
                <p className="text-[10px] text-success/80">+ frais Stripe (~1,5% + 0,25€)</p>
              </div>
            </div>
          </div>

          {/* Stats - Compact horizontal */}
          <div className="flex justify-between gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center flex-1">
              <Timer className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-[10px] font-semibold">5 min</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center flex-1">
              <Banknote className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-[10px] font-semibold">J+2</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center flex-1">
              <Shield className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-[10px] font-semibold">Sécurisé</p>
            </div>
          </div>

          {/* CTA Principal avec guide */}
          <div className="space-y-2">
            <Button 
              onClick={() => setShowGuide(true)}
              disabled={connecting || loading}
              className="w-full h-12 text-sm bg-gradient-premium text-white shadow-lg hover:opacity-90"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Configurer les paiements en ligne
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {/* Lien direct pour les utilisateurs avancés */}
            <button
              onClick={handleConnectStripe}
              disabled={connecting || loading}
              className="w-full text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Accès direct (utilisateurs avancés)
            </button>
          </div>

          {/* Guide modal */}
          <StripeConnectSetupGuide
            open={showGuide}
            onOpenChange={setShowGuide}
            onStartSetup={handleConnectStripe}
            isConnecting={connecting}
          />

          {/* Toggle détails */}
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Masquer
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Comment ça fonctionne ?
              </>
            )}
          </button>

          {showDetails && (
            <div className="space-y-3 pt-2 border-t">
              {/* Étapes compactes */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                {[
                  { num: "1", text: "Client réserve en ligne" },
                  { num: "2", text: "Empreinte bancaire sécurisée" },
                  { num: "3", text: "Course terminée = paiement capturé" },
                  { num: "€", text: "Virement en 2 jours ouvrés", green: true },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={cn(
                      "text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      step.green ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                    )}>
                      {step.num}
                    </div>
                    <p className={cn("text-xs", step.green && "text-success font-medium")}>{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Documents requis */}
              <Alert className="border-info/30 bg-info/10 py-2">
                <Info className="h-3 w-3 text-info" />
                <AlertDescription className="text-info text-[10px]">
                  Préparez : pièce d'identité, RIB et SIRET
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Footer compact */}
        <div className="bg-muted/30 border-t px-3 py-2">
          <p className="text-[10px] text-muted-foreground text-center">
            <strong>SoloCab = infrastructure.</strong> Vous encaissez vos clients.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StripeConnectCard;
