import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Download,
  CheckCircle,
  Clock,
  Euro,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  HandCoins
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generatePartnerInvoicePDF } from './PartnerInvoicePDF';

interface Props {
  driverId: string;
}

interface PartnerInvoice {
  id: string;
  order_document_id: string;
  invoice_type: 'sender' | 'receiver';
  invoice_number: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  tva_rate: number;
  tva_amount: number;
  invoice_amount: number;
  payment_status: 'pending' | 'paid' | 'disputed';
  paid_at: string | null;
  payment_schedule: string | null;
  created_at: string;
  // Partner info
  partner_driver_id: string;
  partner_name: string;
  partner_company: string | null;
  partner_siret: string | null;
  partner_photo: string | null;
  // Course info
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  // Driver info
  driver_name: string;
  driver_company: string | null;
  driver_siret: string | null;
}

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-600', icon: Clock },
  paid: { label: 'Payée', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
  disputed: { label: 'Litige', color: 'bg-red-500/20 text-red-600', icon: Clock },
};

const PAYMENT_SCHEDULE_LABELS: Record<string, string> = {
  per_course: 'Par course',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

export function PartnerInvoicesList({ driverId }: Props) {
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PartnerInvoice | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

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

      const enrichedInvoices: PartnerInvoice[] = [];

      for (const invoice of data || []) {
        const doc = invoice.partner_order_documents as any;
        const invoiceType = invoice.invoice_type as 'sender' | 'receiver';
        const isSender = invoiceType === 'sender';
        const partnerDriverId = isSender ? doc.receiver_driver_id : doc.sender_driver_id;

        // Get partner info
        const { data: partnerDriver } = await supabase
          .from('drivers')
          .select('user_id, company_name, siret, card_photo_url')
          .eq('id', partnerDriverId)
          .single();

        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('full_name, profile_photo_url')
          .eq('id', partnerDriver?.user_id)
          .single();

        // Get own info
        const { data: ownDriver } = await supabase
          .from('drivers')
          .select('user_id, company_name, siret')
          .eq('id', driverId)
          .single();

        const { data: ownProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', ownDriver?.user_id)
          .single();

        const paymentStatus = invoice.payment_status as 'pending' | 'paid' | 'disputed';

        enrichedInvoices.push({
          id: invoice.id,
          order_document_id: invoice.order_document_id,
          invoice_type: invoiceType,
          invoice_number: invoice.invoice_number,
          course_amount: invoice.course_amount,
          commission_percentage: invoice.commission_percentage,
          commission_amount: invoice.commission_amount,
          tva_rate: invoice.tva_rate || 0,
          tva_amount: invoice.tva_amount || 0,
          invoice_amount: invoice.invoice_amount,
          payment_status: paymentStatus,
          paid_at: invoice.paid_at,
          payment_schedule: invoice.payment_schedule,
          created_at: invoice.created_at,
          partner_driver_id: partnerDriverId,
          partner_name: partnerProfile?.full_name || 'Partenaire',
          partner_company: partnerDriver?.company_name || null,
          partner_siret: partnerDriver?.siret || null,
          partner_photo: partnerDriver?.card_photo_url || partnerProfile?.profile_photo_url || null,
          pickup_address: doc.pickup_address,
          destination_address: doc.destination_address,
          scheduled_date: doc.scheduled_date,
          driver_name: ownProfile?.full_name || '',
          driver_company: ownDriver?.company_name || null,
          driver_siret: ownDriver?.siret || null,
        });
      }

      setInvoices(enrichedInvoices);
    } catch (error) {
      console.error('Error loading partner invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = (invoice: PartnerInvoice) => {
    setSelectedInvoice(invoice);
    setConfirmDialogOpen(true);
  };

  const confirmPaymentReceived = async () => {
    if (!selectedInvoice) return;
    setConfirming(true);

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

      toast.success('Paiement confirmé !');
      setConfirmDialogOpen(false);
      setPaymentNotes('');
      loadInvoices();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadPDF = async (invoice: PartnerInvoice) => {
    try {
      await generatePartnerInvoicePDF(invoice);
      toast.success('Facture téléchargée');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (loading) {
    return null;
  }

  if (invoices.length === 0) {
    return null;
  }

  const pendingInvoices = invoices.filter(i => i.payment_status === 'pending');
  const paidInvoices = invoices.filter(i => i.payment_status === 'paid');

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-500" />
            Factures partenaires
            <Badge variant="secondary" className="ml-1">{invoices.length}</Badge>
          </h2>
        </div>

        {/* Pending Section */}
        {pendingInvoices.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">En attente ({pendingInvoices.length})</span>
            </div>
            <div className="grid gap-3">
              {pendingInvoices.map((invoice) => (
                <InvoiceCard 
                  key={invoice.id} 
                  invoice={invoice} 
                  driverId={driverId}
                  onConfirmPayment={handleConfirmPayment}
                  onDownload={handleDownloadPDF}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paid Section */}
        {paidInvoices.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">Payées ({paidInvoices.length})</span>
            </div>
            <div className="grid gap-3">
              {paidInvoices.slice(0, 5).map((invoice) => (
                <InvoiceCard 
                  key={invoice.id} 
                  invoice={invoice} 
                  driverId={driverId}
                  onConfirmPayment={handleConfirmPayment}
                  onDownload={handleDownloadPDF}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Payment Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-green-600" />
              Confirmer la réception du paiement
            </DialogTitle>
            <DialogDescription>
              Confirmez que vous avez bien reçu le paiement de {selectedInvoice?.commission_amount.toFixed(2)}€
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Facture:</strong> {selectedInvoice?.invoice_number}</p>
              <p><strong>De:</strong> {selectedInvoice?.partner_name}</p>
              <p><strong>Montant:</strong> {selectedInvoice?.commission_amount.toFixed(2)}€</p>
            </div>
            
            <Textarea
              placeholder="Notes (optionnel)..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={confirmPaymentReceived}
              disabled={confirming}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface InvoiceCardProps {
  invoice: PartnerInvoice;
  driverId: string;
  onConfirmPayment: (invoice: PartnerInvoice) => void;
  onDownload: (invoice: PartnerInvoice) => void;
}

function InvoiceCard({ invoice, driverId, onConfirmPayment, onDownload }: InvoiceCardProps) {
  const isSender = invoice.invoice_type === 'sender';
  const statusConfig = PAYMENT_STATUS_CONFIG[invoice.payment_status];
  const StatusIcon = statusConfig.icon;

  // Sender: reçoit la commission (bouton pour confirmer qu'il a reçu)
  // Receiver: paie la commission (bouton pour confirmer qu'il a payé)
  const canConfirmPayment = invoice.payment_status === 'pending' && isSender;

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 hover:shadow-md",
      isSender 
        ? "border-l-4 border-l-green-500 bg-gradient-to-r from-green-500/5 to-transparent" 
        : "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar & Partner */}
          <Avatar className="h-12 w-12 border-2 border-background shadow-md">
            <AvatarImage src={invoice.partner_photo || undefined} />
            <AvatarFallback className={cn(
              "text-white font-bold",
              isSender ? "bg-green-500" : "bg-blue-500"
            )}>
              {invoice.partner_name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Top Row: Name + Amount */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{invoice.partner_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{invoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-lg font-bold",
                  isSender ? "text-green-600" : "text-blue-600"
                )}>
                  {isSender ? '+' : ''}{invoice.commission_amount.toFixed(2)}€
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isSender ? 'À recevoir' : 'À payer'}
                </p>
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center flex-wrap gap-2">
              <Badge className={cn("text-xs font-medium", statusConfig.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {invoice.payment_schedule && (
                <Badge variant="outline" className="text-xs">
                  {PAYMENT_SCHEDULE_LABELS[invoice.payment_schedule]}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(invoice.scheduled_date), "d MMM yyyy", { locale: fr })}
              </span>
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-2 pt-1">
              {canConfirmPayment && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                  onClick={() => onConfirmPayment(invoice)}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Confirmer réception
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onDownload(invoice)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
