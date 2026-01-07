import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, Building2, Users, Handshake, Euro, MapPin, Loader2, CheckCircle, XCircle, Ban, RefreshCw, Unlock, Lock, Clock, FileText, Eye, Route } from "lucide-react";
import { FleetDriverSearch } from "./FleetDriverSearch";
import { FleetDriverPartnerships } from "./FleetDriverPartnerships";
import { FleetCompanySearch } from "./FleetCompanySearch";
import { FleetPartnerCommissions } from "./FleetPartnerCommissions";
import { FleetPartnerCoursesSent } from "./FleetPartnerCoursesSent";
import { PartnershipSignatureConfirmation } from "@/components/shared/PartnershipSignatureConfirmation";
import { PartnershipRejectDialog } from "@/components/shared/PartnershipRejectDialog";
import { BlockReasonDialog } from "@/components/shared/BlockReasonDialog";
import { UniversalPartnershipContract } from "@/components/shared/UniversalPartnershipContract";
import { PartnerPublicProfilePreview } from "@/components/shared/PartnerPublicProfilePreview";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetPartnershipsHubProps {
  fleetManagerId: string;
  fleetManagerProfile?: {
    company_name: string;
    contact_name?: string;
    services_offered?: string[];
    total_drivers?: number;
    siret?: string;
    tva_number?: string;
    address?: string;
    contact_phone?: string;
    contact_email?: string;
  };
  defaultCommission?: number;
  initialTab?: "drivers" | "companies";
}

export function FleetPartnershipsHub({ 
  fleetManagerId, 
  fleetManagerProfile,
  defaultCommission = 10,
  initialTab = "drivers"
}: FleetPartnershipsHubProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [driverPartnershipsCount, setDriverPartnershipsCount] = useState(0);
  const [companyPartnershipsCount, setCompanyPartnershipsCount] = useState(0);
  const [pendingDriverRequests, setPendingDriverRequests] = useState(0);
  const [pendingCompanyRequests, setPendingCompanyRequests] = useState(0);

  useEffect(() => {
    loadStats();
  }, [fleetManagerId]);

  const loadStats = async () => {
    try {
      // Count active driver partnerships
      const { count: driverCount } = await supabase
        .from("fleet_driver_partnerships")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted");

      // Count active company partnerships
      const { count: companyCount } = await supabase
        .from("company_fleet_agreements")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted");

      // Count pending driver requests (initiated by drivers)
      const { count: pendingDrivers } = await supabase
        .from("fleet_driver_partnerships")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "pending")
        .eq("initiated_by", "driver");

      // Count pending company requests (initiated by companies)
      const { count: pendingCompanies } = await supabase
        .from("company_fleet_agreements")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "pending")
        .eq("proposed_by", "company");

      setDriverPartnershipsCount(driverCount || 0);
      setCompanyPartnershipsCount(companyCount || 0);
      setPendingDriverRequests(pendingDrivers || 0);
      setPendingCompanyRequests(pendingCompanies || 0);
    } catch (error) {
      console.error("Error loading partnership stats:", error);
    }
  };

  const totalPending = pendingDriverRequests + pendingCompanyRequests;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-info/10 border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Gestion des Partenariats
          </CardTitle>
          <CardDescription>
            Recherchez et gérez vos partenariats avec les chauffeurs indépendants et les entreprises
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{driverPartnershipsCount}</div>
              <div className="text-xs text-muted-foreground">Chauffeurs partenaires</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-info">{companyPartnershipsCount}</div>
              <div className="text-xs text-muted-foreground">Entreprises partenaires</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-warning">{pendingDriverRequests}</div>
              <div className="text-xs text-muted-foreground">Demandes chauffeurs</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">{pendingCompanyRequests}</div>
              <div className="text-xs text-muted-foreground">Demandes entreprises</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger 
            value="drivers" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white"
          >
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Chauffeurs</span>
            {(driverPartnershipsCount > 0 || pendingDriverRequests > 0) && (
              <Badge 
                variant={pendingDriverRequests > 0 ? "destructive" : "secondary"} 
                className="ml-1 h-5 min-w-5 flex items-center justify-center"
              >
                {pendingDriverRequests > 0 ? pendingDriverRequests : driverPartnershipsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="courses" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-warning data-[state=active]:to-orange-600 data-[state=active]:text-white"
          >
            <Route className="w-4 h-4" />
            <span className="hidden sm:inline">Missions</span>
          </TabsTrigger>
          <TabsTrigger 
            value="companies" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-info data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Entreprises</span>
            {(companyPartnershipsCount > 0 || pendingCompanyRequests > 0) && (
              <Badge 
                variant={pendingCompanyRequests > 0 ? "destructive" : "secondary"} 
                className="ml-1 h-5 min-w-5 flex items-center justify-center"
              >
                {pendingCompanyRequests > 0 ? pendingCompanyRequests : companyPartnershipsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="commissions" 
            className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white"
          >
            <Euro className="w-4 h-4" />
            <span className="hidden sm:inline">Commissions</span>
          </TabsTrigger>
        </TabsList>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <Tabs defaultValue="partnerships" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="partnerships">
                <Handshake className="w-4 h-4 mr-2" />
                Mes Partenariats
                {pendingDriverRequests > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 animate-pulse">
                    {pendingDriverRequests}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search">
                <Users className="w-4 h-4 mr-2" />
                Rechercher
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partnerships">
              <FleetDriverPartnerships 
                fleetManagerId={fleetManagerId} 
                defaultCommission={defaultCommission}
              />
            </TabsContent>

            <TabsContent value="search">
              <FleetDriverSearch fleetManagerId={fleetManagerId} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Courses/Missions Tab */}
        <TabsContent value="courses" className="space-y-6">
          <FleetPartnerCoursesSent fleetManagerId={fleetManagerId} />
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-6">
          <Tabs defaultValue="search" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="partnerships">
                <Handshake className="w-4 h-4 mr-2" />
                Mes Partenariats
                {pendingCompanyRequests > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 animate-pulse">
                    {pendingCompanyRequests}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search">
                <Building2 className="w-4 h-4 mr-2" />
                Rechercher
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partnerships">
              <FleetCompanyPartnerships 
                fleetManagerId={fleetManagerId} 
                fleetManagerProfile={fleetManagerProfile}
              />
            </TabsContent>

            <TabsContent value="search">
              <FleetCompanySearch 
                fleetManagerId={fleetManagerId}
                fleetManagerProfile={fleetManagerProfile}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <FleetPartnerCommissions fleetManagerId={fleetManagerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component for managing existing company partnerships
function FleetCompanyPartnerships({ fleetManagerId, fleetManagerProfile }: { 
  fleetManagerId: string;
  fleetManagerProfile?: {
    company_name: string;
    contact_name?: string;
    siret?: string;
    tva_number?: string;
    address?: string;
    contact_phone?: string;
    contact_email?: string;
  };
}) {
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [selectedPartnership, setSelectedPartnership] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [relaunching, setRelaunching] = useState(false);

  useEffect(() => {
    fetchPartnerships();
  }, [fleetManagerId]);

  const fetchPartnerships = async () => {
    try {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select(`
          *,
          company:companies(
            id,
            company_name,
            contact_name,
            contact_email,
            contact_phone,
            address,
            logo_url,
            employee_count,
            siret,
            tva_number,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartnerships(data || []);
    } catch (error) {
      console.error("Error fetching company partnerships:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedPartnership) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString()
        })
        .eq("id", selectedPartnership.id);

      if (error) throw error;

      // Notify company
      if (selectedPartnership.company) {
        await supabase.from("notifications").insert({
          user_id: selectedPartnership.company.user_id,
          title: "Partenariat accepté",
          message: `${fleetManagerProfile?.company_name || "Un gestionnaire de flotte"} a accepté votre demande de partenariat`,
          type: "success",
          link: "/company-dashboard?tab=fleet-partners"
        });
      }

      toast.success("Partenariat accepté !");
      setShowSignatureDialog(false);
      setSelectedPartnership(null);
      fetchPartnerships();
    } catch (error) {
      console.error("Error accepting partnership:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (reason: string, block: boolean) => {
    if (!selectedPartnership) return;
    setRejecting(true);
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: block ? "blocked" : "rejected",
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq("id", selectedPartnership.id);

      if (error) throw error;

      toast.success(block ? "Proposition refusée et entreprise bloquée" : "Proposition refusée");
      setShowRejectDialog(false);
      setSelectedPartnership(null);
      fetchPartnerships();
    } catch (error) {
      console.error("Error rejecting partnership:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setRejecting(false);
    }
  };

  const handleBlock = async (reason: string) => {
    if (!selectedPartnership) return;
    setBlocking(true);
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "blocked",
          notes: reason ? `Motif de blocage: ${reason}` : null
        })
        .eq("id", selectedPartnership.id);

      if (error) throw error;

      toast.success("Entreprise bloquée");
      setShowBlockDialog(false);
      setSelectedPartnership(null);
      fetchPartnerships();
    } catch (error) {
      console.error("Error blocking company:", error);
      toast.error("Erreur lors du blocage");
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({ status: "rejected" })
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Entreprise débloquée");
      fetchPartnerships();
    } catch (error) {
      console.error("Error unblocking company:", error);
      toast.error("Erreur lors du déblocage");
    }
  };

  const handleRelaunch = async (partnership: any) => {
    setRelaunching(true);
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "pending",
          proposed_by: "fleet_manager",
          rejected_at: null,
          rejection_reason: null,
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", partnership.id);

      if (error) throw error;

      // Notify company
      if (partnership.company) {
        await supabase.from("notifications").insert({
          user_id: partnership.company.user_id,
          title: "Nouvelle proposition de partenariat",
          message: `${fleetManagerProfile?.company_name || "Un gestionnaire de flotte"} vous propose à nouveau un partenariat`,
          type: "partnership",
          link: "/company-dashboard?tab=fleet-partners"
        });
      }

      toast.success("Proposition relancée !");
      fetchPartnerships();
    } catch (error) {
      console.error("Error relaunching proposal:", error);
      toast.error("Erreur lors de la relance");
    } finally {
      setRelaunching(false);
    }
  };

  const handleCancel = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .delete()
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Proposition annulée");
      fetchPartnerships();
    } catch (error) {
      console.error("Error cancelling proposal:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingReceived = partnerships.filter(p => p.status === "pending" && p.proposed_by === "company");
  const pendingSent = partnerships.filter(p => p.status === "pending" && p.proposed_by === "fleet_manager");
  const activePartnerships = partnerships.filter(p => p.status === "accepted");
  const blockedPartnerships = partnerships.filter(p => p.status === "blocked");
  const rejectedPartnerships = partnerships.filter(p => p.status === "rejected");

  return (
    <div className="space-y-6">
      {/* Pending Received */}
      {pendingReceived.length > 0 && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">{pendingReceived.length}</Badge>
              Demandes d'entreprises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingReceived.map((partnership) => (
              <Card key={partnership.id} className="border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={partnership.company?.logo_url} />
                        <AvatarFallback>
                          <Building2 className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{partnership.company?.company_name}</h4>
                        <p className="text-sm text-muted-foreground">{partnership.company?.contact_name}</p>
                        {partnership.company?.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {partnership.company.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-blue-500">À traiter</Badge>
                  </div>

                  {partnership.proposal_message && (
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded-lg mb-3 line-clamp-2">
                      "{partnership.proposal_message}"
                    </p>
                  )}

                  {/* Bouton voir profil */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary mb-3"
                    onClick={() => {
                      setSelectedPartnership(partnership);
                      setShowProfilePreview(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir le profil de l'entreprise
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedPartnership(partnership);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setSelectedPartnership(partnership);
                        setShowSignatureDialog(true);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accepter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Sent */}
      {pendingSent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Propositions envoyées ({pendingSent.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingSent.map((partnership) => (
              <Card key={partnership.id} className="border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={partnership.company?.logo_url} />
                        <AvatarFallback>
                          <Building2 className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{partnership.company?.company_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Envoyée le {format(new Date(partnership.created_at), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500">En attente</Badge>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCancel(partnership.id)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Annuler la proposition
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Handshake className="w-5 h-5 text-green-500" />
            Partenariats actifs ({activePartnerships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePartnerships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun partenariat actif avec des entreprises</p>
              <p className="text-sm">Recherchez des entreprises pour leur proposer vos services</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activePartnerships.map((partnership) => (
                <Card key={partnership.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={partnership.company?.logo_url} />
                          <AvatarFallback>
                            <Building2 className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{partnership.company?.company_name}</h4>
                          <p className="text-xs text-green-600">
                            Partenaire depuis le {format(new Date(partnership.accepted_at || partnership.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Actif</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedPartnership(partnership);
                          setShowContractDialog(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Contrat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setSelectedPartnership(partnership);
                          setShowBlockDialog(true);
                        }}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Bloquer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked */}
      {blockedPartnerships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Entreprises bloquées ({blockedPartnerships.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockedPartnerships.map((partnership) => (
              <Card key={partnership.id} className="border-destructive/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-3">
                      <Avatar className="w-10 h-10 border-2 border-destructive/20">
                        <AvatarImage src={partnership.company?.logo_url} />
                        <AvatarFallback className="bg-destructive/10">
                          <Building2 className="w-5 h-5 text-destructive" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{partnership.company?.company_name}</h4>
                        <Badge variant="destructive" className="mt-1">
                          <Lock className="w-3 h-3 mr-1" />
                          Bloquée
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(partnership.id)}
                    >
                      <Unlock className="w-4 h-4 mr-1" />
                      Débloquer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rejected - can relaunch */}
      {rejectedPartnerships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 text-muted-foreground" />
              Historique ({rejectedPartnerships.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejectedPartnerships.map((partnership) => {
              const canRelaunch = partnership.proposed_by === "fleet_manager";
              return (
                <Card key={partnership.id} className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={partnership.company?.logo_url} />
                          <AvatarFallback>
                            <Building2 className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{partnership.company?.company_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {partnership.rejection_reason || "Proposition refusée"}
                          </p>
                        </div>
                      </div>
                      {canRelaunch && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRelaunch(partnership)}
                          disabled={relaunching}
                        >
                          {relaunching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Relancer
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <PartnershipSignatureConfirmation
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        partnerName={selectedPartnership?.company?.company_name || ""}
        paymentSchedule={selectedPartnership?.payment_frequency}
        onConfirmSign={handleAccept}
        signing={accepting}
        partnershipType="company_fleet"
        mode="accept"
        signerRole="fleet_manager"
      />

      <PartnershipRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onReject={handleReject}
        partnerName={selectedPartnership?.company?.company_name || "Entreprise"}
        partnerType="company"
        isLoading={rejecting}
      />

      <BlockReasonDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        onBlock={handleBlock}
        partnerName={selectedPartnership?.company?.company_name || "Entreprise"}
        partnerType="company"
        isLoading={blocking}
      />

      {selectedPartnership && (
        <UniversalPartnershipContract
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          partnershipId={selectedPartnership.id}
          partnershipType="company_fleet"
          status={selectedPartnership.status}
          createdAt={selectedPartnership.created_at}
          acceptedAt={selectedPartnership.accepted_at}
          party1={{
            name: fleetManagerProfile?.contact_name || "",
            company: fleetManagerProfile?.company_name,
            siret: fleetManagerProfile?.siret,
            tvaNumber: fleetManagerProfile?.tva_number,
            address: fleetManagerProfile?.address,
            phone: fleetManagerProfile?.contact_phone,
            email: fleetManagerProfile?.contact_email
          }}
          party2={{
            name: selectedPartnership.company?.contact_name || "",
            company: selectedPartnership.company?.company_name,
            siret: selectedPartnership.company?.siret,
            tvaNumber: selectedPartnership.company?.tva_number,
            address: selectedPartnership.company?.address,
            email: selectedPartnership.company?.contact_email,
            phone: selectedPartnership.company?.contact_phone
          }}
          terms={{
            paymentFrequency: selectedPartnership.payment_frequency,
            paymentDay: selectedPartnership.payment_day,
            paymentMethods: selectedPartnership.payment_methods
          }}
          signatures={{
            party1Signed: selectedPartnership.fleet_manager_signed,
            party1SignedAt: selectedPartnership.fleet_manager_signed_at,
            party2Signed: selectedPartnership.company_signed,
          party2SignedAt: selectedPartnership.company_signed_at
          }}
        />
      )}

      {/* Profile Preview Dialog */}
      <PartnerPublicProfilePreview
        open={showProfilePreview}
        onOpenChange={setShowProfilePreview}
        partnerId={selectedPartnership?.company?.id || ""}
        partnerType="company"
        partnerName={selectedPartnership?.company?.company_name}
        onContinue={() => {
          setShowProfilePreview(false);
          setShowSignatureDialog(true);
        }}
        viewOnly={false}
      />
    </div>
  );
}

// Card for displaying a company partnership
function CompanyPartnershipCard({ partnership, onUpdate }: { partnership: any; onUpdate: () => void }) {
  const company = partnership.company;
  const isPending = partnership.status === "pending";
  const isFromCompany = partnership.proposed_by === "company";

  const handleAccept = async () => {
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString()
        })
        .eq("id", partnership.id);

      if (error) throw error;

      // Notify company
      if (company) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("user_id")
          .eq("id", company.id)
          .single();

        if (companyData) {
          await supabase.from("notifications").insert({
            user_id: companyData.user_id,
            title: "Partenariat accepté",
            message: "Votre demande de partenariat a été acceptée",
            type: "success",
            link: "/company-dashboard?tab=fleet-partners"
          });
        }
      }

      onUpdate();
    } catch (error) {
      console.error("Error accepting partnership:", error);
    }
  };

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString()
        })
        .eq("id", partnership.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error rejecting partnership:", error);
    }
  };

  return (
    <Card className={isPending && isFromCompany ? "border-warning/50 bg-warning/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.company_name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">{company?.company_name}</h4>
            <p className="text-sm text-muted-foreground">{company?.contact_name}</p>
            {company?.address && (
              <p className="text-xs text-muted-foreground mt-1">{company.address}</p>
            )}
          </div>
          <Badge variant={isPending ? "outline" : "default"}>
            {isPending ? (isFromCompany ? "À traiter" : "En attente") : "Actif"}
          </Badge>
        </div>

        {isPending && isFromCompany && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAccept}
              className="flex-1 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90"
            >
              Accepter
            </button>
            <button
              onClick={handleReject}
              className="flex-1 px-3 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90"
            >
              Refuser
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
