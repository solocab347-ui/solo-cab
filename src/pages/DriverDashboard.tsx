import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Car, Users, Calendar, TrendingUp, QrCode, LogOut, Settings, Building2, FileText, MapPin, CreditCard, AlertCircle, LayoutGrid, MessageSquare, Globe } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import CoursesList from "@/components/CoursesList";
import DriverClientsList from "@/components/driver/DriverClientsList";
import DriverDevisList from "@/components/driver/DriverDevisList";
import DriverFacturesList from "@/components/driver/DriverFacturesList";
import QRCodeDisplay from "@/components/driver/QRCodeDisplay";
import SubscriptionManager from "@/components/driver/SubscriptionManager";
import { DriverHome } from "@/components/driver/DriverHome";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DriverDashboard = () => {
  const { signOut, user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // Form states
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  const [workingSectors, setWorkingSectors] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [baseFare, setBaseFare] = useState("");
  const [perKmRate, setPerKmRate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");

  useEffect(() => {
    fetchDriverProfile();
  }, [user]);

  const fetchDriverProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const { data: driver } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driver) {
      setDriverProfile({ ...profile, driver });
      // Populate form
      setPublicProfileEnabled(driver.public_profile_enabled || false);
      setWorkingSectors(driver.working_sectors?.join(", ") || "");
      setServiceDescription(driver.service_description || "");
      setBaseFare(driver.base_fare?.toString() || "");
      setPerKmRate(driver.per_km_rate?.toString() || "");
      setHourlyRate(driver.hourly_rate?.toString() || "");
      setVehicleColor(driver.vehicle_color || "");
      setCompanyName(driver.company_name || "");
      setSiret(driver.siret || "");
    }
  };

  useEffect(() => {
    if (driverProfile?.driver?.id) {
      fetchQRCode();
    }
  }, [driverProfile?.driver?.id]);

  const fetchQRCode = async () => {
    if (!driverProfile?.driver?.id) return;

    setLoadingQR(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/qr-code-manager?action=get&driver_id=${driverProfile.driver.id}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setQrCode(data);
      }
    } catch (error) {
      console.error("QR fetch error:", error);
    } finally {
      setLoadingQR(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode?.qr_code_image) return;

    const link = document.createElement("a");
    link.href = qrCode.qr_code_image;
    link.download = `qr-code-${driverProfile?.full_name || "driver"}.png`;
    link.click();
    toast.success("QR Code téléchargé !");
  };

  const handleUpdateProfile = async () => {
    if (!driverProfile?.driver?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          public_profile_enabled: publicProfileEnabled,
          working_sectors: workingSectors
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          service_description: serviceDescription,
          base_fare: baseFare ? parseFloat(baseFare) : null,
          per_km_rate: perKmRate ? parseFloat(perKmRate) : null,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          vehicle_color: vehicleColor,
          company_name: companyName,
          siret: siret,
        })
        .eq("id", driverProfile.driver.id);

      if (error) throw error;
      toast.success("Profil mis à jour avec succès !");
      fetchDriverProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <NotificationBell />
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{driverProfile?.full_name || "Chauffeur"}</span>
              <Badge variant="outline" className="border-success text-success">
                {driverProfile?.driver?.subscription_status === "active" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bonjour, {driverProfile?.full_name?.split(" ")[0] || "Chauffeur"} ✨
          </h1>
          <p className="text-muted-foreground">Voici un aperçu de votre activité</p>
        </div>

        {/* Subscription Alert */}
        {driverProfile?.driver?.subscription_status !== "active" && (
          <Alert className="mb-6 bg-destructive/10 border-destructive">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">Abonnement Inactif</AlertTitle>
            <AlertDescription>
              Votre abonnement n'est pas actif. Activez-le dans l'onglet "Abonnement" pour accéder à toutes les fonctionnalités de la plateforme.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-card">
            <TabsTrigger value="home" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Accueil
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Mes Clients
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <Car className="w-4 h-4" />
              Mes Courses
            </TabsTrigger>
            <TabsTrigger value="devis" className="gap-2">
              <FileText className="w-4 h-4" />
              Devis
            </TabsTrigger>
            <TabsTrigger value="factures" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Factures
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Globe className="w-4 h-4" />
              Profil Public
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home">
            <DriverHome driverProfile={driverProfile} onTabChange={setActiveTab} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <MessagingInterface />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* QR Code Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Mon QR Code</h2>
              <QRCodeDisplay qrCode={qrCode} loadingQR={loadingQR} driverProfile={driverProfile} />
            </Card>

            {/* Subscription Manager */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Abonnement</h2>
              <SubscriptionManager 
                driverProfile={driverProfile} 
                onSubscriptionUpdate={fetchDriverProfile}
              />
            </Card>

            {/* Pricing */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Tarification Professionnelle</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="baseFare">Forfait de base (€)</Label>
                  <Input
                    id="baseFare"
                    type="number"
                    step="0.01"
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    placeholder="10.00"
                  />
                  <p className="text-xs text-muted-foreground">Prix de départ de la course</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perKm">Prix par kilomètre (€)</Label>
                  <Input
                    id="perKm"
                    type="number"
                    step="0.01"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(e.target.value)}
                    placeholder="1.50"
                  />
                  <p className="text-xs text-muted-foreground">Coût par km parcouru</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly">Tarif horaire optionnel (€)</Label>
                  <Input
                    id="hourly"
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="50.00"
                  />
                  <p className="text-xs text-muted-foreground">Pour les courses au temps</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  TVA Automatique
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <span className="font-medium">10% TVA</span> pour les courses au kilomètre</p>
                  <p>• <span className="font-medium">20% TVA</span> pour les mises à disposition (horaire)</p>
                  <p className="text-xs mt-2 italic">La TVA est calculée automatiquement selon le type de course</p>
                </div>
              </div>
            </Card>

            {/* Company Info */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Informations Entreprise</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company">Nom de l'entreprise</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="VTC Excellence"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    placeholder="123 456 789 00012"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={loading} size="lg">
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </TabsContent>


          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverClientsList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-premium-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Demandes de Réservation</h2>
                  <p className="text-sm text-muted-foreground">Gérez vos courses et créez des devis</p>
                </div>
              </div>

              {driverProfile?.driver?.id && (
                <CoursesList driverId={driverProfile.driver.id} />
              )}
            </Card>
          </TabsContent>

          {/* Devis Tab */}
          <TabsContent value="devis" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverDevisList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Factures Tab */}
          <TabsContent value="factures" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverFacturesList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Profil Public</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Activer le profil public</Label>
                    <p className="text-sm text-muted-foreground">
                      Apparaître sur /chauffeurs pour les clients libres
                    </p>
                  </div>
                  <Switch
                    checked={publicProfileEnabled}
                    onCheckedChange={setPublicProfileEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sectors">Secteurs desservis (séparés par virgule)</Label>
                  <Input
                    id="sectors"
                    value={workingSectors}
                    onChange={(e) => setWorkingSectors(e.target.value)}
                    placeholder="Paris, 75, 92, Hauts-de-Seine"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description du service</Label>
                  <Textarea
                    id="description"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Décrivez votre service, vos spécialités..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Couleur du véhicule</Label>
                  <Input
                    id="color"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Noir, Gris, Blanc..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateProfile} disabled={loading} size="lg">
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

export default DriverDashboard;
