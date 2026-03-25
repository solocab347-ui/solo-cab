import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import {
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  Receipt,
  Check,
} from "lucide-react";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces", icon: Banknote, description: "Paiement en liquide" },
  { value: "card", label: "Carte bancaire", icon: CreditCard, description: "CB, Visa, Mastercard" },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  value,
  onChange,
  label = "Moyen de paiement",
  compact = false,
  disabled = false,
}: PaymentMethodSelectorProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <RadioGroup
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="grid grid-cols-3 gap-2"
        >
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.value}>
                <RadioGroupItem
                  value={method.value}
                  id={`payment-${method.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`payment-${method.value}`}
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{method.label}</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="grid gap-2"
      >
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          return (
            <Card
              key={method.value}
              className={`p-3 cursor-pointer transition-all ${
                value === method.value
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => !disabled && onChange(method.value)}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={method.value} id={`payment-full-${method.value}`} />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
}

export function getPaymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find(m => m.value === value)?.label || value;
}

export function getPaymentMethodIcon(value: string) {
  return PAYMENT_METHODS.find(m => m.value === value)?.icon || CreditCard;
}