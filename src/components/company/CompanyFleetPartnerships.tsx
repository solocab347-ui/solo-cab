import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Loader2, Search, Users, CheckCircle, XCircle, 
  Clock, Send, Inbox, Ban, Info, Unlock, Lock, MapPin, Handshake,
  ChevronDown, ChevronUp, Euro, CreditCard, RefreshCw, EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CompanyFleetSearch } from "./CompanyFleetSearch";
import { PartnershipRejectDialog } from "@/components/shared/PartnershipRejectDialog";
import { BlockReasonDialog } from "@/components/shared/BlockReasonDialog";

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

interface CompanyFleetPartnershipsProps {
  companyId: string;
  companyProfile: {
    company_name: string;
    contact_name?: string;
    employee_count?: number;
    preferred_vehicle_types?: string[];
  };
}

// Active Fleet Agreement Card Component
function ActiveFleetAgreementCard({ 
  agreement, 
  companyId, 
  getStatusBadge, 
  getDayLabel,
  onRefresh,
  onBlock
}: { 
  agreement: any; 
  companyId: string;
  getStatusBadge: (status: string, proposedBy: string) => React.ReactNode;
  getDayLabel: (day: number, frequency: string) => string;
  onRefresh: () => void;
  onBlock: (agreement: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPayments = async () => {
    if (payments.length > 0) return;
    setLoadingPayments(true);
    try {
      const { data } = await supabase
        .from("company_fleet_payments")
        .select("*")
        .eq("agreement_id", agreement.id)
        .order("created_at", { ascending: false });
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleExpand = (isOpen: boolean) => {
    setExpanded(isOpen);
    if (isOpen) fetchPayments();
  };

  return (
    <Card className="border-green-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <Avatar className="w-14 h-14">
              <AvatarImage src={agreement.fleet_manager?.logo_url} />
              <AvatarFallback>
                <Users className="w-7 h-7" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-lg">{agreement.fleet_manager?.company_name}</h4>
              {agreement.fleet_manager?.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {agreement.fleet_manager.address}
                </p>
              )}
              {agreement.fleet_manager?.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {agreement.fleet_manager.description}
                </p>
              )}
              <p className="text-xs text-green-600 mt-2">
                Partenariat depuis le {format(new Date(agreement.accepted_at || agreement.created_at), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          {getStatusBadge(agreement.status, agreement.proposed_by)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-medium mb-2 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Paiements
            </h5>
            <div className="flex flex-wrap gap-1">
              {agreement.payment_methods?.map((method: string) => (
                <Badge key={method} variant="secondary" className="text-xs">
                  {PAYMENT_METHODS.find((m) => m.value === method)?.icon}
                </Badge>
              ))}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <h5 className="font-medium mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Fréquence
            </h5>
            <p className="text-xs">
              {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label || "Non défini"}
              {agreement.payment_day && ` - ${getDayLabel(agreement.payment_day, agreement.payment_frequency)}`}
            </p>
          </div>
        </div>

        {(agreement.total_amount > 0) && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                <Euro className="w-4 h-4" />
                Total facturé: {agreement.total_amount?.toFixed(2) || "0.00"}€
              </span>
            </div>
          </div>
        )}

        {/* Expandable section for payment management */}
        <Collapsible open={expanded} onOpenChange={handleExpand} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              {expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              Gérer le partenariat
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {loadingPayments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Historique des paiements */}
                {payments.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Historique des paiements</h5>
                    {payments.slice(0, 3).map((payment: any) => (
                      <div key={payment.id} className="p-2 bg-muted rounded-lg text-sm flex justify-between items-center">
                        <span>{payment.amount?.toFixed(2)}€</span>
                        <Badge variant={payment.status === "received" ? "default" : "secondary"}>
                          {payment.status === "received" ? "Reçu" : payment.status === "sent" ? "Envoyé" : payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Actions de gestion */}
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onBlock(agreement)}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Bloquer ce gestionnaire
                  </Button>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function CompanyFleetPartnerships({ companyId, companyProfile }: CompanyFleetPartnershipsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("search");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);

  // Fetch existing fleet agreements
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["company-fleet-agreements-full", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select(`
          *,
          fleet_manager:fleet_managers(
            id,
            company_name,
            logo_url,
            address,
            user_id,
            services_offered,
            description
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Unblock fleet mutation
  const unblockFleet = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "rejected",
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gestionnaire de flotte débloqué");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors du déblocage");
    },
  });

  // Block fleet mutation
  const blockFleet = useMutation({
    mutationFn: async ({ agreementId, reason }: { agreementId: string; reason: string }) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "blocked",
          notes: reason ? `Motif de blocage: ${reason}` : null,
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gestionnaire de flotte bloqué");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
      setShowBlockDialog(false);
      setSelectedAgreement(null);
    },
    onError: () => {
      toast.error("Erreur lors du blocage");
    },
  });

  // Accept fleet proposal
  const acceptProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "accepted",
          company_signed: true,
          company_signed_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partenariat accepté !");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation");
    },
  });

  // Reject fleet proposal
  const rejectProposal = useMutation({
    mutationFn: async ({ agreementId, reason, block }: { agreementId: string; reason: string; block: boolean }) => {
      const updateData: any = {
        status: block ? "blocked" : "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      };

      const { error } = await supabase
        .from("company_fleet_agreements")
        .update(updateData)
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.block ? "Proposition refusée et gestionnaire bloqué" : "Proposition refusée");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
      setShowRejectDialog(false);
      setSelectedAgreement(null);
    },
    onError: () => {
      toast.error("Erreur lors du refus");
    },
  });

  // Cancel sent proposal mutation
  const cancelProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .delete()
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition annulée");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation");
    },
  });

  // Relaunch rejected proposal
  const relaunchProposal = useMutation({
    mutationFn: async ({ agreementId, message }: { agreementId: string; message?: string }) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "pending",
          proposed_by: "company",
          proposal_message: message,
          rejected_at: null,
          rejection_reason: null,
          created_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition relancée avec succès");
      queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] });
    },
    onError: () => {
      toast.error("Erreur lors de la relance");
    },
  });

  const handleReject = (reason: string, block: boolean) => {
    if (selectedAgreement) {
      rejectProposal.mutate({ 
        agreementId: selectedAgreement.id, 
        reason, 
        block 
      });
    }
  };

  const handleBlock = (reason: string) => {
    if (selectedAgreement) {
      blockFleet.mutate({ 
        agreementId: selectedAgreement.id, 
        reason 
      });
    }
  };

  const openBlockDialog = (agreement: any) => {
    setSelectedAgreement(agreement);
    setShowBlockDialog(true);
  };

  const openRejectDialog = (agreement: any) => {
    setSelectedAgreement(agreement);
    setShowRejectDialog(true);
  };

  const getDayLabel = (day: number, frequency: string) => {
    if (frequency === "weekly") {
      const days = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      return days[day];
    }
    return `le ${day} du mois`;
  };

  // Filter agreements by status
  const receivedPending = agreements?.filter(
    (a) => a.status === "pending" && a.proposed_by === "fleet_manager"
  ) || [];
  
  const sentPending = agreements?.filter(
    (a) => a.status === "pending" && a.proposed_by === "company"
  ) || [];
  
  const activeAgreements = agreements?.filter(
    (a) => a.status === "accepted"
  ) || [];
  
  const blockedAgreements = agreements?.filter(
    (a) => a.status === "blocked"
  ) || [];
  
  const rejectedAgreements = agreements?.filter(
    (a) => a.status === "rejected"
  ) || [];
  
  const terminatedAgreements = agreements?.filter(
    (a) => a.status === "terminated" || a.status === "suspended"
  ) || [];

  const getStatusBadge = (status: string, proposedBy: string) => {
    switch (status) {
      case "pending":
        return proposedBy === "fleet_manager" ? (
          <Badge className="bg-blue-500"><Inbox className="w-3 h-3 mr-1" />Reçue</Badge>
        ) : (
          <Badge className="bg-yellow-500"><Send className="w-3 h-3 mr-1" />Envoyée</Badge>
        );
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "blocked":
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Bloqué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingAgreements) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Partenariats Gestionnaires de Flotte
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez vos partenariats avec les gestionnaires de flotte VTC
        </p>
      </div>

      {/* Navigation Grid 3x2 */}
      <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2 rounded-2xl">
        {/* Row 1 */}
        <button
          onClick={() => setActiveTab("search")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-150 ${
            activeTab === "search"
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-background/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === "search" ? "bg-indigo-500 text-white" : "bg-indigo-500/15 text-indigo-600"}`}>
            <Search className="w-5 h-5" />
          </div>
          <span className={`text-[11px] font-medium ${activeTab === "search" ? "text-foreground" : "text-muted-foreground"}`}>Rechercher</span>
        </button>

        <button
          onClick={() => setActiveTab("received")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-150 relative ${
            activeTab === "received"
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-background/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${activeTab === "received" ? "bg-cyan-500 text-white" : "bg-cyan-500/15 text-cyan-600"}`}>
            <Inbox className="w-5 h-5" />
            {receivedPending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                {receivedPending.length}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-medium ${activeTab === "received" ? "text-foreground" : "text-muted-foreground"}`}>Reçues</span>
        </button>

        <button
          onClick={() => setActiveTab("sent")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-150 relative ${
            activeTab === "sent"
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-background/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${activeTab === "sent" ? "bg-orange-500 text-white" : "bg-orange-500/15 text-orange-600"}`}>
            <Send className="w-5 h-5" />
            {sentPending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                {sentPending.length}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-medium ${activeTab === "sent" ? "text-foreground" : "text-muted-foreground"}`}>Envoyées</span>
        </button>

        {/* Row 2 */}
        <button
          onClick={() => setActiveTab("active")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-150 relative ${
            activeTab === "active"
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-background/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${activeTab === "active" ? "bg-teal-500 text-white" : "bg-teal-500/15 text-teal-600"}`}>
            <Handshake className="w-5 h-5" />
            {activeAgreements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                {activeAgreements.length}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-medium ${activeTab === "active" ? "text-foreground" : "text-muted-foreground"}`}>Actifs</span>
        </button>

        <button
          onClick={() => setActiveTab("blocked")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-150 relative ${
            activeTab === "blocked"
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-background/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${activeTab === "blocked" ? "bg-rose-500 text-white" : "bg-rose-500/15 text-rose-600"}`}>
            <Ban className="w-5 h-5" />
            {blockedAgreements.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                {blockedAgreements.length}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-medium ${activeTab === "blocked" ? "text-foreground" : "text-muted-foreground"}`}>Bloqués</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-150 ${
            activeTab === "history"
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-background/50"
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === "history" ? "bg-gray-500 text-white" : "bg-gray-500/15 text-gray-600"}`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className={`text-[11px] font-medium ${activeTab === "history" ? "text-foreground" : "text-muted-foreground"}`}>Historique</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "search" && (
        <CompanyFleetSearch companyId={companyId} companyProfile={companyProfile} />
      )}

      {activeTab === "received" && (
        <div className="space-y-4">
          {receivedPending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune proposition reçue</h3>
                <p className="text-muted-foreground">
                  Les gestionnaires de flotte peuvent vous envoyer des propositions de partenariat
                </p>
              </CardContent>
            </Card>
          ) : (
            receivedPending.map((agreement) => (
              <Card key={agreement.id} className="border-blue-500 border-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={agreement.fleet_manager?.logo_url} />
                        <AvatarFallback>
                          <Users className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                        {agreement.fleet_manager?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {agreement.fleet_manager.address}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                  
                  {agreement.proposal_message && (
                    <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted rounded-lg">
                      "{agreement.proposal_message}"
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openRejectDialog(agreement)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => acceptProposal.mutate(agreement.id)}
                      disabled={acceptProposal.isPending}
                    >
                      {acceptProposal.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accepter
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "sent" && (
        <div className="space-y-4">
          {sentPending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune proposition envoyée</h3>
                <p className="text-muted-foreground">
                  Vos propositions de partenariat en attente apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            sentPending.map((agreement) => (
              <Card key={agreement.id} className="border-yellow-500 border-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={agreement.fleet_manager?.logo_url} />
                        <AvatarFallback>
                          <Users className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                        {agreement.fleet_manager?.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {agreement.fleet_manager.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Envoyée le {format(new Date(agreement.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                  
                  {agreement.proposal_message && (
                    <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted rounded-lg">
                      "{agreement.proposal_message}"
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => cancelProposal.mutate(agreement.id)}
                    disabled={cancelProposal.isPending}
                  >
                    {cancelProposal.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Annuler la proposition
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "active" && (
        <div className="space-y-4">
          {activeAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun partenariat actif</h3>
                <p className="text-muted-foreground">
                  Vos partenariats avec les gestionnaires de flotte apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            activeAgreements.map((agreement) => (
              <ActiveFleetAgreementCard
                key={agreement.id}
                agreement={agreement}
                companyId={companyId}
                getStatusBadge={getStatusBadge}
                getDayLabel={getDayLabel}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["company-fleet-agreements-full"] })}
                onBlock={openBlockDialog}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "blocked" && (
        <div className="space-y-4">
          {blockedAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun gestionnaire bloqué</h3>
                <p className="text-muted-foreground">
                  Les gestionnaires que vous bloquez apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les gestionnaires bloqués ne peuvent plus vous voir dans les recherches et vice-versa.
                </AlertDescription>
              </Alert>
              
              {blockedAgreements.map((agreement) => (
                <Card key={agreement.id} className="border-destructive/40">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <Avatar className="w-14 h-14 border-2 border-destructive/20">
                          <AvatarImage src={agreement.fleet_manager?.logo_url} />
                          <AvatarFallback className="bg-destructive/10">
                            <Users className="w-7 h-7 text-destructive" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{agreement.fleet_manager?.company_name}</h4>
                          {agreement.fleet_manager?.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {agreement.fleet_manager.address}
                            </p>
                          )}
                          {agreement.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {agreement.notes}
                            </p>
                          )}
                          <Badge variant="destructive" className="mt-2">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloqué
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockFleet.mutate(agreement.id)}
                        disabled={unblockFleet.isPending}
                      >
                        {unblockFleet.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-1" />
                            Débloquer
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {rejectedAgreements.length === 0 && terminatedAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun historique</h3>
                <p className="text-muted-foreground">
                  Les partenariats refusés ou terminés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {rejectedAgreements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-muted-foreground">Refusés</h3>
                  {rejectedAgreements.map((agreement) => {
                    const isMyProposal = agreement.proposed_by === "company";
                    const rejectedDate = new Date(agreement.rejected_at || agreement.updated_at);
                    
                    return (
                      <Card key={agreement.id} className="border-destructive/30">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                            <div className="flex gap-3">
                              <Avatar className="w-14 h-14 border-2 border-destructive/20">
                                <AvatarImage src={agreement.fleet_manager?.logo_url} />
                                <AvatarFallback className="bg-destructive/10">
                                  <Users className="w-7 h-7 text-destructive" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold text-lg">{agreement.fleet_manager?.company_name}</h4>
                                {agreement.fleet_manager?.address && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {agreement.fleet_manager.address}
                                  </p>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(agreement.status, agreement.proposed_by)}
                          </div>

                          {/* Informations détaillées sur le refus */}
                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Type:</span>
                                <Badge variant="outline" className="text-xs">
                                  {isMyProposal ? "Votre proposition" : "Proposition reçue"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Refusée le:</span>
                                <span className="font-medium">
                                  {format(rejectedDate, "d MMM yyyy", { locale: fr })}
                                </span>
                              </div>
                              {agreement.rejection_reason && (
                                <div className="flex items-start gap-2 sm:col-span-2">
                                  <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5" />
                                  <span className="font-medium text-destructive">
                                    Motif: {agreement.rejection_reason}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bouton relancer si c'était notre proposition */}
                          {isMyProposal && (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => relaunchProposal.mutate({ agreementId: agreement.id })}
                              disabled={relaunchProposal.isPending}
                            >
                              {relaunchProposal.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Relancer la proposition
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {terminatedAgreements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-muted-foreground">Terminés</h3>
                  {terminatedAgreements.map((agreement) => (
                    <Card key={agreement.id} className="opacity-70">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={agreement.fleet_manager?.logo_url} />
                              <AvatarFallback>
                                <Users className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{agreement.fleet_manager?.company_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {agreement.termination_reason || "Partenariat terminé"}
                              </p>
                              {agreement.terminated_at && (
                                <p className="text-xs text-muted-foreground">
                                  Terminé le {format(new Date(agreement.terminated_at), "d MMM yyyy", { locale: fr })}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">{agreement.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Dialogs */}
      <PartnershipRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onReject={async (reason, block) => handleReject(reason, block)}
        partnerName={selectedAgreement?.fleet_manager?.company_name || "Gestionnaire"}
        partnerType="driver"
        isLoading={rejectProposal.isPending}
      />

      <BlockReasonDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        onBlock={handleBlock}
        partnerName={selectedAgreement?.fleet_manager?.company_name || "Gestionnaire"}
        partnerType="driver"
        isLoading={blockFleet.isPending}
      />
    </div>
  );
}
