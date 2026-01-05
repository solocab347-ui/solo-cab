import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Loader2, Handshake, CreditCard, Clock, CheckCircle, XCircle, 
  AlertCircle, Eye, EyeOff, Car, Star, Settings, Search,
  Send, Inbox, Ban, User, Euro, ChevronDown, ChevronUp, Users, Info, Unlock, Lock
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CompanyDriverSearch } from "./CompanyDriverSearch";
import { CompanyFleetSearch } from "./CompanyFleetSearch";
import { PartnershipPaymentManager } from "@/components/shared/PartnershipPaymentManager";
import { PartnershipTerminationManager } from "@/components/shared/PartnershipTerminationManager";
import { PartnershipRejectDialog } from "@/components/shared/PartnershipRejectDialog";
import { BlockReasonDialog } from "@/components/shared/BlockReasonDialog";
import { notificationService } from "@/lib/notificationService";

interface CompanyDriverAgreementsProps {
  companyId: string;
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

// Active Agreement Card Component
function ActiveAgreementCard({ 
  agreement, 
  companyId, 
  getStatusBadge, 
  getDayLabel,
  onRefresh 
}: { 
  agreement: any; 
  companyId: string;
  getStatusBadge: (status: string, proposedBy: string) => React.ReactNode;
  getDayLabel: (day: number, frequency: string) => string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPayments = async () => {
    if (payments.length > 0) return;
    setLoadingPayments(true);
    try {
      const { data } = await supabase
        .from("company_payments")
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
            <Avatar className="w-12 h-12">
              <AvatarImage src={agreement.driverProfile?.profile_photo_url} />
              <AvatarFallback>
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold">{agreement.driverProfile?.full_name || "Chauffeur"}</h4>
              <p className="text-sm text-muted-foreground">
                {agreement.driver?.company_name} • {agreement.driver?.vehicle_brand} {agreement.driver?.vehicle_model}
              </p>
              {agreement.driver?.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs">{agreement.driver.rating.toFixed(1)}</span>
                  {agreement.driver?.total_rides && (
                    <span className="text-xs text-muted-foreground">
                      ({agreement.driver.total_rides} courses)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(agreement.status, agreement.proposed_by)}
          </div>
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
              {PAYMENT_FREQUENCIES.find((f) => f.value === agreement.payment_frequency)?.label}
              {agreement.payment_day && ` - ${getDayLabel(agreement.payment_day, agreement.payment_frequency)}`}
            </p>
          </div>
        </div>

        {(agreement.outstanding_balance > 0) && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                <Euro className="w-4 h-4" />
                À recevoir: {agreement.outstanding_balance?.toFixed(2) || "0.00"}€
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
                <PartnershipPaymentManager
                  payments={payments}
                  partnershipId={agreement.id}
                  partnershipType="company_driver"
                  userRole="payer"
                  partnerName={agreement.driverProfile?.full_name || "Chauffeur"}
                  outstandingBalance={agreement.outstanding_balance || 0}
                  onRefresh={() => {
                    fetchPayments();
                    onRefresh();
                  }}
                />
                
                <PartnershipTerminationManager
                  partnershipId={agreement.id}
                  partnershipType="company_driver"
                  userRole="initiator"
                  partnerName={agreement.driverProfile?.full_name || "Chauffeur"}
                  outstandingBalance={agreement.outstanding_balance || 0}
                  terminationPending={agreement.termination_pending_payment_validation || false}
                  terminationRequestedBy={agreement.termination_requested_by}
                  ownConfirmedFinalPayment={agreement.company_confirmed_final_payment || false}
                  partnerConfirmedFinalPayment={agreement.driver_confirmed_final_payment || false}
                  onRefresh={onRefresh}
                />
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function CompanyDriverAgreements({ companyId }: CompanyDriverAgreementsProps) {
  const queryClient = useQueryClient();
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showProposalDetails, setShowProposalDetails] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [agreementToBlock, setAgreementToBlock] = useState<any>(null);

  // Fetch company settings
  const { data: company } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("visible_to_drivers, accepting_proposals")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Update visibility settings
  const updateVisibility = useMutation({
    mutationFn: async (settings: { visible_to_drivers?: boolean; accepting_proposals?: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update(settings)
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paramètres mis à jour");
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Fetch company full info for fleet search - MUST BE BEFORE ANY CONDITIONAL RETURNS
  const { data: companyFull } = useQuery({
    queryKey: ["company-full-info", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("company_name, contact_name, employee_count, preferred_vehicle_types")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing agreements
  const { data: agreements, isLoading: loadingAgreements } = useQuery({
    queryKey: ["company-agreements", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          *,
          driver:drivers(
            id,
            company_name,
            vehicle_model,
            vehicle_brand,
            rating,
            user_id,
            total_rides,
            show_rating_for_sharing,
            show_rides_for_sharing,
            card_photo_url
          )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch driver profiles
      const driverUserIds = data?.map((a: any) => a.driver?.user_id).filter(Boolean) || [];
      if (driverUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        return data?.map((agreement: any) => ({
          ...agreement,
          driverProfile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
        }));
      }

      return data;
    },
  });

  // Accept driver proposal
  const acceptProposal = useMutation({
    mutationFn: async (agreementId: string) => {
      // Get agreement info for notification
      const agreement = agreements?.find((a: any) => a.id === agreementId);
      
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "accepted",
          company_signed: true,
          company_signed_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        })
        .eq("id", agreementId);

      if (error) throw error;

      // Notify driver that company accepted
      if (agreement?.driver?.user_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("company_name")
          .eq("id", companyId)
          .single();
        
        await notificationService.notifyCompanyAgreementAccepted(
          agreement.driver.user_id,
          companyData?.company_name || 'L\'entreprise'
        );
      }
    },
    onSuccess: () => {
      toast.success("Partenariat accepté !");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      setShowProposalDetails(false);
      setSelectedProposal(null);
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation");
    },
  });

  // Reject driver proposal with optional blocking
  const handleRejectProposal = async (reason: string, blockDriver: boolean) => {
    if (!selectedProposal) return;
    
    setIsRejecting(true);
    try {
      const updateData: any = {
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      };
      
      // Si l'entreprise veut bloquer le chauffeur
      if (blockDriver) {
        updateData.company_blocked_driver = true;
        updateData.company_blocked_driver_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("company_driver_agreements")
        .update(updateData)
        .eq("id", selectedProposal.id);

      if (error) throw error;

      toast.success(blockDriver ? "Proposition refusée et chauffeur bloqué" : "Proposition refusée");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["visible-drivers"] });
      setShowProposalDetails(false);
      setShowRejectDialog(false);
      setSelectedProposal(null);
    } catch (error: any) {
      toast.error("Erreur lors du refus: " + error.message);
    } finally {
      setIsRejecting(false);
    }
  };

  // Block driver mutation - MUST be before conditional returns
  const blockDriver = useMutation({
    mutationFn: async ({ agreementId, blockReason }: { agreementId: string; blockReason: string }) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          company_blocked_driver: true,
          company_blocked_driver_at: new Date().toISOString(),
          notes: blockReason ? `Motif de blocage: ${blockReason}` : null,
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chauffeur bloqué. Il ne vous verra plus dans les recherches.");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["company-driver-proposals"] });
      setShowBlockDialog(false);
      setAgreementToBlock(null);
    },
    onError: () => {
      toast.error("Erreur lors du blocage");
    },
  });

  const handleBlockDriver = (reason: string) => {
    if (agreementToBlock) {
      blockDriver.mutate({ agreementId: agreementToBlock.id, blockReason: reason });
    }
  };

  const openBlockDialog = (agreement: any) => {
    setAgreementToBlock(agreement);
    setShowBlockDialog(true);
  };

  // Unblock driver mutation - MUST be before conditional returns
  const unblockDriver = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          company_blocked_driver: false,
          company_blocked_driver_at: null,
        })
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chauffeur débloqué. Vous pouvez à nouveau vous voir mutuellement.");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      queryClient.invalidateQueries({ queryKey: ["company-driver-proposals"] });
    },
    onError: () => {
      toast.error("Erreur lors du déblocage");
    },
  });

  const getStatusBadge = (status: string, proposedBy: string) => {
    switch (status) {
      case "pending":
        return proposedBy === "driver" ? (
          <Badge className="bg-blue-500"><Inbox className="w-3 h-3 mr-1" />Reçue</Badge>
        ) : (
          <Badge className="bg-yellow-500"><Send className="w-3 h-3 mr-1" />Envoyée</Badge>
        );
      case "accepted":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Suspendu</Badge>;
      case "terminated":
        return <Badge variant="outline"><Ban className="w-3 h-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDayLabel = (day: number, frequency: string) => {
    if (frequency === "weekly") {
      const days = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      return days[day];
    }
    return `le ${day} du mois`;
  };

  if (loadingAgreements) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Separate by status and origin
  const receivedPending = agreements?.filter((a: any) => a.status === "pending" && a.proposed_by === "driver") || [];
  const sentPending = agreements?.filter((a: any) => a.status === "pending" && a.proposed_by === "company") || [];
  const activeAgreements = agreements?.filter((a: any) => a.status === "accepted") || [];
  // Refusés mais non bloqués
  const rejectedAgreements = agreements?.filter((a: any) => 
    a.status === "rejected" && !a.company_blocked_driver && !a.driver_blocked_company
  ) || [];
  // Bloqués (par l'un ou l'autre)
  const blockedAgreements = agreements?.filter((a: any) => 
    a.company_blocked_driver || a.driver_blocked_company
  ) || [];
  const terminatedAgreements = agreements?.filter((a: any) => a.status === "terminated" || a.status === "suspended") || [];


  return (
    <div className="space-y-6">
      {/* Visibility Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium">Paramètres de visibilité</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  {company?.visible_to_drivers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Visible par les chauffeurs
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les chauffeurs peuvent voir votre entreprise et vous proposer leurs services
                </p>
              </div>
              <Switch
                checked={company?.visible_to_drivers || false}
                onCheckedChange={(checked) => updateVisibility.mutate({ visible_to_drivers: checked })}
              />
            </div>
            {company?.visible_to_drivers && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Accepter les propositions</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre aux chauffeurs de vous envoyer des propositions de partenariat
                  </p>
                </div>
                <Switch
                  checked={company?.accepting_proposals || false}
                  onCheckedChange={(checked) => updateVisibility.mutate({ accepting_proposals: checked })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Partnership Type Tabs */}
      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Chauffeurs
          </TabsTrigger>
          <TabsTrigger value="fleets" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Gestionnaires de flotte
          </TabsTrigger>
        </TabsList>

        {/* Drivers Tab Content */}
        <TabsContent value="drivers" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Handshake className="w-5 h-5" />
              Partenariats Chauffeurs
            </h2>
            <p className="text-sm text-muted-foreground">
              Gérez vos partenariats avec les chauffeurs VTC
            </p>
          </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Rechercher</span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            <span className="hidden sm:inline">Reçues</span>
            {receivedPending.length > 0 && (
              <Badge className="bg-blue-500 ml-1">{receivedPending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Envoyées</span>
            {sentPending.length > 0 && (
              <Badge className="bg-yellow-500 ml-1">{sentPending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Actifs</span>
            {activeAgreements.length > 0 && (
              <Badge className="bg-green-500 ml-1">{activeAgreements.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            <span className="hidden sm:inline">Bloqués</span>
            {blockedAgreements.length > 0 && (
              <Badge variant="destructive" className="ml-1">{blockedAgreements.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-6">
          <CompanyDriverSearch companyId={companyId} />
        </TabsContent>

        {/* Received Proposals Tab */}
        <TabsContent value="received" className="mt-6 space-y-4">
          {receivedPending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune proposition reçue</h3>
                <p className="text-muted-foreground">
                  {company?.visible_to_drivers 
                    ? "Les chauffeurs peuvent vous contacter via votre profil visible"
                    : "Activez la visibilité pour recevoir des propositions de chauffeurs"}
                </p>
              </CardContent>
            </Card>
          ) : (
            receivedPending.map((agreement: any) => (
              <Card key={agreement.id} className="border-blue-500 border-2">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={agreement.driverProfile?.profile_photo_url} />
                        <AvatarFallback>
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{agreement.driverProfile?.full_name || "Chauffeur"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {agreement.driver?.company_name} • {agreement.driver?.vehicle_brand} {agreement.driver?.vehicle_model}
                        </p>
                        {agreement.driver?.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs">{agreement.driver.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedProposal(agreement);
                        setShowProposalDetails(true);
                      }}
                    >
                      Voir détails
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
        </TabsContent>

        {/* Sent Proposals Tab */}
        <TabsContent value="sent" className="mt-6 space-y-4">
          {sentPending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune proposition envoyée</h3>
                <p className="text-muted-foreground">
                  Recherchez des chauffeurs et proposez-leur un partenariat
                </p>
              </CardContent>
            </Card>
          ) : (
            sentPending.map((agreement: any) => (
              <Card key={agreement.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={agreement.driverProfile?.profile_photo_url} />
                        <AvatarFallback>
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{agreement.driverProfile?.full_name || "Chauffeur"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {agreement.driver?.company_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Envoyée le {new Date(agreement.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(agreement.status, agreement.proposed_by)}
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                    <div className="flex flex-wrap gap-2">
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
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        {/* Active Agreements Tab */}
        <TabsContent value="active" className="mt-6 space-y-4">
          {activeAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun partenariat actif</h3>
                <p className="text-muted-foreground">
                  Vos partenariats acceptés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            activeAgreements.map((agreement: any) => (
              <ActiveAgreementCard 
                key={agreement.id} 
                agreement={agreement}
                companyId={companyId}
                getStatusBadge={getStatusBadge}
                getDayLabel={getDayLabel}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["company-agreements"] })}
              />
            ))
          )}
        </TabsContent>

        {/* Blocked Drivers Tab */}
        <TabsContent value="blocked" className="mt-6 space-y-4">
          {blockedAgreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucun chauffeur bloqué</h3>
                <p className="text-muted-foreground">
                  Les chauffeurs que vous bloquez ou qui vous bloquent apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les chauffeurs bloqués ne peuvent plus vous voir dans les recherches et vice-versa. 
                  Vous pouvez débloquer ceux que vous avez bloqués.
                </AlertDescription>
              </Alert>
              
              {blockedAgreements.map((agreement: any) => {
                const blockedByCompany = agreement.company_blocked_driver;
                const blockedByDriver = agreement.driver_blocked_company;
                const driver = agreement.driver;
                const driverProfile = agreement.driverProfile;
                
                // Respecter les critères de visibilité du chauffeur
                const showRating = driver?.show_rating_for_sharing !== false;
                const showRides = driver?.show_rides_for_sharing !== false;
                
                // Photo du chauffeur (priorité: profil, puis carte chauffeur)
                const driverPhoto = driverProfile?.profile_photo_url || driver?.card_photo_url;
                
                // Extraire le motif de blocage depuis les notes si présent
                const blockReasonMatch = agreement.notes?.match(/Motif de blocage: (.+)/);
                const blockReason = blockReasonMatch ? blockReasonMatch[1] : null;
                
                return (
                  <Card key={agreement.id} className="border-destructive/40">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex gap-3">
                          <Avatar className="w-16 h-16 border-2 border-destructive/20">
                            <AvatarImage src={driverPhoto} />
                            <AvatarFallback className="bg-destructive/10">
                              <User className="w-8 h-8 text-destructive" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-lg">
                              {driverProfile?.full_name || "Chauffeur"}
                            </h4>
                            {driver?.company_name && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Car className="w-3.5 h-3.5" />
                                {driver.company_name}
                              </p>
                            )}
                            {/* Véhicule */}
                            {(driver?.vehicle_brand || driver?.vehicle_model) && (
                              <p className="text-sm text-muted-foreground">
                                {driver.vehicle_brand} {driver.vehicle_model}
                              </p>
                            )}
                            {/* Note si autorisée par le chauffeur */}
                            {showRating && driver?.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                                {showRides && driver?.total_rides && (
                                  <span className="text-sm text-muted-foreground">
                                    ({driver.total_rides} courses)
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Badges de blocage */}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {blockedByCompany && (
                                <Badge variant="destructive" className="text-xs">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Bloqué par vous
                                  {agreement.company_blocked_driver_at && (
                                    <span className="ml-1 opacity-70">
                                      le {format(new Date(agreement.company_blocked_driver_at), "d MMM yyyy", { locale: fr })}
                                    </span>
                                  )}
                                </Badge>
                              )}
                              {blockedByDriver && (
                                <Badge variant="outline" className="text-xs border-destructive text-destructive">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Vous a bloqué
                                  {agreement.driver_blocked_company_at && (
                                    <span className="ml-1 opacity-70">
                                      le {format(new Date(agreement.driver_blocked_company_at), "d MMM yyyy", { locale: fr })}
                                    </span>
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {/* Débloquer seulement si bloqué par l'entreprise */}
                          {blockedByCompany && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unblockDriver.mutate(agreement.id)}
                              disabled={unblockDriver.isPending}
                              className="w-full sm:w-auto"
                            >
                              {unblockDriver.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-1" />
                                  Débloquer
                                </>
                              )}
                            </Button>
                          )}
                          {/* Si bloqué par le chauffeur, on ne peut rien faire */}
                          {blockedByDriver && !blockedByCompany && (
                            <p className="text-xs text-muted-foreground text-center sm:text-right">
                              Seul le chauffeur peut vous débloquer
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Motif du blocage si existant */}
                      {blockReason && (
                        <Alert className="mt-3 bg-destructive/5 border-destructive/20">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-sm">
                            <span className="font-medium">Motif du blocage:</span> {blockReason}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Motif de refus initial si existant */}
                      {agreement.rejection_reason && !blockReason && (
                        <Alert className="mt-3 bg-muted/50">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <span className="font-medium">Motif initial du refus:</span> {agreement.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6 space-y-4">
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
                  {rejectedAgreements.map((agreement: any) => {
                    const isMyProposal = agreement.proposed_by === "company";
                    const rejectedDate = new Date(agreement.rejected_at || agreement.updated_at);
                    const driver = agreement.driver;
                    const driverProfile = agreement.driverProfile;
                    
                    // Respecter les critères de visibilité du chauffeur
                    const showRating = driver?.show_rating_for_sharing !== false;
                    const showRides = driver?.show_rides_for_sharing !== false;
                    
                    // Photo du chauffeur (priorité: profil, puis carte chauffeur)
                    const driverPhoto = driverProfile?.profile_photo_url || driver?.card_photo_url;
                    
                    return (
                      <Card key={agreement.id} className="border-destructive/30">
                        <CardContent className="p-4">
                          {/* En-tête avec photo et infos chauffeur */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                            <div className="flex gap-3">
                              <Avatar className="w-16 h-16 border-2 border-destructive/20">
                                <AvatarImage src={driverPhoto} />
                                <AvatarFallback className="bg-destructive/10">
                                  <User className="w-8 h-8 text-destructive" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-lg">
                                  {driverProfile?.full_name || "Chauffeur"}
                                </h4>
                                {driver?.company_name && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Car className="w-3.5 h-3.5" />
                                    {driver.company_name}
                                  </p>
                                )}
                                {(driver?.vehicle_brand || driver?.vehicle_model) && (
                                  <p className="text-sm text-muted-foreground">
                                    {driver.vehicle_brand} {driver.vehicle_model}
                                  </p>
                                )}
                                {/* Note si autorisée par le chauffeur */}
                                {showRating && driver?.rating && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                                    {showRides && driver?.total_rides && (
                                      <span className="text-sm text-muted-foreground">
                                        ({driver.total_rides} courses)
                                      </span>
                                    )}
                                  </div>
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
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <XCircle className="w-3.5 h-3.5 text-destructive" />
                                <span className="font-medium text-destructive">
                                  {isMyProposal ? "Refusée par le chauffeur" : "Refusée par vous"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Motif de refus affiché clairement */}
                          {agreement.rejection_reason && (
                            <Alert className="mb-4 bg-muted/50">
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                <span className="font-medium">Motif du refus:</span> {agreement.rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Boutons d'action */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveTab("search")}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Relancer
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openBlockDialog(agreement)}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Bloquer ce chauffeur
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {terminatedAgreements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-muted-foreground">Terminés / Suspendus</h3>
                  {terminatedAgreements.map((agreement: any) => (
                    <Card key={agreement.id} className="opacity-70">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={agreement.driverProfile?.profile_photo_url} />
                              <AvatarFallback>
                                <User className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">{agreement.driverProfile?.full_name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {agreement.termination_reason || "Partenariat terminé"}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(agreement.status, agreement.proposed_by)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Fleet Managers Tab Content */}
        <TabsContent value="fleets" className="space-y-6">
          {companyFull && (
            <CompanyFleetSearch 
              companyId={companyId} 
              companyProfile={{
                company_name: companyFull.company_name,
                contact_name: companyFull.contact_name || undefined,
                employee_count: companyFull.employee_count || undefined,
                preferred_vehicle_types: companyFull.preferred_vehicle_types || undefined,
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Proposal Details Dialog */}
      <Dialog open={showProposalDetails} onOpenChange={setShowProposalDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Proposition de partenariat
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.driverProfile?.full_name} vous propose ses services
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-6 py-4">
              {/* Driver Info */}
              <div className="flex gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedProposal.driverProfile?.profile_photo_url} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedProposal.driverProfile?.full_name}</h3>
                  <p className="text-muted-foreground">{selectedProposal.driver?.company_name}</p>
                  {selectedProposal.driver?.rating && (
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{selectedProposal.driver.rating.toFixed(1)}/5</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              {selectedProposal.driver_vehicle_info && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Véhicule
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Modèle:</span>{" "}
                      {selectedProposal.driver_vehicle_info.brand} {selectedProposal.driver_vehicle_info.model}
                    </div>
                    {selectedProposal.driver_vehicle_info.year && (
                      <div>
                        <span className="text-muted-foreground">Année:</span>{" "}
                        {selectedProposal.driver_vehicle_info.year}
                      </div>
                    )}
                    {selectedProposal.driver_vehicle_info.color && (
                      <div>
                        <span className="text-muted-foreground">Couleur:</span>{" "}
                        {selectedProposal.driver_vehicle_info.color}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Passagers max:</span>{" "}
                      {selectedProposal.driver_vehicle_info.max_passengers}
                    </div>
                  </div>
                  {selectedProposal.driver_vehicle_info.equipment?.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">Équipements:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedProposal.driver_vehicle_info.equipment.map((eq: string) => (
                          <Badge key={eq} variant="outline" className="text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Driver Presentation */}
              {selectedProposal.driver_presentation && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Présentation</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedProposal.driver_presentation}</p>
                </div>
              )}

              {/* Payment Conditions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Modes de paiement
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedProposal.payment_methods?.map((method: string) => (
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
                    {PAYMENT_FREQUENCIES.find((f) => f.value === selectedProposal.payment_frequency)?.label}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedProposal.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Conditions supplémentaires</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedProposal.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  onClick={() => acceptProposal.mutate(selectedProposal.id)}
                  disabled={acceptProposal.isPending}
                >
                  {acceptProposal.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Accepter le partenariat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog using new component */}
      <PartnershipRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        partnerName={selectedProposal?.driverProfile?.full_name || "ce chauffeur"}
        partnerType="driver"
        onReject={handleRejectProposal}
        isLoading={isRejecting}
      />

      {/* Block Reason Dialog */}
      <BlockReasonDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        partnerName={agreementToBlock?.driverProfile?.full_name || "ce chauffeur"}
        partnerType="driver"
        onBlock={handleBlockDriver}
        isLoading={blockDriver.isPending}
      />
    </div>
  );
}
