import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Receipt,
  Loader2,
  RefreshCw,
  Calendar,
  MapPin,
  Euro,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getPaymentMethodLabel, getPaymentMethodIcon } from "@/components/shared/PaymentMethodSelector";

interface ExpenseReport {
  id: string;
  amount: number;
  payment_method: string;
  description: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reimbursed_at: string | null;
  rejection_reason: string | null;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
  };
}

interface EmployeeExpenseReportsProps {
  employeeId: string;
}

export function EmployeeExpenseReports({ employeeId }: EmployeeExpenseReportsProps) {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [employeeId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_reports")
        .select(`
          *,
          course:courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq("employee_id", employeeId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { 
          badge: <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">En attente</Badge>,
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          message: "En attente de validation par l'entreprise"
        };
      case "approved":
        return { 
          badge: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approuvée</Badge>,
          icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
          message: "Approuvée, en attente de remboursement"
        };
      case "rejected":
        return { 
          badge: <Badge variant="destructive">Refusée</Badge>,
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          message: "Refusée par l'entreprise"
        };
      case "reimbursed":
        return { 
          badge: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Remboursée</Badge>,
          icon: <Euro className="w-5 h-5 text-green-600" />,
          message: "Montant remboursé"
        };
      default:
        return { 
          badge: <Badge variant="secondary">{status}</Badge>,
          icon: <AlertCircle className="w-5 h-5" />,
          message: ""
        };
    }
  };

  const pendingAmount = reports
    .filter(r => r.status === "pending" || r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);

  const reimbursedAmount = reports
    .filter(r => r.status === "reimbursed")
    .reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingAmount.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{reimbursedAmount.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">Remboursé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{reports.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Mes notes de frais
        </h2>
        <Button variant="outline" size="sm" onClick={fetchReports}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Liste */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune note de frais</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les notes de frais sont créées automatiquement lorsque vous payez directement une course
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const statusInfo = getStatusInfo(report.status);
            const PaymentIcon = getPaymentMethodIcon(report.payment_method);
            
            return (
              <Card key={report.id} className={`${
                report.status === "rejected" ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : ""
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {statusInfo.icon}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{report.amount.toFixed(2)}€</span>
                          {statusInfo.badge}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <PaymentIcon className="w-3 h-3" />
                          <span>{getPaymentMethodLabel(report.payment_method)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{report.course?.pickup_address}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Course du {report.course?.scheduled_date && format(new Date(report.course.scheduled_date), "dd MMMM yyyy", { locale: fr })}
                          </span>
                        </div>

                        {report.status === "rejected" && report.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300">
                            <strong>Motif:</strong> {report.rejection_reason}
                          </div>
                        )}

                        {report.status === "reimbursed" && report.reimbursed_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Remboursé le {format(new Date(report.reimbursed_at), "dd/MM/yyyy", { locale: fr })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Soumise le</p>
                      <p>{format(new Date(report.submitted_at), "dd/MM/yy", { locale: fr })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}