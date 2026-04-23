import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Percent, Calendar, MessageSquare } from 'lucide-react';

interface ModifyPartnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnership: {
    id: string;
    partner_id: string;
    partner_name: string;
    commission_percentage: number;
    payment_schedule: string;
    pending_modification?: boolean;
    pending_new_commission?: number;
    pending_new_payment_schedule?: string;
    pending_modification_by?: string;
  };
  currentDriverId: string;
  onSuccess: () => void;
}

export function ModifyPartnershipDialog({
  open,
  onOpenChange,
  partnership,
  currentDriverId,
  onSuccess
}: ModifyPartnershipDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newCommission, setNewCommission] = useState(partnership.commission_percentage.toString());
  const [newPaymentSchedule, setNewPaymentSchedule] = useState(partnership.payment_schedule);
  const [message, setMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const hasPendingModification = partnership.pending_modification;
  const isPendingFromMe = partnership.pending_modification_by === currentDriverId;

  const handleSubmitModification = async () => {
    const commission = parseFloat(newCommission);
    if (isNaN(commission) || commission < 5 || commission > 20) {
      toast.error('La frais de transaction doit être entre 5% et 20%');
      return;
    }

    setLoading(true);
    try {
      // Get the partner's user_id to send notification
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', partnership.partner_id)
        .single();

      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          pending_modification: true,
          pending_new_commission: commission,
          pending_new_payment_schedule: newPaymentSchedule,
          pending_modification_by: currentDriverId,
          pending_modification_at: new Date().toISOString(),
          pending_modification_message: message || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', partnership.id);

      if (error) throw error;

      // Get current driver's name for notification
      const { data: currentDriverData } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', currentDriverId)
        .single();

      if (currentDriverData) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentDriverData.user_id)
          .single();

        // Send notification to partner
        if (partnerDriver) {
          await supabase.from('notifications').insert({
            user_id: partnerDriver.user_id,
            title: '📝 Demande de modification',
            message: `${myProfile?.full_name || 'Un partenaire'} propose de modifier le contrat: ${frais de transaction}% - ${newPaymentSchedule === 'per_course' ? 'Par course' : newPaymentSchedule === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}`,
            type: 'partnership',
            link: '/driver-dashboard?tab=sharing',
            is_read: false
          });
        }
      }

      toast.success('Proposition de modification envoyée à votre partenaire');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error proposing modification:', error);
      toast.error('\'Erreur lors de lenvoi de la proposition');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptModification = async () => {
    setLoading(true);
    try {
      // Get the proposer's user_id to send notification
      const { data: proposerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', partnership.pending_modification_by)
        .single();

      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          commission_percentage: partnership.pending_new_commission,
          payment_schedule: partnership.pending_new_payment_schedule,
          pending_modification: false,
          pending_new_commission: null,
          pending_new_payment_schedule: null,
          pending_modification_by: null,
          pending_modification_at: null,
          pending_modification_message: null,
          contract_generated_at: new Date().toISOString(), // Update contract date
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', partnership.id);

      if (error) throw error;

      // Get current driver's name for notification
      const { data: currentDriverData } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', currentDriverId)
        .single();

      if (currentDriverData && proposerDriver) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentDriverData.user_id)
          .single();

        // Send notification to proposer
        await supabase.from('notifications').insert({
          user_id: proposerDriver.user_id,
          title: '✅ Modification acceptée',
          message: `${myProfile?.full_name || 'Votre partenaire'} a accepté les nouvelles conditions: ${partnership.pending_new_frais de transaction}%`,
          type: 'success',
          link: '/driver-dashboard?tab=sharing',
          is_read: false
        });
      }

      toast.success('Modification acceptée ! Le contrat a été mis à jour.');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error accepting modification:', error);
      toast.error('\'Erreur lors de lacceptation');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectModification = async () => {
    setLoading(true);
    try {
      // Get the proposer's user_id to send notification
      const { data: proposerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', partnership.pending_modification_by)
        .single();

      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          pending_modification: false,
          pending_new_commission: null,
          pending_new_payment_schedule: null,
          pending_modification_by: null,
          pending_modification_at: null,
          pending_modification_message: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', partnership.id);

      if (error) throw error;

      // Get current driver's name for notification
      const { data: currentDriverData } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', currentDriverId)
        .single();

      if (currentDriverData && proposerDriver) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentDriverData.user_id)
          .single();

        // Send notification to proposer with rejection reason
        const reasonText = rejectionReason 
          ? `. Motif: "${rejectionReason}"` 
          : '';
        await supabase.from('notifications').insert({
          user_id: proposerDriver.user_id,
          title: '❌ Modification refusée',
          message: `${myProfile?.full_name || 'Votre partenaire'} a refusé les nouvelles conditions${reasonText}`,
          type: 'warning',
          link: '/driver-dashboard?tab=sharing',
          is_read: false
        });
      }

      toast.success('Modification refusée. Le contrat actuel reste en vigueur.');
      setShowRejectionForm(false);
      setRejectionReason('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error rejecting modification:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelModification = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          pending_modification: false,
          pending_new_commission: null,
          pending_new_payment_schedule: null,
          pending_modification_by: null,
          pending_modification_at: null,
          pending_modification_message: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', partnership.id);

      if (error) throw error;

      toast.success('Proposition annulée');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling modification:', error);
      toast.error('\'Erreur lors de lannulation');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'per_course': return 'Par course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return schedule;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le partenariat</DialogTitle>
          <DialogDescription>
            {hasPendingModification 
              ? isPendingFromMe 
                ? 'Vous avez proposé une modification. En attente de validation par votre partenaire.'
                : `${partnership.partner_name} a proposé une modification.`
              : 'Proposer des changements au contrat. Votre partenaire devra les accepter pour que les modifications soient appliquées.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Current terms */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Contrat actuel</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span>{partnership.commission_percentage}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{getPaymentScheduleLabel(partnership.payment_schedule)}</span>
            </div>
          </div>
        </div>

        {/* Pending modification view */}
        {hasPendingModification && (
          <div className="space-y-4">
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Modification en attente</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Percent className="h-3 w-3" />
                    {partnership.pending_new_commission}%
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {getPaymentScheduleLabel(partnership.pending_new_payment_schedule || '')}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            {isPendingFromMe ? (
              <div className="space-y-3">
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    Votre proposition a été envoyée à <strong>{partnership.partner_name}</strong>. 
                    En attente de sa réponse.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  onClick={handleCancelModification}
                  disabled={loading}
                  className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Annuler ma proposition
                </Button>
              </div>
            ) : showRejectionForm ? (
              <div className="space-y-3">
                <Label htmlFor="rejection-reason">Motif du refus (optionnel)</Label>
                <Select value={rejectionReason} onValueChange={setRejectionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un motif..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Commission trop élevée">Frais de transaction trop élevés</SelectItem>
                    <SelectItem value="Commission trop basse">Frais de transaction trop bas</SelectItem>
                    <SelectItem value="Fréquence de paiement inadaptée">Fréquence de paiement inadaptée</SelectItem>
                    <SelectItem value="Besoin de discuter avant">Besoin de discuter avant</SelectItem>
                    <SelectItem value="other">Autre motif (personnalisé)</SelectItem>
                  </SelectContent>
                </Select>
                {rejectionReason === 'other' && (
                  <Textarea
                    id="rejection-reason-custom"
                    placeholder="Expliquez votre motif de refus..."
                    value=""
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                )}
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowRejectionForm(false);
                      setRejectionReason('');
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button 
                    onClick={handleRejectModification}
                    disabled={loading}
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirmer le refus
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handleAcceptModification}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Accepter
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={loading}
                  className="flex-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                >
                  Refuser
                </Button>
              </div>
            )}
          </div>
        )}

        {/* New modification form */}
        {!hasPendingModification && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commission-input">Nouveaux frais de transaction (%)</Label>
              <div className="relative">
                <Input
                  id="commission-input"
                  type="number"
                  min={5}
                  max={20}
                  step={1}
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  className="pr-8"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Entre 5% et 20%</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Fréquence de paiement</Label>
              <Select value={newPaymentSchedule} onValueChange={setNewPaymentSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_course">Par course</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea
                id="message"
                placeholder="Expliquez pourquoi vous proposez ces changements..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Votre partenaire recevra une notification et devra accepter les changements pour qu'ils entrent en vigueur.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Retour
          </Button>
          {!hasPendingModification && (
            <Button 
              onClick={handleSubmitModification} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Proposer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
