import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Euro, 
  ArrowRight,
  Bell,
  CreditCard
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface CompanyPaymentAlertsProps {
  companyId: string;
  onNavigateToPayments: () => void;
}

interface PaymentAlert {
  driverId: string;
  driverName: string;
  driverCompany: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  invoiceCount: number;
  severity: 'critical' | 'warning' | 'info';
}

export function CompanyPaymentAlerts({ companyId, onNavigateToPayments }: CompanyPaymentAlertsProps) {
  // Fetch active agreements
  const { data: agreements } = useQuery({
    queryKey: ["company-agreements-alerts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          driver_id,
          payment_frequency,
          payment_day,
          next_payment_due,
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
          .select("id, full_name")
          .in("id", userIds);

        return data?.map((agreement: any) => ({
          ...agreement,
          driverProfile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
        }));
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch unpaid invoices
  const { data: unpaidInvoices } = useQuery({
    queryKey: ["company-unpaid-invoices-alerts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          id,
          amount,
          created_at,
          driver_id,
          course_id
        `)
        .eq("company_id", companyId)
        .neq("payment_status", "paid");

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch existing sent payments
  const { data: sentPayments } = useQuery({
    queryKey: ["company-sent-payments-alerts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_payments")
        .select("driver_id, course_ids, status")
        .eq("company_id", companyId)
        .in("status", ["sent", "received"]);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Calculate payment alerts
  const alerts = useMemo((): PaymentAlert[] => {
    if (!agreements || !unpaidInvoices) return [];

    const today = new Date();
    const alertsList: PaymentAlert[] = [];

    // Get list of already paid course IDs
    const paidCourseIds = new Set(
      sentPayments?.flatMap((p: any) => p.course_ids || []) || []
    );

    // Group unpaid invoices by driver
    const invoicesByDriver = unpaidInvoices
      .filter((inv: any) => !paidCourseIds.has(inv.course_id))
      .reduce((acc: any, invoice: any) => {
        if (!acc[invoice.driver_id]) {
          acc[invoice.driver_id] = [];
        }
        acc[invoice.driver_id].push(invoice);
        return acc;
      }, {});

    // Check each agreement
    agreements.forEach((agreement: any) => {
      const driverInvoices = invoicesByDriver[agreement.driver_id] || [];
      if (driverInvoices.length === 0) return;

      const totalAmount = driverInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
      
      // Calculate due date based on payment frequency
      let dueDate = new Date();
      const paymentDay = agreement.payment_day || 1;
      
      if (agreement.payment_frequency === "per_course") {
        // Due 7 days after oldest invoice
        const oldestInvoice = driverInvoices.reduce((oldest: any, inv: any) => 
          new Date(inv.created_at) < new Date(oldest.created_at) ? inv : oldest
        );
        dueDate = addDays(new Date(oldestInvoice.created_at), 7);
      } else if (agreement.payment_frequency === "weekly") {
        // Due on payment day after week ends
        dueDate = agreement.next_payment_due ? new Date(agreement.next_payment_due) : addDays(today, 7);
      } else if (agreement.payment_frequency === "monthly") {
        // Due on payment day of next month
        dueDate = agreement.next_payment_due ? new Date(agreement.next_payment_due) : new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
      }

      const daysOverdue = differenceInDays(today, dueDate);
      
      // Only add alert if due soon or overdue
      if (daysOverdue >= -3) { // 3 days before due or overdue
        alertsList.push({
          driverId: agreement.driver_id,
          driverName: agreement.driverProfile?.full_name || "Chauffeur",
          driverCompany: agreement.driver?.company_name || "",
          amount: totalAmount,
          dueDate,
          daysOverdue,
          invoiceCount: driverInvoices.length,
          severity: daysOverdue > 7 ? 'critical' : daysOverdue > 0 ? 'warning' : 'info'
        });
      }
    });

    return alertsList.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [agreements, unpaidInvoices, sentPayments]);

  // Calculate totals
  const totals = useMemo(() => {
    const critical = alerts.filter(a => a.severity === 'critical');
    const warning = alerts.filter(a => a.severity === 'warning');
    const info = alerts.filter(a => a.severity === 'info');
    
    return {
      criticalCount: critical.length,
      criticalAmount: critical.reduce((sum, a) => sum + a.amount, 0),
      warningCount: warning.length,
      warningAmount: warning.reduce((sum, a) => sum + a.amount, 0),
      infoCount: info.length,
      infoAmount: info.reduce((sum, a) => sum + a.amount, 0),
      totalAmount: alerts.reduce((sum, a) => sum + a.amount, 0),
      totalByDriver: alerts.reduce((acc, a) => {
        if (!acc[a.driverId]) {
          acc[a.driverId] = { name: a.driverName, company: a.driverCompany, amount: 0, invoices: 0 };
        }
        acc[a.driverId].amount += a.amount;
        acc[a.driverId].invoices += a.invoiceCount;
        return acc;
      }, {} as Record<string, { name: string; company: string; amount: number; invoices: number }>)
    };
  }, [alerts]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Critical alerts banner */}
      {totals.criticalCount > 0 && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg">
            {totals.criticalCount} paiement(s) en retard critique !
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              <span className="font-bold text-lg">{totals.criticalAmount.toFixed(2)} €</span> en retard de plus de 7 jours
            </p>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onNavigateToPayments}
              className="mt-2"
            >
              Gérer les paiements urgents
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning alerts */}
      {totals.warningCount > 0 && totals.criticalCount === 0 && (
        <Alert className="border-yellow-500 bg-yellow-500/10">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-700">
            {totals.warningCount} paiement(s) en retard
          </AlertTitle>
          <AlertDescription className="mt-2 text-yellow-700">
            <p>
              <span className="font-bold">{totals.warningAmount.toFixed(2)} €</span> à régulariser rapidement
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNavigateToPayments}
              className="mt-2 border-yellow-500 text-yellow-700 hover:bg-yellow-500/20"
            >
              Voir les paiements
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Info about upcoming payments */}
      {totals.infoCount > 0 && totals.criticalCount === 0 && totals.warningCount === 0 && (
        <Alert className="border-blue-500 bg-blue-500/10">
          <Clock className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-700">
            {totals.infoCount} paiement(s) à venir
          </AlertTitle>
          <AlertDescription className="mt-2 text-blue-700">
            <p>
              <span className="font-bold">{totals.infoAmount.toFixed(2)} €</span> à prévoir dans les prochains jours
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary by driver */}
      {Object.keys(totals.totalByDriver).length > 0 && (
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Récapitulatif par chauffeur</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(totals.totalByDriver).map(([driverId, data]) => (
                <div 
                  key={driverId}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/60 hover:bg-background transition-colors"
                >
                  <div>
                    <p className="font-medium">{data.name}</p>
                    {data.company && (
                      <p className="text-xs text-muted-foreground">{data.company}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{data.amount.toFixed(2)} €</p>
                    <p className="text-xs text-muted-foreground">{data.invoices} facture(s)</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <span className="font-semibold">Total à payer</span>
                <span className="text-lg font-bold text-primary">{totals.totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}