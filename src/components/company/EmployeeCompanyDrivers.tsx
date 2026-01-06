import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Car, 
  Phone, 
  Star, 
  MapPin, 
  Loader2, 
  Search, 
  UserPlus,
  CheckCircle2,
  Users,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  vehicle_type: string | null;
  average_rating: number | null;
  contact_phone: string | null;
  services: string[];
}

interface EmployeeCompanyDriversProps {
  companyId: string;
  canInviteDrivers: boolean;
  canCreateCourses: boolean;
}

export function EmployeeCompanyDrivers({ companyId, canInviteDrivers, canCreateCourses }: EmployeeCompanyDriversProps) {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchResults, setSearchResults] = useState<Driver[]>([]);
  const [searching, setSearching] = useState(false);
  const [proposingDriver, setProposingDriver] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyDrivers();
  }, [companyId]);

  const fetchCompanyDrivers = async () => {
    try {
      // Récupérer les chauffeurs liés à l'entreprise via les accords
      const { data: agreements, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          driver_id,
          drivers!inner(
            id,
            user_id,
            city,
            vehicle_type,
            average_rating,
            contact_phone,
            services
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      // Enrichir avec les profils
      const enrichedDrivers: Driver[] = [];
      for (const agreement of agreements || []) {
        const driver = agreement.drivers as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", driver.user_id)
          .maybeSingle();

        enrichedDrivers.push({
          id: driver.id,
          user_id: driver.user_id,
          full_name: profile?.full_name || "Chauffeur",
          avatar_url: profile?.avatar_url,
          city: driver.city,
          vehicle_type: driver.vehicle_type,
          average_rating: driver.average_rating,
          contact_phone: driver.contact_phone,
          services: driver.services || [],
        });
      }

      setDrivers(enrichedDrivers);
    } catch (error) {
      console.error("Erreur chargement chauffeurs:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const searchPublicDrivers = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      // Rechercher dans les chauffeurs publics disponibles
      const { data: driversData, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          vehicle_type,
          average_rating,
          contact_phone,
          services
        `)
        .eq("status", "validated")
        .eq("visible_to_companies", true)
        .limit(10);

      if (error) throw error;

      // Filtrer les chauffeurs déjà liés
      const existingIds = drivers.map(d => d.id);
      const filteredDrivers = (driversData || []).filter((d: any) => !existingIds.includes(d.id));

      // Enrichir avec les profils
      const enriched: Driver[] = [];
      for (const driver of filteredDrivers) {
        const driverData = driver as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", driverData.user_id)
          .maybeSingle();

        enriched.push({
          id: driverData.id,
          user_id: driverData.user_id,
          full_name: profile?.full_name || "Chauffeur",
          avatar_url: profile?.avatar_url,
          city: null,
          vehicle_type: driverData.vehicle_type,
          average_rating: driverData.average_rating,
          contact_phone: driverData.contact_phone,
          services: driverData.services || [],
        });
      }

      setSearchResults(enriched);
    } catch (error) {
      console.error("Erreur recherche:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const proposeDriver = async (driverId: string) => {
    setProposingDriver(driverId);
    try {
      // Créer une proposition de partenariat au nom de l'entreprise
      const { error } = await supabase
        .from("company_driver_agreements")
        .insert({
          company_id: companyId,
          driver_id: driverId,
          status: "pending",
          proposed_by: "company",
          payment_methods: ["transfer", "card"],
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ce chauffeur a déjà été proposé à votre entreprise");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Proposition envoyée au chauffeur !");
      setShowSearchDialog(false);
      setSearchResults([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Erreur proposition:", error);
      toast.error("Erreur lors de l'envoi de la proposition");
    } finally {
      setProposingDriver(null);
    }
  };

  const handleBookDriver = (driverId: string) => {
    navigate(`/create-course?driver_id=${driverId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Chauffeurs partenaires</h2>
          <p className="text-sm text-muted-foreground">
            Les chauffeurs VTC liés à votre entreprise
          </p>
        </div>
        {canInviteDrivers && (
          <Button onClick={() => setShowSearchDialog(true)}>
            <Search className="w-4 h-4 mr-2" />
            Rechercher un chauffeur
          </Button>
        )}
      </div>

      {/* Liste des chauffeurs */}
      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Aucun chauffeur partenaire</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Votre entreprise n'a pas encore de chauffeurs partenaires.
            </p>
            {canInviteDrivers && (
              <Button onClick={() => setShowSearchDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Proposer un chauffeur
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <Card key={driver.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={driver.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {driver.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{driver.full_name}</h3>
                    {driver.city && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {driver.city}
                      </p>
                    )}
                    {driver.average_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{driver.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {driver.vehicle_type && (
                  <Badge variant="secondary" className="mt-3">
                    <Car className="w-3 h-3 mr-1" />
                    {driver.vehicle_type}
                  </Badge>
                )}

                <div className="flex gap-2 mt-4">
                  {canCreateCourses && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleBookDriver(driver.id)}
                    >
                      Réserver
                    </Button>
                  )}
                  {driver.contact_phone && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`tel:${driver.contact_phone}`, "_blank")}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de recherche */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rechercher un chauffeur</DialogTitle>
            <DialogDescription>
              Recherchez un chauffeur par ville pour le proposer comme partenaire de votre entreprise.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher par ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPublicDrivers()}
              />
              <Button onClick={searchPublicDrivers} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {searchResults.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={driver.avatar_url || undefined} />
                        <AvatarFallback>{driver.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{driver.full_name}</p>
                        <p className="text-xs text-muted-foreground">{driver.city}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => proposeDriver(driver.id)}
                      disabled={proposingDriver === driver.id}
                    >
                      {proposingDriver === driver.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Proposer
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-center text-muted-foreground py-4">
                Aucun chauffeur trouvé pour cette recherche
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
