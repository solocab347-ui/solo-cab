import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  CreditCard, 
  Euro, 
  FileText, 
  Loader2, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Car,
  CalendarDays,
  Send,
  Check,
  Upload,
  Paperclip
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameWeek, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface CompanyPaymentsDueProps {
  companyId: string;
}

interface GroupedPayment {
  driverId: string;
  driverName: string;
  driverCompany: string;
  driverPhoto: string | null;
  agreementId: string;
  paymentFrequency: string;
  paymentMethods: string[];
  paymentDay: number | null;
  totalAmount: number;
  invoiceCount: number;
  invoices: any[];
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: 'upcoming' | 'due' | 'overdue' | 'sent' | 'received';
  paymentId?: string;
  sentAt?: Date;
  paymentReference?: string;
}

export function CompanyPaymentsDue({ companyId }: CompanyPaymentsDueProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [showSendPaymentDialog, setShowSendPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<GroupedPayment | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Fetch agreements with payment settings
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["company-agreements-for-payments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          driver_id,
          payment_frequency,
          payment_methods,
          payment_day,
          next_payment_due,
          total_billed,
          total_paid,
          outstanding_balance,
          driver:drivers(
            id,
            company_name,
            user_id
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      // Get driver profiles
      const userIds = data?.map((a: any) => a.driver?.user_id).filter(Boolean) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", userIds);

        return data?.map((agreement: any) => ({
          ...agreement,
          driverProfile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
        }));
      }

      return data;
    },
  });

  // Fetch unpaid invoices for this company
  const { data: unpaidInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["company-unpaid-invoices", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          id,
          invoice_number,
          invoice_number_generated,
          amount,
          payment_status,
          created_at,
          driver_id,
          course_id,
          courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq("company_id", companyId)
        .neq("payment_status", "paid")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing company payments
  const { data: companyPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ["company-payments-tracking", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_payments")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Mark payment as sent mutation
  const markPaymentSentMutation = useMutation({
    mutationFn: async ({ payment, reference, document }: { payment: GroupedPayment; reference: string; document?: File }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Create company_payments record
      const { data, error } = await supabase
        .from("company_payments")
        .insert({
          company_id: companyId,
          driver_id: payment.driverId,
          agreement_id: payment.agreementId,
          amount: payment.totalAmount,
          payment_method: payment.paymentMethods[0] || "virement",
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_by_user_id: userId,
          payment_reference: reference,
          period_start: payment.periodStart.toISOString(),
          period_end: payment.periodEnd.toISOString(),
          course_ids: payment.invoices.map((i: any) => i.course_id),
          courses_count: payment.invoiceCount
        })
        .select()
        .single();

      if (error) throw error;

      // Upload document if provided
      if (document && data) {
        const fileExt = document.name.split('.').pop();
        const fileName = `${data.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-documents')
          .upload(fileName, document);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('payment-documents')
            .getPublicUrl(fileName);

          await supabase
            .from('company_payment_documents')
            .insert({
              payment_id: data.id,
              document_url: urlData.publicUrl,
              document_type: 'proof_of_payment',
              file_name: document.name,
              uploaded_by_user_id: userId,
            });
        }
      }

      // Create notification for driver
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", payment.driverId)
        .single();

      if (driverData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "💸 Paiement envoyé",
          message: `Un paiement de ${payment.totalAmount.toFixed(2)}€ a été envoyé. Référence: ${reference || "N/A"}`,
          type: "payment",
          link: "/driver-dashboard?tab=company-payments"
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-payments-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["company-unpaid-invoices"] });
      toast.success("Paiement marqué comme envoyé");
      setShowSendPaymentDialog(false);
      setSelectedPayment(null);
      setPaymentReference("");
      setDocumentFile(null);
    },
    onError: (error) => {
      console.error("Error marking payment as sent:", error);
      toast.error("Erreur lors de l'envoi du paiement");
    }
  });

  // Group invoices by driver and payment period
  const groupedPayments = useMemo(() => {
    if (!agreements || !unpaidInvoices) return [];

    const today = new Date();
    const groups: GroupedPayment[] = [];

    // Group invoices by driver
    const invoicesByDriver = unpaidInvoices.reduce((acc: any, invoice: any) => {
      if (!acc[invoice.driver_id]) {
        acc[invoice.driver_id] = [];
      }
      acc[invoice.driver_id].push(invoice);
      return acc;
    }, {});

    // Check for existing sent payments
    const sentPaymentsByDriver = (companyPayments || []).reduce((acc: any, payment: any) => {
      if (payment.status === "sent" || payment.status === "received") {
        const key = `${payment.driver_id}-${payment.period_start}`;
        acc[key] = payment;
      }
      return acc;
    }, {});

    // Process each driver's invoices according to their payment agreement
    agreements?.forEach((agreement: any) => {
      const driverInvoices = invoicesByDriver[agreement.driver_id] || [];
      if (driverInvoices.length === 0) return;

      const paymentFrequency = agreement.payment_frequency || "per_course";
      const paymentDay = agreement.payment_day || 1;

      if (paymentFrequency === "per_course") {
        driverInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const dueDate = addDays(invoiceDate, 7);
          const paymentKey = `${agreement.driver_id}-${invoiceDate.toISOString()}`;
          const existingPayment = sentPaymentsByDriver[paymentKey];
          
          groups.push({
            driverId: agreement.driver_id,
            driverName: agreement.driverProfile?.full_name || "Chauffeur",
            driverCompany: agreement.driver?.company_name || "",
            driverPhoto: agreement.driverProfile?.profile_photo_url,
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount: invoice.amount,
            invoiceCount: 1,
            invoices: [invoice],
            periodStart: invoiceDate,
            periodEnd: invoiceDate,
            dueDate,
            status: existingPayment?.status === "received" ? 'received' : 
                   existingPayment?.status === "sent" ? 'sent' :
                   dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: existingPayment?.id,
            sentAt: existingPayment?.sent_at ? new Date(existingPayment.sent_at) : undefined,
            paymentReference: existingPayment?.payment_reference
          });
        });
      } else if (paymentFrequency === "weekly") {
        const weeklyGroups: { [key: string]: any[] } = {};
        
        driverInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.courses?.scheduled_date || invoice.created_at);
          const weekStart = startOfWeek(invoiceDate, { weekStartsOn: 1 });
          const weekKey = format(weekStart, "yyyy-ww");
          
          if (!weeklyGroups[weekKey]) {
            weeklyGroups[weekKey] = [];
          }
          weeklyGroups[weekKey].push(invoice);
        });

        Object.entries(weeklyGroups).forEach(([weekKey, invoices]) => {
          const firstInvoice = invoices[0];
          const invoiceDate = new Date(firstInvoice.courses?.scheduled_date || firstInvoice.created_at);
          const weekStart = startOfWeek(invoiceDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(invoiceDate, { weekStartsOn: 1 });
          const dueDate = addDays(weekEnd, paymentDay);
          const paymentKey = `${agreement.driver_id}-${weekStart.toISOString()}`;
          const existingPayment = sentPaymentsByDriver[paymentKey];

          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

          groups.push({
            driverId: agreement.driver_id,
            driverName: agreement.driverProfile?.full_name || "Chauffeur",
            driverCompany: agreement.driver?.company_name || "",
            driverPhoto: agreement.driverProfile?.profile_photo_url,
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount,
            invoiceCount: invoices.length,
            invoices,
            periodStart: weekStart,
            periodEnd: weekEnd,
            dueDate,
            status: existingPayment?.status === "received" ? 'received' : 
                   existingPayment?.status === "sent" ? 'sent' :
                   dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: existingPayment?.id,
            sentAt: existingPayment?.sent_at ? new Date(existingPayment.sent_at) : undefined,
            paymentReference: existingPayment?.payment_reference
          });
        });
      } else if (paymentFrequency === "monthly") {
        const monthlyGroups: { [key: string]: any[] } = {};
        
        driverInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.courses?.scheduled_date || invoice.created_at);
          const monthKey = format(invoiceDate, "yyyy-MM");
          
          if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = [];
          }
          monthlyGroups[monthKey].push(invoice);
        });

        Object.entries(monthlyGroups).forEach(([monthKey, invoices]) => {
          const firstInvoice = invoices[0];
          const invoiceDate = new Date(firstInvoice.courses?.scheduled_date || firstInvoice.created_at);
          const monthStart = startOfMonth(invoiceDate);
          const monthEnd = endOfMonth(invoiceDate);
          const nextMonth = addDays(monthEnd, 1);
          const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), paymentDay);
          const paymentKey = `${agreement.driver_id}-${monthStart.toISOString()}`;
          const existingPayment = sentPaymentsByDriver[paymentKey];

          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

          groups.push({
            driverId: agreement.driver_id,
            driverName: agreement.driverProfile?.full_name || "Chauffeur",
            driverCompany: agreement.driver?.company_name || "",
            driverPhoto: agreement.driverProfile?.profile_photo_url,
            agreementId: agreement.id,
            paymentFrequency,
            paymentMethods: agreement.payment_methods || [],
            paymentDay,
            totalAmount,
            invoiceCount: invoices.length,
            invoices,
            periodStart: monthStart,
            periodEnd: monthEnd,
            dueDate,
            status: existingPayment?.status === "received" ? 'received' : 
                   existingPayment?.status === "sent" ? 'sent' :
                   dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming',
            paymentId: existingPayment?.id,
            sentAt: existingPayment?.sent_at ? new Date(existingPayment.sent_at) : undefined,
            paymentReference: existingPayment?.payment_reference
          });
        });
      }
    });

    return groups.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [agreements, unpaidInvoices, companyPayments]);

  const pendingPayments = groupedPayments.filter(p => !['sent', 'received'].includes(p.status));
  const sentPayments = groupedPayments.filter(p => p.status === 'sent');
  const receivedPayments = groupedPayments.filter(p => p.status === 'received');

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalSent = sentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalReceived = receivedPayments.reduce((sum, p) => sum + p.totalAmount, 0);

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "per_course": return "À la course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return frequency;
    }
  };

  const getPeriodLabel = (payment: GroupedPayment) => {
    if (payment.paymentFrequency === "per_course") {
      return format(payment.periodStart, "d MMM yyyy", { locale: fr });
    } else if (payment.paymentFrequency === "weekly") {
      return `Semaine du ${format(payment.periodStart, "d", { locale: fr })} au ${format(payment.periodEnd, "d MMM", { locale: fr })}`;
    } else {
      return format(payment.periodStart, "MMMM yyyy", { locale: fr });
    }
  };

  const openSendPaymentDialog = (payment: GroupedPayment) => {
    setSelectedPayment(payment);
    setPaymentReference("");
    setDocumentFile(null);
    setShowSendPaymentDialog(true);
  };

  const handleSendPayment = () => {
    if (!selectedPayment) return;
    markPaymentSentMutation.mutate({ 
      payment: selectedPayment, 
      reference: paymentReference,
      document: documentFile || undefined
    });
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 10MB)");
        return;
      }
      setDocumentFile(file);
    }
  };

  const downloadRecap = (payment: GroupedPayment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("RÉCAPITULATIF DE PAIEMENT", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(getPeriodLabel(payment), pageWidth / 2, 28, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Chauffeur", 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    yPos += 7;
    doc.text(payment.driverName, 20, yPos);
    if (payment.driverCompany) {
      yPos += 5;
      doc.text(payment.driverCompany, 20, yPos);
    }
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Détail des factures", 20, yPos);
    yPos += 10;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(9);
    doc.text("N° Facture", 20, yPos);
    doc.text("Date", 70, yPos);
    doc.text("Trajet", 100, yPos);
    doc.text("Montant", pageWidth - 25, yPos, { align: "right" });
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    payment.invoices.forEach((invoice: any) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(invoice.invoice_number_generated || invoice.invoice_number || "N/A", 20, yPos);
      doc.text(format(new Date(invoice.created_at), "dd/MM/yy"), 70, yPos);
      const destination = invoice.courses?.destination_address?.substring(0, 25) + "..." || "";
      doc.text(destination, 100, yPos);
      doc.text(`${Number(invoice.amount).toFixed(2)} €`, pageWidth - 25, yPos, { align: "right" });
      yPos += 6;
    });
    
    yPos += 10;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(1);
    doc.line(pageWidth - 80, yPos - 3, pageWidth - 15, yPos - 3);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("TOTAL À PAYER:", pageWidth - 80, yPos + 5);
    doc.setFontSize(14);
    doc.text(`${payment.totalAmount.toFixed(2)} €`, pageWidth - 25, yPos + 5, { align: "right" });
    
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Date d'échéance: ${format(payment.dueDate, "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    
    const fileName = `recap-paiement-${payment.driverName.replace(/\s+/g, '-')}-${format(payment.periodStart, "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    toast.success("Récapitulatif téléchargé");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">En retard</Badge>;
      case 'due':
        return <Badge className="bg-yellow-500">À payer</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500">Envoyé</Badge>;
      case 'received':
        return <Badge className="bg-green-500">Reçu</Badge>;
      default:
        return <Badge variant="outline">À venir</Badge>;
    }
  };

  if (loadingAgreements || loadingInvoices || loadingPayments) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PaymentCard = ({ payment }: { payment: GroupedPayment }) => (
    <Card key={`${payment.driverId}-${payment.periodStart.getTime()}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={payment.driverPhoto || undefined} />
            <AvatarFallback>
              {payment.driverName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium truncate">{payment.driverName}</h4>
              {getStatusBadge(payment.status)}
            </div>
            
            {payment.driverCompany && (
              <p className="text-sm text-muted-foreground">{payment.driverCompany}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {getPeriodLabel(payment)}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {payment.invoiceCount} facture(s)
              </span>
              <Badge variant="outline" className="text-xs">
                {getFrequencyLabel(payment.paymentFrequency)}
              </Badge>
            </div>

            {payment.sentAt && (
              <p className="text-xs text-blue-600 mt-1">
                Envoyé le {format(payment.sentAt, "d MMM yyyy", { locale: fr })}
                {payment.paymentReference && ` - Réf: ${payment.paymentReference}`}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Échéance: {format(payment.dueDate, "d MMM yyyy", { locale: fr })}
                </p>
                <p className="text-lg font-bold text-primary">
                  {payment.totalAmount.toFixed(2)} €
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadRecap(payment)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                
                {!['sent', 'received'].includes(payment.status) && (
                  <Button
                    size="sm"
                    onClick={() => openSendPaymentDialog(payment)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Marquer envoyé
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paiements aux chauffeurs</h2>
        <p className="text-sm text-muted-foreground">
          Gérez et suivez vos paiements aux chauffeurs partenaires
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={pendingPayments.filter(p => p.status === 'overdue').length > 0 ? "border-destructive" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">À payer</p>
                <p className="text-xl font-bold">{totalPending.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{pendingPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Envoyés</p>
                <p className="text-xl font-bold">{totalSent.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{sentPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmés</p>
                <p className="text-xl font-bold">{totalReceived.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{receivedPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            À payer ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Envoyés ({sentPayments.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Confirmés ({receivedPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">Aucun paiement en attente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <PaymentCard key={`${payment.driverId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sentPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Send className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun paiement envoyé en attente de confirmation</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentPayments.map((payment) => (
                <PaymentCard key={`${payment.driverId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received">
          {receivedPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun paiement confirmé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedPayments.map((payment) => (
                <PaymentCard key={`${payment.driverId}-${payment.periodStart.getTime()}`} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Payment Dialog */}
      <Dialog open={showSendPaymentDialog} onOpenChange={setShowSendPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer le paiement comme envoyé</DialogTitle>
            <DialogDescription>
              Confirmez l'envoi du paiement à {selectedPayment?.driverName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Montant</span>
                  <span className="font-bold text-lg">{selectedPayment.totalAmount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                  <span>Période</span>
                  <span>{getPeriodLabel(selectedPayment)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference">Référence du paiement (optionnel)</Label>
                <Input
                  id="reference"
                  placeholder="Ex: VIR-2024-001, Stripe pi_xxx..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Numéro de virement, ID Stripe, ou toute référence utile
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document">Justificatif de paiement (optionnel)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentChange}
                    className="flex-1"
                  />
                </div>
                {documentFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="w-4 h-4" />
                    <span className="truncate">{documentFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentFile(null)}
                    >
                      ×
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  PDF, JPG ou PNG (max 10MB) - Preuve de virement, reçu, etc.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendPaymentDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendPayment}
              disabled={markPaymentSentMutation.isPending}
            >
              {markPaymentSentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
