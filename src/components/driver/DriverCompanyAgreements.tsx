import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Handshake, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Building2, Euro } from "lucide-react";

interface DriverCompanyAgreementsProps {
  driverId: string;
}

const PAYMENT_METHODS = [
  { value: "card", label: "Carte bancaire", icon: "💳" },
  { value: "payment_link", label: "Lien de paiement", icon: "🔗" },
  { value: "cash", label: "Espèces", icon: "💵" },
  { value: "bank_transfer", label: "Virement bancaire", icon: "🏦" },
];

const PAYMENT_FREQUENCIES = [
  { value: "per_course", label: "À la course", description: "Paiement après chaque course" },
  { value: "weekly", label: "Hebdomadaire", description: "Paiement chaque semaine" },
  { value: "monthly", label: "Mensuel", description: "Paiement chaque mois" },
  { value: "mixed", label: "Mixte", description: "Selon l'accord" },
];

export function DriverCompanyAgreements({ driverId }: DriverCompanyAgreementsProps) {
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch agreements
  const { data: agreements, isLoading } = useQuery({
    queryKey: ["driver-company-agreements", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          *,
          company:companies(
            id,
            company_name,
            contact_name,
            contact_email,
            contact_phone,
            address
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Accept agreement
  const acceptAgreement = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "accepted",
          driver_signed: true,
          driver_signed_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partenariat accepté !");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation");
    },
  });

  // Reject agreement
  const rejectAgreement = useMutation({
    mutationFn: async ({ agreementId, reason }: { agreementId: string; reason: string }) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partenariat refusé");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedAgreement(null);
    },
    onError: () => {
      toast.error("Erreur lors du refus");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />En attente de votre réponse</Badge>;
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Suspendu</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDayLabel = (day: number, frequency: string) => {
    if (frequency === "weekly") {
      const days = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      return days[day];
    }
    return `le ${day} du mois`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingAgreements = agreements?.filter((a) => a.status === "pending") || [];
  const activeAgreements = agreements?.filter((a) => a.status === "accepted") || [];
  const otherAgreements = agreements?.filter((a) => !["pending", "accepted"].includes(a.status)) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Partenariats Entreprises
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez vos accords avec les entreprises clientes
        </p>
      </div>

      {/* Pending Agreements - Highlighted */}
      {pendingAgreements.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-yellow-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Propositions en attente ({pendingAgreements.length})
          </h3>
          {pendingAgreements.map((agreement: any) => (
            <Card key={agreement.id} className="border-yellow-500 border-2">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">{agreement.company?.company_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Contact: {agreement.company?.contact_name}
                    </p>
                  </div>
                  {getStatusBadge(agreement.status)}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Modes de paiement proposés
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {agreement.payment_methods?.map((method: string) => (
                        <Badge key={method} variant="secondary">
                          {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                          {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Fréquence de paiement
                    </h5>
                    <p className="font-semibold">
                      {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
                    </p>
                    {agreement.payment_day && (
                      <p className="text-sm text-muted-foreground">
                        Paiement {getDayLabel(agreement.payment_day, agreement.payment_frequency)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {agreement.credit_limit > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h5 className="font-medium mb-1 flex items-center gap-2">
                        <Euro className="w-4 h-4" />
                        Limite de crédit
                      </h5>
                      <p className="text-lg font-bold">{agreement.credit_limit.toFixed(2)}€</p>
                    </div>
                  )}
                  {agreement.discount_percentage > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h5 className="font-medium mb-1">Remise accordée</h5>
                      <p className="text-lg font-bold text-green-600">
                        -{agreement.discount_percentage}%
                      </p>
                    </div>
                  )}
                </div>

                {agreement.notes && (
                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <h5 className="font-medium mb-1">Notes et conditions</h5>
                    <p className="text-sm">{agreement.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAgreement(agreement);
                      setShowRejectDialog(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    onClick={() => acceptAgreement.mutate(agreement.id)}
                    disabled={acceptAgreement.isPending}
                  >
                    {acceptAgreement.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Accepter le partenariat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Agreements */}
      {activeAgreements.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-green-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Partenariats actifs ({activeAgreements.length})
          </h3>
          {activeAgreements.map((agreement: any) => (
            <Card key={agreement.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{agreement.company?.company_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {agreement.company?.contact_name} • {agreement.company?.contact_phone}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {agreement.payment_methods?.map((method: string) => (
                        <Badge key={method} variant="secondary" className="text-xs">
                          {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                          {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(agreement.status)}
                    {agreement.outstanding_balance > 0 && (
                      <p className="text-sm font-medium text-yellow-600 mt-1">
                        À recevoir: {agreement.outstanding_balance.toFixed(2)}€
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Other Agreements */}
      {otherAgreements.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-muted-foreground">Historique</h3>
          {otherAgreements.map((agreement: any) => (
            <Card key={agreement.id} className="opacity-70">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{agreement.company?.company_name}</h4>
                    {agreement.rejection_reason && (
                      <p className="text-sm text-muted-foreground">
                        Raison: {agreement.rejection_reason}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(agreement.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {agreements?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Aucun partenariat entreprise</h3>
            <p className="text-muted-foreground">
              Les entreprises peuvent vous proposer des partenariats avec des conditions de paiement personnalisées
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le partenariat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Expliquez brièvement la raison de votre refus (optionnel)
            </p>
            <Textarea
              placeholder="Ex: Conditions de paiement non adaptées à mon activité..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  selectedAgreement &&
                  rejectAgreement.mutate({
                    agreementId: selectedAgreement.id,
                    reason: rejectionReason,
                  })
                }
                disabled={rejectAgreement.isPending}
              >
                {rejectAgreement.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Confirmer le refus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
