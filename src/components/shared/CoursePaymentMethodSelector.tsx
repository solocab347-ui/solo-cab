import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Building2, Wallet, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "not_specified", label: "Non précisé", icon: HelpCircle, description: "Je déciderai plus tard", color: "bg-muted text-muted-foreground" },
  { value: "cash", label: "Espèces", icon: Banknote, description: "Paiement en liquide", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  { value: "card", label: "Carte", icon: CreditCard, description: "CB, Visa, Mastercard", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "transfer", label: "Virement", icon: Building2, description: "Virement bancaire", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "other", label: "Autre", icon: Wallet, description: "Chèque, autre moyen", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
];

interface CoursePaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const CoursePaymentMethodSelector = ({
  value,
  onChange,
  label = "Moyen de paiement préféré",
  className = "",
}: CoursePaymentMethodSelectorProps) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-base font-medium flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        {label}
      </Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5"
      >
        {PAYMENT_METHODS.map((method) => {
          const IconComponent = method.icon;
          return (
            <div key={method.value}>
              <RadioGroupItem
                value={method.value}
                id={`payment-${method.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`payment-${method.value}`}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
              >
                <IconComponent className="mb-1 h-5 w-5" />
                <span className="text-xs font-medium text-center">{method.label}</span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        Indiquez le moyen de paiement prévu pour informer votre chauffeur
      </p>
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
  if (!paymentMethod || paymentMethod === "not_specified") {
    return null;
  }

  const method = PAYMENT_METHODS.find((m) => m.value === paymentMethod);
  if (!method) return null;

  const IconComponent = method.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-medium border",
        method.color,
        textSize,
        className
      )}
    >
      <IconComponent className={iconSize} />
      {method.label}
    </Badge>
  );
};
