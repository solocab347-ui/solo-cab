import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Euro,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Ban,
  FileText,
  HandshakeIcon
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  sent_at?: string | null;
  received_at?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  courses_count?: number | null;
  created_at: string;
}

interface PartnershipPaymentManagerProps {
  payments: Payment[];
  partnershipId: string;
  partnershipType: "company_driver" | "fleet_driver";
  userRole: "payer" | "receiver"; // payer = company/fleet_manager, receiver = driver
  partnerName: string;
  outstandingBalance: number;
  onRefresh: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "💳 Carte bancaire",
  payment_link: "🔗 Lien de paiement",
  cash: "💵 Espèces",
  bank_transfer: "🏦 Virement bancaire",
};

export function PartnershipPaymentManager({
  payments,
  partnershipId,
  partnershipType,
  userRole,
  partnerName,
  outstandingBalance,
  onRefresh,
}: PartnershipPaymentManagerProps) {
  const queryClient = useQueryClient();
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("bank_transfer");
  const [newPaymentReference, setNewPaymentReference] = useState("");
  const [newPaymentNotes, setNewPaymentNotes] = useState("");

  const tableName = partnershipType === "company_driver" ? "company_payments" : "fleet_partnership_payments";
  const partnershipField = partnershipType === "company_driver" ? "agreement_id" : "partnership_id";

  // Mark payment as sent
  const markAsSent = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from(tableName)
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement marqué comme envoyé");
      onRefresh();
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // Confirm receipt
  const confirmReceipt = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from(tableName)
        .update({
          status: "received",
          received_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Réception confirmée");
      onRefresh();
    },
    onError: () => toast.error("Erreur lors de la confirmation"),
  });

  // Create new payment
  const createPayment = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(newPaymentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Montant invalide");

      const paymentData: any = {
        [partnershipField]: partnershipId,
        amount,
        payment_method: newPaymentMethod,
        payment_reference: newPaymentReference || null,
        notes: newPaymentNotes || null,
        status: "pending",
      };

      // Add company/driver IDs for company_payments
      if (partnershipType === "company_driver") {
        const { data: agreement } = await supabase
          .from("company_driver_agreements")
          .select("company_id, driver_id")
          .eq("id", partnershipId)
          .single();
        if (agreement) {
          paymentData.company_id = agreement.company_id;
          paymentData.driver_id = agreement.driver_id;
        }
      } else {
        const { data: partnership } = await supabase
          .from("fleet_driver_partnerships")
          .select("fleet_manager_id, driver_id")
          .eq("id", partnershipId)
          .single();
        if (partnership) {
          paymentData.fleet_manager_id = partnership.fleet_manager_id;
          paymentData.driver_id = partnership.driver_id;
        }
      }

      const { error } = await supabase.from(tableName).insert(paymentData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement créé");
      setShowNewPaymentDialog(false);
      setNewPaymentAmount("");
      setNewPaymentReference("");
      setNewPaymentNotes("");
      onRefresh();
    },
    onError: (error: any) => toast.error(error.message || "Erreur lors de la création"),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "sent":
        return <Badge className="bg-yellow-500"><Send className="w-3 h-3 mr-1" />Envoyé</Badge>;
      case "received":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Reçu</Badge>;
      case "disputed":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Litige</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingPayments = payments.filter(p => p.status === "pending");
  const sentPayments = payments.filter(p => p.status === "sent");
  const receivedPayments = payments.filter(p => p.status === "received");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {userRole === "payer" ? "À payer" : "À recevoir"}
            </p>
            <p className="text-2xl font-bold text-warning">{outstandingBalance.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Déjà réglé</p>
            <p className="text-2xl font-bold text-success">
              {receivedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      {userRole === "payer" && (
        <Button onClick={() => setShowNewPaymentDialog(true)} className="w-full">
          <Euro className="w-4 h-4 mr-2" />
          Enregistrer un paiement
        </Button>
      )}

      {/* Payments awaiting action */}
      {(pendingPayments.length > 0 || sentPayments.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Actions requises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userRole === "payer" && pendingPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{payment.amount.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => markAsSent.mutate(payment.id)}
                  disabled={markAsSent.isPending}
                >
                  {markAsSent.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Marquer envoyé
                    </>
                  )}
                </Button>
              </div>
            ))}

            {userRole === "receiver" && sentPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div>
                  <p className="font-medium">{payment.amount.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">
                    Envoyé le {payment.sent_at ? format(new Date(payment.sent_at), "dd/MM/yyyy", { locale: fr }) : "N/A"}
                  </p>
                  {payment.payment_reference && (
                    <p className="text-xs text-muted-foreground">Réf: {payment.payment_reference}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => confirmReceipt.mutate(payment.id)}
                  disabled={confirmReceipt.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {confirmReceipt.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Confirmer réception
                    </>
                  )}
                </Button>
              </div>
            ))}

            {userRole === "payer" && sentPayments.length > 0 && (
              <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {sentPayments.length} paiement(s) en attente de confirmation par {partnerName}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun paiement enregistré
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{payment.amount.toFixed(2)} €</span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.created_at), "dd MMM yyyy", { locale: fr })}
                      {payment.payment_reference && ` • Réf: ${payment.payment_reference}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New payment dialog */}
      <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Enregistrez un paiement pour {partnerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Méthode de paiement</Label>
              <select
                id="method"
                className="w-full p-2 border rounded-md"
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
              >
                <option value="bank_transfer">Virement bancaire</option>
                <option value="card">Carte bancaire</option>
                <option value="cash">Espèces</option>
                <option value="payment_link">Lien de paiement</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Référence (optionnel)</Label>
              <Input
                id="reference"
                placeholder="Ex: VIR-2024-001"
                value={newPaymentReference}
                onChange={(e) => setNewPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Notes supplémentaires..."
                value={newPaymentNotes}
                onChange={(e) => setNewPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPaymentDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createPayment.mutate()}
              disabled={createPayment.isPending || !newPaymentAmount}
            >
              {createPayment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
