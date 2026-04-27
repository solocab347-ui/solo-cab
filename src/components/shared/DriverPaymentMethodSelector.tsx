import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Banknote, HelpCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDriverPaymentMethods, DriverPaymentConfig } from "@/hooks/useDriverPaymentMethods";

const PAYMENT_METHOD_INFO: Record<string, { label: string; icon: any; description: string; color: string }> = {
  cash: { 
    label: "Espèces", 
    icon: Banknote, 
    description: "Paiement en liquide", 
    color: "bg-green-500/10 text-green-600 border-green-500/30" 
  },
  card: { 
    label: "Carte bancaire", 
    icon: CreditCard, 
    description: "CB, Visa, Mastercard", 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30" 
  },
};

interface DriverPaymentMethodSelectorProps {
  driverId: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showNotSpecified?: boolean;
  /** Méthodes à masquer/interdire (ex: ['cash'] pour les courses partagées) */
  excludeMethods?: string[];
  /** Texte d'avertissement affiché sous le sélecteur quand une méthode est exclue */
  excludeReason?: string;
  className?: string;
}

/**
 * Payment method selector that automatically adapts to driver's configured payment methods
 */
export function DriverPaymentMethodSelector({
  driverId,
  value,
  onChange,
  label = "Moyen de paiement",
  showNotSpecified: _showNotSpecified = false,
  excludeMethods = [],
  excludeReason,
  className = ""
}: DriverPaymentMethodSelectorProps) {
  const { config, loading, isStripeEnabled } = useDriverPaymentMethods(driverId);

  // Build available methods from driver config (et retire les exclusions)
  const availableMethods = [...config.acceptedMethods].filter((m) => !excludeMethods.includes(m));

  // Set default value if current value is not available (or exclu)
  useEffect(() => {
    if (loading) return;
    if (value && (!availableMethods.includes(value) || excludeMethods.includes(value))) {
      const fallback = availableMethods.includes(config.defaultMethod || '')
        ? (config.defaultMethod as string)
        : (availableMethods[0] || '');
      onChange(fallback);
    }
  }, [loading, value, availableMethods, config.defaultMethod, onChange, excludeMethods]);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-base font-medium flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        {label}
        {isStripeEnabled && (
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            <Zap className="h-3 w-3 mr-1" />
            Paiement en ligne
          </Badge>
        )}
      </Label>
      
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {availableMethods.map((method) => {
          const info = PAYMENT_METHOD_INFO[method];
          if (!info) return null;
          
          const IconComponent = info.icon;
          const isOnlinePayment = isStripeEnabled && method === 'card';
          
          return (
            <div key={method}>
              <RadioGroupItem
                value={method}
                id={`payment-${method}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`payment-${method}`}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all min-h-[70px]",
                  "hover:bg-accent hover:text-accent-foreground",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                )}
              >
                <div className="relative">
                  <IconComponent className="mb-1 h-5 w-5" />
                  {isOnlinePayment && (
                    <Zap className="absolute -top-1 -right-2 h-3 w-3 text-primary" />
                  )}
                </div>
                <span className="text-xs font-medium text-center">{info.label}</span>
                {isOnlinePayment && (
                  <span className="text-[10px] text-primary mt-0.5">En ligne</span>
                )}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
      
      <p className="text-xs text-muted-foreground">
        {isStripeEnabled 
          ? "Les paiements CB seront traités en ligne via Stripe"
          : "Indiquez le moyen de paiement prévu pour cette course"
        }
      </p>

      {excludeReason && excludeMethods.length > 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded p-2">
          ⚠️ {excludeReason}
        </p>
      )}
    </div>
  );
}

/**
 * Display badge for payment method
 */
export function DriverPaymentMethodBadge({ 
  paymentMethod, 
  isOnline = false,
  size = "sm",
  className 
}: { 
  paymentMethod: string | null | undefined;
  isOnline?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!paymentMethod || paymentMethod === "not_specified") {
    return null;
  }

  const info = PAYMENT_METHOD_INFO[paymentMethod];
  if (!info) return null;

  const IconComponent = info.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-medium border",
        info.color,
        textSize,
        className
      )}
    >
      <IconComponent className={iconSize} />
      {info.label}
      {isOnline && <Zap className="h-3 w-3 ml-1 text-primary" />}
    </Badge>
  );
}

export default DriverPaymentMethodSelector;
