import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, LogOut, Plus, Euro, FileText, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DevisList from "@/components/DevisList";
import ClientCoursesList from "@/components/client/ClientCoursesList";
import ClientFacturesList from "@/components/client/ClientFacturesList";
import ClientProfile from "@/components/client/ClientProfile";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";

const ClientDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientProfile();
    
    // Check for payment success
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Paiement confirmé ! Votre course est réservée.");
      // Clean up URL params
      setSearchParams({});
    } else if (paymentStatus === "cancelled") {
      toast.error("Paiement annulé");
      setSearchParams({});
    }
  }, [user, searchParams]);

  const fetchClientProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { data: client } = await supabase
        .from("clients")
        .select(`
          *,
          drivers:driver_id(
            id,
            company_name,
            vehicle_model,
            profiles:user_id(full_name, profile_photo_url)
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (client) {
        setClientProfile({ ...profile, client });
      }
    } catch (error: any) {
      console.error("Error fetching client profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleNewReservation = () => {
    if (clientProfile?.client?.is_exclusive && clientProfile?.client?.driver_id) {
      navigate(`/create-course?driver_id=${clientProfile.client.driver_id}`);
    } else {
      navigate("/chauffeurs");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-premium text-premium">
              {clientProfile?.client?.is_exclusive ? "Client Exclusif" : "Client Libre"}
            </Badge>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bonjour, {clientProfile?.full_name?.split(" ")[0] || "Client"} 👋
          </h1>
          <p className="text-muted-foreground">Gérez vos réservations et trajets</p>
        </div>

        <Card className="p-6 mb-8 bg-gradient-premium">
          <div className="flex items-center justify-between">
            <div className="text-premium-foreground">
              <h2 className="text-xl font-bold mb-1">Nouvelle Réservation</h2>
              <p className="text-sm opacity-90">
                {clientProfile?.client?.is_exclusive
                  ? "Réservez avec votre chauffeur attitré"
                  : "Choisissez un chauffeur et réservez"}
              </p>
            </div>
            <Button
              onClick={handleNewReservation}
              className="bg-premium-foreground text-premium hover:bg-premium-foreground/90"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Réserver
            </Button>
          </div>
        </Card>

        {clientProfile?.client?.is_exclusive && clientProfile?.client?.drivers && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Votre Chauffeur Attitré</h2>
            <div className="flex items-center gap-4">
              {clientProfile.client.drivers.profiles?.profile_photo_url ? (
                <img
                  src={clientProfile.client.drivers.profiles.profile_photo_url}
                  alt={clientProfile.client.drivers.profiles.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-dark rounded-full flex items-center justify-center">
                  <Car className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">
                  {clientProfile.client.drivers.profiles?.full_name}
                </h3>
                {clientProfile.client.drivers.company_name && (
                  <p className="text-sm text-muted-foreground">
                    {clientProfile.client.drivers.company_name}
                  </p>
                )}
                <Badge variant="outline" className="mt-1">
                  {clientProfile.client.drivers.vehicle_model}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-premium-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {clientProfile?.client?.total_rides || 0}
            </h3>
            <p className="text-sm text-muted-foreground">Courses réalisées</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {parseFloat(clientProfile?.client?.total_spent || 0).toFixed(2)} €
            </h3>
            <p className="text-sm text-muted-foreground">Total dépensé</p>
          </Card>

          <Card className="p-6 bg-gradient-premium">
            <div className="mb-4">
              <div className="w-12 h-12 bg-premium-foreground/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-premium-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-premium-foreground mb-1">En attente</h3>
            <p className="text-sm text-premium-foreground/80">Devis à traiter</p>
          </Card>
        </div>

        <Tabs defaultValue="devis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="courses">Mes Courses</TabsTrigger>
            <TabsTrigger value="devis">Mes Devis</TabsTrigger>
            <TabsTrigger value="factures">Mes Factures</TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {clientProfile?.client?.id && (
              <ClientCoursesList clientId={clientProfile.client.id} />
            )}
          </TabsContent>

          <TabsContent value="devis" className="space-y-6">
            {clientProfile?.client?.id && (
              <DevisList clientId={clientProfile.client.id} />
            )}
          </TabsContent>

          <TabsContent value="factures" className="space-y-6">
            {clientProfile?.client?.id && (
              <ClientFacturesList clientId={clientProfile.client.id} />
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagingInterface />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ClientProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;
