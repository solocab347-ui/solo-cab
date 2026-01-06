import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock,
  Building2,
  Banknote
} from "lucide-react";

interface CompanyPaymentStatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  companyName?: string;
}

export function CompanyPaymentStatusSelector({
  value,
  onChange,
  companyName
}: CompanyPaymentStatusSelectorProps) {
  return (
    <div className="space-y-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-sm">Course entreprise{companyName ? ` - ${companyName}` : ''}</span>
      </div>
      
      <Label className="text-sm text-muted-foreground">
        Statut du paiement à la fin de la course :
      </Label>
      
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="received" id="payment_received" className="mt-0.5" />
          <Label htmlFor="payment_received" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium">Paiement reçu sur place</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Le collaborateur a payé directement (espèces, CB, etc.)
            </p>
          </Label>
        </div>
        
        <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="pending" id="payment_pending" className="mt-0.5" />
          <Label htmlFor="payment_pending" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-medium">Paiement en attente</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              L'entreprise effectuera le paiement plus tard
            </p>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
