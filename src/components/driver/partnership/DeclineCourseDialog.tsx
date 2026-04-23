import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';

interface DeclineCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  senderName: string;
}

const DECLINE_REASONS = [
  { id: 'unavailable', label: 'Je ne suis pas disponible à cette date/heure' },
  { id: 'too_far', label: 'La destination est trop éloignée' },
  { id: 'price_too_low', label: 'Le prix proposé est trop bas' },
  { id: 'commission_too_high', label: 'Les frais de transaction est trop élevée' },
  { id: 'client_issue', label: 'Problème avec le client' },
  { id: 'vehicle_issue', label: 'Problème avec mon véhicule' },
  { id: 'other', label: 'Autre raison' },
];

export function DeclineCourseDialog({
  open,
  onOpenChange,
  onConfirm,
  senderName,
}: DeclineCourseDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const reason = selectedReason === 'other' 
      ? customReason 
      : DECLINE_REASONS.find(r => r.id === selectedReason)?.label || '';
    
    if (!reason.trim()) return;

    setLoading(true);
    try {
      await onConfirm(reason);
      onOpenChange(false);
      setSelectedReason('');
      setCustomReason('');
    } finally {
      setLoading(false);
    }
  };

  const isValid = selectedReason && (selectedReason !== 'other' || customReason.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            Refuser la course
          </DialogTitle>
          <DialogDescription>
            Indiquez à {senderName} la raison de votre refus pour cette course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {DECLINE_REASONS.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={reason.id} id={reason.id} />
                <Label htmlFor={reason.id} className="flex-1 cursor-pointer text-sm">
                  {reason.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Précisez votre raison</Label>
              <Textarea
                id="custom-reason"
                placeholder="Expliquez la raison de votre refus..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {customReason.length}/500 caractères
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!isValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              'Confirmer le refus'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
