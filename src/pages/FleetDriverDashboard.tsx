import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Car, Calendar, LogOut, Building2, MessageSquare, Shield, Home, FileText, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo-solocab.png";
import CoursesList from "@/components/CoursesList";
import { DriverHome } from "@/components/driver/DriverHomeMemoized";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import DriverPlanning from "@/components/driver/DriverPlanning";
import { FleetDriverDocuments } from "@/components/fleet-manager/FleetDriverDocuments";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOptimizedDriverProfile } from "@/hooks/useOptimizedDriverProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

const FleetDriverDashboard = () => {
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const { driverProfile, isLoading: profileLoading, updateProfile, isUpdating } = useOptimizedDriverProfile(user?.id);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [fleetManager, setFleetManager] = useState<any>(null);

  // Form states - only editable ones for fleet drivers
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [serviceDescription, setServiceDescription] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (driverProfile?.driver?.fleet_manager_id) {
      fetchFleetManager();
    }
  }, [driverProfile?.driver?.fleet_manager_id]);

  const fetchFleetManager = async () => {
    if (!driverProfile?.driver?.fleet_manager_id) return;
    
    const { data } = await supabase
      .from("fleet_managers")
      .select("company_name, contact_name, contact_email")
      .eq("id", driverProfile.driver.fleet_manager_id)
      .single();
    
    if (data) setFleetManager(data);
  };

  useEffect(() => {
    if (!driverProfile?.driver?.id) return;
    
    const driver = driverProfile.driver;
    setShowPhone(driver.show_phone || false);
    setShowEmail(driver.show_email || false);
    setServiceDescription(driver.service_description || "");
    setProfilePhotoUrl(driverProfile.profile_photo_url || null);
  }, [driverProfile?.driver?.id]);

  const handleUpdateProfile = async () => {
    if (!driverProfile?.driver?.id || !updateProfile) {
      toast.error("Impossible d'enregistrer : profil non chargé");
      return;
    }

    setLoading(true);
    
    try {
      const driverUpdates = {
        show_phone: showPhone,
        show_email: showEmail,
        service_description: serviceDescription,
      };

      await updateProfile(driverUpdates);

      if (user?.id && profilePhotoUrl) {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: profilePhotoUrl })
          .eq('id', user.id);
      }

      await queryClient.invalidateQueries({ queryKey: ['driver-profile-optimized', user?.id] });
      toast.success("Profil mis à jour !");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 shadow-elegant">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            </div>
            {activeTab !== "home" && (
              <NavigationHeader 
                showBack={false}
                showHome={true}
                homeRoute="/fleet-driver-dashboard"
                onBack={() => setActiveTab("home")}
              />
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{driverProfile?.full_name || "Chauffeur"}</span>
              <Badge 
                variant="outline" 
                className="text-xs border-primary/50 text-primary bg-primary/10"
              >
                <Building2 className="w-3 h-3 mr-1" />
                Chauffeur Flotte
              </Badge>
            </div>
            <Link to="/rgpd-data">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted" title="Mes Données RGPD">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Fleet Manager Info */}
        {fleetManager && (
          <Alert className="mb-6 bg-primary/5 border-primary/20">
            <Building2 className="w-4 h-4 text-primary" />
            <AlertTitle>Flotte : {fleetManager.company_name}</AlertTitle>
            <AlertDescription>
              Votre planning est géré par votre gestionnaire de flotte. Les courses vous sont attribuées automatiquement.
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Validation Alert */}
        {driverProfile?.driver?.status === "pending" && (
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <FileText className="w-4 h-4 text-yellow-600" />
            <AlertTitle className="text-yellow-700">En attente de validation</AlertTitle>
            <AlertDescription className="text-yellow-600">
              Votre profil est en cours de validation par l'administrateur. Vous serez notifié dès que votre compte sera activé.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full bg-white/5 backdrop-blur-sm flex flex-col gap-2 h-auto p-2 shadow-lg border border-white/10">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 w-full">
              <TabsTrigger value="home" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
                <Home className="w-4 h-4" />
                <span>Accueil</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white">
                <Car className="w-4 h-4" />
                <span>Courses</span>
              </TabsTrigger>
              <TabsTrigger value="planning" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white">
                <Calendar className="w-4 h-4" />
                <span>Planning</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white">
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white">
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                <User className="w-4 h-4" />
                <span>Profil</span>
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            {driverProfile?.driver?.id && user?.id && (
              <FleetDriverDocuments 
                driverId={driverProfile.driver.id} 
                userId={user.id} 
              />
            )}
          </TabsContent>

          {/* Home Tab */}
          <TabsContent value="home">
            {driverProfile && (
              <DriverHome 
                driverProfile={driverProfile}
                onTabChange={setActiveTab}
              />
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Mes Courses Attribuées</h2>
              {driverProfile?.driver?.id && (
                <CoursesList driverId={driverProfile.driver.id} />
              )}
            </Card>
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Mon Planning</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Votre planning est géré par votre gestionnaire de flotte.
              </p>
              {driverProfile?.driver?.id && (
                <DriverPlanning driverId={driverProfile.driver.id} />
              )}
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Messagerie</h2>
              <MessagingInterface />
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Mon Profil</h2>
              
              <div className="space-y-6">
                {/* Info (read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nom</Label>
                    <p className="font-medium">{driverProfile?.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Véhicule</Label>
                    <p className="font-medium">
                      {driverProfile?.driver?.vehicle_brand} {driverProfile?.driver?.vehicle_model}
                    </p>
                  </div>
                </div>

                {/* Privacy settings */}
                <div className="space-y-4">
                  <h3 className="font-medium">Paramètres de confidentialité</h3>
                  
                  <div className="flex items-center justify-between">
                    <Label>Afficher mon téléphone aux clients</Label>
                    <Switch
                      checked={showPhone}
                      onCheckedChange={setShowPhone}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Afficher mon email aux clients</Label>
                    <Switch
                      checked={showEmail}
                      onCheckedChange={setShowEmail}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="serviceDescription">Description de vos services</Label>
                  <textarea
                    id="serviceDescription"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    className="w-full mt-2 p-3 border rounded-lg bg-background"
                    rows={3}
                    placeholder="Décrivez vos services..."
                  />
                </div>

                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FleetDriverDashboard;
