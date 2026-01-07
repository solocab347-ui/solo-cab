import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Car, Building2, Users, Handshake, Euro } from "lucide-react";
import { FleetDriverSearch } from "./FleetDriverSearch";
import { FleetDriverPartnerships } from "./FleetDriverPartnerships";
import { FleetCompanySearch } from "./FleetCompanySearch";
import { FleetPartnerCommissions } from "./FleetPartnerCommissions";

interface FleetPartnershipsHubProps {
  fleetManagerId: string;
  fleetManagerProfile?: {
    company_name: string;
    contact_name?: string;
    services_offered?: string[];
    total_drivers?: number;
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
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
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
              <FleetCompanyPartnerships fleetManagerId={fleetManagerId} />
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
function FleetCompanyPartnerships({ fleetManagerId }: { fleetManagerId: string }) {
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            address,
            logo_url,
            employee_count
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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingPartnerships = partnerships.filter(p => p.status === "pending");
  const activePartnerships = partnerships.filter(p => p.status === "accepted");

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingPartnerships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">{pendingPartnerships.length}</Badge>
              Demandes en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPartnerships.map((partnership) => (
              <CompanyPartnershipCard 
                key={partnership.id} 
                partnership={partnership}
                onUpdate={fetchPartnerships}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Partenariats actifs ({activePartnerships.length})</CardTitle>
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
                <CompanyPartnershipCard 
                  key={partnership.id} 
                  partnership={partnership}
                  onUpdate={fetchPartnerships}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
