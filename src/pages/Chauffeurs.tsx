import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Car, Search, MapPin, Star, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublicDriver {
  id: string;
  full_name: string;
  vehicle_model: string;
  bio: string;
  rating: number;
  total_rides: number;
  working_sectors: string[];
  service_description: string;
  base_rate: number;
  per_km_rate: number;
  profile_photo_url: string;
}

const Chauffeurs = () => {
  const [drivers, setDrivers] = useState<PublicDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const navigate = useNavigate();

  // Extract unique sectors from all drivers
  const allSectors = Array.from(
    new Set(drivers.flatMap((d) => d.working_sectors || []))
  ).sort();

  useEffect(() => {
    fetchPublicDrivers();
  }, [searchTerm, selectedSector]);

  const fetchPublicDrivers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_public_drivers", {
        _search_term: searchTerm || null,
        _sector: selectedSector,
      });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-gradient-premium hover:opacity-90 transition-opacity">
                S'inscrire
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Trouvez votre{" "}
            <span className="bg-gradient-premium bg-clip-text text-transparent">
              chauffeur professionnel
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez nos chauffeurs VTC vérifiés et réservez en toute
            confiance
          </p>
        </div>

        {/* Search & Filters */}
        <Card className="p-6 mb-8 shadow-elegant">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, véhicule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedSector === null ? "default" : "outline"}
                onClick={() => setSelectedSector(null)}
                className={
                  selectedSector === null ? "bg-gradient-premium" : ""
                }
              >
                Tous les secteurs
              </Button>
              {allSectors.slice(0, 5).map((sector) => (
                <Button
                  key={sector}
                  variant={selectedSector === sector ? "default" : "outline"}
                  onClick={() => setSelectedSector(sector)}
                  className={
                    selectedSector === sector ? "bg-gradient-premium" : ""
                  }
                >
                  {sector}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Drivers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-premium border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-muted-foreground">Chargement des chauffeurs...</p>
          </div>
        ) : drivers.length === 0 ? (
          <Card className="p-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucun chauffeur trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos critères de recherche
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <Card
                key={driver.id}
                className="overflow-hidden hover:shadow-elegant transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/chauffeur/${driver.id}`)}
              >
                <div className="aspect-video bg-gradient-dark relative">
                  {driver.profile_photo_url ? (
                    <img
                      src={driver.profile_photo_url}
                      alt={driver.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-foreground text-4xl font-bold">
                      {driver.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-gradient-premium border-0">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {driver.rating.toFixed(1)}
                    </Badge>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-premium transition-colors">
                    {driver.full_name}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Car className="w-4 h-4" />
                    <span className="text-sm">{driver.vehicle_model}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {driver.bio || driver.service_description || "Chauffeur professionnel"}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {driver.working_sectors?.slice(0, 3).map((sector) => (
                      <Badge key={sector} variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {sector}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm">
                      <span className="text-muted-foreground">À partir de </span>
                      <span className="font-bold text-premium">
                        {driver.base_rate ? `${driver.base_rate}€` : "Sur devis"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-premium hover:opacity-90"
                    >
                      Voir profil
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chauffeurs;
