import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, CreditCard, Calendar, MessageSquare, Clock, Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ModifyCompanyDriverAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: {
    id: string;
    partner_id: string; // driver_id or company_id
    partner_name: string;
    payment_frequency: string;
    payment_methods: string[];
    payment_day?: number;
    pending_modification?: boolean;
    pending_new_payment_frequency?: string;
    pending_new_payment_methods?: string[];
    pending_new_payment_day?: number;
    pending_modification_by?: string;
    pending_modification_message?: string;
  };
  currentPartyType: 'company' | 'driver';
  currentPartyId: string;
  onSuccess: () => void;
}

const PAYMENT_FREQUENCIES = [
  { value: 'per_course', label: 'À la course' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire', icon: '💳' },
  { value: 'payment_link', label: 'Lien de paiement', icon: '🔗' },
  { value: 'bank_transfer', label: 'Virement bancaire', icon: '🏦' },
  { value: 'cash', label: 'Espèces', icon: '💵' },
];

export function ModifyCompanyDriverAgreementDialog({
  open,
  onOpenChange,
  agreement,
  currentPartyType,
  currentPartyId,
  onSuccess
}: ModifyCompanyDriverAgreementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newPaymentFrequency, setNewPaymentFrequency] = useState(agreement.payment_frequency);
  const [newPaymentMethods, setNewPaymentMethods] = useState<string[]>(agreement.payment_methods || []);
  const [newPaymentDay, setNewPaymentDay] = useState(agreement.payment_day?.toString() || '');
  const [message, setMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const hasPendingModification = agreement.pending_modification;
  const isPendingFromMe = agreement.pending_modification_by === (currentPartyType === 'company' ? 'company' : 'driver');

  const togglePaymentMethod = (method: string) => {
    setNewPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const getFrequencyLabel = (freq: string) => {
    return PAYMENT_FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  const handleSubmitModification = async () => {
    if (newPaymentMethods.length === 0) {
      toast.error('Veuillez sélectionner au moins un moyen de paiement');
      return;
    }

    setLoading(true);
    try {
      const modificationBy = currentPartyType;

      const { error } = await supabase
        .from('company_driver_agreements')
        .update({
          pending_modification: true,
          pending_new_payment_frequency: newPaymentFrequency,
          pending_new_payment_methods: newPaymentMethods,
          pending_new_payment_day: newPaymentDay ? parseInt(newPaymentDay) : null,
          pending_modification_by: modificationBy,
          pending_modification_at: new Date().toISOString(),
          pending_modification_message: message || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agreement.id);

      if (error) throw error;

      // Send notification to partner
      const notifyUserId = currentPartyType === 'company' 
        ? await getDriverUserId(agreement.partner_id)
        : await getCompanyUserId(agreement.partner_id);

      if (notifyUserId) {
        await supabase.from('notifications').insert({
          user_id: notifyUserId,
          title: '📝 Demande de modification',
          message: `Votre partenaire propose de modifier les conditions du contrat: ${getFrequencyLabel(newPaymentFrequency)}`,
          type: 'partnership',
          link: currentPartyType === 'company' ? '/driver-dashboard?tab=sharing' : '/company-dashboard?tab=partnerships',
          is_read: false
        });
      }

      toast.success('Proposition de modification envoyée');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error proposing modification:', error);
      toast.error('Erreur lors de l\'envoi de la proposition');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptModification = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_driver_agreements')
        .update({
          payment_frequency: agreement.pending_new_payment_frequency,
          payment_methods: agreement.pending_new_payment_methods,
          payment_day: agreement.pending_new_payment_day,
          pending_modification: false,
          pending_new_payment_frequency: null,
          pending_new_payment_methods: null,
          pending_new_payment_day: null,
          pending_modification_by: null,
          pending_modification_at: null,
          pending_modification_message: null,
          contract_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', agreement.id);

      if (error) throw error;

      // Notify the proposer
      const proposerUserId = agreement.pending_modification_by === 'company'
        ? await getCompanyUserId(agreement.partner_id)
        : await getDriverUserId(agreement.partner_id);

      if (proposerUserId) {
        await supabase.from('notifications').insert({
          user_id: proposerUserId,
          title: '✅ Modification acceptée',
          message: 'Votre partenaire a accepté les nouvelles conditions du contrat.',
          type: 'success',
          link: agreement.pending_modification_by === 'company' 
            ? '/company-dashboard?tab=partnerships' 
            : '/driver-dashboard?tab=sharing',
          is_read: false
        });
      }

      toast.success('Modification acceptée ! Le contrat a été mis à jour.');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error accepting modification:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectModification = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_driver_agreements')
        .update({
          pending_modification: false,
          pending_new_payment_frequency: null,
          pending_new_payment_methods: null,
          pending_new_payment_day: null,
          pending_modification_by: null,
          pending_modification_at: null,
          pending_modification_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agreement.id);

      if (error) throw error;

      // Notify the proposer
      const proposerUserId = agreement.pending_modification_by === 'company'
        ? await getCompanyUserId(agreement.partner_id)
        : await getDriverUserId(agreement.partner_id);

      const reasonText = rejectionReason ? `. Motif: "${rejectionReason}"` : '';
      if (proposerUserId) {
        await supabase.from('notifications').insert({
          user_id: proposerUserId,
          title: '❌ Modification refusée',
          message: `Votre partenaire a refusé les nouvelles conditions${reasonText}`,
          type: 'warning',
          link: agreement.pending_modification_by === 'company' 
            ? '/company-dashboard?tab=partnerships' 
            : '/driver-dashboard?tab=sharing',
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
        .from('company_driver_agreements')
        .update({
          pending_modification: false,
          pending_new_payment_frequency: null,
          pending_new_payment_methods: null,
          pending_new_payment_day: null,
          pending_modification_by: null,
          pending_modification_at: null,
          pending_modification_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agreement.id);

      if (error) throw error;

      toast.success('Proposition annulée');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling modification:', error);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to get user IDs for notifications
  const getDriverUserId = async (driverId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('id', driverId)
      .single();
    return data?.user_id || null;
  };

  const getCompanyUserId = async (companyId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', companyId)
      .single();
    return data?.user_id || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le contrat</DialogTitle>
          <DialogDescription>
            {hasPendingModification 
              ? isPendingFromMe 
                ? 'Votre proposition de modification est en attente de validation.'
                : `${agreement.partner_name} propose une modification.`
              : 'Proposer des changements au contrat. Votre partenaire devra les accepter.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Current terms */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Contrat actuel</p>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{getFrequencyLabel(agreement.payment_frequency)}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              {agreement.payment_methods?.map(m => (
                <Badge key={m} variant="outline" className="text-xs">
                  {PAYMENT_METHODS.find(pm => pm.value === m)?.icon}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Pending modification view */}
        {hasPendingModification && (
          <div className="space-y-4">
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Modification proposée</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {getFrequencyLabel(agreement.pending_new_payment_frequency || '')}
                  </Badge>
                  {agreement.pending_new_payment_methods?.map(m => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {PAYMENT_METHODS.find(pm => pm.value === m)?.icon} {PAYMENT_METHODS.find(pm => pm.value === m)?.label}
                    </Badge>
                  ))}
                </div>
                {agreement.pending_modification_message && (
                  <div className="mt-2 p-2 bg-background rounded text-xs">
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    {agreement.pending_modification_message}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {isPendingFromMe ? (
              <div className="space-y-3">
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    En attente de réponse de <strong>{agreement.partner_name}</strong>.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  onClick={handleCancelModification}
                  disabled={loading}
                  className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                  Annuler ma proposition
                </Button>
              </div>
            ) : showRejectionForm ? (
              <div className="space-y-3">
                <Label htmlFor="rejection-reason">Motif du refus (optionnel)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Expliquez votre motif de refus..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                />
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
                    variant="destructive"
                    className="flex-1"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Accepter
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={loading}
                  className="flex-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
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
              <Label>Fréquence de paiement</Label>
              <Select value={newPaymentFrequency} onValueChange={setNewPaymentFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Moyens de paiement</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <div 
                    key={m.value}
                    className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                      newPaymentMethods.includes(m.value) 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => togglePaymentMethod(m.value)}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={newPaymentMethods.includes(m.value)}
                        onCheckedChange={() => togglePaymentMethod(m.value)}
                      />
                      <span className="text-sm">{m.icon} {m.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(newPaymentFrequency === 'weekly' || newPaymentFrequency === 'monthly') && (
              <div className="space-y-2">
                <Label>Jour de paiement</Label>
                <Select value={newPaymentDay} onValueChange={setNewPaymentDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un jour" />
                  </SelectTrigger>
                  <SelectContent>
                    {newPaymentFrequency === 'weekly' ? (
                      <>
                        <SelectItem value="1">Lundi</SelectItem>
                        <SelectItem value="2">Mardi</SelectItem>
                        <SelectItem value="3">Mercredi</SelectItem>
                        <SelectItem value="4">Jeudi</SelectItem>
                        <SelectItem value="5">Vendredi</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="1">1er du mois</SelectItem>
                        <SelectItem value="5">5 du mois</SelectItem>
                        <SelectItem value="10">10 du mois</SelectItem>
                        <SelectItem value="15">15 du mois</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Textarea
                placeholder="Expliquez la raison de votre demande..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSubmitModification}
                disabled={loading || newPaymentMethods.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Envoyer la proposition
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
