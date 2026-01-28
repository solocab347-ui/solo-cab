import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, User, Loader2, Trash2, Calendar, Mail, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, addMonths, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";

interface Driver {
  id: string;
  user_id: string;
  subscription_status: string | null;
  subscription_stripe_id: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  onDeleted: () => void;
}

const DELETION_TYPES = [
  { value: 'immediate', label: 'Immédiate', description: 'Le compte est supprimé maintenant' },
  { value: '3_days', label: 'Dans 3 jours', description: 'L\'utilisateur a 3 jours pour contester' },
  { value: '1_week', label: 'Dans 1 semaine', description: 'L\'utilisateur a 1 semaine pour contester' },
  { value: '1_month', label: 'Dans 1 mois', description: 'L\'utilisateur a 1 mois pour contester' },
];

const REASON_TYPES = [
  { value: 'inactivity', label: 'Inactivité prolongée', icon: '💤' },
  { value: 'violation', label: 'Violation des CGU', icon: '⚠️' },
  { value: 'fraud', label: 'Fraude / Activité suspecte', icon: '🚨' },
  { value: 'request', label: 'Demande de l\'utilisateur', icon: '📝' },
  { value: 'duplicate', label: 'Compte en double', icon: '👥' },
  { value: 'other', label: 'Autre (personnalisé)', icon: '📌' },
];

export const DeleteUserDialog = ({ open, onOpenChange, driver, onDeleted }: DeleteUserDialogProps) => {
  const [deletionType, setDeletionType] = useState<string>('3_days');
  const [reasonType, setReasonType] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const handleDelete = async () => {
    if (!driver || !reasonType) {
      toast.error("Veuillez sélectionner un motif");
      return;
    }

    if (reasonType === 'other' && !customReason.trim()) {
      toast.error("Veuillez préciser le motif personnalisé");
      return;
    }

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: {
          driver_id: driver.id,
          deletion_type: deletionType,
          reason_type: reasonType,
          reason_custom: reasonType === 'other' ? customReason : undefined,
        },
      });

      if (error) throw error;

      if (data.is_immediate) {
        toast.success("Compte supprimé avec succès");
      } else {
        toast.success(`Suppression programmée pour le ${format(new Date(data.deletion_date), "dd MMMM yyyy", { locale: fr })}`);
      }

      onOpenChange(false);
      onDeleted();
      resetState();
    } catch (error: any) {
      console.error("Deletion error:", error);
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetState = () => {
    setDeletionType('3_days');
    setReasonType('');
    setCustomReason('');
    setConfirmStep(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const getDeletionDate = () => {
    const now = new Date();
    switch (deletionType) {
      case 'immediate':
        return now;
      case '3_days':
        return addDays(now, 3);
      case '1_week':
        return addWeeks(now, 1);
      case '1_month':
        return addMonths(now, 1);
      default:
        return now;
    }
  };

  const selectedReason = REASON_TYPES.find(r => r.value === reasonType);
  const selectedDeletionType = DELETION_TYPES.find(d => d.value === deletionType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Supprimer un utilisateur
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. L'utilisateur sera notifié par email.
          </DialogDescription>
        </DialogHeader>

        {driver && (
          <div className="space-y-4">
            {/* Info utilisateur */}
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{driver.profiles?.full_name || "Sans nom"}</p>
                  <p className="text-sm text-muted-foreground truncate">{driver.profiles?.email}</p>
                </div>
                {driver.subscription_status && driver.subscription_status !== 'canceled' && (
                  <Badge className="bg-amber-500">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Abonné
                  </Badge>
                )}
              </div>
            </Card>

            {!confirmStep ? (
              <>
                {/* Délai de suppression */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Délai de suppression</label>
                  <Select value={deletionType} onValueChange={setDeletionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELETION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Suppression le {format(getDeletionDate(), "dd MMMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>

                {/* Motif */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motif de suppression *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REASON_TYPES.map((reason) => (
                      <Card
                        key={reason.value}
                        className={`p-3 cursor-pointer transition-all ${
                          reasonType === reason.value 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setReasonType(reason.value)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{reason.icon}</span>
                          <span className="text-sm">{reason.label}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Motif personnalisé */}
                {reasonType === 'other' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Motif personnalisé *</label>
                    <Textarea
                      placeholder="Décrivez la raison de la suppression..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                {/* Avertissement abonnement */}
                {driver.subscription_stripe_id && driver.subscription_status !== 'canceled' && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      L'abonnement Stripe sera automatiquement annulé.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Confirmation */
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-semibold text-destructive">Confirmer la suppression</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>Date: <strong>{format(getDeletionDate(), "dd MMMM yyyy", { locale: fr })}</strong></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-lg">{selectedReason?.icon}</span>
                          <span>Motif: <strong>{reasonType === 'other' ? customReason : selectedReason?.label}</strong></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <span>Un email de notification sera envoyé</span>
                        </li>
                        {driver.subscription_stripe_id && (
                          <li className="flex items-center gap-2">
                            <CreditCard className="w-3 h-3" />
                            <span>L'abonnement sera annulé</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              {confirmStep ? (
                <>
                  <Button variant="outline" onClick={() => setConfirmStep(false)} disabled={isDeleting}>
                    Retour
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Suppression...
                      </>
                    ) : deletionType === 'immediate' ? (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer maintenant
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Programmer la suppression
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={!reasonType || (reasonType === 'other' && !customReason.trim())}
                  >
                    Continuer
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
