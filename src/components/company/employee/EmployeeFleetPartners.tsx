import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  Loader2, 
  MapPin, 
  Phone,
  Mail,
  Users,
  Car,
  CheckCircle2,
} from "lucide-react";

interface FleetPartner {
  id: string;
  fleet_manager_id: string;
  status: string;
  accepted_at: string | null;
  fleet_manager: {
    id: string;
    company_name: string;
    logo_url: string | null;
    address: string | null;
    contact_phone: string | null;
    contact_email: string | null;
  };
}

interface EmployeeFleetPartnersProps {
  companyId: string;
}

export function EmployeeFleetPartners({ companyId }: EmployeeFleetPartnersProps) {
  const [partners, setPartners] = useState<FleetPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFleetPartners();
  }, [companyId]);

  const fetchFleetPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select(`
          id,
          fleet_manager_id,
          status,
          accepted_at,
          fleet_manager:fleet_managers!inner(
            id,
            company_name,
            logo_url,
            address,
            contact_phone,
            contact_email
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        fleet_manager_id: item.fleet_manager_id,
        status: item.status,
        accepted_at: item.accepted_at,
        fleet_manager: item.fleet_manager,
      }));

      setPartners(transformedData);
    } catch (error) {
      console.error("Error fetching fleet partners:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {partners.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-accent" />
          </div>
          <h3 className="font-semibold mb-2">Aucun partenariat flotte</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Votre entreprise n'a pas encore de partenariats avec des gestionnaires de flotte.
            Seuls les administrateurs peuvent établir ces partenariats.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <Card 
                key={partner.id}
                className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg transition-all"
              >
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 ring-2 ring-accent/20 ring-offset-2 ring-offset-background">
                      <AvatarImage src={partner.fleet_manager.logo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-accent/20 to-success/20 text-accent font-bold">
                        {partner.fleet_manager.company_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{partner.fleet_manager.company_name}</h3>
                      {partner.fleet_manager.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {partner.fleet_manager.address.split(",")[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {partner.fleet_manager.contact_phone && (
                      <a
                        href={`tel:${partner.fleet_manager.contact_phone}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        Appeler
                      </a>
                    )}
                    {partner.fleet_manager.contact_email && (
                      <a
                        href={`mailto:${partner.fleet_manager.contact_email}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs hover:bg-accent/20 transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </a>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      Vous pouvez réserver des courses via cette flotte
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note :</strong> Seuls les administrateurs de l'entreprise peuvent établir ou modifier les partenariats avec les gestionnaires de flotte. 
              Vous pouvez cependant contacter ces partenaires et réserver des courses avec leurs chauffeurs.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
