import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  HelpCircle,
  Loader2,
  RefreshCw,
  Users,
  Star,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import sumupTpeCard from '@/assets/sumup-tpe-card.jpg';
import sumupTpeDevice from '@/assets/sumup-tpe-device.jpg';
import { StripeConnectSetupGuide } from '@/components/driver/settings/StripeConnectSetupGuide';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingBillingStepProps {
  data: {
    billingType: 'own_equipment' | 'buy_equipment' | 'solocab_stripe' | null;
  };
  onUpdate: (updates: Partial<OnboardingBillingStepProps['data']>) => void;
}

const SUMUP_AFFILIATE_LINK = 'https://join.sumup.com/4oCL6MY3?share_id=t9y754T4ocl6my3';

const BILLING_OPTIONS = [
  {
    value: 'solocab_stripe' as const,
    title: 'Encaissement en ligne SoloCab',
    subtitle: 'La solution tout-en-un recommandée',
    icon: Zap,
    description: 'Permettez à vos clients de payer par carte bancaire et automatisez la facturation de vos courses. Les fonds sont versés directement sur votre compte bancaire.',
    features: [
      { text: 'Demandez des acomptes automatiquement', icon: Lock },
      { text: 'Factures & devis générés pour vous', icon: Euro },
      { text: 'Partage de courses entre chauffeurs (bientôt)', icon: Users },
      { text: 'Gestion simplifiée de votre clientèle', icon: Shield },
      { text: 'Virements directs J+2 sur votre compte', icon: Banknote },
    ],
    fees: 'Frais transparents : 0,50€/course + frais Stripe (~1,5% + 0,25€)',
    highlight: true,
    highlightText: 'Recommandé',
    availableNow: true,
    requiresSetup: true,
    whyRecommended: [
      'Plus besoin d\'envoyer des liens manuellement',
      'Protégez-vous des no-shows avec les acomptes',
      'Fiscalité simplifiée avec le détail des frais',
    ],
  },
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
    highlight: false,
    highlightText: 'Réduction exclusive',
    availableNow: true,
  },
];

export function OnboardingBillingStep({ data, onUpdate }: OnboardingBillingStepProps) {
  const [searchParams] = useSearchParams();
  const [showAffiliateInfo, setShowAffiliateInfo] = useState(false);
  const [showStripeInfo, setShowStripeInfo] = useState(false);
  const [hasOrderedEquipment, setHasOrderedEquipment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasClickedLink, setHasClickedLink] = useState(false);
  const [showStripeGuide, setShowStripeGuide] = useState(false);
  const [stripeOnboardingLoading, setStripeOnboardingLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(false);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<{
    connected: boolean;
    status: string;
    charges_enabled: boolean;
    details_submitted: boolean;
  } | null>(null);

  const tpeImages = [sumupTpeDevice, sumupTpeCard];
  const selectedOption = BILLING_OPTIONS.find(o => o.value === data.billingType);

  // Mode : sélection initiale ou option déjà choisie
  // IMPORTANT: Toujours afficher toutes les options si aucune n'est sélectionnée
  const hasSelectedOption = data.billingType !== null && data.billingType !== undefined;
  const [showAllOptions, setShowAllOptions] = useState(true); // Toujours montrer les options au chargement

  // Vérifier automatiquement le statut Stripe après retour du callback
  const checkStripeStatus = async () => {
    setStripeStatusLoading(true);
    try {
      const { data: statusData, error } = await supabase.functions.invoke('stripe-connect-status');
      
      if (error) throw error;
      
      setStripeConnectStatus(statusData);
      
      if (statusData?.connected) {
        if (statusData.details_submitted) {
          toast.success('✅ Votre compte Stripe Connect est configuré !', {
            description: statusData.charges_enabled 
              ? 'Vous pouvez maintenant recevoir des paiements.'
              : 'En attente de vérification par Stripe.',
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setStripeStatusLoading(false);
    }
  };

  // Auto-check Stripe status when component mounts with solocab_stripe selected
  useEffect(() => {
    if (data.billingType === 'solocab_stripe') {
      checkStripeStatus();
    }
  }, [data.billingType]);

  // Check if user just returned from Stripe Connect
  useEffect(() => {
    const stripeParam = searchParams.get('stripe_connect');
    if (stripeParam === 'success' && data.billingType === 'solocab_stripe') {
      // User just returned from Stripe - refresh status
      checkStripeStatus();
    }
  }, [searchParams, data.billingType]);

  // Fonction pour démarrer l'onboarding Stripe Connect
  const startStripeOnboarding = async () => {
    setStripeOnboardingLoading(true);
    try {
      const { data: onboardingData, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      
      if (error) throw error;
      
      if (onboardingData?.url) {
        window.open(onboardingData.url, '_blank');
        toast.info('Fenêtre Stripe ouverte. Complétez votre inscription puis revenez ici.');
      }
    } catch (error: any) {
      console.error('Error starting Stripe onboarding:', error);
      toast.error(error.message || 'Erreur lors du démarrage de l\'inscription Stripe');
    } finally {
      setStripeOnboardingLoading(false);
    }
  };

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
          {BILLING_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isRecommended = option.highlight;
            
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
                    isRecommended && "border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/70 ring-1 ring-primary/20"
                  )}
                >
                  {isRecommended && (
                    <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-2.5 py-0.5 shadow-md">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {option.highlightText}
                    </Badge>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "rounded-lg p-2 shrink-0",
                      isRecommended ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm block">{option.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{option.subtitle}</p>
                    </div>
                  </div>

                  {/* Avantages détaillés pour l'option recommandée */}
                  {isRecommended && option.whyRecommended && (
                    <div className="mt-3 pt-3 border-t border-primary/10">
                      <p className="text-[10px] font-medium text-primary mb-1.5 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Pourquoi choisir cette option ?
                      </p>
                      <ul className="space-y-1">
                        {option.whyRecommended.map((reason, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
            
            {/* Statut du compte Stripe Connect */}
            {stripeConnectStatus?.connected ? (
              <Alert className={cn(
                "border",
                stripeConnectStatus.details_submitted 
                  ? stripeConnectStatus.charges_enabled 
                    ? "border-green-500/30 bg-green-500/10" 
                    : "border-amber-500/30 bg-amber-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              )}>
                {stripeConnectStatus.details_submitted && stripeConnectStatus.charges_enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
                <AlertTitle className={cn(
                  "text-sm font-semibold",
                  stripeConnectStatus.details_submitted && stripeConnectStatus.charges_enabled
                    ? "text-green-700"
                    : "text-amber-700"
                )}>
                  {stripeConnectStatus.details_submitted && stripeConnectStatus.charges_enabled
                    ? "✅ Compte Stripe Connect actif"
                    : stripeConnectStatus.details_submitted
                    ? "⏳ Vérification en cours par Stripe"
                    : "⚠️ Configuration incomplète"}
                </AlertTitle>
                <AlertDescription className={cn(
                  "text-xs mt-1",
                  stripeConnectStatus.details_submitted && stripeConnectStatus.charges_enabled
                    ? "text-green-600"
                    : "text-amber-600"
                )}>
                  {stripeConnectStatus.details_submitted && stripeConnectStatus.charges_enabled
                    ? "Vous pouvez recevoir des paiements par carte bancaire !"
                    : stripeConnectStatus.details_submitted
                    ? "Stripe vérifie vos informations. Cela peut prendre quelques minutes à 24h."
                    : "Complétez votre inscription Stripe pour activer les paiements."}
                </AlertDescription>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkStripeStatus}
                    disabled={stripeStatusLoading}
                    className="text-xs"
                  >
                    {stripeStatusLoading ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Actualiser le statut
                  </Button>
                  {!stripeConnectStatus.details_submitted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startStripeOnboarding}
                      disabled={stripeOnboardingLoading}
                      className="text-xs"
                    >
                      Reprendre la configuration
                    </Button>
                  )}
                </div>
              </Alert>
            ) : (
              /* CTA Principal - Design épuré - seulement si pas encore connecté */
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
                  onClick={startStripeOnboarding}
                  disabled={stripeOnboardingLoading}
                >
                  {stripeOnboardingLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5 mr-2" />
                  )}
                  {stripeOnboardingLoading ? 'Chargement...' : 'Commencer la configuration'}
                  {!stripeOnboardingLoading && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
                
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Redirection sécurisée vers Stripe.com
                </p>
              </div>
            )}
            {/* Guide secondaire */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowStripeGuide(true)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Voir le guide détaillé
            </Button>

            {/* Info importante - Essai 14 jours */}
            <Alert className="border-primary/30 bg-primary/5">
              <Clock className="h-4 w-4 text-primary" />
              <AlertTitle className="text-xs text-foreground font-semibold">🎁 Vos 14 jours d'essai gratuit</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1 space-y-1.5">
                <p>
                  <strong className="text-foreground">Vous ne perdez aucun jour !</strong> Votre essai ne démarrera que lorsque :
                </p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Vos documents seront validés par notre équipe</li>
                  <li>Vous appuierez sur le bouton "Lancer mon indépendance"</li>
                </ul>
                <p className="text-foreground font-medium pt-1">
                  → À la fin des 14 jours, vous pourrez souscrire à l'abonnement (29,99€/mois) pour continuer.
                </p>
              </AlertDescription>
            </Alert>

            {/* Info après inscription */}
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
