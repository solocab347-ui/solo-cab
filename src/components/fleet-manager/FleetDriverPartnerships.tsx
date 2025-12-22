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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Handshake, 
  Search, 
  Star, 
  Car, 
  MapPin, 
  Send, 
  Check, 
  X, 
  Clock, 
  FileText,
  Loader2,
  Users,
  Percent,
  AlertTriangle
} from "lucide-react";

interface FleetDriverPartnershipsProps {
  fleetManagerId: string;
  defaultCommission: number;
}

interface IndependentDriver {
  id: string;
  user_id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  rating: number | null;
  total_rides: number | null;
  working_sectors: string[] | null;
  bio: string | null;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
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
  driver?: IndependentDriver;
}

export const FleetDriverPartnerships = ({ 
  fleetManagerId, 
  defaultCommission 
}: FleetDriverPartnershipsProps) => {
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [independentDrivers, setIndependentDrivers] = useState<IndependentDriver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<IndependentDriver | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  const [commissionRate, setCommissionRate] = useState(defaultCommission.toString());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing partnerships
      const { data: partnershipsData, error: partErr } = await supabase
        .from("fleet_driver_partnerships")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("created_at", { ascending: false });

      if (partErr) throw partErr;

      // Get driver info for partnerships
      if (partnershipsData && partnershipsData.length > 0) {
        const driverIds = partnershipsData.map(p => p.driver_id);
        const { data: driversData } = await supabase
          .from("drivers")
          .select("id, user_id, vehicle_model, vehicle_brand, rating, total_rides, working_sectors, bio")
          .in("id", driverIds);

        if (driversData) {
          const userIds = driversData.map(d => d.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", userIds);

          const partnershipsWithDrivers = partnershipsData.map(p => ({
            ...p,
            driver: {
              ...driversData.find(d => d.id === p.driver_id),
              profile: profilesData?.find(pr => pr.id === driversData.find(d => d.id === p.driver_id)?.user_id)
            }
          }));
          setPartnerships(partnershipsWithDrivers as Partnership[]);
        } else {
          setPartnerships(partnershipsData as Partnership[]);
        }
      } else {
        setPartnerships([]);
      }

      // Fetch independent drivers (not in any fleet)
      const { data: independentData } = await supabase
        .from("drivers")
        .select("id, user_id, vehicle_model, vehicle_brand, rating, total_rides, working_sectors, bio")
        .eq("status", "validated")
        .eq("public_profile_enabled", true)
        .is("fleet_manager_id", null);

      if (independentData && independentData.length > 0) {
        const userIds = independentData.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", userIds);

        const driversWithProfiles = independentData.map(d => ({
          ...d,
          profile: profiles?.find(p => p.id === d.user_id)
        }));
        setIndependentDrivers(driversWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching partnerships:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleProposePartnership = (driver: IndependentDriver) => {
    setSelectedDriver(driver);
    setCommissionRate(defaultCommission.toString());
    setProposalMessage("");
    setShowProposalDialog(true);
  };

  const submitProposal = async () => {
    if (!selectedDriver) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .insert({
          fleet_manager_id: fleetManagerId,
          driver_id: selectedDriver.id,
          initiated_by: "fleet_manager",
          commission_percentage: parseFloat(commissionRate),
          proposal_message: proposalMessage || null,
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Un partenariat existe déjà avec ce chauffeur");
        } else {
          throw error;
        }
        return;
      }

      // Notify driver
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", selectedDriver.id)
        .single();

      if (driverData) {
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "Proposition de partenariat",
          message: `Un gestionnaire de flotte vous propose un partenariat avec ${commissionRate}% de commission`,
          type: "partnership",
          link: "/driver-dashboard?tab=partnerships"
        });
      }

      toast.success("Proposition envoyée !");
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
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString(),
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

  const cancelPartnership = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          status: "cancelled"
        })
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Partenariat annulé");
      fetchData();
    } catch (error) {
      console.error("Error cancelling partnership:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const filteredDrivers = independentDrivers.filter(d => {
    if (!searchTerm) return true;
    const name = d.profile?.full_name?.toLowerCase() || "";
    const vehicle = `${d.vehicle_brand} ${d.vehicle_model}`.toLowerCase();
    const sectors = d.working_sectors?.join(" ").toLowerCase() || "";
    return name.includes(searchTerm.toLowerCase()) || 
           vehicle.includes(searchTerm.toLowerCase()) ||
           sectors.includes(searchTerm.toLowerCase());
  });

  // Filter out drivers with existing partnerships
  const existingPartnerDriverIds = partnerships.map(p => p.driver_id);
  const availableDrivers = filteredDrivers.filter(d => !existingPartnerDriverIds.includes(d.id));

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
            Partenariats Chauffeurs
          </CardTitle>
          <CardDescription>
            Collaborez avec des chauffeurs indépendants pour élargir votre offre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="explore" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="explore" className="gap-2">
                <Search className="w-4 h-4" />
                Explorer
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                En attente ({pendingPartnerships.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <Check className="w-4 h-4" />
                Actifs ({activePartnerships.length})
              </TabsTrigger>
            </TabsList>

            {/* Explore Tab */}
            <TabsContent value="explore" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, véhicule ou secteur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {availableDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucun chauffeur indépendant disponible</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableDrivers.map((driver) => (
                    <Card key={driver.id} className="border-border/50 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-14 h-14 border-2 border-border">
                            <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                              {(driver.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {driver.profile?.full_name || "Chauffeur"}
                              </h3>
                              {driver.rating && (
                                <Badge variant="secondary" className="bg-warning/20 text-warning gap-1">
                                  <Star className="w-3 h-3 fill-warning" />
                                  {driver.rating.toFixed(1)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              <Car className="w-3 h-3 inline mr-1" />
                              {driver.vehicle_brand} {driver.vehicle_model}
                            </p>
                            {driver.working_sectors && driver.working_sectors.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {driver.working_sectors.slice(0, 3).map((sector, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <MapPin className="w-2 h-2 mr-1" />
                                    {sector}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {driver.total_rides || 0} courses effectuées
                            </p>
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-4 gap-2"
                          onClick={() => handleProposePartnership(driver)}
                        >
                          <Send className="w-4 h-4" />
                          Proposer un partenariat
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
                <div className="space-y-4">
                  {pendingPartnerships.map((partnership) => (
                    <Card key={partnership.id} className="border-warning/30 bg-warning/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={partnership.driver?.profile?.profile_photo_url || undefined} />
                              <AvatarFallback>
                                {(partnership.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">
                                {partnership.driver?.profile?.full_name || "Chauffeur"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Commission: {partnership.commission_percentage}%
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={partnership.fleet_manager_signed ? "default" : "secondary"}>
                                  {partnership.fleet_manager_signed ? "✓ Vous avez signé" : "En attente de votre signature"}
                                </Badge>
                                <Badge variant={partnership.driver_signed ? "default" : "secondary"}>
                                  {partnership.driver_signed ? "✓ Chauffeur a signé" : "En attente du chauffeur"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!partnership.fleet_manager_signed && partnership.initiated_by === "driver" && (
                              <Button size="sm" onClick={() => signContract(partnership.id)}>
                                <FileText className="w-4 h-4 mr-1" />
                                Signer
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => cancelPartnership(partnership.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
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
                <div className="grid gap-4 md:grid-cols-2">
                  {activePartnerships.map((partnership) => (
                    <Card key={partnership.id} className="border-success/30 bg-success/5">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14 border-2 border-success/30">
                            <AvatarImage src={partnership.driver?.profile?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-success/20">
                              {(partnership.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {partnership.driver?.profile?.full_name || "Chauffeur"}
                              </h3>
                              <Badge className="bg-success/20 text-success border-success/30">
                                <Check className="w-3 h-3 mr-1" />
                                Actif
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {partnership.driver?.vehicle_brand} {partnership.driver?.vehicle_model}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">
                                <Percent className="w-3 h-3 mr-1" />
                                {partnership.commission_percentage}% commission
                              </Badge>
                            </div>
                          </div>
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
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Proposez une collaboration à {selectedDriver?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Ce partenariat nécessite la signature des deux parties. Le chauffeur devra accepter et signer le contrat.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Commission (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pourcentage prélevé sur chaque course effectuée par le chauffeur
              </p>
            </div>

            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Textarea
                placeholder="Présentez votre offre de partenariat..."
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
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
