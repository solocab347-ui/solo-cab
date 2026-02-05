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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import sumupTpeCard from '@/assets/sumup-tpe-card.jpg';
import sumupTpeDevice from '@/assets/sumup-tpe-device.jpg';

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

  const tpeImages = [sumupTpeDevice, sumupTpeCard];
  const selectedOption = BILLING_OPTIONS.find(o => o.value === data.billingType);

  return (
    <div className="space-y-4">
      {/* Message d'introduction */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Comment souhaitez-vous être payé ?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Choisissez la solution qui vous convient le mieux. Vous pourrez toujours modifier ce choix plus tard dans vos paramètres.
            </p>
          </div>
        </div>
      </div>

      {/* Options de facturation */}
      <RadioGroup 
        value={data.billingType} 
        onValueChange={(value) => onUpdate({ billingType: value as typeof data.billingType })}
        className="space-y-3"
      >
        {BILLING_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = data.billingType === option.value;
          
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
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : "border-muted hover:border-muted-foreground/30 hover:bg-muted/30",
                  option.highlight && !isSelected && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {option.highlight && (
                  <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]">
                    <Gift className="w-3 h-3 mr-1" />
                    {option.highlightText}
                  </Badge>
                )}
                
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "rounded-lg p-2 shrink-0",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{option.title}</span>
                      {isSelected && (
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          Sélectionné
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.subtitle}</p>
                    
                    {isSelected && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {option.description}
                        </p>
                        
                        <div className="space-y-1.5 mt-2">
                          {option.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <feature.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{feature.text}</span>
                            </div>
                          ))}
                        </div>

                        {option.fees && (
                          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Euro className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-amber-700">Frais applicables</p>
                                <p className="text-[11px] text-amber-600">{option.fees}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* Détails supplémentaires selon le choix */}
      {data.billingType === 'buy_equipment' && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              Offre partenaire SumUp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              Via notre lien partenaire SumUp, équipez-vous d'un terminal de paiement professionnel pour encaisser vos clients par carte bancaire.
            </p>
            
            {/* Image Carousel TPE */}
            <div className="relative bg-white rounded-xl overflow-hidden">
              <div className="relative aspect-square max-h-48 flex items-center justify-center p-4">
                <img 
                  src={tpeImages[currentImageIndex]} 
                  alt={`SumUp Solo Lite ${currentImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
                {/* Navigation arrows */}
                <button
                  onClick={() => setCurrentImageIndex(prev => prev === 0 ? tpeImages.length - 1 : prev - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => prev === tpeImages.length - 1 ? 0 : prev + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Dots indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {tpeImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        idx === currentImageIndex ? "bg-amber-500" : "bg-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>
              
              {/* Product info */}
              <div className="p-3 bg-gray-50 dark:bg-background/50">
                <h3 className="font-bold text-base">Solo Lite</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Un terminal de paiement simple et durable qui se connecte à votre smartphone via Bluetooth pour accepter les paiements où que vous soyez.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold">20 €</span>
                  <span className="text-sm text-muted-foreground line-through">34 €</span>
                  <Badge className="bg-purple-600 text-white text-[10px]">41% de réduction</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">24 € TVA incluse</p>
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-background/50 rounded-lg p-3 space-y-3">
              <Separator className="my-2" />
              
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium">Ce que vous pourrez faire avec SumUp :</p>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3 text-primary" />
                    Encaisser vos clients par carte bancaire
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Euro className="w-3 h-3 text-primary" />
                    Envoyer des liens de paiement (acomptes, pré-paiements)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-primary" />
                    Bénéficier d'un compte professionnel gratuit
                  </li>
                </ul>
              </div>
            </div>

            <Button
              variant="default"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
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
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <AlertTitle className="text-xs text-green-700">Commande confirmée !</AlertTitle>
                <AlertDescription className="text-[11px] text-green-600 mt-1">
                  Parfait ! En attendant de recevoir votre TPE, vous pourrez encaisser en espèces ou par virement. Passez à l'étape suivante.
                </AlertDescription>
              </Alert>
            )}

            {!hasOrderedEquipment && (
              <Alert className="border-primary/30 bg-primary/5">
                <Info className="h-3.5 w-3.5 text-primary" />
                <AlertDescription className="text-[11px] text-muted-foreground">
                  En attendant de recevoir votre matériel, vous pourrez encaisser en espèces ou par virement. Vous pourrez également activer l'encaissement en ligne plus tard.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {data.billingType === 'solocab_stripe' && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Encaissement en ligne Stripe Connect
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <AlertTitle className="text-xs text-amber-700">Configuration requise après l'inscription</AlertTitle>
              <AlertDescription className="text-[11px] text-amber-600 mt-1">
                Pour encaisser en ligne, vous devrez créer un compte Stripe Express gratuit. Ce processus prend environ 5 minutes et nécessite une pièce d'identité.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold">Comment ça marche ?</h4>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                  <div className="text-xs">
                    <p className="font-medium">Terminez votre inscription SoloCab</p>
                    <p className="text-muted-foreground text-[11px]">Complétez d'abord les étapes de création de compte</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                  <div className="text-xs">
                    <p className="font-medium">Activez Stripe Connect</p>
                    <p className="text-muted-foreground text-[11px]">Dans Paramètres → Paiements, cliquez sur "Connecter Stripe"</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                  <div className="text-xs">
                    <p className="font-medium">Complétez la vérification Stripe</p>
                    <p className="text-muted-foreground text-[11px]">Identité + RIB (inscription gratuite, ~5 min)</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
                  <div className="text-xs">
                    <p className="font-medium">C'est prêt !</p>
                    <p className="text-muted-foreground text-[11px]">Vos clients peuvent payer en ligne, les fonds arrivent sur votre compte bancaire</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>Paiements sécurisés</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Acomptes automatiques</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5 text-primary" />
                <span>Virements J+2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Empreinte bancaire</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                <strong>SoloCab n'est pas une plateforme de réservation.</strong>
                <br />
                Vous encaissez vos clients. SoloCab fournit l'infrastructure et les outils.
                <br />
                <span className="text-primary font-medium">Les frais sont fixes, clairs et visibles.</span>
              </p>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              En attendant la configuration Stripe, vous pourrez encaisser vos clients par espèces, virement ou avec votre propre TPE.
            </p>
          </CardContent>
        </Card>
      )}

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
