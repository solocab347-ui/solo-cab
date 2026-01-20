import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users, Mail, Phone, MapPin, Calendar, TrendingUp, FileText, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DriverClientDevisFactures from "@/components/driver/DriverClientDevisFactures";

const ClientProfileView = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profil" | "documents">("profil");
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
  });

  useEffect(() => {
    if (clientId && user) {
      fetchClientProfile();
      fetchClientStats();
      fetchDriverInfo();
    }
  }, [clientId, user]);

  const fetchClientProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          profiles:user_id(
            full_name,
            email,
            phone,
            address,
            profile_photo_url
          )
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error: any) {
      console.error("Error fetching client profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverInfo = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setDriver(data);
    } catch (error) {
      console.error("Error fetching driver info:", error);
    }
  };

  const fetchClientStats = async () => {
    try {
      // Fetch courses statistics
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, status")
        .eq("client_id", clientId);

      if (coursesError) throw coursesError;

      const totalCourses = coursesData?.length || 0;
      const completedCourses = coursesData?.filter(c => c.status === "completed").length || 0;

      // Note: Financial information (total spent) is private and not displayed to drivers
      setStats({
        totalCourses,
        completedCourses,
      });
    } catch (error: any) {
      console.error("Error fetching client stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="p-8 bg-card/80 backdrop-blur-sm">
          <p className="text-white">Client introuvable</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Retour
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header avec navigation */}
        <NavigationHeader 
          showBack={true}
          showHome={true}
          className="mb-4"
        />
        
        {/* Profil principal */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Photo de profil */}
            <div className="flex-shrink-0">
              {client.profiles?.profile_photo_url ? (
                <img
                  src={client.profiles.profile_photo_url}
                  alt={client.profiles?.full_name || "Client"}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/30"
                />
              ) : (
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            {/* Informations principales */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <h2 className="text-3xl font-bold text-white">
                  {client.profiles?.full_name || "Client sans nom"}
                </h2>
                {client.is_exclusive && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 self-center md:self-auto">
                    <Crown className="w-4 h-4 mr-1" />
                    Client Exclusif
                  </Badge>
                )}
              </div>

              <div className="space-y-3 text-white/80">
                {client.profiles?.email && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span>{client.profiles.email}</span>
                  </div>
                )}
                
                {client.profiles?.phone && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Phone className="w-5 h-5 text-green-400" />
                    <span>{client.profiles.phone}</span>
                  </div>
                )}
                
                {client.profiles?.address && (
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <MapPin className="w-5 h-5 text-red-400" />
                    <span>{client.profiles.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span>
                    Inscrit le {format(new Date(client.created_at), "dd MMMM yyyy", { locale: fr })}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => navigate(`/driver/create-course?client_id=${client.id}`)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                >
                  Créer une course avec ce client
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs: Profil / Documents */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "profil" | "documents")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="profil" 
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              <User className="w-4 h-4 mr-2" />
              Profil
            </TabsTrigger>
            <TabsTrigger 
              value="documents"
              className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
            >
              <FileText className="w-4 h-4 mr-2" />
              Devis & Factures
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profil" className="mt-6">
            {/* Statistiques */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6 bg-gradient-to-br from-blue-500 to-cyan-600 border-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">Courses totales</p>
                    <p className="text-3xl font-bold text-white">{stats.totalCourses}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 border-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">Courses terminées</p>
                    <p className="text-3xl font-bold text-white">{stats.completedCourses}</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            {driver ? (
              <DriverClientDevisFactures clientId={clientId!} driverId={driver.id} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Chargement des informations...</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientProfileView;
