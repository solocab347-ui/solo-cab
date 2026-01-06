import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Receipt, 
  Plus, 
  Loader2, 
  Euro, 
  Calendar, 
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExpenseReport {
  id: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  course_id: string | null;
  facture_id: string | null;
}

interface EmployeeExpenseReportsProps {
  employeeId: string;
  companyId: string;
}

const EXPENSE_CATEGORIES = [
  { value: "transport", label: "Transport / VTC" },
  { value: "parking", label: "Parking" },
  { value: "toll", label: "Péage" },
  { value: "meal", label: "Repas" },
  { value: "other", label: "Autre" },
];

export function EmployeeExpenseReports({ employeeId, companyId }: EmployeeExpenseReportsProps) {
  const [expenses, setExpenses] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    payment_method: "card",
    notes: "",
    receipt_url: null as string | null,
  });

  useEffect(() => {
    fetchExpenses();
  }, [employeeId]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_reports")
        .select("*")
        .eq("employee_id", employeeId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }

    setUploadingReceipt(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `expense-${employeeId}-${Date.now()}.${fileExt}`;
      const filePath = `expense-receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-documents")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, receipt_url: publicUrl }));
      toast.success("Justificatif ajouté");
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("Erreur lors de l'upload du justificatif");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Veuillez saisir un montant valide");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("expense_reports")
        .insert({
          company_id: companyId,
          employee_id: employeeId,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          payment_method: formData.payment_method,
          notes: formData.notes || null,
          receipt_url: formData.receipt_url,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Note de frais soumise !", {
        description: "Elle sera examinée par l'administration."
      });

      setShowCreateDialog(false);
      setFormData({
        amount: "",
        description: "",
        payment_method: "card",
        notes: "",
        receipt_url: null,
      });
      fetchExpenses();
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "En attente", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200" };
      case "approved":
        return { label: "Approuvée", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      case "rejected":
        return { label: "Refusée", icon: XCircle, color: "bg-red-100 text-red-700 border-red-200" };
      case "reimbursed":
        return { label: "Remboursée", icon: Euro, color: "bg-primary/10 text-primary border-primary/20" };
      default:
        return { label: status, icon: AlertCircle, color: "bg-muted text-muted-foreground" };
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-accent via-primary to-success" />
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          Notes de frais
        </CardTitle>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-accent to-success"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle note
        </Button>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Aucune note de frais</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              Vous pouvez soumettre vos frais de transport payés personnellement pour remboursement.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
              className="border-accent/30 hover:bg-accent/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une note de frais
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const statusConfig = getStatusConfig(expense.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div
                  key={expense.id}
                  className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{expense.amount.toFixed(2)} €</span>
                        <Badge variant="outline" className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground mb-2">{expense.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(expense.submitted_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                        {expense.receipt_url && (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            Justificatif
                          </a>
                        )}
                      </div>
                      {expense.rejection_reason && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                          Motif: {expense.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-accent" />
              Nouvelle note de frais
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Montant (€) *</Label>
              <div className="relative mt-1">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Ex: Course VTC Paris-Orly"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Mode de paiement</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="transfer">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes complémentaires</Label>
              <Textarea
                id="notes"
                placeholder="Détails supplémentaires..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>Justificatif</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleReceiptUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              {formData.receipt_url ? (
                <div className="mt-2 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">Justificatif ajouté</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs"
                    onClick={() => setFormData(prev => ({ ...prev, receipt_url: null }))}
                  >
                    Supprimer
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingReceipt}
                >
                  {uploadingReceipt ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Ajouter un justificatif
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-accent to-success"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Soumettre"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
