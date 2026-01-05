import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Handshake, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Building2, Euro, Search, ChevronDown, ChevronUp, Info } from "lucide-react";
import { DriverCompanySearch } from "./DriverCompanySearch";
import { PartnershipPaymentManager } from "@/components/shared/PartnershipPaymentManager";
import { PartnershipTerminationManager } from "@/components/shared/PartnershipTerminationManager";
import { PartnershipRejectDialog } from "@/components/shared/PartnershipRejectDialog";

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

// Active Driver Agreement Card Component
function ActiveDriverAgreementCard({ agreement, driverId, onRefresh }: { agreement: any; driverId: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPayments = async () => {
    if (payments.length > 0) return;
    setLoadingPayments(true);
    try {
      const { data } = await supabase.from("company_payments").select("*").eq("agreement_id", agreement.id).order("created_at", { ascending: false });
      setPayments(data || []);
    } catch (error) { console.error(error); }
    finally { setLoadingPayments(false); }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold">{agreement.company?.company_name}</h4>
            <p className="text-sm text-muted-foreground">{agreement.company?.contact_name} • {agreement.company?.contact_phone}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {agreement.payment_methods?.map((method: string) => (
                <Badge key={method} variant="secondary" className="text-xs">
                  {PAYMENT_METHODS.find((m) => m.value === method)?.icon} {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}</Badge>
            </div>
          </div>
          <div className="text-right">
            <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>
            {agreement.outstanding_balance > 0 && <p className="text-sm font-medium text-yellow-600 mt-1">À recevoir: {agreement.outstanding_balance.toFixed(2)}€</p>}
          </div>
        </div>
        <Collapsible open={expanded} onOpenChange={(o) => { setExpanded(o); if (o) fetchPayments(); }} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">{expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}Gérer le partenariat</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {loadingPayments ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
              <>
                <PartnershipPaymentManager payments={payments} partnershipId={agreement.id} partnershipType="company_driver" userRole="receiver" partnerName={agreement.company?.company_name || "Entreprise"} outstandingBalance={agreement.outstanding_balance || 0} onRefresh={() => { fetchPayments(); onRefresh(); }} />
                <PartnershipTerminationManager partnershipId={agreement.id} partnershipType="company_driver" userRole="receiver" partnerName={agreement.company?.company_name || "Entreprise"} outstandingBalance={agreement.outstanding_balance || 0} terminationPending={agreement.termination_pending_payment_validation || false} terminationRequestedBy={agreement.termination_requested_by} ownConfirmedFinalPayment={agreement.driver_confirmed_final_payment || false} partnerConfirmedFinalPayment={agreement.company_confirmed_final_payment || false} onRefresh={onRefresh} />
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function DriverCompanyAgreements({ driverId }: DriverCompanyAgreementsProps) {
  const queryClient = useQueryClient();
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState("agreements");

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

  // Reject agreement with optional blocking
  const handleRejectAgreement = async (reason: string, blockCompany: boolean) => {
    if (!selectedAgreement) return;
    
    setIsRejecting(true);
    try {
      const updateData: any = {
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      };
      
      // Si le chauffeur veut bloquer l'entreprise
      if (blockCompany) {
        updateData.driver_blocked_company = true;
        updateData.driver_blocked_company_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("company_driver_agreements")
        .update(updateData)
        .eq("id", selectedAgreement.id);

      if (error) throw error;

      toast.success(blockCompany ? "Partenariat refusé et entreprise bloquée" : "Partenariat refusé");
      queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["visible-companies"] });
      setShowRejectDialog(false);
      setSelectedAgreement(null);
    } catch (error: any) {
      toast.error("Erreur lors du refus: " + error.message);
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string, proposedBy?: string) => {
    switch (status) {
      case "pending":
        if (proposedBy === "driver") {
          return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />En attente de réponse</Badge>;
        }
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

  // Demandes reçues de l'entreprise (le chauffeur peut accepter/refuser)
  const receivedRequests = agreements?.filter((a) => a.status === "pending" && a.proposed_by === "company") || [];
  // Demandes envoyées par le chauffeur (en attente de réponse de l'entreprise)
  const sentRequests = agreements?.filter((a) => a.status === "pending" && a.proposed_by === "driver") || [];
  const activeAgreements = agreements?.filter((a) => a.status === "accepted") || [];
  const rejectedAgreements = agreements?.filter((a) => a.status === "rejected") || [];
  const otherAgreements = agreements?.filter((a) => !["pending", "accepted", "rejected"].includes(a.status)) || [];
  
  const totalPending = receivedRequests.length + sentRequests.length;

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agreements" className="flex items-center gap-2">
            <Handshake className="w-4 h-4" />
            <span className="hidden sm:inline">Mes partenariats</span>
            <span className="sm:hidden">Partenariats</span>
            {totalPending > 0 && (
              <Badge className="bg-yellow-500 ml-1">{totalPending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Rechercher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <DriverCompanySearch driverId={driverId} />
        </TabsContent>

        <TabsContent value="agreements" className="mt-6 space-y-6">
          {/* Demandes reçues de l'entreprise - Le chauffeur peut accepter/refuser */}
          {receivedRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-yellow-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Propositions reçues ({receivedRequests.length})
              </h3>
              {receivedRequests.map((agreement: any) => (
                <Card key={agreement.id} className="border-yellow-500 border-2">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{agreement.company?.company_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Contact: {agreement.company?.contact_name}
                        </p>
                      </div>
                      {getStatusBadge(agreement.status, agreement.proposed_by)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <CreditCard className="w-4 h-4" />
                          Modes de paiement proposés
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {agreement.payment_methods?.map((method: string) => (
                            <Badge key={method} variant="secondary" className="text-xs sm:text-sm">
                              {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                              {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {agreement.credit_limit > 0 && (
                        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <h5 className="font-medium mb-1 flex items-center gap-2 text-sm sm:text-base">
                            <Euro className="w-4 h-4" />
                            Limite de crédit
                          </h5>
                          <p className="text-lg font-bold">{agreement.credit_limit.toFixed(2)}€</p>
                        </div>
                      )}
                      {agreement.discount_percentage > 0 && (
                        <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <h5 className="font-medium mb-1 text-sm sm:text-base">Remise accordée</h5>
                          <p className="text-lg font-bold text-green-600">
                            -{agreement.discount_percentage}%
                          </p>
                        </div>
                      )}
                    </div>

                    {agreement.notes && (
                      <div className="p-3 sm:p-4 bg-muted rounded-lg mb-4">
                        <h5 className="font-medium mb-1 text-sm sm:text-base">Notes et conditions</h5>
                        <p className="text-sm">{agreement.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setSelectedAgreement(agreement);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Refuser
                      </Button>
                      <Button
                        className="w-full sm:w-auto"
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

          {/* Demandes envoyées par le chauffeur - En attente de réponse de l'entreprise */}
          {sentRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-blue-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Demandes envoyées ({sentRequests.length})
              </h3>
              {sentRequests.map((agreement: any) => (
                <Card key={agreement.id} className="border-blue-500 border-2">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{agreement.company?.company_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Contact: {agreement.company?.contact_name}
                        </p>
                      </div>
                      {getStatusBadge(agreement.status, agreement.proposed_by)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <CreditCard className="w-4 h-4" />
                          Modes de paiement proposés
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {agreement.payment_methods?.map((method: string) => (
                            <Badge key={method} variant="secondary" className="text-xs sm:text-sm">
                              {PAYMENT_METHODS.find((m) => m.value === method)?.icon}{" "}
                              {PAYMENT_METHODS.find((m) => m.value === method)?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                          <Clock className="w-4 h-4" />
                          Fréquence de paiement
                        </h5>
                        <p className="font-semibold">
                          {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
                        </p>
                      </div>
                    </div>

                    {agreement.driver_presentation && (
                      <div className="p-3 sm:p-4 bg-muted rounded-lg mb-4">
                        <h5 className="font-medium mb-1 text-sm sm:text-base">Votre présentation</h5>
                        <p className="text-sm">{agreement.driver_presentation}</p>
                      </div>
                    )}

                    <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm text-center text-blue-700 dark:text-blue-300">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Votre demande est en cours d'examen par l'entreprise
                      </p>
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
                <ActiveDriverAgreementCard 
                  key={agreement.id}
                  agreement={agreement}
                  driverId={driverId}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["driver-company-agreements"] })}
                />
              ))}
            </div>
          )}

          {/* Rejected Agreements - Avec affichage détaillé du motif et du blocage */}
          {rejectedAgreements.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Demandes refusées ({rejectedAgreements.length})
              </h3>
              {rejectedAgreements.map((agreement: any) => {
                const isMyRequestRejected = agreement.proposed_by === "driver";
                const rejectedDate = agreement.rejected_at 
                  ? new Date(agreement.rejected_at) 
                  : new Date(agreement.updated_at);
                
                return (
                  <Card key={agreement.id} className="border-destructive/40 bg-destructive/5">
                    <CardContent className="p-4">
                      {/* En-tête avec entreprise et statut */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-destructive" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{agreement.company?.company_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Contact: {agreement.company?.contact_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-start sm:items-end">
                          {getStatusBadge(agreement.status)}
                          {agreement.driver_blocked_company && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                              Entreprise bloquée
                            </Badge>
                          )}
                          {agreement.company_blocked_driver && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                              Vous êtes bloqué
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Informations sur le refus */}
                      <div className="p-3 rounded-lg bg-background/80 border border-destructive/20 mb-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Statut:</span>
                            <span className="font-medium text-destructive">
                              {isMyRequestRejected ? "Refusée par l'entreprise" : "Refusée par vous"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Le</span>
                            <span className="font-medium">
                              {rejectedDate.toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Origine:</span>
                            <Badge variant="outline" className="text-xs">
                              {isMyRequestRejected ? "Votre demande" : "Proposition reçue"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Motif de refus affiché clairement */}
                      {agreement.rejection_reason ? (
                        <Alert className="mb-4 bg-destructive/5 border-destructive/20">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <span className="font-medium">Motif du refus:</span>{" "}
                            <span className="text-foreground">{agreement.rejection_reason}</span>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="mb-4 bg-muted/50 border-muted">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <AlertDescription className="text-muted-foreground">
                            Aucun motif de refus communiqué
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Bouton pour refaire une demande (si non bloqué) */}
                      {!agreement.driver_blocked_company && !agreement.company_blocked_driver && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => setActiveTab("search")}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Refaire une demande
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Other Agreements (suspended, terminated, etc.) */}
          {otherAgreements.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Historique</h3>
              {otherAgreements.map((agreement: any) => (
                <Card key={agreement.id} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <h4 className="font-medium">{agreement.company?.company_name}</h4>
                        {agreement.termination_reason && (
                          <p className="text-sm text-muted-foreground">
                            Raison: {agreement.termination_reason}
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
                <p className="text-muted-foreground mb-4">
                  Les entreprises peuvent vous proposer des partenariats, ou vous pouvez les rechercher
                </p>
                <Button variant="outline" onClick={() => setActiveTab("search")}>
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher des entreprises
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog using new component */}
      <PartnershipRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        partnerName={selectedAgreement?.company?.company_name || "cette entreprise"}
        partnerType="company"
        onReject={handleRejectAgreement}
        isLoading={isRejecting}
      />
    </div>
  );
}
