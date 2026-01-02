import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Handshake, 
  Search, 
  Building2, 
  MapPin, 
  Send, 
  Check, 
  X, 
  Clock, 
  FileText,
  Loader2,
  Users,
  Percent,
  AlertTriangle,
  Car,
  Edit
} from "lucide-react";
import { PartnershipModificationDialog } from "@/components/fleet-manager/PartnershipModificationDialog";
import { PendingModificationBanner } from "@/components/shared/PendingModificationBanner";

interface DriverFleetPartnershipsProps {
  driverId: string;
}

interface FleetManager {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  logo_url: string | null;
  description: string | null;
  driver_profile_description: string | null;
  default_partnership_commission: number | null;
  address: string | null;
  total_drivers: number | null;
  total_clients: number | null;
  show_driver_count_public?: boolean;
  show_client_count_public?: boolean;
}

interface Partnership {
  id: string;
  driver_id: string;
  fleet_manager_id: string;
  initiated_by: string;
  commission_percentage: number;
  status: string;
  fleet_manager_signed: boolean;
  driver_signed: boolean;
  contract_signed: boolean;
  proposal_message: string | null;
  rejection_reason: string | null;
  proposed_at: string;
  payment_schedule?: string;
  pending_modification?: boolean;
  pending_modification_by?: string;
  pending_new_commission?: number;
  pending_new_payment_schedule?: string;
  pending_modification_reason?: string;
  fleet_manager?: Partial<FleetManager>;
}

export const DriverFleetPartnerships = ({ driverId }: DriverFleetPartnershipsProps) => {
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [fleetManagers, setFleetManagers] = useState<FleetManager[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFleet, setSelectedFleet] = useState<FleetManager | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Modification dialog state
  const [showModificationDialog, setShowModificationDialog] = useState(false);
  const [modifyingPartnership, setModifyingPartnership] = useState<Partnership | null>(null);
  
  // Counter-proposal dialog state (for pending proposals)
  const [showCounterProposalDialog, setShowCounterProposalDialog] = useState(false);
  const [counterProposingPartnership, setCounterProposingPartnership] = useState<Partnership | null>(null);
  const [counterCommission, setCounterCommission] = useState(10);
  const [counterPaymentSchedule, setCounterPaymentSchedule] = useState("per_course");
  const [counterReason, setCounterReason] = useState("");
  const [submittingCounter, setSubmittingCounter] = useState(false);

  useEffect(() => {
    if (driverId) {
      fetchData();
    }
  }, [driverId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing partnerships
      const { data: partnershipsData, error: partErr } = await supabase
        .from("fleet_driver_partnerships")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (partErr) throw partErr;

      // Get fleet manager info for partnerships
      if (partnershipsData && partnershipsData.length > 0) {
        const fleetIds = partnershipsData.map(p => p.fleet_manager_id);
        const { data: fleetsData } = await supabase
          .from("fleet_managers")
          .select("id, company_name, contact_name, contact_email, logo_url, description, total_drivers, total_clients")
          .in("id", fleetIds);

        const partnershipsWithFleets = partnershipsData.map(p => ({
          ...p,
          fleet_manager: fleetsData?.find(f => f.id === p.fleet_manager_id)
        }));
        setPartnerships(partnershipsWithFleets as Partnership[]);
      } else {
        setPartnerships([]);
      }

      // Fetch visible fleet managers via RPC function
      const { data: visibleFleets, error: fleetErr } = await supabase
        .rpc("get_visible_fleet_managers");

      if (fleetErr) {
        console.error("Error fetching fleet managers:", fleetErr);
      } else {
        setFleetManagers(visibleFleets || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleProposePartnership = (fleet: FleetManager) => {
    setSelectedFleet(fleet);
    setProposalMessage("");
    setShowProposalDialog(true);
  };

  const submitProposal = async () => {
    if (!selectedFleet) return;
    setSubmitting(true);

    try {
      const commission = selectedFleet.default_partnership_commission || 10;

      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .insert({
          fleet_manager_id: selectedFleet.id,
          driver_id: driverId,
          initiated_by: "driver",
          commission_percentage: commission,
          proposal_message: proposalMessage || null,
          driver_signed: true,
          driver_signed_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Un partenariat existe déjà avec ce gestionnaire");
        } else {
          throw error;
        }
        return;
      }

      // Notify fleet manager
      const { data: fmData } = await supabase
        .from("fleet_managers")
        .select("user_id")
        .eq("id", selectedFleet.id)
        .single();

      if (fmData) {
        await supabase.from("notifications").insert({
          user_id: fmData.user_id,
          title: "Demande de partenariat",
          message: `Un chauffeur souhaite rejoindre votre réseau de partenaires`,
          type: "partnership",
          link: "/fleet-dashboard?tab=partnerships"
        });
      }

      toast.success("Demande envoyée !");
      setShowProposalDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error proposing partnership:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const signContract = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          driver_signed: true,
          driver_signed_at: new Date().toISOString(),
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Contrat signé !");
      fetchData();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Erreur lors de la signature");
    }
  };

  const rejectPartnership = async (partnershipId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          status: "rejected",
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Partenariat refusé");
      fetchData();
    } catch (error) {
      console.error("Error rejecting partnership:", error);
      toast.error("Erreur lors du refus");
    }
  };

  const openCounterProposal = (partnership: Partnership) => {
    setCounterProposingPartnership(partnership);
    setCounterCommission(partnership.commission_percentage);
    setCounterPaymentSchedule(partnership.payment_schedule || "per_course");
    setCounterReason("");
    setShowCounterProposalDialog(true);
  };

  const submitCounterProposal = async () => {
    if (!counterProposingPartnership) return;
    
    if (!counterReason.trim()) {
      toast.error("Veuillez indiquer la raison de votre contre-proposition");
      return;
    }
    
    setSubmittingCounter(true);
    try {
      // Update the partnership with the counter-proposal
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          commission_percentage: counterCommission,
          payment_schedule: counterPaymentSchedule,
          proposal_message: counterReason,
          initiated_by: "driver", // Flip the initiator to show it's now the driver's turn
          driver_signed: true,
          driver_signed_at: new Date().toISOString(),
          fleet_manager_signed: false, // Reset fleet manager signature to require their approval
          fleet_manager_signed_at: null,
        })
        .eq("id", counterProposingPartnership.id);

      if (error) throw error;

      // Notify fleet manager
      const { data: fmData } = await supabase
        .from("fleet_managers")
        .select("user_id")
        .eq("id", counterProposingPartnership.fleet_manager_id)
        .single();

      if (fmData) {
        await supabase.from("notifications").insert({
          user_id: fmData.user_id,
          title: "Contre-proposition reçue",
          message: `Un chauffeur a fait une contre-proposition: ${counterCommission}%`,
          type: "partnership",
          link: "/fleet-dashboard?tab=partnerships"
        });
      }

      toast.success("Contre-proposition envoyée !");
      setShowCounterProposalDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error submitting counter-proposal:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmittingCounter(false);
    }
  };

  const filteredFleets = fleetManagers.filter(f => {
    if (!searchTerm) return true;
    const name = f.company_name?.toLowerCase() || "";
    const contact = f.contact_name?.toLowerCase() || "";
    const description = f.description?.toLowerCase() || "";
    return name.includes(searchTerm.toLowerCase()) || 
           contact.includes(searchTerm.toLowerCase()) ||
           description.includes(searchTerm.toLowerCase());
  });

  // Filter out fleets with existing partnerships
  const existingPartnerFleetIds = partnerships.map(p => p.fleet_manager_id);
  const availableFleets = filteredFleets.filter(f => !existingPartnerFleetIds.includes(f.id));

  const activePartnerships = partnerships.filter(p => p.status === "accepted" && p.contract_signed);
  const pendingPartnerships = partnerships.filter(p => p.status === "pending" || (p.status === "accepted" && !p.contract_signed));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            Partenariats Gestionnaires
          </CardTitle>
          <CardDescription>
            Rejoignez des gestionnaires de flotte pour accéder à plus de clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="explore" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="explore" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Explorer</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">En attente</span>
                <span className="xs:hidden">{pendingPartnerships.length}</span>
                <span className="hidden xs:inline">({pendingPartnerships.length})</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-1.5 text-xs sm:text-sm px-2 py-2">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Actifs</span>
                <span className="xs:hidden">{activePartnerships.length}</span>
                <span className="hidden xs:inline">({activePartnerships.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Explore Tab */}
            <TabsContent value="explore" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un gestionnaire de flotte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {availableFleets.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucun gestionnaire disponible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les gestionnaires doivent activer leur profil pour les chauffeurs
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  {availableFleets.map((fleet) => (
                    <Card key={fleet.id} className="border-border/50 hover:border-primary/50 transition-colors overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-border shrink-0">
                            <AvatarImage src={fleet.logo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm sm:text-base">
                              {(fleet.company_name || "F").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate text-sm sm:text-base">{fleet.company_name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                              Géré par {fleet.contact_name}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {fleet.show_driver_count_public && (
                                <Badge variant="outline" className="text-xs py-0.5">
                                  <Car className="w-3 h-3 mr-1" />
                                  {fleet.total_drivers || 0}
                                </Badge>
                              )}
                              {fleet.show_client_count_public && (
                                <Badge variant="outline" className="text-xs py-0.5">
                                  <Users className="w-3 h-3 mr-1" />
                                  {fleet.total_clients || 0}
                                </Badge>
                              )}
                              {fleet.default_partnership_commission && (
                                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs py-0.5">
                                  <Percent className="w-3 h-3 mr-1" />
                                  {fleet.default_partnership_commission}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {fleet.driver_profile_description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 line-clamp-2">
                            {fleet.driver_profile_description}
                          </p>
                        )}
                        <Button 
                          className="w-full mt-3 sm:mt-4 gap-1.5 h-9 sm:h-10 text-xs sm:text-sm"
                          onClick={() => handleProposePartnership(fleet)}
                        >
                          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Demander à rejoindre
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-4">
              {pendingPartnerships.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucune demande en attente</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {pendingPartnerships.map((partnership) => (
                    <Card key={partnership.id} className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 ring-2 ring-warning/30">
                              <AvatarImage src={partnership.fleet_manager?.logo_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-warning/20 to-warning/5">
                                {(partnership.fleet_manager?.company_name || "F").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate text-sm sm:text-base">
                                {partnership.fleet_manager?.company_name || "Gestionnaire"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                                  <Percent className="w-3 h-3 mr-1" />
                                  {partnership.commission_percentage}%
                                </Badge>
                              </div>
                              {partnership.proposal_message && partnership.initiated_by === "fleet_manager" && (
                                <p className="text-xs sm:text-sm mt-2 italic text-muted-foreground line-clamp-2">
                                  "{partnership.proposal_message}"
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <Badge 
                                  variant={partnership.driver_signed ? "default" : "secondary"} 
                                  className={`text-xs ${partnership.driver_signed ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : ''}`}
                                >
                                  {partnership.driver_signed ? "✓ Signé" : "À signer"}
                                </Badge>
                                <Badge 
                                  variant={partnership.fleet_manager_signed ? "default" : "secondary"}
                                  className={`text-xs ${partnership.fleet_manager_signed ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : ''}`}
                                >
                                  {partnership.fleet_manager_signed ? "✓ Gestionnaire" : "Attente gest."}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 sm:shrink-0">
                            {!partnership.driver_signed && partnership.initiated_by === "fleet_manager" && (
                              <>
                                <Button size="sm" onClick={() => signContract(partnership.id)} className="flex-1 sm:flex-none gap-1.5">
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="text-xs sm:text-sm">Accepter</span>
                                </Button>
                                <Button 
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openCounterProposal(partnership)}
                                  className="flex-1 sm:flex-none gap-1.5"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span className="text-xs sm:text-sm">Contre-proposer</span>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => rejectPartnership(partnership.id, "Refusé par le chauffeur")}
                                  className="px-2.5"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {partnership.driver_signed && !partnership.fleet_manager_signed && partnership.initiated_by === "driver" && (
                              <Badge variant="secondary" className="py-1.5 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Attente réponse
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Active Tab */}
            <TabsContent value="active" className="space-y-4">
              {activePartnerships.length === 0 ? (
                <div className="text-center py-8">
                  <Handshake className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucun partenariat actif</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {activePartnerships.map((partnership) => (
                    <Card key={partnership.id} className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent overflow-hidden">
                      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                        {/* Pending modification banner */}
                        {partnership.pending_modification && (
                          <PendingModificationBanner
                            partnershipId={partnership.id}
                            pendingCommission={partnership.pending_new_commission || partnership.commission_percentage}
                            pendingPaymentSchedule={partnership.pending_new_payment_schedule || partnership.payment_schedule || "per_course"}
                            currentCommission={partnership.commission_percentage}
                            currentPaymentSchedule={partnership.payment_schedule || "per_course"}
                            reason={partnership.pending_modification_reason || ""}
                            initiatedBy={partnership.pending_modification_by as "fleet_manager" | "driver"}
                            isInitiator={partnership.pending_modification_by === "driver"}
                            onResponse={fetchData}
                          />
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-emerald-500/30 shrink-0 ring-2 ring-emerald-500/20">
                              <AvatarImage src={partnership.fleet_manager?.logo_url || undefined} />
                              <AvatarFallback className="bg-emerald-500/20 text-emerald-600">
                                {(partnership.fleet_manager?.company_name || "F").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <h3 className="font-semibold truncate text-sm sm:text-base">
                                  {partnership.fleet_manager?.company_name || "Gestionnaire"}
                                </h3>
                                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-xs">
                                  <Check className="w-3 h-3 mr-0.5" />
                                  Actif
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                {partnership.fleet_manager?.contact_name}
                              </p>
                              <Badge variant="outline" className="mt-1.5 text-xs">
                                <Percent className="w-3 h-3 mr-1" />
                                {partnership.commission_percentage}% commission
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Modify button */}
                          {!partnership.pending_modification && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto gap-1.5 h-9"
                              onClick={() => {
                                setModifyingPartnership(partnership);
                                setShowModificationDialog(true);
                              }}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="text-xs sm:text-sm">Modifier</span>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-primary" />
              Demander un partenariat
            </DialogTitle>
            <DialogDescription>
              Rejoignez {selectedFleet?.company_name} en tant que chauffeur partenaire
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                En acceptant ce partenariat, vous acceptez une commission de{" "}
                <strong>{selectedFleet?.default_partnership_commission || 10}%</strong> sur les courses effectuées via ce gestionnaire.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedFleet?.logo_url || undefined} />
                  <AvatarFallback>
                    {(selectedFleet?.company_name || "F").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedFleet?.company_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedFleet?.contact_name}</p>
                </div>
              </div>
              {selectedFleet?.driver_profile_description && (
                <p className="text-sm text-muted-foreground">{selectedFleet.driver_profile_description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Textarea
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez rejoindre ce réseau..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitProposal} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partnership Modification Dialog */}
      {modifyingPartnership && (
        <PartnershipModificationDialog
          open={showModificationDialog}
          onOpenChange={setShowModificationDialog}
          partnershipId={modifyingPartnership.id}
          currentCommission={modifyingPartnership.commission_percentage}
          currentPaymentSchedule={modifyingPartnership.payment_schedule || "per_course"}
          partnerName={modifyingPartnership.fleet_manager?.company_name || "Gestionnaire"}
          initiatorType="driver"
          onSuccess={fetchData}
        />
      )}

      {/* Counter-Proposal Dialog */}
      <Dialog open={showCounterProposalDialog} onOpenChange={setShowCounterProposalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Contre-proposition
            </DialogTitle>
            <DialogDescription>
              Proposez de nouvelles conditions à {counterProposingPartnership?.fleet_manager?.company_name}
            </DialogDescription>
          </DialogHeader>

          {counterProposingPartnership && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Proposition actuelle: <strong>{counterProposingPartnership.commission_percentage}%</strong> de commission
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Nouvelle commission (%)</Label>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={counterCommission}
                  onChange={(e) => setCounterCommission(parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">Entre 5% et 30%</p>
              </div>

              <div className="space-y-2">
                <Label>Fréquence de paiement</Label>
                <Select value={counterPaymentSchedule} onValueChange={setCounterPaymentSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_course">Par course</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="bi_weekly">Bi-mensuel</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Raison de la contre-proposition *</Label>
                <Textarea
                  placeholder="Expliquez pourquoi vous proposez ces nouvelles conditions..."
                  value={counterReason}
                  onChange={(e) => setCounterReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterProposalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitCounterProposal} disabled={submittingCounter}>
              {submittingCounter ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la contre-proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
