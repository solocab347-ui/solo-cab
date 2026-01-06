import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  Loader2,
  RefreshCw,
  MoreVertical,
  Check,
  X,
  Euro,
  FileText,
  Calendar,
  User,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getPaymentMethodLabel, getPaymentMethodIcon } from "@/components/shared/PaymentMethodSelector";

interface ExpenseReport {
  id: string;
  amount: number;
  payment_method: string;
  description: string | null;
  receipt_url: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reimbursed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  employee: {
    id: string;
    department: string | null;
    job_title: string | null;
    profile: {
      full_name: string;
      email: string;
    };
  };
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
  };
}

interface CompanyExpenseReportsProps {
  companyId: string;
}

export function CompanyExpenseReports({ companyId }: CompanyExpenseReportsProps) {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReimburseDialog, setShowReimburseDialog] = useState(false);
  const [reimbursementMethod, setReimbursementMethod] = useState<"direct_payment" | "payroll">("direct_payment");
  const [reimbursementMonth, setReimbursementMonth] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "reimbursed">("all");

  useEffect(() => {
    fetchReports();
  }, [companyId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_reports")
        .select(`
          *,
          employee:company_employees(
            id,
            user_id,
            department,
            job_title
          ),
          course:courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq("company_id", companyId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Récupérer les profils des employés
      const reportsWithProfiles = await Promise.all(
        (data || []).map(async (report: any) => {
          if (!report.employee?.user_id) {
            return {
              ...report,
              employee: {
                ...report.employee,
                profile: { full_name: "N/A", email: "" }
              }
            };
          }
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", report.employee.user_id)
            .maybeSingle();
            
          return {
            ...report,
            employee: {
              ...report.employee,
              profile: profile || { full_name: "N/A", email: "" }
            }
          };
        })
      );

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string, extraData: any = {}) => {
    setProcessingId(reportId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("expense_reports")
        .update({
          status,
          reviewed_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
          reviewed_by: user?.id,
          reimbursed_at: status === "reimbursed" ? new Date().toISOString() : null,
          ...extraData
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success(
        status === "approved" ? "Note de frais approuvée" :
        status === "rejected" ? "Note de frais refusée" :
        status === "reimbursed" ? "Note de frais remboursée" : "Mise à jour effectuée"
      );

      fetchReports();
      setShowDetailDialog(false);
      setShowRejectDialog(false);
      setRejectionReason("");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">En attente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approuvée</Badge>;
      case "rejected":
        return <Badge variant="destructive">Refusée</Badge>;
      case "reimbursed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Remboursée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(r => filter === "all" || r.status === filter);
  const pendingCount = reports.filter(r => r.status === "pending").length;
  const totalPending = reports.filter(r => r.status === "pending" || r.status === "approved")
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalPending.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">À rembourser</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === "reimbursed").length}
            </p>
            <p className="text-xs text-muted-foreground">Remboursées</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Notes de frais
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérez les remboursements de vos collaborateurs
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {[
              { value: "all", label: "Toutes" },
              { value: "pending", label: "En attente" },
              { value: "approved", label: "Approuvées" },
              { value: "reimbursed", label: "Remboursées" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f.value as any)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucune note de frais</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const PaymentIcon = getPaymentMethodIcon(report.payment_method);
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{report.employee?.profile?.full_name || "N/A"}</p>
                            {(report.employee?.job_title || report.employee?.department) && (
                              <p className="text-xs text-muted-foreground">
                                {report.employee?.job_title}{report.employee?.job_title && report.employee?.department && " • "}{report.employee?.department}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="truncate max-w-[200px]">{report.course?.pickup_address}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.course?.scheduled_date && format(new Date(report.course.scheduled_date), "dd/MM/yy", { locale: fr })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {report.amount.toFixed(2)}€
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PaymentIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{getPaymentMethodLabel(report.payment_method)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedReport(report);
                              setShowDetailDialog(true);
                            }}>
                              <FileText className="w-4 h-4 mr-2" />
                              Détails
                            </DropdownMenuItem>
                            {report.status === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => updateReportStatus(report.id, "approved")}>
                                  <Check className="w-4 h-4 mr-2 text-green-600" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedReport(report);
                                  setShowRejectDialog(true);
                                }}>
                                  <X className="w-4 h-4 mr-2 text-red-600" />
                                  Refuser
                                </DropdownMenuItem>
                              </>
                            )}
                            {report.status === "approved" && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedReport(report);
                                setShowReimburseDialog(true);
                              }}>
                                <Euro className="w-4 h-4 mr-2 text-green-600" />
                                Déclarer remboursement
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de la note de frais</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Collaborateur</p>
                  <p className="font-medium">{selectedReport.employee?.profile?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="font-medium text-xl">{selectedReport.amount.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moyen de paiement</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedReport.payment_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date soumission</p>
                  <p className="font-medium">{format(new Date(selectedReport.submitted_at), "dd/MM/yyyy", { locale: fr })}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Course</p>
                <p className="text-sm">{selectedReport.course?.pickup_address}</p>
                <p className="text-sm">→ {selectedReport.course?.destination_address}</p>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">Statut</p>
                {getStatusBadge(selectedReport.status)}
              </div>

              {selectedReport.status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowDetailDialog(false);
                      setShowRejectDialog(true);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => updateReportStatus(selectedReport.id, "approved")}
                    disabled={processingId === selectedReport.id}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approuver
                  </Button>
                </div>
              )}

              {selectedReport.status === "approved" && (
                <Button 
                  className="w-full"
                  onClick={() => {
                    setShowDetailDialog(false);
                    setShowReimburseDialog(true);
                  }}
                >
                  <Euro className="w-4 h-4 mr-2" />
                  Déclarer remboursement
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la note de frais</DialogTitle>
            <DialogDescription>
              Indiquez la raison du refus
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Raison du refus..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectDialog(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => selectedReport && updateReportStatus(selectedReport.id, "rejected", { rejection_reason: rejectionReason })}
                disabled={!rejectionReason.trim() || processingId === selectedReport?.id}
              >
                Refuser
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reimburse Dialog */}
      <Dialog open={showReimburseDialog} onOpenChange={setShowReimburseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-emerald-600" />
              Déclarer le remboursement
            </DialogTitle>
            <DialogDescription>
              Choisissez le mode de remboursement pour cette note de frais
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-5">
              {/* Amount summary */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">Montant à rembourser</p>
                    <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {selectedReport.amount.toFixed(2)} €
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Collaborateur</p>
                    <p className="font-medium">{selectedReport.employee?.profile?.full_name}</p>
                  </div>
                </div>
              </div>

              {/* Reimbursement method selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Mode de remboursement</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReimbursementMethod("direct_payment")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      reimbursementMethod === "direct_payment"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Euro className="w-5 h-5 text-primary" />
                      <span className="font-medium">Paiement direct</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Virement ou remise immédiate
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReimbursementMethod("payroll")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      reimbursementMethod === "payroll"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="font-medium">Avec la paye</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inclus dans la prochaine fiche de paie
                    </p>
                  </button>
                </div>
              </div>

              {/* Month selection for payroll */}
              {reimbursementMethod === "payroll" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mois de la paye</label>
                  <Input
                    type="month"
                    value={reimbursementMonth}
                    onChange={(e) => setReimbursementMonth(e.target.value)}
                    className="w-full"
                    min={format(new Date(), "yyyy-MM")}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowReimburseDialog(false);
                    setReimbursementMethod("direct_payment");
                    setReimbursementMonth("");
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    updateReportStatus(selectedReport.id, "reimbursed", {
                      reimbursement_method: reimbursementMethod,
                      reimbursement_month: reimbursementMethod === "payroll" ? reimbursementMonth : null,
                    });
                    setShowReimburseDialog(false);
                    setReimbursementMethod("direct_payment");
                    setReimbursementMonth("");
                  }}
                  disabled={
                    processingId === selectedReport.id || 
                    (reimbursementMethod === "payroll" && !reimbursementMonth)
                  }
                >
                  {processingId === selectedReport.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}