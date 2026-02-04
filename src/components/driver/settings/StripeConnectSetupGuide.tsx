import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Euro,
  Shield,
  Clock,
  CreditCard,
  FileText,
  Building2,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Info,
  Lock,
  Smartphone,
  Wallet,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Banknote,
  Timer,
  Receipt
} from "lucide-react";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface StripeConnectSetupGuideProps {
  driverId: string;
  onStatusChange?: () => void;
}

const SETUP_STEPS = [
  {
    id: 1,
    title: "Créer votre compte Stripe Express",
    description: "Inscription gratuite sur la plateforme Stripe",
    icon: UserCheck,
    duration: "~2 min",
  },
  {
    id: 2,
    title: "Vérifier votre identité",
    description: "Pièce d'identité et informations personnelles",
    icon: FileText,
    duration: "~2 min",
  },
  {
    id: 3,
    title: "Ajouter votre compte bancaire",
    description: "RIB pour recevoir vos paiements",
    icon: Building2,
    duration: "~1 min",
  },
  {
    id: 4,
    title: "Activer les paiements",
    description: "Stripe valide votre compte automatiquement",
    icon: CheckCircle2,
    duration: "Automatique",
  },
];

const FAQ_ITEMS = [
  {
    question: "Combien de temps prend l'inscription ?",
    answer: "L'inscription prend environ 5 minutes. Vous aurez besoin de votre pièce d'identité, de votre RIB et des informations de votre entreprise (SIRET). La validation par Stripe est généralement instantanée, mais peut prendre jusqu'à 24h dans certains cas."
  },
  {
    question: "Quels sont les frais prélevés ?",
    answer: "Pour chaque paiement en ligne, les frais sont : 0,50€ de frais de gestion SoloCab + environ 1,5% + 0,25€ de frais Stripe. Par exemple, pour un encaissement de 50€, vous recevrez environ 48,50€ sur votre compte."
  },
  {
    question: "Quand vais-je recevoir mes paiements ?",
    answer: "Les fonds sont virés automatiquement sur votre compte bancaire sous 2 jours ouvrés après chaque paiement encaissé. Vous pouvez suivre tous vos paiements depuis le tableau de bord Stripe."
  },
  {
    question: "Puis-je demander des acomptes à mes clients ?",
    answer: "Oui ! Une fois votre compte Stripe actif, vous pouvez configurer la demande d'acompte automatique (10% à 30% du prix de la course). L'acompte est capturé à la réservation et le reste est débité en fin de course."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Stripe est certifié PCI DSS niveau 1, la norme de sécurité la plus stricte du secteur des paiements. Vos coordonnées bancaires sont cryptées et SoloCab n'y a jamais accès."
  },
  {
    question: "Que se passe-t-il si le client annule ?",
    answer: "Si vous annulez la course, l'acompte est remboursé automatiquement au client. Si le client annule, l'acompte vous est conservé pour compenser le préjudice (règle anti no-show)."
  }
];

export function StripeConnectSetupGuide({ driverId, onStatusChange }: StripeConnectSetupGuideProps) {
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

  // Calculate progress
  const getProgress = () => {
    if (isReady) return 100;
    if (isPending) return 75;
    if (status?.details_submitted) return 50;
    if (status?.connected) return 25;
    return 0;
  };

  const getCurrentStep = () => {
    if (isReady) return 5;
    if (isPending) return 4;
    if (status?.details_submitted) return 3;
    if (status?.connected) return 2;
    return 1;
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Encaissement en ligne Stripe</CardTitle>
              <CardDescription className="text-xs">
                Acceptez les paiements CB de vos clients
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center gap-2">
          {loading ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Vérification...
            </Badge>
          ) : isReady ? (
            <Badge className="bg-green-500/10 text-green-700 border-green-500/30 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Compte actif - Prêt à encaisser
            </Badge>
          ) : isPending ? (
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 gap-1">
              <Clock className="h-3 w-3" />
              Vérification en cours par Stripe
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Configuration requise
            </Badge>
          )}
        </div>

        {/* Not Ready State - Full Experience */}
        {!isReady && (
          <>
            {/* Value Proposition Cards */}
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-center">
                <Timer className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-emerald-700">5 min</p>
                <p className="text-[10px] text-emerald-600">d'inscription</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center">
                <Banknote className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-blue-700">J+2</p>
                <p className="text-[10px] text-blue-600">virements</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-3 text-center">
                <Shield className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-purple-700">100%</p>
                <p className="text-[10px] text-purple-600">sécurisé</p>
              </div>
            </div>

            <Separator />

            {/* How it works section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Comment ça fonctionne
              </h4>
              
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
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
                    <p className="text-[11px] text-muted-foreground">Le montant est réservé (ou l'acompte prélevé selon vos réglages)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</div>
                  <div>
                    <p className="text-xs font-medium">Course terminée = paiement capturé</p>
                    <p className="text-[11px] text-muted-foreground">Quand vous marquez la course comme terminée, le paiement est finalisé</p>
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

            <Separator />
            
            {/* Setup Steps */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Étapes de configuration
              </h4>
              
              <div className="space-y-2">
                {SETUP_STEPS.map((step) => {
                  const isCompleted = step.id < getCurrentStep();
                  const isCurrent = step.id === getCurrentStep();
                  const Icon = step.icon;
                  
                  return (
                    <div 
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 p-2 rounded-lg transition-colors",
                        isCompleted && "bg-green-500/5",
                        isCurrent && "bg-primary/5 border border-primary/20"
                      )}
                    >
                      <div className={cn(
                        "rounded-full p-1.5 shrink-0",
                        isCompleted 
                          ? "bg-green-500 text-white" 
                          : isCurrent 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-xs font-medium",
                            isCompleted && "text-green-700",
                            isCurrent && "text-primary"
                          )}>
                            {step.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {step.duration}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Requirements Info */}
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-xs text-blue-700">Ce dont vous aurez besoin</AlertTitle>
              <AlertDescription className="text-[11px] text-blue-600 space-y-1">
                <p>✓ Une pièce d'identité valide (carte d'identité ou passeport)</p>
                <p>✓ Votre RIB (IBAN) pour les virements</p>
                <p>✓ Les informations de votre entreprise (SIRET)</p>
              </AlertDescription>
            </Alert>

            {/* Main CTA Button */}
            <Button 
              onClick={handleConnectStripe}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
              size="lg"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Redirection vers Stripe...
                </>
              ) : isPending ? (
                <>
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Compléter mon inscription Stripe
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Activer les paiements en ligne
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">
              Vous serez redirigé vers Stripe.com (plateforme sécurisée) dans un nouvel onglet
            </p>

            {/* FAQ Section */}
            <Separator />
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Questions fréquentes
              </h4>
              
              <Accordion type="single" collapsible className="space-y-1">
                {FAQ_ITEMS.map((item, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="border border-muted rounded-lg px-3 py-0"
                  >
                    <AccordionTrigger className="text-xs font-medium hover:no-underline py-2">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[11px] text-muted-foreground pb-2">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Alternatives while waiting */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                En attendant...
              </p>
              <p className="text-[11px] text-muted-foreground">
                Vous pouvez continuer à encaisser vos clients par espèces, virement ou avec votre propre TPE. L'encaissement en ligne sera disponible dès la validation de votre compte Stripe.
              </p>
            </div>
          </>
        )}

        {/* Ready State Benefits */}
        {isReady && (
          <>
            <Separator />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
                <CreditCard className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-700">Paiements CB</p>
                <p className="text-[10px] text-green-600">Activés</p>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
                <Euro className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-700">Virements</p>
                <p className="text-[10px] text-green-600">Sous 2 jours</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold">Fonctionnalités disponibles</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Encaissement en ligne sécurisé</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Demande d'acompte automatique</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Empreinte bancaire à la réservation</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Capture automatique en fin de course</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleConnectStripe}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Accéder à mon tableau de bord Stripe
            </Button>
          </>
        )}

        {/* Fees Information - Always visible */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <Euro className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-xs text-amber-700">Frais de transaction</AlertTitle>
          <AlertDescription className="text-[11px] text-amber-600 space-y-1">
            <p><strong>0,50€</strong> frais de gestion par transaction (hébergement paiement)</p>
            <p><strong>+ Frais Stripe</strong> (environ 1,5% + 0,25€ par transaction)</p>
            <p className="mt-1 text-[10px]">Ces frais sont automatiquement déduits avant le virement sur votre compte.</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default StripeConnectSetupGuide;
