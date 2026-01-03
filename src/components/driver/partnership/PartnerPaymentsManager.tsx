import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Euro,
  Loader2,
  Bell,
  Eye,
  ChevronDown,
  ChevronUp,
  Wallet,
  FileText,
  Users
} from 'lucide-react';
import { format, isBefore, startOfDay, endOfWeek, endOfMonth, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getPaymentMethodLabel, getPaymentMethodIcon, PAYMENT_METHODS } from '@/components/shared/PaymentMethodSelector';

interface Props {
  driverId: string;
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
  billing_period_start: string | null;
  billing_period_end: string | null;
  partner_name: string;
  partner_photo: string | null;
  partner_driver_id: string;
  partnership_id: string;
  scheduled_date: string;
  created_at: string;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  payment_sent_at: string | null;
  payment_proof_url: string | null;
  payment_methods: string[];
}

// Regroupement intelligent par partenaire et période
interface PaymentGroup {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnershipId: string;
  paymentSchedule: 'per_course' | 'weekly' | 'monthly';
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  invoices: PartnerInvoiceItem[];
  totalAmount: number;
  dueDate: string | null;
  isOverdue: boolean;
  isDueSoon: boolean;
  allSent: boolean;
  allPending: boolean;
  canConfirm: boolean;
  confirmReason?: string;
  paymentMethods: string[];
}

const SCHEDULE_LABELS: Record<string, string> = {
  per_course: 'Par course',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

const SCHEDULE_ICONS: Record<string, React.ReactNode> = {
  per_course: <FileText className="h-4 w-4" />,
  weekly: <Calendar className="h-4 w-4" />,
  monthly: <Wallet className="h-4 w-4" />,
};

export function PartnerPaymentsManager({ driverId }: Props) {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [invoices, setInvoices] = useState<PartnerInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [sendPaymentOpen, setSendPaymentOpen] = useState(false);
  const [confirmReceiptOpen, setConfirmReceiptOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PaymentGroup | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PartnerInvoiceItem | null>(null);
  
  // Form states
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
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
          ),
          partnership:driver_partnerships!partnership_id(
            id,
            driver_a_id,
            driver_b_id,
            payment_schedule,
            payment_methods
          )
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedInvoices: PartnerInvoiceItem[] = [];

      for (const invoice of data || []) {
        const doc = invoice.partner_order_documents as any;
        const partnership = invoice.partnership as any;
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
          payment_schedule: invoice.payment_schedule || partnership?.payment_schedule,
          billing_period_start: invoice.billing_period_start,
          billing_period_end: invoice.billing_period_end,
          partner_name: partnerProfile?.full_name || 'Partenaire',
          partner_photo: partnerDriver?.card_photo_url || partnerProfile?.profile_photo_url || null,
          partner_driver_id: partnerDriverId,
          partnership_id: partnership?.id || invoice.partnership_id,
          scheduled_date: doc.scheduled_date,
          created_at: invoice.created_at,
          last_reminder_sent_at: invoice.last_reminder_sent_at,
          reminder_count: invoice.reminder_count || 0,
          payment_sent_at: invoice.payment_sent_at,
          payment_proof_url: invoice.payment_proof_url,
          payment_methods: partnership?.payment_methods || ['transfer'],
        });
      }

      setInvoices(enrichedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Regrouper les factures par partenaire et par période
  const groupInvoices = useCallback((invoiceList: PartnerInvoiceItem[], direction: 'outgoing' | 'incoming'): PaymentGroup[] => {
    const groups: Map<string, PaymentGroup> = new Map();
    const today = new Date();

    invoiceList.forEach(invoice => {
      const schedule = (invoice.payment_schedule || 'per_course') as 'per_course' | 'weekly' | 'monthly';
      let groupKey: string;
      let periodLabel: string;
      let periodStart: string | null = null;
      let periodEnd: string | null = null;

      if (schedule === 'per_course') {
        // Chaque facture est un groupe distinct
        groupKey = `${invoice.partner_driver_id}_course_${invoice.id}`;
        periodLabel = format(parseISO(invoice.scheduled_date), "d MMM yyyy", { locale: fr });
      } else if (schedule === 'weekly') {
        // Grouper par semaine
        const courseDate = parseISO(invoice.scheduled_date);
        const weekStart = startOfWeek(courseDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(courseDate, { weekStartsOn: 1 });
        groupKey = `${invoice.partner_driver_id}_week_${format(weekStart, 'yyyy-ww')}`;
        periodLabel = `Semaine du ${format(weekStart, "d MMM", { locale: fr })} au ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
        periodStart = weekStart.toISOString();
        periodEnd = weekEnd.toISOString();
      } else {
        // Grouper par mois
        const courseDate = parseISO(invoice.scheduled_date);
        const monthStart = startOfMonth(courseDate);
        const monthEnd = endOfMonth(courseDate);
        groupKey = `${invoice.partner_driver_id}_month_${format(monthStart, 'yyyy-MM')}`;
        periodLabel = format(monthStart, "MMMM yyyy", { locale: fr });
        periodStart = monthStart.toISOString();
        periodEnd = monthEnd.toISOString();
      }

      if (!groups.has(groupKey)) {
        // Déterminer si confirmation possible
        let canConfirm = true;
        let confirmReason: string | undefined;
        
        if (direction === 'incoming') {
          if (schedule === 'weekly' && periodEnd) {
            const end = parseISO(periodEnd);
            if (isBefore(today, end)) {
              canConfirm = false;
              confirmReason = `Confirmation possible le ${format(end, "d MMM", { locale: fr })}`;
            }
          } else if (schedule === 'monthly' && periodEnd) {
            const end = parseISO(periodEnd);
            if (isBefore(today, end)) {
              canConfirm = false;
              confirmReason = `Confirmation possible le ${format(end, "d MMM", { locale: fr })}`;
            }
          }
        }

        groups.set(groupKey, {
          id: groupKey,
          partnerId: invoice.partner_driver_id,
          partnerName: invoice.partner_name,
          partnerPhoto: invoice.partner_photo,
          partnershipId: invoice.partnership_id,
          paymentSchedule: schedule,
          periodLabel,
          periodStart,
          periodEnd,
          invoices: [],
          totalAmount: 0,
          dueDate: null,
          isOverdue: false,
          isDueSoon: false,
          allSent: true,
          allPending: true,
          canConfirm,
          confirmReason,
          paymentMethods: invoice.payment_methods || ['transfer'],
        });
      }

      const group = groups.get(groupKey)!;
      group.invoices.push(invoice);
      group.totalAmount += invoice.commission_amount;
      
      // Mettre à jour la date d'échéance (la plus proche)
      if (invoice.payment_due_date) {
        if (!group.dueDate || isBefore(parseISO(invoice.payment_due_date), parseISO(group.dueDate))) {
          group.dueDate = invoice.payment_due_date;
        }
      }

      // Vérifier les statuts
      if (invoice.payment_status !== 'sent') group.allSent = false;
      if (invoice.payment_status !== 'pending') group.allPending = false;
    });

    // Calculer isOverdue et isDueSoon pour chaque groupe
    groups.forEach(group => {
      if (group.dueDate) {
        const dueDate = parseISO(group.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        group.isOverdue = diffDays < 0;
        group.isDueSoon = diffDays >= 0 && diffDays <= 2;
      }
    });

    // Trier par urgence puis par date
    return Array.from(groups.values()).sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isDueSoon && !b.isDueSoon) return -1;
      if (!a.isDueSoon && b.isDueSoon) return 1;
      if (a.dueDate && b.dueDate) {
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
      }
      return 0;
    });
  }, []);

  // Séparer les factures par type
  const outgoingInvoices = useMemo(() => 
    invoices.filter(i => i.invoice_type === 'receiver' && i.payment_status !== 'paid'),
    [invoices]
  );

  const incomingInvoices = useMemo(() => 
    invoices.filter(i => i.invoice_type === 'sender' && i.payment_status !== 'paid'),
    [invoices]
  );

  // Grouper les factures
  const outgoingGroups = useMemo(() => 
    groupInvoices(outgoingInvoices, 'outgoing'),
    [outgoingInvoices, groupInvoices]
  );

  const incomingGroups = useMemo(() => 
    groupInvoices(incomingInvoices, 'incoming'),
    [incomingInvoices, groupInvoices]
  );

  // Totaux
  const totalOutgoing = useMemo(() => 
    outgoingGroups.reduce((acc, g) => acc + g.totalAmount, 0),
    [outgoingGroups]
  );

  const totalIncoming = useMemo(() => 
    incomingGroups.reduce((acc, g) => acc + g.totalAmount, 0),
    [incomingGroups]
  );

  const overdueCount = useMemo(() => 
    outgoingGroups.filter(g => g.isOverdue).length,
    [outgoingGroups]
  );

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Upload proof
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

  // Notifier l'envoi du paiement (pour un groupe ou une facture)
  const submitPaymentSent = async () => {
    if (!selectedGroup && !selectedInvoice) return;
    setSubmitting(true);

    try {
      const proofUrl = await uploadProof();
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const invoicesToUpdate = selectedGroup 
        ? selectedGroup.invoices.filter(i => i.payment_status === 'pending')
        : selectedInvoice ? [selectedInvoice] : [];

      // Update all invoices in the group
      for (const invoice of invoicesToUpdate) {
        await supabase
          .from('partner_invoices')
          .update({
            payment_status: 'sent',
            payment_sent_at: new Date().toISOString(),
            payment_sent_by: userId,
            payment_proof_url: proofUrl,
            payment_notes: paymentNotes || null,
          })
          .eq('id', invoice.id);
      }

      // Notify partner
      const partnerId = selectedGroup?.partnerId || selectedInvoice?.partner_driver_id;
      const totalAmount = selectedGroup?.totalAmount || selectedInvoice?.commission_amount || 0;
      
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', partnerId)
        .single();

      if (partnerDriver?.user_id) {
        const scheduleLabel = selectedGroup 
          ? SCHEDULE_LABELS[selectedGroup.paymentSchedule]
          : 'Par course';
        
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '💸 Paiement envoyé',
          message: `Paiement ${scheduleLabel.toLowerCase()} de ${totalAmount.toFixed(2)}€ envoyé. Confirmez la réception.`,
          type: 'info',
          link: '/driver-dashboard?tab=partnerships&subtab=payments',
        });
      }

      toast.success('Paiement notifié avec succès');
      resetDialogs();
      loadInvoices();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la notification');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmer la réception d'un paiement
  const submitReceiptConfirmation = async () => {
    if (!selectedGroup && !selectedInvoice) return;
    setSubmitting(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const invoicesToUpdate = selectedGroup 
        ? selectedGroup.invoices
        : selectedInvoice ? [selectedInvoice] : [];

      for (const invoice of invoicesToUpdate) {
        await supabase
          .from('partner_invoices')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            payment_confirmed_by: userId,
            received_confirmed_at: new Date().toISOString(),
            received_confirmed_by: userId,
            payment_notes: paymentNotes || null,
          })
          .eq('id', invoice.id);
      }

      // Notify partner
      const partnerId = selectedGroup?.partnerId || selectedInvoice?.partner_driver_id;
      const totalAmount = selectedGroup?.totalAmount || selectedInvoice?.commission_amount || 0;
      
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', partnerId)
        .single();

      if (partnerDriver?.user_id) {
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '✅ Paiement confirmé',
          message: `Votre paiement de ${totalAmount.toFixed(2)}€ a été confirmé`,
          type: 'success',
          link: '/driver-dashboard?tab=partnerships&subtab=payments',
        });
      }

      toast.success('Réception confirmée');
      resetDialogs();
      loadInvoices();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  // Envoyer un rappel
  const submitReminder = async () => {
    if (!selectedGroup && !selectedInvoice) return;
    setSubmitting(true);

    try {
      const invoicesToUpdate = selectedGroup 
        ? selectedGroup.invoices
        : selectedInvoice ? [selectedInvoice] : [];

      for (const invoice of invoicesToUpdate) {
        await supabase
          .from('partner_invoices')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminder_count: (invoice.reminder_count || 0) + 1,
          })
          .eq('id', invoice.id);
      }

      const partnerId = selectedGroup?.partnerId || selectedInvoice?.partner_driver_id;
      const totalAmount = selectedGroup?.totalAmount || selectedInvoice?.commission_amount || 0;
      
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', partnerId)
        .single();

      if (partnerDriver?.user_id) {
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '🔔 Rappel de paiement',
          message: `Rappel: Un paiement de ${totalAmount.toFixed(2)}€ est en attente`,
          type: 'warning',
          link: '/driver-dashboard?tab=partnerships&subtab=payments',
        });
      }

      toast.success('Rappel envoyé');
      resetDialogs();
      loadInvoices();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'envoi du rappel');
    } finally {
      setSubmitting(false);
    }
  };

  const resetDialogs = () => {
    setSendPaymentOpen(false);
    setConfirmReceiptOpen(false);
    setReminderOpen(false);
    setSelectedGroup(null);
    setSelectedInvoice(null);
    setPaymentReference('');
    setPaymentNotes('');
    setProofFile(null);
    setSelectedPaymentMethod('');
  };

  // Render a payment group card (moved inline for stability)
  const renderPaymentGroupCard = (group: PaymentGroup, direction: 'outgoing' | 'incoming') => {
    const isExpanded = expandedGroups.has(group.id);
    const isPool = group.paymentSchedule !== 'per_course';
    
    return (
      <Card 
        key={group.id}
        className={cn(
          "overflow-hidden transition-all",
          group.isOverdue && "border-red-500/50 bg-red-500/5",
          group.isDueSoon && !group.isOverdue && "border-orange-500/50 bg-orange-500/5",
          group.allSent && "border-blue-500/50 bg-blue-500/5"
        )}
      >
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Partner avatar */}
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={group.partnerPhoto || undefined} />
                  <AvatarFallback className="text-sm bg-muted">
                    {group.partnerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center",
                  direction === 'outgoing' ? "bg-orange-500" : "bg-green-500"
                )}>
                  {direction === 'outgoing' ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{group.partnerName}</p>
                
                {/* Schedule badge */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs gap-1",
                      group.paymentSchedule === 'per_course' && "border-gray-400 text-gray-600",
                      group.paymentSchedule === 'weekly' && "border-blue-400 text-blue-600",
                      group.paymentSchedule === 'monthly' && "border-purple-400 text-purple-600"
                    )}
                  >
                    {SCHEDULE_ICONS[group.paymentSchedule]}
                    {SCHEDULE_LABELS[group.paymentSchedule]}
                  </Badge>
                  
                  {isPool && (
                    <Badge variant="secondary" className="text-xs">
                      {group.invoices.length} course{group.invoices.length > 1 ? 's' : ''}
                    </Badge>
                  )}

                  {group.allSent && (
                    <Badge className="bg-blue-500/20 text-blue-600 text-xs">
                      <Send className="h-3 w-3 mr-1" />
                      Envoyé
                    </Badge>
                  )}
                </div>

                {/* Period */}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {group.periodLabel}
                </p>

                {/* Due date */}
                {group.dueDate && (
                  <div className="mt-1">
                    {group.isOverdue ? (
                      <Badge className="bg-red-500/20 text-red-600 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        En retard
                      </Badge>
                    ) : group.isDueSoon ? (
                      <Badge className="bg-orange-500/20 text-orange-600 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Échéance: {format(parseISO(group.dueDate), "d MMM", { locale: fr })}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Échéance: {format(parseISO(group.dueDate), "d MMM", { locale: fr })}
                      </span>
                    )}
                  </div>
                )}

                {/* Payment methods */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {group.paymentMethods.map(method => {
                    const Icon = getPaymentMethodIcon(method);
                    return (
                      <Badge 
                        key={method} 
                        variant="outline" 
                        className="text-[10px] py-0.5 px-1.5 bg-muted/50"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {getPaymentMethodLabel(method)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={cn(
                  "text-lg font-bold",
                  direction === 'outgoing' ? "text-orange-600" : "text-green-600"
                )}>
                  {direction === 'outgoing' ? '-' : '+'}{group.totalAmount.toFixed(2)}€
                </p>
                {isPool && (
                  <p className="text-xs text-muted-foreground">Cagnotte</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {direction === 'outgoing' ? (
                group.allSent ? (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-blue-600 border-blue-500"
                      disabled
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Paiement envoyé
                    </Button>
                    {group.invoices.some(i => i.payment_proof_url) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(group.invoices.find(i => i.payment_proof_url)?.payment_proof_url!, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedPaymentMethod(group.paymentMethods[0] || 'transfer');
                      setSendPaymentOpen(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Notifier le paiement
                  </Button>
                )
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-orange-600 border-orange-500 hover:bg-orange-500/10"
                    onClick={() => {
                      setSelectedGroup(group);
                      setReminderOpen(true);
                    }}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Relancer
                  </Button>
                  <Button 
                    size="sm" 
                    className={cn(
                      "flex-1",
                      group.canConfirm 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-gray-400 cursor-not-allowed"
                    )}
                    disabled={!group.canConfirm}
                    onClick={() => {
                      if (group.canConfirm) {
                        setSelectedGroup(group);
                        setConfirmReceiptOpen(true);
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider réception
                  </Button>
                </>
              )}
            </div>

            {/* Show reason if can't confirm */}
            {direction === 'incoming' && !group.canConfirm && group.confirmReason && (
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {group.confirmReason}
              </p>
            )}
          </div>

          {/* Collapsible invoice list for pools */}
          {isPool && (
            <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full rounded-none border-t h-10 text-xs text-muted-foreground hover:bg-muted/50"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Masquer les détails
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Voir les {group.invoices.length} courses
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t bg-muted/30 p-3 space-y-2">
                  {group.invoices.map(invoice => (
                    <div 
                      key={invoice.id}
                      className="flex items-center justify-between text-sm bg-background rounded-lg p-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{invoice.invoice_number}</p>
                        <p className="text-xs">{format(parseISO(invoice.scheduled_date), "d MMM yyyy", { locale: fr })}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-medium",
                          direction === 'outgoing' ? "text-orange-600" : "text-green-600"
                        )}>
                          {invoice.commission_amount.toFixed(2)}€
                        </p>
                        {invoice.payment_status === 'sent' && (
                          <Badge className="bg-blue-500/20 text-blue-600 text-[10px]">Envoyé</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    );
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
          overdueCount > 0 ? "border-red-500/50 bg-red-500/5" : "border-orange-500/30 bg-orange-500/5"
        )}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-orange-600" />
              <p className="text-xs text-muted-foreground font-medium">À payer</p>
            </div>
            <p className={cn(
              "text-xl font-bold mt-1",
              overdueCount > 0 ? "text-red-600" : "text-orange-600"
            )}>
              {totalOutgoing.toFixed(2)} €
            </p>
            {overdueCount > 0 && (
              <Badge className="bg-red-500/20 text-red-600 text-[10px] mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueCount} en retard
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-600" />
              <p className="text-xs text-muted-foreground font-medium">À recevoir</p>
            </div>
            <p className="text-xl font-bold text-green-600 mt-1">{totalIncoming.toFixed(2)} €</p>
            {incomingGroups.length > 0 && (
              <Badge className="bg-green-500/20 text-green-600 text-[10px] mt-1">
                {incomingGroups.length} en attente
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-600">
            <strong>Attention :</strong> {overdueCount} paiement{overdueCount > 1 ? 's' : ''} en retard. 
            Régularisez rapidement pour maintenir vos partenariats.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="outgoing" className="text-xs gap-1.5">
            <ArrowUpRight className="h-4 w-4" />
            Sortants ({outgoingGroups.length})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="text-xs gap-1.5">
            <ArrowDownLeft className="h-4 w-4" />
            Entrants ({incomingGroups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {outgoingGroups.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>Aucun paiement à effectuer. Vous êtes à jour !</AlertDescription>
                </Alert>
              ) : (
                outgoingGroups.map(group => renderPaymentGroupCard(group, 'outgoing'))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {incomingGroups.length === 0 ? (
                <Alert>
                  <Euro className="h-4 w-4" />
                  <AlertDescription>Aucun paiement en attente à recevoir.</AlertDescription>
                </Alert>
              ) : (
                incomingGroups.map(group => renderPaymentGroupCard(group, 'incoming'))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Send Payment Dialog */}
      <Dialog open={sendPaymentOpen} onOpenChange={setSendPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Notifier le paiement
            </DialogTitle>
            <DialogDescription>
              Informez votre partenaire que vous avez effectué le virement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedGroup?.partnerPhoto || undefined} />
                  <AvatarFallback>{selectedGroup?.partnerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedGroup?.partnerName}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {selectedGroup && SCHEDULE_LABELS[selectedGroup.paymentSchedule]}
                  </Badge>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Période:</strong> {selectedGroup?.periodLabel}</p>
                <p><strong>Montant:</strong> <span className="text-orange-600 font-bold">{selectedGroup?.totalAmount.toFixed(2)}€</span></p>
                {selectedGroup && selectedGroup.invoices.length > 1 && (
                  <p><strong>Courses:</strong> {selectedGroup.invoices.length}</p>
                )}
              </div>
            </div>

            {/* Payment method selection */}
            {selectedGroup && selectedGroup.paymentMethods.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Méthode de paiement utilisée</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedGroup.paymentMethods.map(method => {
                    const Icon = getPaymentMethodIcon(method);
                    const isSelected = selectedPaymentMethod === method;
                    return (
                      <Button
                        key={method}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "justify-start h-auto py-2",
                          isSelected && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setSelectedPaymentMethod(method)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {getPaymentMethodLabel(method)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Référence du paiement (optionnel)</label>
              <Input
                placeholder="Ex: VIR-2026-001"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Justificatif (optionnel)</label>
              <div className="mt-1">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
              {proofFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ {proofFile.name}
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
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Notifier le paiement
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
              Valider la réception
            </DialogTitle>
            <DialogDescription>
              Confirmez que vous avez bien reçu le paiement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedGroup?.partnerPhoto || undefined} />
                  <AvatarFallback>{selectedGroup?.partnerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedGroup?.partnerName}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {selectedGroup && SCHEDULE_LABELS[selectedGroup.paymentSchedule]}
                  </Badge>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Période:</strong> {selectedGroup?.periodLabel}</p>
                <p><strong>Montant reçu:</strong> <span className="text-green-600 font-bold">{selectedGroup?.totalAmount.toFixed(2)}€</span></p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                placeholder="Commentaires..."
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
              <CheckCircle className="h-4 w-4 mr-2" />
              Valider la réception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Relancer le partenaire
            </DialogTitle>
            <DialogDescription>
              Envoyer un rappel de paiement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedGroup?.partnerPhoto || undefined} />
                  <AvatarFallback>{selectedGroup?.partnerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedGroup?.partnerName}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {selectedGroup && SCHEDULE_LABELS[selectedGroup.paymentSchedule]}
                  </Badge>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Montant en attente:</strong> <span className="text-orange-600 font-bold">{selectedGroup?.totalAmount.toFixed(2)}€</span></p>
              </div>
            </div>

            <Alert className="border-orange-500/50 bg-orange-500/10">
              <Bell className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-700">
                Une notification sera envoyée au partenaire pour lui rappeler le paiement.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={submitReminder} 
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Bell className="h-4 w-4 mr-2" />
              Envoyer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
