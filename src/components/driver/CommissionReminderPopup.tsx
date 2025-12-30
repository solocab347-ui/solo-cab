import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell,
  AlertTriangle,
  Euro,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Loader2,
  X,
  Clock
} from "lucide-react";
import { CommissionReminder } from "@/hooks/useCommissionReminders";

interface CommissionReminderPopupProps {
  reminder: CommissionReminder | null;
  open: boolean;
  onClose: () => void;
  onMarkAsPaid: (reminderId: string, partnershipId: string, type: 'fleet' | 'partner') => Promise<void>;
  onDismiss: (reminderId: string) => void;
}

export function CommissionReminderPopup({
  reminder,
  open,
  onClose,
  onMarkAsPaid,
  onDismiss
}: CommissionReminderPopupProps) {
  const [confirmedPayment, setConfirmedPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!reminder) return null;

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'per_course': return 'À chaque course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return schedule;
    }
  };

  const handleMarkAsPaid = async () => {
    if (!confirmedPayment) {
      toast.error("Veuillez confirmer que vous avez effectué le versement");
      return;
    }

    setIsProcessing(true);
    try {
      await onMarkAsPaid(reminder.id, reminder.partnershipId, reminder.type);
      toast.success("Commission marquée comme versée");
      setConfirmedPayment(false);
      onClose();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    onDismiss(reminder.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {reminder.isOverdue ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Bell className="w-5 h-5 text-warning" />
            )}
            Rappel de Commission
          </DialogTitle>
          <DialogDescription>
            {reminder.isOverdue 
              ? `Commission en retard de ${reminder.daysSinceDue} jour(s)`
              : "Vous avez une commission à reverser"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alert for overdue */}
          {reminder.isOverdue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention !</strong> Cette commission est en retard. Le non-paiement 
                peut affecter votre partenariat.
              </AlertDescription>
            </Alert>
          )}

          {/* Partner info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              <AvatarImage src={reminder.partnerPhoto} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg">
                {reminder.partnerName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{reminder.partnerName}</p>
              <div className="flex items-center gap-2 mt-1">
                {reminder.type === 'fleet' ? (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    Gestionnaire
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Users className="w-3 h-3" />
                    Partenaire
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {reminder.commissionPercentage}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Commission details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                <span className="font-medium">Montant à verser</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {reminder.amount.toFixed(2)} €
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Échéance</p>
                  <p className={`font-medium ${reminder.isOverdue ? 'text-destructive' : ''}`}>
                    {format(new Date(reminder.dueDate), "dd MMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Fréquence</p>
                  <p className="font-medium">{getPaymentScheduleLabel(reminder.paymentSchedule)}</p>
                </div>
              </div>
            </div>

            {reminder.coursesCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Basé sur {reminder.coursesCount} course(s) reçue(s)
              </p>
            )}
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
            <Checkbox
              id="confirm-payment"
              checked={confirmedPayment}
              onCheckedChange={(checked) => setConfirmedPayment(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-payment" className="text-sm leading-relaxed cursor-pointer">
              Je confirme avoir effectué le versement de <strong>{reminder.amount.toFixed(2)} €</strong> à{" "}
              <strong>{reminder.partnerName}</strong>
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Rappeler plus tard
          </Button>
          <Button
            onClick={handleMarkAsPaid}
            disabled={!confirmedPayment || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Marquer comme versé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
