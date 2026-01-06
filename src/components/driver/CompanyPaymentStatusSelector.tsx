import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, 
  Clock,
  Building2,
  AlertTriangle
} from "lucide-react";

interface CompanyPaymentStatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  companyName?: string;
  hasInvitation?: boolean;
}

export function CompanyPaymentStatusSelector({
  value,
  onChange,
  companyName,
  hasInvitation = false
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

      {/* Avertissement quand paiement en attente est sélectionné */}
      {value === "pending" && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 text-sm">Double vérification activée</AlertTitle>
          <AlertDescription className="text-xs text-amber-600/90">
            {hasInvitation ? (
              <>
                <strong>Important :</strong> Informez le collaborateur qu'il devra confirmer sur son lien de suivi 
                qu'il n'a pas payé sur place. Cette double vérification protège contre les erreurs de facturation.
              </>
            ) : (
              <>
                <strong>Important :</strong> En sélectionnant cette option, vous indiquez que le paiement 
                sera géré par l'entreprise. L'entreprise pourra vérifier cette information avant de procéder au règlement.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
