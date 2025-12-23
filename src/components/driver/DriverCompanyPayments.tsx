import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Euro, 
  FileText, 
  Loader2, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  CalendarDays,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface DriverCompanyPaymentsProps {
  driverId: string;
}

interface GroupedPayment {
  companyId: string;
  companyName: string;
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
  status: 'upcoming' | 'due' | 'overdue' | 'paid';
}

export function DriverCompanyPayments({ driverId }: DriverCompanyPaymentsProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<GroupedPayment | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Fetch agreements with companies
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["driver-company-agreements", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          company_id,
          payment_frequency,
          payment_methods,
          payment_day,
          next_payment_due,
          total_billed,
          total_paid,
          outstanding_balance,
          company:companies(
            id,
            company_name,
            contact_name,
            contact_email
          )
        `)
        .eq("driver_id", driverId)
        .eq("status", "accepted");

      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices for companies
  const { data: companyInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["driver-company-invoices", driverId],
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
          company_id,
          course_id,
          courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq("driver_id", driverId)
        .not("company_id", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Group invoices by company and payment period
  const groupedPayments = useMemo(() => {
    if (!agreements || !companyInvoices) return [];

    const today = new Date();
    const groups: GroupedPayment[] = [];

    // Group invoices by company
    const invoicesByCompany = companyInvoices.reduce((acc: any, invoice: any) => {
      if (!acc[invoice.company_id]) {
        acc[invoice.company_id] = [];
      }
      acc[invoice.company_id].push(invoice);
      return acc;
    }, {});

    // Process each company's invoices
    agreements?.forEach((agreement: any) => {
      const companyInvoicesForAgreement = invoicesByCompany[agreement.company_id] || [];
      if (companyInvoicesForAgreement.length === 0) return;

      const paymentFrequency = agreement.payment_frequency || "per_course";
      const paymentDay = agreement.payment_day || 1;

      // Separate paid and unpaid
      const unpaidInvoices = companyInvoicesForAgreement.filter((i: any) => i.payment_status !== "paid");
      const paidInvoices = companyInvoicesForAgreement.filter((i: any) => i.payment_status === "paid");

      // Process unpaid invoices
      if (paymentFrequency === "per_course") {
        unpaidInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const dueDate = addDays(invoiceDate, 7);
          
          groups.push({
            companyId: agreement.company_id,
            companyName: agreement.company?.company_name || "Entreprise",
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
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming'
          });
        });
      } else if (paymentFrequency === "weekly") {
        const weeklyGroups: { [key: string]: any[] } = {};
        
        unpaidInvoices.forEach((invoice: any) => {
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

          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

          groups.push({
            companyId: agreement.company_id,
            companyName: agreement.company?.company_name || "Entreprise",
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
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming'
          });
        });
      } else if (paymentFrequency === "monthly") {
        const monthlyGroups: { [key: string]: any[] } = {};
        
        unpaidInvoices.forEach((invoice: any) => {
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

          const totalAmount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

          groups.push({
            companyId: agreement.company_id,
            companyName: agreement.company?.company_name || "Entreprise",
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
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming'
          });
        });
      }

      // Add paid invoices grouped by period for history
      // (simplified - just group all paid together for now)
      if (paidInvoices.length > 0) {
        const totalPaid = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
        const lastPaidDate = new Date(paidInvoices[paidInvoices.length - 1].created_at);
        
        groups.push({
          companyId: agreement.company_id,
          companyName: agreement.company?.company_name || "Entreprise",
          agreementId: agreement.id,
          paymentFrequency,
          paymentMethods: agreement.payment_methods || [],
          paymentDay,
          totalAmount: totalPaid,
          invoiceCount: paidInvoices.length,
          invoices: paidInvoices,
          periodStart: new Date(paidInvoices[0].created_at),
          periodEnd: lastPaidDate,
          dueDate: lastPaidDate,
          status: 'paid'
        });
      }
    });

    return groups.sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }, [agreements, companyInvoices]);

  const pendingPayments = groupedPayments.filter(p => p.status !== 'paid');
  const overduePayments = groupedPayments.filter(p => p.status === 'overdue');
  const paidPayments = groupedPayments.filter(p => p.status === 'paid');

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.totalAmount, 0);

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

  const openDispute = (payment: GroupedPayment) => {
    setSelectedPayment(payment);
    setDisputeReason("");
    setShowDisputeDialog(true);
  };

  const submitDispute = async () => {
    if (!selectedPayment || !disputeReason.trim()) {
      toast.error("Veuillez préciser le motif de la contestation");
      return;
    }

    try {
      // Create a notification for admin
      const { error } = await supabase.from("notifications").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: "Contestation de paiement",
        message: `Contestation pour ${selectedPayment.companyName} - ${selectedPayment.totalAmount.toFixed(2)}€ - ${disputeReason}`,
        type: "payment_dispute",
        link: "/driver-dashboard?tab=payments"
      });

      if (error) throw error;

      toast.success("Contestation envoyée. L'équipe SoloCab va examiner votre demande.");
      setShowDisputeDialog(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast.error("Erreur lors de l'envoi de la contestation");
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
    doc.text("RÉCAPITULATIF À PERCEVOIR", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(getPeriodLabel(payment), pageWidth / 2, 28, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Entreprise", 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    yPos += 7;
    doc.text(payment.companyName, 20, yPos);
    
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
    doc.text("TOTAL À RECEVOIR:", pageWidth - 80, yPos + 5);
    doc.setFontSize(14);
    doc.text(`${payment.totalAmount.toFixed(2)} €`, pageWidth - 25, yPos + 5, { align: "right" });
    
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Échéance prévue: ${format(payment.dueDate, "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    
    const fileName = `recap-a-percevoir-${payment.companyName.replace(/\s+/g, '-')}-${format(payment.periodStart, "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    toast.success("Récapitulatif téléchargé");
  };

  if (loadingAgreements || loadingInvoices) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agreements || agreements.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Aucun partenariat entreprise</h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore de contrat avec des entreprises.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paiements entreprises</h2>
        <p className="text-sm text-muted-foreground">
          Suivi des montants à percevoir de vos entreprises partenaires
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={overduePayments.length > 0 ? "border-destructive" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${overduePayments.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <AlertCircle className={`w-5 h-5 ${overduePayments.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-xl font-bold">{totalOverdue.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{overduePayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{totalPending.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{pendingPayments.length} paiement(s)</p>
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
                <p className="text-sm text-muted-foreground">Reçus</p>
                <p className="text-xl font-bold">{totalPaid.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{paidPayments.length} période(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className={overduePayments.length > 0 ? "text-destructive" : ""}>
            À percevoir ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Historique ({paidPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">Tous les paiements sont à jour</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment, index) => (
                <Card key={`${payment.companyId}-${index}`} className={
                  payment.status === 'overdue' ? 'border-destructive/50' :
                  payment.status === 'due' ? 'border-yellow-500/50' : ''
                }>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{payment.companyName}</span>
                            <Badge variant="outline">
                              {getFrequencyLabel(payment.paymentFrequency)}
                            </Badge>
                            {payment.status === 'overdue' && (
                              <Badge variant="destructive">En retard</Badge>
                            )}
                            {payment.status === 'due' && (
                              <Badge className="bg-yellow-500">Imminent</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {getPeriodLabel(payment)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {payment.invoiceCount} facture(s)
                            </span>
                          </div>

                          <div className="text-sm">
                            <span className={
                              payment.status === 'overdue' ? 'text-destructive font-medium' :
                              payment.status === 'due' ? 'text-yellow-600 font-medium' : 
                              'text-muted-foreground'
                            }>
                              Échéance : {format(payment.dueDate, "d MMMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">+{payment.totalAmount.toFixed(2)} €</p>
                          <p className="text-xs text-muted-foreground">À recevoir</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadRecap(payment)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                          </Button>
                          {payment.status === 'overdue' && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => openDispute(payment)}
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Contester
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid">
          {paidPayments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Euro className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun historique de paiement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paidPayments.map((payment, index) => (
                <Card key={`paid-${payment.companyId}-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{payment.companyName}</span>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">
                              Payé
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {payment.invoiceCount} facture(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">+{payment.totalAmount.toFixed(2)} €</p>
                        <p className="text-xs text-muted-foreground">Reçu</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Contester un paiement
            </DialogTitle>
            <DialogDescription>
              Signaler un problème de paiement avec {selectedPayment?.companyName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{selectedPayment?.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPayment && getPeriodLabel(selectedPayment)}
                    </p>
                  </div>
                  <p className="text-xl font-bold">{selectedPayment?.totalAmount.toFixed(2)} €</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Motif de la contestation</Label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Décrivez le problème rencontré (paiement non reçu, montant incorrect, etc.)"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={submitDispute}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Envoyer la contestation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
