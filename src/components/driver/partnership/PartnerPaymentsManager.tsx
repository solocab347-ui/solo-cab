import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  FileText,
  Send,
  Euro,
  Loader2
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  driverId: string;
}

interface PartnerBalance {
  partnershipId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  commissionPercentage: number;
  paymentSchedule: string;
  pendingInvoicesCount: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  nextPaymentDue: Date | null;
  isOverdue: boolean;
  direction: 'incoming' | 'outgoing';
}

interface PartnerInvoiceItem {
  id: string;
  invoice_number: string;
  invoice_type: 'sender' | 'receiver';
  invoice_amount: number;
  commission_amount: number;
  payment_status: string;
  payment_due_date: string | null;
  payment_schedule: string | null;
  partner_name: string;
  partner_photo: string | null;
  partner_driver_id: string;
  scheduled_date: string;
  created_at: string;
}

const PAYMENT_SCHEDULE_LABELS: Record<string, string> = {
  per_course: 'Par course',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-600', icon: Clock },
  paid: { label: 'Payée', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
  disputed: { label: 'Litige', color: 'bg-red-500/20 text-red-600', icon: AlertTriangle },
};

export function PartnerPaymentsManager({ driverId }: Props) {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [invoices, setInvoices] = useState<PartnerInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendPaymentOpen, setSendPaymentOpen] = useState(false);
  const [confirmReceiptOpen, setConfirmReceiptOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PartnerInvoiceItem | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [driverId]);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_invoices')
        .select(`
          *,
          partner_order_documents!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            sender_driver_id,
            receiver_driver_id
          )
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedInvoices: PartnerInvoiceItem[] = [];

      for (const invoice of data || []) {
        const doc = invoice.partner_order_documents as any;
        const invoiceType = invoice.invoice_type as 'sender' | 'receiver';
        const isSender = invoiceType === 'sender';
        const partnerDriverId = isSender ? doc.receiver_driver_id : doc.sender_driver_id;

        // Get partner info
        const { data: partnerDriver } = await supabase
          .from('drivers')
          .select('user_id, card_photo_url')
          .eq('id', partnerDriverId)
          .single();

        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('full_name, profile_photo_url')
          .eq('id', partnerDriver?.user_id)
          .single();

        enrichedInvoices.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_type: invoiceType,
          invoice_amount: invoice.invoice_amount,
          commission_amount: invoice.commission_amount,
          payment_status: invoice.payment_status,
          payment_due_date: invoice.payment_due_date,
          payment_schedule: invoice.payment_schedule,
          partner_name: partnerProfile?.full_name || 'Partenaire',
          partner_photo: partnerDriver?.card_photo_url || partnerProfile?.profile_photo_url || null,
          partner_driver_id: partnerDriverId,
          scheduled_date: doc.scheduled_date,
          created_at: invoice.created_at,
        });
      }

      setInvoices(enrichedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Outgoing = invoices where I'm receiver (I need to pay commission to sender)
  const outgoingInvoices = useMemo(() => 
    invoices.filter(i => i.invoice_type === 'receiver'), 
    [invoices]
  );

  // Incoming = invoices where I'm sender (I receive commission from receiver)
  const incomingInvoices = useMemo(() => 
    invoices.filter(i => i.invoice_type === 'sender'),
    [invoices]
  );

  const pendingOutgoing = useMemo(() => 
    outgoingInvoices.filter(i => i.payment_status === 'pending'),
    [outgoingInvoices]
  );

  const pendingIncoming = useMemo(() => 
    incomingInvoices.filter(i => i.payment_status === 'pending'),
    [incomingInvoices]
  );

  const overdueOutgoing = useMemo(() => 
    pendingOutgoing.filter(i => 
      i.payment_due_date && isBefore(new Date(i.payment_due_date), startOfDay(new Date()))
    ),
    [pendingOutgoing]
  );

  // Pour les sortants (receiver), on doit payer la commission
  const totalOutgoingPending = useMemo(() => 
    pendingOutgoing.reduce((acc, i) => acc + i.commission_amount, 0),
    [pendingOutgoing]
  );

  // Pour les entrants (sender), on reçoit la commission
  const totalIncomingPending = useMemo(() => 
    pendingIncoming.reduce((acc, i) => acc + i.commission_amount, 0),
    [pendingIncoming]
  );

  const handleSendPayment = (invoice: PartnerInvoiceItem) => {
    setSelectedInvoice(invoice);
    setSendPaymentOpen(true);
  };

  const handleConfirmReceipt = (invoice: PartnerInvoiceItem) => {
    setSelectedInvoice(invoice);
    setConfirmReceiptOpen(true);
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = proofFile.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, proofFile);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const submitPaymentSent = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);

    try {
      const proofUrl = await uploadProof();

      // Update invoice status
      const { error } = await supabase
        .from('partner_invoices')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_notes: paymentNotes || null,
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      // Create a payment record
      const { data: partnership } = await supabase
        .from('driver_partnerships')
        .select('id')
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .or(`driver_a_id.eq.${selectedInvoice.partner_driver_id},driver_b_id.eq.${selectedInvoice.partner_driver_id}`)
        .eq('status', 'active')
        .single();

      if (partnership) {
        await supabase.from('partner_payments').insert({
          partnership_id: partnership.id,
          payer_driver_id: driverId,
          receiver_driver_id: selectedInvoice.partner_driver_id,
          amount: selectedInvoice.commission_amount,
          payment_reference: paymentReference || null,
          payment_method: 'transfer',
          proof_url: proofUrl,
          notes: paymentNotes || null,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      }

      // Notify partner
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', selectedInvoice.partner_driver_id)
        .single();

      if (partnerDriver?.user_id) {
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '💰 Paiement reçu',
          message: `Un partenaire vous a envoyé un paiement de ${selectedInvoice.commission_amount.toFixed(2)}€`,
          type: 'success',
          link: '/driver-dashboard?tab=partnerships&subtab=balances',
        });
      }

      toast.success('Paiement envoyé avec succès');
      setSendPaymentOpen(false);
      setPaymentReference('');
      setPaymentNotes('');
      setProofFile(null);
      loadInvoices();
    } catch (error) {
      console.error('Error sending payment:', error);
      toast.error('Erreur lors de l\'envoi du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReceiptConfirmation = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('partner_invoices')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_notes: paymentNotes || null,
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success('Réception confirmée');
      setConfirmReceiptOpen(false);
      setPaymentNotes('');
      loadInvoices();
    } catch (error) {
      console.error('Error confirming receipt:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  const isInvoiceOverdue = (invoice: PartnerInvoiceItem) => {
    if (!invoice.payment_due_date || invoice.payment_status !== 'pending') return false;
    return isBefore(new Date(invoice.payment_due_date), startOfDay(new Date()));
  };

  const getScheduleAlert = (invoice: PartnerInvoiceItem) => {
    if (invoice.payment_status !== 'pending') return null;
    
    const isOverdue = isInvoiceOverdue(invoice);
    if (isOverdue) {
      return { type: 'error', message: 'En retard' };
    }

    if (!invoice.payment_due_date) return null;

    const dueDate = new Date(invoice.payment_due_date);
    const today = startOfDay(new Date());
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { type: 'error', message: 'Échéance aujourd\'hui' };
    } else if (diffDays <= 2) {
      return { type: 'warning', message: `Échéance dans ${diffDays} jour${diffDays > 1 ? 's' : ''}` };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={cn(
          "border-2 transition-colors",
          overdueOutgoing.length > 0 ? "border-red-500/50 bg-red-500/5" : "border-orange-500/30 bg-orange-500/5"
        )}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground font-medium">À payer</p>
            <p className={cn(
              "text-xl font-bold",
              overdueOutgoing.length > 0 ? "text-red-600" : "text-orange-600"
            )}>
              {totalOutgoingPending.toFixed(2)} €
            </p>
            {overdueOutgoing.length > 0 && (
              <Badge className="bg-red-500/20 text-red-600 text-[10px] mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueOutgoing.length} en retard
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground font-medium">À recevoir</p>
            <p className="text-xl font-bold text-green-600">{totalIncomingPending.toFixed(2)} €</p>
            {pendingIncoming.length > 0 && (
              <Badge className="bg-green-500/20 text-green-600 text-[10px] mt-1">
                {pendingIncoming.length} en attente
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts for overdue payments */}
      {overdueOutgoing.length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-600">
            <strong>Attention :</strong> Vous avez {overdueOutgoing.length} paiement{overdueOutgoing.length > 1 ? 's' : ''} en retard. 
            Régularisez la situation pour maintenir votre partenariat.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for incoming/outgoing */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="outgoing" className="text-xs gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Sortants ({pendingOutgoing.length})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="text-xs gap-1">
            <ArrowDownLeft className="h-3.5 w-3.5" />
            Entrants ({pendingIncoming.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing" className="mt-4 space-y-2">
          {pendingOutgoing.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>Aucun paiement en attente à effectuer.</AlertDescription>
            </Alert>
          ) : (
            pendingOutgoing.map((invoice) => {
              const alert = getScheduleAlert(invoice);
              return (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  direction="outgoing"
                  alert={alert}
                  onAction={() => handleSendPayment(invoice)}
                  actionLabel="Notifier paiement"
                  actionIcon={<Send className="h-4 w-4 mr-1" />}
                />
              );
            })
          )}

          {/* Paid outgoing */}
          {outgoingInvoices.filter(i => i.payment_status === 'paid').length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Paiements effectués</p>
              {outgoingInvoices.filter(i => i.payment_status === 'paid').slice(0, 5).map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  direction="outgoing"
                  isPaid
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4 space-y-2">
          {pendingIncoming.length === 0 ? (
            <Alert>
              <Euro className="h-4 w-4" />
              <AlertDescription>Aucun paiement en attente à recevoir.</AlertDescription>
            </Alert>
          ) : (
            pendingIncoming.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                direction="incoming"
                onAction={() => handleConfirmReceipt(invoice)}
                actionLabel="Confirmer réception"
                actionIcon={<CheckCircle className="h-4 w-4 mr-1" />}
              />
            ))
          )}

          {/* Paid incoming */}
          {incomingInvoices.filter(i => i.payment_status === 'paid').length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Paiements reçus</p>
              {incomingInvoices.filter(i => i.payment_status === 'paid').slice(0, 5).map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  direction="incoming"
                  isPaid
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Payment Dialog */}
      <Dialog open={sendPaymentOpen} onOpenChange={setSendPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Notifier un paiement
            </DialogTitle>
            <DialogDescription>
              Confirmez l'envoi du paiement à votre partenaire
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Facture:</strong> {selectedInvoice?.invoice_number}</p>
              <p><strong>À:</strong> {selectedInvoice?.partner_name}</p>
              <p><strong>Montant:</strong> {selectedInvoice?.commission_amount.toFixed(2)}€</p>
            </div>

            <div>
              <label className="text-sm font-medium">Référence de virement (optionnel)</label>
              <Input
                placeholder="Ex: VIR-2024-001"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Preuve de paiement (optionnel)</label>
              <div className="mt-1">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
              {proofFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fichier sélectionné: {proofFile.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                placeholder="Informations complémentaires..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendPaymentOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitPaymentSent} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Receipt Dialog */}
      <Dialog open={confirmReceiptOpen} onOpenChange={setConfirmReceiptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmer la réception
            </DialogTitle>
            <DialogDescription>
              Confirmez que vous avez bien reçu le paiement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Facture:</strong> {selectedInvoice?.invoice_number}</p>
              <p><strong>De:</strong> {selectedInvoice?.partner_name}</p>
              <p><strong>Montant:</strong> {selectedInvoice?.commission_amount.toFixed(2)}€</p>
            </div>

            <div>
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                placeholder="Informations complémentaires..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReceiptOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={submitReceiptConfirmation} 
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer la réception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InvoiceCardProps {
  invoice: PartnerInvoiceItem;
  direction: 'incoming' | 'outgoing';
  alert?: { type: string; message: string } | null;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  isPaid?: boolean;
}

function InvoiceCard({ 
  invoice, 
  direction, 
  alert, 
  onAction, 
  actionLabel, 
  actionIcon,
  isPaid 
}: InvoiceCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden",
      isPaid && "opacity-60",
      alert?.type === 'error' && "border-red-500/50",
      alert?.type === 'warning' && "border-orange-500/50"
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Direction indicator */}
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
            direction === 'outgoing' ? "bg-orange-500/20" : "bg-green-500/20"
          )}>
            {direction === 'outgoing' ? (
              <ArrowUpRight className="h-5 w-5 text-orange-600" />
            ) : (
              <ArrowDownLeft className="h-5 w-5 text-green-600" />
            )}
          </div>

          {/* Partner info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={invoice.partner_photo || undefined} />
                <AvatarFallback className="text-[10px]">
                  {invoice.partner_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{invoice.partner_name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="font-mono">{invoice.invoice_number}</span>
              {invoice.payment_schedule && (
                <Badge variant="outline" className="text-[9px]">
                  {PAYMENT_SCHEDULE_LABELS[invoice.payment_schedule] || invoice.payment_schedule}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(invoice.scheduled_date), "d MMM yyyy", { locale: fr })}
              {invoice.payment_due_date && (
                <>
                  <span className="mx-1">•</span>
                  <span>Échéance: {format(new Date(invoice.payment_due_date), "d MMM", { locale: fr })}</span>
                </>
              )}
            </div>
          </div>

          {/* Amount and action */}
          <div className="text-right shrink-0">
            <p className={cn(
              "text-sm font-bold",
              direction === 'outgoing' ? "text-orange-600" : "text-green-600"
            )}>
              {direction === 'outgoing' ? '-' : '+'}{invoice.commission_amount.toFixed(2)}€
            </p>
            {alert && (
              <Badge className={cn(
                "text-[9px] mt-1",
                alert.type === 'error' ? "bg-red-500/20 text-red-600" : "bg-orange-500/20 text-orange-600"
              )}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alert.message}
              </Badge>
            )}
            {isPaid && (
              <Badge className="bg-green-500/20 text-green-600 text-[9px] mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Payée
              </Badge>
            )}
          </div>

          {onAction && !isPaid && (
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "shrink-0 text-xs",
                direction === 'outgoing' 
                  ? "border-primary text-primary hover:bg-primary/10" 
                  : "border-green-600 text-green-600 hover:bg-green-600/10"
              )}
              onClick={onAction}
            >
              {actionIcon}
              <span className="hidden sm:inline">{actionLabel}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
