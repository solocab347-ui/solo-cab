import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Receipt, AlertCircle } from "lucide-react";
import { PaymentMethodSelector } from "@/components/shared/PaymentMethodSelector";

interface EmployeePaymentSelectorProps {
  paymentHandledBy: "company" | "employee";
  onPaymentHandledByChange: (value: "company" | "employee") => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  companyName?: string;
}

export function EmployeePaymentSelector({
  paymentHandledBy,
  onPaymentHandledByChange,
  paymentMethod,
  onPaymentMethodChange,
  companyName = "l'entreprise",
}: EmployeePaymentSelectorProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Qui règle cette course ?</Label>
      
      <RadioGroup
        value={paymentHandledBy}
        onValueChange={(value) => onPaymentHandledByChange(value as "company" | "employee")}
        className="grid gap-3"
      >
        {/* Option: Entreprise paie */}
        <Card
          className={`cursor-pointer transition-all ${
            paymentHandledBy === "company"
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
          onClick={() => onPaymentHandledByChange("company")}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="company" id="payment-company" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">Facturation entreprise</span>
                  <Badge variant="secondary" className="text-xs">Recommandé</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  La course sera facturée à {companyName}. Le paiement sera regroupé avec les autres courses de l'entreprise.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Option: Collaborateur paie */}
        <Card
          className={`cursor-pointer transition-all ${
            paymentHandledBy === "employee"
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
          onClick={() => onPaymentHandledByChange("employee")}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="employee" id="payment-employee" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <span className="font-medium">Paiement direct</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous réglez directement le chauffeur. Une note de frais sera automatiquement créée pour remboursement.
                </p>
              </div>
            </div>

            {paymentHandledBy === "employee" && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Receipt className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Note de frais automatique</p>
                    <p className="text-xs mt-1">
                      Une note de frais sera créée et transmise à {companyName} pour remboursement.
                    </p>
                  </div>
                </div>

                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={onPaymentMethodChange}
                  label="Comment allez-vous payer ?"
                  compact
                />
              </div>
            )}
          </CardContent>
        </Card>
      </RadioGroup>

      {paymentHandledBy === "company" && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Le chauffeur sera informé que le paiement sera effectué par {companyName} selon les conditions convenues.
          </p>
        </div>
      )}
    </div>
  );
}