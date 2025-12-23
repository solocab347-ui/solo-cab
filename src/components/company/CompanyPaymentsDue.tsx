import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CalendarDays
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
  status: 'upcoming' | 'due' | 'overdue';
}

export function CompanyPaymentsDue({ companyId }: CompanyPaymentsDueProps) {
  const [activeTab, setActiveTab] = useState("upcoming");

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

    // Process each driver's invoices according to their payment agreement
    agreements?.forEach((agreement: any) => {
      const driverInvoices = invoicesByDriver[agreement.driver_id] || [];
      if (driverInvoices.length === 0) return;

      const paymentFrequency = agreement.payment_frequency || "per_course";
      const paymentDay = agreement.payment_day || 1;

      if (paymentFrequency === "per_course") {
        // Each invoice is separate
        driverInvoices.forEach((invoice: any) => {
          const invoiceDate = new Date(invoice.created_at);
          const dueDate = addDays(invoiceDate, 7); // 7 days to pay
          
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
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming'
          });
        });
      } else if (paymentFrequency === "weekly") {
        // Group by week
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
          const dueDate = addDays(weekEnd, paymentDay); // Payment due X days after week ends

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
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming'
          });
        });
      } else if (paymentFrequency === "monthly") {
        // Group by month
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
          
          // Payment due on the payment_day of the next month
          const nextMonth = addDays(monthEnd, 1);
          const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), paymentDay);

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
            status: dueDate < today ? 'overdue' : dueDate <= addDays(today, 3) ? 'due' : 'upcoming'
          });
        });
      }
    });

    // Sort by due date
    return groups.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [agreements, unpaidInvoices]);

  const overduePayments = groupedPayments.filter(p => p.status === 'overdue');
  const duePayments = groupedPayments.filter(p => p.status === 'due');
  const upcomingPayments = groupedPayments.filter(p => p.status === 'upcoming');

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalDue = duePayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.totalAmount, 0);

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

  const downloadRecap = (payment: GroupedPayment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
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
    
    // Driver info
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
    
    // Invoices table header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(9);
    doc.text("N° Facture", 20, yPos);
    doc.text("Date", 70, yPos);
    doc.text("Trajet", 100, yPos);
    doc.text("Montant", pageWidth - 25, yPos, { align: "right" });
    yPos += 8;
    
    // Invoice rows
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
    
    // Total
    yPos += 10;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(1);
    doc.line(pageWidth - 80, yPos - 3, pageWidth - 15, yPos - 3);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("TOTAL À PAYER:", pageWidth - 80, yPos + 5);
    doc.setFontSize(14);
    doc.text(`${payment.totalAmount.toFixed(2)} €`, pageWidth - 25, yPos + 5, { align: "right" });
    
    // Due date
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Date d'échéance: ${format(payment.dueDate, "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    
    const fileName = `recap-paiement-${payment.driverName.replace(/\s+/g, '-')}-${format(payment.periodStart, "yyyy-MM-dd")}.pdf`;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paiements à venir</h2>
        <p className="text-sm text-muted-foreground">
          Récapitulatif des montants à payer aux chauffeurs selon vos accords
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

        <Card className={duePayments.length > 0 ? "border-yellow-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${duePayments.length > 0 ? "bg-yellow-500/10" : "bg-muted"}`}>
                <Clock className={`w-5 h-5 ${duePayments.length > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">À payer bientôt</p>
                <p className="text-xl font-bold">{totalDue.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{duePayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">À venir</p>
                <p className="text-xl font-bold">{totalUpcoming.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{upcomingPayments.length} paiement(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overdue" className={overduePayments.length > 0 ? "text-destructive" : ""}>
            En retard ({overduePayments.length})
          </TabsTrigger>
          <TabsTrigger value="due" className={duePayments.length > 0 ? "text-yellow-600" : ""}>
            À payer ({duePayments.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            À venir ({upcomingPayments.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: "overdue", data: overduePayments, empty: "Aucun paiement en retard" },
          { key: "due", data: duePayments, empty: "Aucun paiement imminent" },
          { key: "upcoming", data: upcomingPayments, empty: "Aucun paiement à venir" }
        ].map(({ key, data, empty }) => (
          <TabsContent key={key} value={key}>
            {data.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">{empty}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.map((payment, index) => (
                  <Card key={`${payment.driverId}-${index}`} className={
                    payment.status === 'overdue' ? 'border-destructive/50' :
                    payment.status === 'due' ? 'border-yellow-500/50' : ''
                  }>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Driver Photo */}
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {payment.driverPhoto ? (
                              <img 
                                src={payment.driverPhoto} 
                                alt="" 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <Car className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{payment.driverName}</span>
                              {payment.driverCompany && (
                                <span className="text-sm text-muted-foreground">• {payment.driverCompany}</span>
                              )}
                              <Badge variant="outline">
                                {getFrequencyLabel(payment.paymentFrequency)}
                              </Badge>
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

                            <div className="flex items-center gap-2 text-sm">
                              <span className={
                                payment.status === 'overdue' ? 'text-destructive font-medium' :
                                payment.status === 'due' ? 'text-yellow-600 font-medium' : 
                                'text-muted-foreground'
                              }>
                                {payment.status === 'overdue' && <AlertCircle className="w-4 h-4 inline mr-1" />}
                                {payment.status === 'due' && <Clock className="w-4 h-4 inline mr-1" />}
                                Échéance : {format(payment.dueDate, "d MMMM yyyy", { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{payment.totalAmount.toFixed(2)} €</p>
                            <div className="flex gap-1 mt-1">
                              {payment.paymentMethods.slice(0, 3).map((method: string) => (
                                <Badge key={method} variant="secondary" className="text-xs">
                                  {method === "card" && "💳"}
                                  {method === "bank_transfer" && "🏦"}
                                  {method === "cash" && "💵"}
                                  {method === "payment_link" && "🔗"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadRecap(payment)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger récap
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
