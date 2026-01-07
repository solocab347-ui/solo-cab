import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  XCircle, 
  Loader2, 
  Ban, 
  AlertTriangle,
  Clock,
  CreditCard,
  MapPin,
  Car,
  MessageSquare
} from 'lucide-react';

// Motifs prédéfinis pour le refus par un chauffeur
const DRIVER_REJECTION_REASONS = [
  { value: 'payment_terms', label: 'Conditions de paiement non adaptées', icon: CreditCard },
  { value: 'zone_mismatch', label: 'Zone géographique incompatible', icon: MapPin },
  { value: 'schedule_conflict', label: 'Indisponibilité horaire', icon: Clock },
  { value: 'vehicle_mismatch', label: 'Type de véhicule non correspondant', icon: Car },
  { value: 'other', label: 'Autre motif (préciser)', icon: MessageSquare },
];

// Motifs prédéfinis pour le refus par une entreprise
const COMPANY_REJECTION_REASONS = [
  { value: 'pricing', label: 'Tarifs non compatibles', icon: CreditCard },
  { value: 'vehicle_type', label: 'Type de véhicule non adapté', icon: Car },
  { value: 'zone_mismatch', label: 'Zone géographique non couverte', icon: MapPin },
  { value: 'availability', label: 'Disponibilité insuffisante', icon: Clock },
  { value: 'other', label: 'Autre motif (préciser)', icon: MessageSquare },
];

interface PartnershipRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  partnerType: 'company' | 'driver'; // Type du partenaire qu'on refuse (pas du refusant)
  onReject: (reason: string, blockPartner: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function PartnershipRejectDialog({
  open,
  onOpenChange,
  partnerName,
  partnerType,
  onReject,
  isLoading = false,
}: PartnershipRejectDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [blockPartner, setBlockPartner] = useState(false);

  // Les motifs dépendent de qui refuse
  const reasons = partnerType === 'company' ? DRIVER_REJECTION_REASONS : COMPANY_REJECTION_REASONS;

  const handleSubmit = async () => {
    let finalReason = selectedReason;
    
    if (selectedReason === 'other') {
      if (!customReason.trim()) {
        return; // Don't submit if other is selected but no custom reason
      }
      finalReason = customReason.trim();
    } else {
      const reasonLabel = reasons.find(r => r.value === selectedReason)?.label;
      finalReason = reasonLabel || selectedReason;
    }

    await onReject(finalReason, blockPartner);
    
    // Reset form
    setSelectedReason('');
    setCustomReason('');
    setBlockPartner(false);
  };

  const isValid = selectedReason && (selectedReason !== 'other' || customReason.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Refuser le partenariat
          </DialogTitle>
          <DialogDescription>
            Refuser la proposition de {partnerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Rejection reasons */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Motif du refus</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <div
                    key={reason.value}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedReason === reason.value 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                    onClick={() => setSelectedReason(reason.value)}
                  >
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Label htmlFor={reason.value} className="cursor-pointer flex-1 text-sm">
                      {reason.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Custom reason textarea */}
          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Précisez votre motif</Label>
              <Textarea
                id="custom-reason"
                placeholder="Expliquez brièvement la raison de votre refus..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Block option */}
          <div className="space-y-3 pt-2 border-t">
            <div
              className={`
                flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all
                ${blockPartner 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : 'border-border hover:border-destructive/30'
                }
              `}
              onClick={() => setBlockPartner(!blockPartner)}
            >
              <Checkbox 
                id="block-partner" 
                checked={blockPartner}
                onCheckedChange={(checked) => setBlockPartner(checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="block-partner" className="cursor-pointer flex items-center gap-2 font-medium">
                  <Ban className="h-4 w-4 text-destructive" />
                  Ne plus voir {partnerType === 'company' ? 'cette entreprise' : 'ce chauffeur'}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {partnerType === 'company' 
                    ? "L'entreprise n'apparaîtra plus dans vos recherches et ne pourra plus voir votre profil."
                    : "Le chauffeur n'apparaîtra plus dans vos recherches et ne pourra plus voir votre profil."
                  }
                </p>
              </div>
            </div>

            {blockPartner && (
              <Alert className="bg-muted border-muted-foreground/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Vous pourrez débloquer ce profil à tout moment depuis l'onglet "Bloqués".
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
