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
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingBillingStepProps {
  data: {
    billingType: 'own_equipment' | 'buy_equipment' | 'solocab_stripe';
  };
  onUpdate: (updates: Partial<OnboardingBillingStepProps['data']>) => void;
}

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
    description: 'SoloCab vous propose un partenariat avec des fournisseurs de TPE pour vous équiper à tarif préférentiel.',
    features: [
      { text: 'Réduction exclusive sur les TPE partenaires', icon: Gift },
      { text: 'Matériel professionnel de qualité', icon: CheckCircle2 },
      { text: 'Support et conseil pour votre choix', icon: Info },
    ],
    highlight: true,
    highlightText: 'Réduction exclusive',
    availableNow: true,
  },
  {
    value: 'solocab_stripe' as const,
    title: 'Encaisser en ligne via SoloCab',
    subtitle: 'Paiement CB en ligne via Stripe Connect',
    icon: Zap,
    description: 'Vos clients peuvent payer par carte en ligne. Les fonds sont versés directement sur votre compte bancaire.',
    features: [
      { text: 'Paiement sécurisé en ligne', icon: Lock },
      { text: 'Demande d\'acomptes automatisée', icon: Clock },
      { text: 'Virements directs sur votre compte', icon: Euro },
    ],
    fees: '0,50€/course + frais Stripe (~1,5% + 0,25€)',
    highlight: false,
    availableNow: true,
    requiresSetup: true,
  },
];

export function OnboardingBillingStep({ data, onUpdate }: OnboardingBillingStepProps) {
  const [showAffiliateInfo, setShowAffiliateInfo] = useState(false);
  const [showStripeInfo, setShowStripeInfo] = useState(false);

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
              Offre partenaire TPE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              Grâce à notre partenariat, vous pouvez acquérir un terminal de paiement professionnel à prix réduit.
            </p>
            
            <div className="bg-white/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium">Réduction exclusive SoloCab</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Le lien vers notre partenaire TPE vous sera envoyé par email après la création de votre compte.
              </p>
            </div>

            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-3.5 w-3.5 text-primary" />
              <AlertDescription className="text-[11px] text-muted-foreground">
                En attendant de recevoir votre matériel, vous pourrez encaisser en espèces ou par virement. Vous pourrez également activer l'encaissement en ligne plus tard.
              </AlertDescription>
            </Alert>
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
