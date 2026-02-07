import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  Zap, 
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  Euro,
  Shield,
  CreditCard,
  Banknote,
  Info,
  ArrowRight,
  Gift,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import sumupTpeCard from '@/assets/sumup-tpe-card.jpg';
import sumupTpeDevice from '@/assets/sumup-tpe-device.jpg';
import { StripeConnectSetupGuide } from '@/components/driver/settings/StripeConnectSetupGuide';

interface OnboardingBillingStepProps {
  data: {
    billingType: 'own_equipment' | 'buy_equipment' | 'solocab_stripe';
  };
  onUpdate: (updates: Partial<OnboardingBillingStepProps['data']>) => void;
}

const SUMUP_AFFILIATE_LINK = 'https://join.sumup.com/4oCL6MY3?share_id=t9y754T4ocl6my3';

const BILLING_OPTIONS = [
  {
    value: 'own_equipment' as const,
    title: 'J\'ai mon propre matériel',
    subtitle: 'TPE, terminal ou application d\'encaissement',
    icon: Smartphone,
    description: 'Vous utilisez déjà votre propre terminal de paiement (SumUp, Zettle, etc.) ou une solution d\'encaissement personnelle.',
    features: [
      { text: 'Encaissez directement vos clients', icon: CreditCard },
      { text: 'Gérez votre facturation de façon autonome', icon: Euro },
      { text: 'Aucun frais SoloCab sur les paiements', icon: Shield },
    ],
    highlight: false,
    availableNow: true,
  },
  {
    value: 'buy_equipment' as const,
    title: 'Je veux acheter du matériel',
    subtitle: 'TPE avec réduction partenaire SoloCab',
    icon: ShoppingCart,
    description: 'Via notre lien partenaire SumUp, vous pouvez vous équiper d\'un terminal de paiement professionnel.',
    features: [
      { text: 'TPE à partir de 24€ seulement', icon: Gift },
      { text: 'Encaissez vos clients en CB', icon: CreditCard },
      { text: 'Envoyez des liens de paiement & acomptes', icon: Euro },
      { text: 'Bénéficiez d\'un compte professionnel', icon: Shield },
    ],
    highlight: true,
    highlightText: 'Réduction exclusive',
    availableNow: true,
  },
  {
    value: 'solocab_stripe' as const,
    title: 'Encaissement en ligne via SoloCab',
    subtitle: 'Paiement CB sécurisé via Stripe Connect',
    icon: Zap,
    description: 'Permettez à vos clients de payer par carte bancaire et automatisez la facturation de vos courses. Les fonds sont versés directement sur votre compte bancaire.',
    features: [
      { text: 'Paiement CB sécurisé', icon: Lock },
      { text: 'Factures automatiques', icon: Euro },
      { text: 'Virements directs sur votre compte', icon: Banknote },
      { text: 'Aucun abonnement supplémentaire', icon: Shield },
    ],
    fees: 'Frais SoloCab : 0,50€/transaction + frais Stripe (~1,5% + 0,25€)',
    highlight: false,
    availableNow: true,
    requiresSetup: true,
  },
];

export function OnboardingBillingStep({ data, onUpdate }: OnboardingBillingStepProps) {
  const [showAffiliateInfo, setShowAffiliateInfo] = useState(false);
  const [showStripeInfo, setShowStripeInfo] = useState(false);
  const [hasOrderedEquipment, setHasOrderedEquipment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasClickedLink, setHasClickedLink] = useState(false);
  const [showStripeGuide, setShowStripeGuide] = useState(false);

  const tpeImages = [sumupTpeDevice, sumupTpeCard];
  const selectedOption = BILLING_OPTIONS.find(o => o.value === data.billingType);

  // Mode : sélection initiale ou option déjà choisie
  const hasSelectedOption = data.billingType !== null;
  const [showAllOptions, setShowAllOptions] = useState(!hasSelectedOption);

  return (
    <div className="space-y-4">
      {/* Message d'introduction - seulement si on montre toutes les options */}
      {showAllOptions && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Comment souhaitez-vous être payé ?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Choisissez la solution qui vous convient le mieux. Vous pourrez toujours modifier ce choix plus tard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Options de facturation - Mode sélection */}
      {showAllOptions ? (
        <RadioGroup 
          value={data.billingType} 
          onValueChange={(value) => {
            onUpdate({ billingType: value as typeof data.billingType });
            setShowAllOptions(false); // Masquer les autres options après sélection
          }}
          className="space-y-3"
        >
          {BILLING_OPTIONS.map((option) => {
            const Icon = option.icon;
            
            return (
              <div key={option.value} className="relative">
                <RadioGroupItem
                  value={option.value}
                  id={`billing-${option.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`billing-${option.value}`}
                  className={cn(
                    "flex flex-col rounded-xl border-2 p-4 cursor-pointer transition-all",
                    "border-muted hover:border-muted-foreground/30 hover:bg-muted/30",
                    option.highlight && "border-amber-500/30 bg-amber-500/5"
                  )}
                >
                  {option.highlight && (
                    <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
                      <Gift className="w-3 h-3 mr-1" />
                      {option.highlightText}
                    </Badge>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 bg-muted shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm block">{option.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.subtitle}</p>
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      ) : (
        /* Mode option sélectionnée - Affichage compact avec bouton modifier */
        <div className="space-y-3">
          {/* Récapitulatif de la sélection */}
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-primary text-primary-foreground shrink-0">
                {selectedOption && <selectedOption.icon className="h-5 w-5" />}
              </div>
              <div>
                <span className="font-semibold text-sm">{selectedOption?.title}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">Sélectionné</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllOptions(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Modifier
            </Button>
          </div>

          {/* Indication de scroll */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
            <ArrowRight className="w-3 h-3 rotate-90" />
            <span>Voir les détails ci-dessous</span>
          </div>
        </div>
      )}

      {/* Détails supplémentaires selon le choix */}
      {data.billingType === 'buy_equipment' && (
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
              Offre partenaire SumUp
            </CardTitle>
            <CardDescription>
              Équipez-vous d'un terminal de paiement professionnel
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            
            {/* Image Carousel TPE - Design épuré */}
            <div className="relative bg-muted/30 rounded-xl overflow-hidden border border-border">
              <div className="relative aspect-[4/3] flex items-center justify-center p-8 bg-white dark:bg-slate-900">
                <img 
                  src={tpeImages[currentImageIndex]} 
                  alt={`SumUp Solo Lite ${currentImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
                {/* Navigation arrows */}
                <button
                  onClick={() => setCurrentImageIndex(prev => prev === 0 ? tpeImages.length - 1 : prev - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white shadow-md transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev === tpeImages.length - 1 ? 0 : prev + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-white shadow-md transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {tpeImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        idx === currentImageIndex 
                          ? "bg-amber-500" 
                          : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              </div>
              
              {/* Product info */}
              <div className="p-4 bg-muted/50 border-t border-border">
                <h3 className="font-bold text-base">Solo Lite</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Terminal de paiement Bluetooth qui se connecte à votre smartphone.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-500">24 €</span>
                  <span className="text-sm text-muted-foreground line-through">34 €</span>
                  <Badge className="bg-amber-500 text-white text-xs">
                    -41%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">TVA incluse • Livraison gratuite</p>
              </div>
            </div>
            
            {/* Avantages - Style simple */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Ce que vous pourrez faire :
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4 text-foreground shrink-0" />
                  <span>Encaisser par carte bancaire</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Euro className="w-4 h-4 text-foreground shrink-0" />
                  <span>Envoyer des liens de paiement</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-foreground shrink-0" />
                  <span>Compte professionnel gratuit</span>
                </li>
              </ul>
            </div>

            <Button
              variant="default"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
              onClick={() => {
                window.open(SUMUP_AFFILIATE_LINK, '_blank');
                setHasClickedLink(true);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Commander mon TPE SumUp
            </Button>

            {/* Bouton "J'ai commandé" qui apparaît après clic sur le lien */}
            {hasClickedLink && !hasOrderedEquipment && (
              <Button
                variant="outline"
                className="w-full border-green-500/50 text-green-600 hover:bg-green-500/10"
                onClick={() => setHasOrderedEquipment(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                J'ai commandé mon matériel
              </Button>
            )}

            {hasOrderedEquipment && (
              <Alert className="border-green-500/30 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-sm text-green-700">Commande confirmée ! 🎉</AlertTitle>
                <AlertDescription className="text-xs text-green-600 mt-1">
                  <p>Votre TPE sera livré sous quelques jours.</p>
                  <p className="mt-2 font-medium">
                    💡 Vos 14 jours d'essai ne démarrent qu'après validation de vos documents — vous aurez le temps de recevoir votre matériel !
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {!hasOrderedEquipment && (
              <Alert className="border-border bg-muted/50">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-xs text-muted-foreground">
                  <p>En attendant de recevoir votre matériel, vous pourrez encaisser en espèces ou par virement.</p>
                  <p className="font-medium text-foreground mt-1.5">
                    💡 Vos 14 jours d'essai ne démarrent qu'après validation de vos documents.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {data.billingType === 'solocab_stripe' && (
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Encaissement en ligne Stripe Connect
            </CardTitle>
            <CardDescription>
              Recevez les paiements CB directement sur votre compte bancaire
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4">
            
            {/* CTA Principal - Design épuré */}
            <div className="bg-muted/50 border border-border rounded-xl p-4">
              <div className="text-center mb-3">
                <h3 className="font-bold text-base">Créez votre compte Stripe</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configuration gratuite en 5 minutes
                </p>
              </div>
              
              <Button
                size="lg"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                onClick={() => setShowStripeGuide(true)}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Commencer la configuration
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <p className="text-center text-xs text-muted-foreground mt-2">
                Redirection sécurisée vers Stripe.com
              </p>
            </div>

            {/* Guide secondaire */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowStripeGuide(true)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Voir le guide détaillé
            </Button>

            {/* Info importante */}
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-xs text-green-700 font-semibold">Après votre inscription SoloCab</AlertTitle>
              <AlertDescription className="text-xs text-green-600 mt-1">
                Vous pourrez finaliser la connexion Stripe depuis votre tableau de bord → Paramètres → Encaissements
              </AlertDescription>
            </Alert>

            {/* Résumé rapide - Style simple */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                Comment ça marche ?
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-muted-foreground">Inscription Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-muted-foreground">Vérification ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <span className="text-muted-foreground">Ajout RIB</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                  <span className="text-muted-foreground">Encaissez !</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-foreground" />
                <span>Paiements sécurisés</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-foreground" />
                <span>Acomptes automatiques</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5 text-foreground" />
                <span>Virements J+2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-foreground" />
                <span>Empreinte bancaire</span>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                <strong className="text-foreground">SoloCab n'est pas une plateforme de réservation.</strong>
                <br />
                Vous encaissez vos clients. SoloCab fournit l'infrastructure et les outils.
                <br />
                <span className="text-primary font-medium">Les frais sont fixes, clairs et visibles.</span>
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              En attendant la configuration Stripe, vous pourrez encaisser vos clients par espèces, virement ou avec votre propre TPE.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Guide Stripe Connect Modal */}
      <StripeConnectSetupGuide
        open={showStripeGuide}
        onOpenChange={setShowStripeGuide}
        onStartSetup={() => {
          // Dans l'onboarding, on ferme juste le guide car ils n'ont pas encore de compte
          setShowStripeGuide(false);
        }}
      />

      {data.billingType === 'own_equipment' && (
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-xs font-medium">Parfait, vous êtes déjà équipé !</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Vous pourrez toujours activer l'encaissement en ligne plus tard si vous le souhaitez.
          </p>
        </div>
      )}
    </div>
  );
}
