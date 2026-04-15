import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock, Plus, RefreshCw, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Driver {
  id: string;
  user_id: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null };
  stripe_connect_account_id?: string | null;
}

interface Client {
  id: string;
  user_id: string;
  stripe_customer_id?: string | null;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null };
}

interface ManualOperation {
  id: string;
  admin_id: string;
  operation_type: string;
  target_type: string;
  target_driver_id: string | null;
  target_client_id: string | null;
  amount: number;
  justification: string;
  reference_course_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  status: string;
  error_message: string | null;
  notes: string | null;
  executed_at: string | null;
  created_at: string;
}

const OPERATION_TYPES = [
  { value: "driver_payout", label: "Virement chauffeur", icon: ArrowUpCircle, color: "text-green-600" },
  { value: "driver_debit", label: "Débit chauffeur", icon: ArrowDownCircle, color: "text-red-600" },
  { value: "client_refund", label: "Remboursement client", icon: RefreshCw, color: "text-blue-600" },
  { value: "client_credit", label: "Crédit client", icon: ArrowUpCircle, color: "text-emerald-600" },
  { value: "regularization", label: "Régularisation", icon: AlertTriangle, color: "text-amber-600" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  processing: { label: "En cours", variant: "secondary" },
  completed: { label: "Exécuté", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

const AdminManualOperations = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState<ManualOperation[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Form state
  const [formType, setFormType] = useState<string>("");
  const [targetType, setTargetType] = useState<string>("");
  const [targetDriverId, setTargetDriverId] = useState<string>("");
  const [targetClientId, setTargetClientId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [justification, setJustification] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [opsRes, driversRes, clientsRes] = await Promise.all([
        supabase
          .from("admin_manual_operations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("drivers")
          .select("id, user_id, stripe_connect_account_id, profiles!drivers_user_id_fkey(first_name, last_name, email)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("clients")
          .select("id, user_id, stripe_customer_id, profiles:profiles!clients_user_id_fkey(first_name, last_name, email)")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (opsRes.data) setOperations(opsRes.data as any);
      if (driversRes.data) setDrivers(driversRes.data as any);
      if (clientsRes.data) setClients(clientsRes.data as any);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormType("");
    setTargetType("");
    setTargetDriverId("");
    setTargetClientId("");
    setAmount("");
    setJustification("");
    setNotes("");
  };

  const handleTypeChange = (type: string) => {
    setFormType(type);
    if (type === "driver_payout" || type === "driver_debit") {
      setTargetType("driver");
      setTargetClientId("");
    } else if (type === "client_refund" || type === "client_credit") {
      setTargetType("client");
      setTargetDriverId("");
    } else {
      setTargetType("");
    }
  };

  const getDriverLabel = (d: Driver) => {
    const p = d.profiles;
    if (p) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      return name || p.email || d.id.slice(0, 8);
    }
    return d.id.slice(0, 8);
  };

  const getClientLabel = (c: Client) => {
    const p = c.profiles;
    if (p) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      return name || p.email || c.id.slice(0, 8);
    }
    return c.id.slice(0, 8);
  };

  const getTargetName = (op: ManualOperation) => {
    if (op.target_type === "driver" && op.target_driver_id) {
      const d = drivers.find((x) => x.id === op.target_driver_id);
      return d ? getDriverLabel(d) : op.target_driver_id.slice(0, 8);
    }
    if (op.target_type === "client" && op.target_client_id) {
      const c = clients.find((x) => x.id === op.target_client_id);
      return c ? getClientLabel(c) : op.target_client_id.slice(0, 8);
    }
    return "—";
  };

  const isFormValid = () => {
    if (!formType || !targetType || !amount || !justification.trim()) return false;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;
    if (targetType === "driver" && !targetDriverId) return false;
    if (targetType === "client" && !targetClientId) return false;
    return true;
  };

  const handleSubmitForConfirmation = () => {
    if (!isFormValid()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmAndExecute = async () => {
    if (!user) return;
    setExecuting(true);
    try {
      const numAmount = parseFloat(amount);

      // Step 1: Create the operation record
      const { data: op, error: insertErr } = await supabase
        .from("admin_manual_operations")
        .insert({
          admin_id: user.id,
          operation_type: formType,
          target_type: targetType,
          target_driver_id: targetType === "driver" ? targetDriverId : null,
          target_client_id: targetType === "client" ? targetClientId : null,
          amount: numAmount,
          justification: justification.trim(),
          notes: notes.trim() || null,
          status: "processing",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Step 2: Execute via edge function
      const { data: execResult, error: execErr } = await supabase.functions.invoke(
        "execute-admin-operation",
        {
          body: { operation_id: op.id },
        }
      );

      if (execErr) {
        // Update status to failed
        await supabase
          .from("admin_manual_operations")
          .update({ status: "failed", error_message: execErr.message })
          .eq("id", op.id);
        throw execErr;
      }

      toast.success("Opération exécutée avec succès");
      setDialogOpen(false);
      setConfirmOpen(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      console.error("Error executing operation:", err);
      toast.error(`Erreur: ${err.message || "Opération échouée"}`);
      fetchAll();
    } finally {
      setExecuting(false);
    }
  };

  const handleCancel = async (opId: string) => {
    try {
      const { error } = await supabase
        .from("admin_manual_operations")
        .update({ status: "cancelled" })
        .eq("id", opId)
        .eq("status", "pending");
      if (error) throw error;
      toast.success("Opération annulée");
      fetchAll();
    } catch (err: any) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header + New operation button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Opérations manuelles</h2>
          <p className="text-xs text-muted-foreground">Virements, remboursements et régularisations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle opération
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle opération financière</DialogTitle>
              <DialogDescription>
                Créez un virement, remboursement ou régularisation manuelle.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Operation type */}
              <div className="space-y-1.5">
                <Label>Type d'opération *</Label>
                <Select value={formType} onValueChange={handleTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {OPERATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target type for regularization */}
              {formType === "regularization" && (
                <div className="space-y-1.5">
                  <Label>Cible *</Label>
                  <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetDriverId(""); setTargetClientId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Chauffeur</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Driver selector */}
              {targetType === "driver" && (
                <div className="space-y-1.5">
                  <Label>Chauffeur *</Label>
                  <Select value={targetDriverId} onValueChange={setTargetDriverId}>
                    <SelectTrigger><SelectValue placeholder="Choisir un chauffeur..." /></SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {getDriverLabel(d)}
                          {!d.stripe_connect_account_id && " ⚠️ (pas de Stripe)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client selector */}
              {targetType === "client" && (
                <div className="space-y-1.5">
                  <Label>Client *</Label>
                  <Select value={targetClientId} onValueChange={setTargetClientId}>
                    <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {getClientLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <Label>Montant (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Justification */}
              <div className="space-y-1.5">
                <Label>Justification *</Label>
                <Textarea
                  placeholder="Raison de l'opération (obligatoire)..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes internes (optionnel)</Label>
                <Textarea
                  placeholder="Notes additionnelles..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmitForConfirmation} disabled={!isFormValid()}>
                Vérifier et exécuter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmation requise
            </DialogTitle>
            <DialogDescription>
              Vérifiez les détails avant exécution. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{OPERATION_TYPES.find((t) => t.value === formType)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cible:</span>
              <span className="font-medium">
                {targetType === "driver"
                  ? getDriverLabel(drivers.find((d) => d.id === targetDriverId) || {} as any)
                  : getClientLabel(clients.find((c) => c.id === targetClientId) || {} as any)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant:</span>
              <span className="font-bold text-lg">{parseFloat(amount || "0").toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-muted-foreground">Justification:</span>
              <p className="mt-1 text-xs bg-muted/50 p-2 rounded">{justification}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={executing}>
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmAndExecute}
              disabled={executing}
              className="gap-2"
            >
              {executing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {executing ? "Exécution..." : "Confirmer et exécuter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operations history */}
      <div className="space-y-2">
        {operations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucune opération manuelle enregistrée
            </CardContent>
          </Card>
        ) : (
          operations.map((op) => {
            const typeInfo = OPERATION_TYPES.find((t) => t.value === op.operation_type);
            const statusInfo = STATUS_MAP[op.status] || STATUS_MAP.pending;
            const Icon = typeInfo?.icon || AlertTriangle;

            return (
              <Card key={op.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${typeInfo?.color || "text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {typeInfo?.label || op.operation_type}
                        </span>
                        <Badge variant={statusInfo.variant} className="text-[10px] shrink-0">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getTargetName(op)}</span>
                        <span>•</span>
                        <span className="font-bold text-foreground">{Number(op.amount).toFixed(2)} €</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{op.justification}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{format(new Date(op.created_at), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                        <div className="flex gap-1">
                          {op.stripe_transfer_id && (
                            <Badge variant="outline" className="text-[9px]">
                              Transfer: {op.stripe_transfer_id.slice(0, 12)}...
                            </Badge>
                          )}
                          {op.stripe_refund_id && (
                            <Badge variant="outline" className="text-[9px]">
                              Refund: {op.stripe_refund_id.slice(0, 12)}...
                            </Badge>
                          )}
                        </div>
                      </div>
                      {op.error_message && (
                        <p className="text-[10px] text-destructive bg-destructive/10 p-1.5 rounded">
                          {op.error_message}
                        </p>
                      )}
                      {op.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive"
                          onClick={() => handleCancel(op.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminManualOperations;
