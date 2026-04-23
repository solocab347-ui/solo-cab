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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Users,
  History,
  Filter,
  TrendingUp,
  TrendingDown,
  CircleDollarSign
} from 'lucide-react';
import { format, isBefore, startOfDay, endOfWeek, endOfMonth, parseISO, startOfWeek, startOfMonth, subMonths } from 'date-fns';
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
  paid_at?: string | null;
  received_confirmed_at?: string | null;
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

interface PartnerSummary {
  id: string;
  name: string;
  photo: string | null;
  totalPaid: number;
  totalReceived: number;
  pendingOutgoing: number;
  pendingIncoming: number;
  transactionCount: number;
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
  const [viewMode, setViewMode] = useState<'pending' | 'history' | 'overview'>('pending');
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [invoices, setInvoices] = useState<PartnerInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Filter states
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '1month' | '3months' | '6months'>('all');
  
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
      // Load ALL invoices including paid ones for history
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
          paid_at: invoice.paid_at,
          received_confirmed_at: invoice.received_confirmed_at,
        });
      }

      setInvoices(enrichedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique partners for filter dropdown
  const uniquePartners = useMemo(() => {
    const partners = new Map<string, { id: string; name: string; photo: string | null }>();
    invoices.forEach(inv => {
      if (!partners.has(inv.partner_driver_id)) {
        partners.set(inv.partner_driver_id, {
          id: inv.partner_driver_id,
          name: inv.partner_name,
          photo: inv.partner_photo
        });
      }
    });
    return Array.from(partners.values());
  }, [invoices]);

  // Filter invoices based on selected filters
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    
    // Filter by partner
    if (selectedPartnerId !== 'all') {
      result = result.filter(inv => inv.partner_driver_id === selectedPartnerId);
    }
    
    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case '1month':
          startDate = subMonths(now, 1);
          break;
        case '3months':
          startDate = subMonths(now, 3);
          break;
        case '6months':
          startDate = subMonths(now, 6);
          break;
        default:
          startDate = new Date(0);
      }
      result = result.filter(inv => parseISO(inv.created_at) >= startDate);
    }
    
    return result;
  }, [invoices, selectedPartnerId, dateRange]);

  // Partner summaries for overview
  const partnerSummaries = useMemo((): PartnerSummary[] => {
    const summaries = new Map<string, PartnerSummary>();
    
    filteredInvoices.forEach(inv => {
      if (!summaries.has(inv.partner_driver_id)) {
        summaries.set(inv.partner_driver_id, {
          id: inv.partner_driver_id,
          name: inv.partner_name,
          photo: inv.partner_photo,
          totalPaid: 0,
          totalReceived: 0,
          pendingOutgoing: 0,
          pendingIncoming: 0,
          transactionCount: 0
        });
      }
      
      const summary = summaries.get(inv.partner_driver_id)!;
      summary.transactionCount++;
      
      if (inv.invoice_type === 'receiver') {
        // I owe money (outgoing)
        if (inv.payment_status === 'paid') {
          summary.totalPaid += inv.commission_amount;
        } else {
          summary.pendingOutgoing += inv.commission_amount;
        }
      } else {
        // I receive money (incoming)
        if (inv.payment_status === 'paid') {
          summary.totalReceived += inv.commission_amount;
        } else {
          summary.pendingIncoming += inv.commission_amount;
        }
      }
    });
    
    return Array.from(summaries.values()).sort((a, b) => 
      (b.pendingOutgoing + b.pendingIncoming) - (a.pendingOutgoing + a.pendingIncoming)
    );
  }, [filteredInvoices]);

  // Global statistics
  const globalStats = useMemo(() => {
    const stats = {
      totalPaid: 0,
      totalReceived: 0,
      pendingOutgoing: 0,
      pendingIncoming: 0,
      overdueCount: 0,
      partnerCount: uniquePartners.length
    };
    
    const today = new Date();
    
    filteredInvoices.forEach(inv => {
      if (inv.invoice_type === 'receiver') {
        if (inv.payment_status === 'paid') {
          stats.totalPaid += inv.commission_amount;
        } else {
          stats.pendingOutgoing += inv.commission_amount;
          if (inv.payment_due_date && parseISO(inv.payment_due_date) < today) {
            stats.overdueCount++;
          }
        }
      } else {
        if (inv.payment_status === 'paid') {
          stats.totalReceived += inv.commission_amount;
        } else {
          stats.pendingIncoming += inv.commission_amount;
        }
      }
    });
    
    return stats;
  }, [filteredInvoices, uniquePartners]);

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
        groupKey = `${invoice.partner_driver_id}_course_${invoice.id}`;
        periodLabel = format(parseISO(invoice.scheduled_date), "d MMM yyyy", { locale: fr });
      } else if (schedule === 'weekly') {
        const courseDate = parseISO(invoice.scheduled_date);
        const weekStart = startOfWeek(courseDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(courseDate, { weekStartsOn: 1 });
        groupKey = `${invoice.partner_driver_id}_week_${format(weekStart, 'yyyy-ww')}`;
        periodLabel = `Semaine du ${format(weekStart, "d MMM", { locale: fr })} au ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
        periodStart = weekStart.toISOString();
        periodEnd = weekEnd.toISOString();
      } else {
        const courseDate = parseISO(invoice.scheduled_date);
        const monthStart = startOfMonth(courseDate);
        const monthEnd = endOfMonth(courseDate);
        groupKey = `${invoice.partner_driver_id}_month_${format(monthStart, 'yyyy-MM')}`;
        periodLabel = format(monthStart, "MMMM yyyy", { locale: fr });
        periodStart = monthStart.toISOString();
        periodEnd = monthEnd.toISOString();
      }

      if (!groups.has(groupKey)) {
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
      
      if (invoice.payment_due_date) {
        if (!group.dueDate || isBefore(parseISO(invoice.payment_due_date), parseISO(group.dueDate))) {
          group.dueDate = invoice.payment_due_date;
        }
      }

      if (invoice.payment_status !== 'sent') group.allSent = false;
      if (invoice.payment_status !== 'pending') group.allPending = false;
    });

    groups.forEach(group => {
      if (group.dueDate) {
        const dueDate = parseISO(group.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        group.isOverdue = diffDays < 0;
        group.isDueSoon = diffDays >= 0 && diffDays <= 2;
      }
    });

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

  // Séparer les factures par type - PENDING only
  const pendingOutgoingInvoices = useMemo(() => 
    filteredInvoices.filter(i => i.invoice_type === 'receiver' && i.payment_status !== 'paid'),
    [filteredInvoices]
  );

  const pendingIncomingInvoices = useMemo(() => 
    filteredInvoices.filter(i => i.invoice_type === 'sender' && i.payment_status !== 'paid'),
    [filteredInvoices]
  );

  // History (PAID only)
  const paidOutgoingInvoices = useMemo(() => 
    filteredInvoices.filter(i => i.invoice_type === 'receiver' && i.payment_status === 'paid'),
    [filteredInvoices]
  );

  const paidIncomingInvoices = useMemo(() => 
    filteredInvoices.filter(i => i.invoice_type === 'sender' && i.payment_status === 'paid'),
    [filteredInvoices]
  );

  // Grouper les factures
  const pendingOutgoingGroups = useMemo(() => 
    groupInvoices(pendingOutgoingInvoices, 'outgoing'),
    [pendingOutgoingInvoices, groupInvoices]
  );

  const pendingIncomingGroups = useMemo(() => 
    groupInvoices(pendingIncomingInvoices, 'incoming'),
    [pendingIncomingInvoices, groupInvoices]
  );

  // Totaux pending
  const totalPendingOutgoing = useMemo(() => 
    pendingOutgoingGroups.reduce((acc, g) => acc + g.totalAmount, 0),
    [pendingOutgoingGroups]
  );

  const totalPendingIncoming = useMemo(() => 
    pendingIncomingGroups.reduce((acc, g) => acc + g.totalAmount, 0),
    [pendingIncomingGroups]
  );

  const overdueCount = useMemo(() => 
    pendingOutgoingGroups.filter(g => g.isOverdue).length,
    [pendingOutgoingGroups]
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

  // Submit payment notification
  const submitPaymentSent = async () => {
    if (!selectedGroup) return;

    setSubmitting(true);
    try {
      const proofUrl = await uploadProof();

      // Update all invoices in the group
      for (const invoice of selectedGroup.invoices) {
        const { error } = await supabase
          .from('partner_invoices')
          .update({
            payment_status: 'sent',
            payment_sent_at: new Date().toISOString(),
            payment_proof_url: proofUrl,
            payment_method_used: selectedPaymentMethod || null,
            payment_reference: paymentReference || null,
          })
          .eq('id', invoice.id);

        if (error) throw error;
      }

      // Send notification to partner
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', selectedGroup.partnerId)
        .single();

      if (partnerDriver) {
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '💸 Paiement envoyé',
          message: `Un paiement de ${selectedGroup.totalAmount.toFixed(2)}€ vous a été envoyé`,
          type: 'info',
          link: '/driver-dashboard?tab=partnerships&subtab=payments',
          is_read: false
        });
      }

      toast.success('Paiement notifié avec succès');
      resetDialogs();
      loadInvoices();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Erreur lors de la notification du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit receipt confirmation
  const submitReceiptConfirmation = async () => {
    if (!selectedGroup) return;

    setSubmitting(true);
    try {
      // Update all invoices in the group
      for (const invoice of selectedGroup.invoices) {
        const { error } = await supabase
          .from('partner_invoices')
          .update({
            payment_status: 'paid',
            payment_received_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        if (error) throw error;
      }

      // Send notification to partner
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', selectedGroup.partnerId)
        .single();

      if (partnerDriver) {
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '✅ Paiement confirmé',
          message: `Votre paiement de ${selectedGroup.totalAmount.toFixed(2)}€ a été confirmé`,
          type: 'success',
          link: '/driver-dashboard?tab=partnerships&subtab=payments',
          is_read: false
        });
      }

      toast.success('Réception confirmée');
      resetDialogs();
      loadInvoices();
    } catch (error) {
      console.error('Error confirming receipt:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit reminder
  const submitReminder = async () => {
    if (!selectedGroup) return;

    setSubmitting(true);
    try {
      // Update reminder count
      for (const invoice of selectedGroup.invoices) {
        const { error } = await supabase
          .from('partner_invoices')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminder_count: (invoice.reminder_count || 0) + 1,
          })
          .eq('id', invoice.id);

        if (error) throw error;
      }

      // Send notification to partner
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', selectedGroup.partnerId)
        .single();

      if (partnerDriver) {
        await supabase.from('notifications').insert({
          user_id: partnerDriver.user_id,
          title: '🔔 Rappel de paiement',
          message: `Un paiement de ${selectedGroup.totalAmount.toFixed(2)}€ est en attente`,
          type: 'warning',
          link: '/driver-dashboard?tab=partnerships&subtab=payments',
          is_read: false
        });
      }

      toast.success('Rappel envoyé');
      resetDialogs();
      loadInvoices();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('\'Erreur lors de lenvoi du rappel');
    } finally {
      setSubmitting(false);
    }
  };

  const resetDialogs = () => {
    setSendPaymentOpen(false);
    setConfirmReceiptOpen(false);
    setReminderOpen(false);
    setSelectedGroup(null);
    setPaymentReference('');
    setPaymentNotes('');
    setProofFile(null);
    setSelectedPaymentMethod('');
  };

  // Render payment card for pending
  const renderPaymentGroupCard = (group: PaymentGroup, direction: 'outgoing' | 'incoming') => {
    const isExpanded = expandedGroups.has(group.id);
    const isOutgoing = direction === 'outgoing';

    return (
      <Card 
        key={group.id} 
        className={cn(
          "border transition-all",
          group.isOverdue && "border-red-500/50 bg-red-500/5",
          group.isDueSoon && !group.isOverdue && "border-yellow-500/50 bg-yellow-500/5"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={group.partnerPhoto || undefined} />
                <AvatarFallback>{group.partnerName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{group.partnerName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    {SCHEDULE_ICONS[group.paymentSchedule]}
                    <span className="ml-1">{SCHEDULE_LABELS[group.paymentSchedule]}</span>
                  </Badge>
                  {group.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(group.dueDate), "d MMM", { locale: fr })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-lg font-bold",
                isOutgoing ? "text-orange-600" : "text-green-600"
              )}>
                {isOutgoing ? "-" : "+"}{group.totalAmount.toFixed(2)}€
              </p>
              {group.isOverdue && (
                <Badge className="bg-red-500/20 text-red-600 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  En retard
                </Badge>
              )}
              {group.isDueSoon && !group.isOverdue && (
                <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Urgent
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">{group.periodLabel}</p>

          {/* Incoming: Show if payment was sent by partner */}
          {!isOutgoing && group.allSent && (
            <div className="w-full mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Send className="h-4 w-4" />
                <span className="text-sm font-medium">Paiement envoyé par le partenaire</span>
              </div>
              {group.invoices.some(i => i.payment_proof_url) && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full h-8 text-blue-600 border-blue-500/50 hover:bg-blue-500/20"
                  onClick={() => window.open(group.invoices.find(i => i.payment_proof_url)?.payment_proof_url!, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le justificatif
                </Button>
              )}
            </div>
          )}

          {/* Outgoing: Show notification sent status */}
          {isOutgoing && group.allSent && (
            <div className="w-full mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Paiement notifié</span>
              </div>
              {group.invoices.some(i => i.payment_proof_url) && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full h-8 text-blue-600 border-blue-500/50 hover:bg-blue-500/20"
                  onClick={() => window.open(group.invoices.find(i => i.payment_proof_url)?.payment_proof_url!, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le justificatif
                </Button>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            {isOutgoing && !group.allSent && (
              <Button 
                size="sm" 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  setSelectedGroup(group);
                  setSendPaymentOpen(true);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Notifier paiement
              </Button>
            )}

            {!isOutgoing && (
              <>
                {!group.allSent && (
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
                )}
                <Button 
                  size="sm" 
                  className={cn(
                    group.allSent ? "w-full" : "flex-1",
                    "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={() => {
                    setSelectedGroup(group);
                    setConfirmReceiptOpen(true);
                  }}
                  disabled={!group.canConfirm}
                  title={group.confirmReason}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider réception
                </Button>
              </>
            )}
          </div>

          {/* Expandable invoice details */}
          {group.invoices.length > 1 && (
            <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                  {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {group.invoices.length} courses
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 border-t pt-2">
                  {group.invoices.map(invoice => (
                    <div key={invoice.id} className="flex justify-between items-center text-xs p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-mono text-muted-foreground">{invoice.invoice_number}</p>
                        <p>{format(parseISO(invoice.scheduled_date), "d MMM yyyy", { locale: fr })}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-medium",
                          isOutgoing ? "text-orange-600" : "text-green-600"
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

  // Render history card
  const renderHistoryCard = (invoice: PartnerInvoiceItem, isOutgoing: boolean) => (
    <Card key={invoice.id} className="border-green-500/20 bg-green-500/5">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={invoice.partner_photo || undefined} />
              <AvatarFallback className="text-xs">{invoice.partner_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{invoice.partner_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(parseISO(invoice.scheduled_date), "d MMM yyyy", { locale: fr })}</span>
                {invoice.paid_at && (
                  <Badge variant="outline" className="text-[10px]">
                    Payé le {format(parseISO(invoice.paid_at), "d MMM", { locale: fr })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "font-bold",
              isOutgoing ? "text-orange-600" : "text-green-600"
            )}>
              {isOutgoing ? "-" : "+"}{invoice.commission_amount.toFixed(2)}€
            </p>
            <Badge className="bg-green-500/20 text-green-600 text-[10px]">
              <CheckCircle className="h-3 w-3 mr-1" />
              Réglé
            </Badge>
          </div>
        </div>
        {invoice.payment_proof_url && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="w-full mt-2 h-7 text-xs"
            onClick={() => window.open(invoice.payment_proof_url!, '_blank')}
          >
            <Eye className="h-3 w-3 mr-1" />
            Voir le justificatif
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 text-orange-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total payé</p>
            <p className="text-lg font-bold text-orange-600">{globalStats.totalPaid.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total reçu</p>
            <p className="text-lg font-bold text-green-600">{globalStats.totalReceived.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-2",
          globalStats.pendingOutgoing > 0 ? "border-red-500/50 bg-red-500/5" : "border-muted"
        )}>
          <CardContent className="p-3 text-center">
            <ArrowUpRight className="h-4 w-4 text-orange-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">À payer</p>
            <p className="text-lg font-bold text-orange-600">{globalStats.pendingOutgoing.toFixed(2)}€</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <ArrowDownLeft className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">À recevoir</p>
            <p className="text-lg font-bold text-green-600">{globalStats.pendingIncoming.toFixed(2)}€</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
              <SelectTrigger className="flex-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <SelectValue placeholder="Tous les partenaires" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les partenaires</SelectItem>
                {uniquePartners.map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={partner.photo || undefined} />
                        <AvatarFallback className="text-[10px]">{partner.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {partner.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
              <SelectTrigger className="flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <SelectValue placeholder="Période" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute la période</SelectItem>
                <SelectItem value="1month">Dernier mois</SelectItem>
                <SelectItem value="3months">3 derniers mois</SelectItem>
                <SelectItem value="6months">6 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overdue alert */}
      {overdueCount > 0 && viewMode === 'pending' && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-600">
            <strong>Attention :</strong> {overdueCount} paiement{overdueCount > 1 ? 's' : ''} en retard.
          </AlertDescription>
        </Alert>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="pending" className="text-xs gap-1.5">
            <Clock className="h-4 w-4" />
            En attente
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Users className="h-4 w-4" />
            Par partenaire
          </TabsTrigger>
        </TabsList>

        {/* Pending Payments */}
        <TabsContent value="pending" className="mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="outgoing" className="text-xs gap-1.5">
                <ArrowUpRight className="h-4 w-4" />
                Sortants ({pendingOutgoingGroups.length})
              </TabsTrigger>
              <TabsTrigger value="incoming" className="text-xs gap-1.5">
                <ArrowDownLeft className="h-4 w-4" />
                Entrants ({pendingIncomingGroups.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outgoing" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {pendingOutgoingGroups.length === 0 ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>Aucun paiement à effectuer. Vous êtes à jour !</AlertDescription>
                    </Alert>
                  ) : (
                    pendingOutgoingGroups.map(group => renderPaymentGroupCard(group, 'outgoing'))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="incoming" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {pendingIncomingGroups.length === 0 ? (
                    <Alert>
                      <Euro className="h-4 w-4" />
                      <AlertDescription>Aucun paiement en attente à recevoir.</AlertDescription>
                    </Alert>
                  ) : (
                    pendingIncomingGroups.map(group => renderPaymentGroupCard(group, 'incoming'))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="outgoing" className="text-xs gap-1.5">
                <ArrowUpRight className="h-4 w-4" />
                Payés ({paidOutgoingInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="incoming" className="text-xs gap-1.5">
                <ArrowDownLeft className="h-4 w-4" />
                Reçus ({paidIncomingInvoices.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outgoing" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {paidOutgoingInvoices.length === 0 ? (
                    <Alert>
                      <History className="h-4 w-4" />
                      <AlertDescription>Aucun paiement effectué pour le moment.</AlertDescription>
                    </Alert>
                  ) : (
                    paidOutgoingInvoices.map(inv => renderHistoryCard(inv, true))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="incoming" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {paidIncomingInvoices.length === 0 ? (
                    <Alert>
                      <History className="h-4 w-4" />
                      <AlertDescription>Aucun paiement reçu pour le moment.</AlertDescription>
                    </Alert>
                  ) : (
                    paidIncomingInvoices.map(inv => renderHistoryCard(inv, false))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Overview by Partner */}
        <TabsContent value="overview" className="mt-4">
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-3">
              {partnerSummaries.length === 0 ? (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>Aucune transaction avec des partenaires.</AlertDescription>
                </Alert>
              ) : (
                partnerSummaries.map(summary => (
                  <Card key={summary.id} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={summary.photo || undefined} />
                          <AvatarFallback>{summary.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{summary.name}</p>
                          <p className="text-xs text-muted-foreground">{summary.transactionCount} transactions</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedPartnerId(summary.id)}
                        >
                          <Filter className="h-4 w-4 mr-1" />
                          Filtrer
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Payé</p>
                          <p className="font-bold text-orange-600">{summary.totalPaid.toFixed(2)}€</p>
                          {summary.pendingOutgoing > 0 && (
                            <Badge className="bg-red-500/20 text-red-600 text-[10px] mt-1">
                              +{summary.pendingOutgoing.toFixed(2)}€ en attente
                            </Badge>
                          )}
                        </div>
                        <div className="p-2 bg-green-500/10 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Reçu</p>
                          <p className="font-bold text-green-600">{summary.totalReceived.toFixed(2)}€</p>
                          {summary.pendingIncoming > 0 && (
                            <Badge className="bg-green-500/20 text-green-600 text-[10px] mt-1">
                              +{summary.pendingIncoming.toFixed(2)}€ à recevoir
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Balance */}
                      <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Balance globale</span>
                          <span className={cn(
                            "font-bold",
                            (summary.totalReceived - summary.totalPaid) >= 0 ? "text-green-600" : "text-orange-600"
                          )}>
                            {(summary.totalReceived - summary.totalPaid) >= 0 ? "+" : ""}
                            {(summary.totalReceived - summary.totalPaid).toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Send Payment Dialog */}
      <Dialog open={sendPaymentOpen} onOpenChange={setSendPaymentOpen}>
        <DialogContent className="max-w-md">
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
              </div>
            </div>

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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendPaymentOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitPaymentSent} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Notifier le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Receipt Dialog */}
      <Dialog open={confirmReceiptOpen} onOpenChange={setConfirmReceiptOpen}>
        <DialogContent className="max-w-md">
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
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 p-4 rounded-lg">
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

      {/* Reminder Dialog - Enhanced design */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-orange-500/20 rounded-full">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              Relancer le partenaire
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Envoyer un rappel de paiement à votre partenaire
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Partner card - improved styling */}
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 p-5 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-14 w-14 ring-2 ring-orange-500/30 ring-offset-2 ring-offset-background">
                  <AvatarImage src={selectedGroup?.partnerPhoto || undefined} />
                  <AvatarFallback className="bg-orange-500/20 text-orange-700 font-bold text-lg">
                    {selectedGroup?.partnerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{selectedGroup?.partnerName}</p>
                  <Badge variant="outline" className="text-xs mt-1 bg-background/50">
                    {selectedGroup && SCHEDULE_ICONS[selectedGroup.paymentSchedule]}
                    <span className="ml-1">{selectedGroup && SCHEDULE_LABELS[selectedGroup.paymentSchedule]}</span>
                  </Badge>
                </div>
              </div>
              
              {/* Amount with better visual hierarchy */}
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-orange-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Montant en attente</span>
                  <span className="text-2xl font-bold text-orange-600">{selectedGroup?.totalAmount.toFixed(2)}€</span>
                </div>
                {selectedGroup?.periodLabel && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Période : {selectedGroup.periodLabel}
                  </p>
                )}
                {selectedGroup && selectedGroup.invoices.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedGroup.invoices.length} courses concernées
                  </p>
                )}
              </div>
            </div>

            {/* Info message with icon */}
            <div className="flex items-start gap-3 p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
              <div className="p-1.5 bg-orange-500/20 rounded-full mt-0.5">
                <Send className="h-3.5 w-3.5 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Une notification de rappel sera envoyée à <span className="font-medium text-foreground">{selectedGroup?.partnerName}</span> pour lui rappeler de régler ce paiement.
              </p>
            </div>

            {/* Reminder count if any */}
            {selectedGroup && selectedGroup.invoices[0]?.reminder_count > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{selectedGroup.invoices[0].reminder_count} rappel(s) déjà envoyé(s)</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => setReminderOpen(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button 
              onClick={submitReminder} 
              disabled={submitting}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Envoyer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
