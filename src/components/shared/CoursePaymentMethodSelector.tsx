import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Banknote, 
  HelpCircle, 
  Shield, 
  Info,
  CheckCircle
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CardHoldForm } from './CardHoldForm';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces", icon: Banknote, description: "Paiement en liquide", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  { value: "card", label: "Carte", icon: CreditCard, description: "CB, Visa, Mastercard", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
];

interface CoursePaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  driverId?: string;
  courseId?: string;
  clientEmail?: string;
  clientName?: string;
  onCardHoldSuccess?: () => void;
  label?: string;
  className?: string;
}

export const CoursePaymentMethodSelector = ({
  value,
  onChange,
  driverId,
  courseId,
  clientEmail,
  clientName,
  onCardHoldSuccess,
  label = "Moyen de paiement",
  className = "",
}: CoursePaymentMethodSelectorProps) => {
  const [driverHasStripe, setDriverHasStripe] = useState<boolean | null>(null);
  const [cardHoldDone, setCardHoldDone] = useState(false);

  useEffect(() => {
    const checkDriver = async () => {
      if (!driverId) return;
      const { data } = await supabase
        .from('drivers')
        .select('billing_type, stripe_connect_charges_enabled, stripe_connect_account_id')
        .eq('id', driverId)
        .single();
      
      setDriverHasStripe(
        !!data?.stripe_connect_account_id && 
        data?.stripe_connect_charges_enabled === true
      );
    };
    checkDriver();
  }, [driverId]);

  const showCardHold = value === 'card' && driverHasStripe && courseId && !cardHoldDone;

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-base font-medium flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        {label}
      </Label>

      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-3 gap-2"
      >
        {PAYMENT_METHODS.map((method) => {
          const IconComponent = method.icon;
          const isCard = method.value === 'card';
          return (
            <div key={method.value}>
              <RadioGroupItem
                value={method.value}
                id={`payment-${method.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`payment-${method.value}`}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all relative"
              >
                <IconComponent className="mb-1 h-5 w-5" />
                <span className="text-xs font-medium text-center">{method.label}</span>
                {isCard && driverHasStripe && (
                  <Badge variant="outline" className="absolute -top-2 -right-2 text-[8px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                    <Shield className="w-2.5 h-2.5 mr-0.5" />
                    Sécurisé
                  </Badge>
                )}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {value === 'card' && driverHasStripe && (
        <>
          {!courseId ? (
            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                <strong>Paiement par carte sécurisé.</strong> Après création de la course, 
                une empreinte bancaire sera requise pour confirmer la réservation. 
                Consultez notre{' '}
                <a href="/politique-annulation" target="_blank" className="underline text-primary hover:text-primary/80">
                  politique d'annulation
                </a>.
              </AlertDescription>
            </Alert>
          ) : cardHoldDone ? (
            <Alert className="bg-emerald-500/5 border-emerald-500/20">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-xs">
                Empreinte bancaire validée. Votre réservation est sécurisée.
              </AlertDescription>
            </Alert>
          ) : (
            <CardHoldForm
              driverId={driverId!}
              courseId={courseId}
              clientEmail={clientEmail}
              clientName={clientName}
              onSuccess={() => {
                setCardHoldDone(true);
                onCardHoldSuccess?.();
              }}
              onSkip={() => setCardHoldDone(true)}
            />
          )}
        </>
      )}

      {value === 'card' && driverHasStripe === false && (
        <Alert className="bg-muted/30 border-border">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Ce chauffeur accepte le paiement par carte via son propre terminal (TPE). 
            Aucune avance en ligne n'est requise.
          </AlertDescription>
        </Alert>
      )}

      {value && value !== 'card' && value !== 'not_specified' && (
        <p className="text-xs text-muted-foreground">
          Le règlement s'effectuera directement avec votre chauffeur en fin de course.
        </p>
      )}
    </div>
  );
};

export const getPaymentMethodLabel = (value: string): string => {
  const method = PAYMENT_METHODS.find((m) => m.value === value);
  return method?.label || "Non précisé";
};

export const getPaymentMethodIcon = (value: string) => {
  const method = PAYMENT_METHODS.find((m) => m.value === value);
  return method?.icon || HelpCircle;
};

interface PaymentMethodBadgeProps {
  paymentMethod: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

export const PaymentMethodBadge = ({ paymentMethod, size = "sm", className }: PaymentMethodBadgeProps) => {
  if (!paymentMethod || paymentMethod === "not_specified") return null;

  const method = PAYMENT_METHODS.find((m) => m.value === paymentMethod);
  if (!method) return null;

  const IconComponent = method.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1 font-medium border", method.color, textSize, className)}
    >
      <IconComponent className={iconSize} />
      {method.label}
    </Badge>
  );
};
