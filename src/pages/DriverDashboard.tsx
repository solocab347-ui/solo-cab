import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Car, Users, Calendar, TrendingUp, QrCode, LogOut, Settings, Building2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DriverDashboard = () => {
  const { signOut, user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);

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
            <Badge variant="outline" className="border-premium text-premium">
              {driverProfile?.driver?.status === "validated" ? "Vérifié" : "En attente"}
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
            Bonjour, {driverProfile?.full_name?.split(" ")[0] || "Chauffeur"} 👋
          </h1>
          <p className="text-muted-foreground">Gérez votre activité professionnelle</p>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="profile">Profil Public</TabsTrigger>
            <TabsTrigger value="pricing">Tarification</TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-elegant transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-trust rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-trust-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{driverProfile?.driver?.quote_counter || 0}</h3>
                <p className="text-sm text-muted-foreground">Devis générés</p>
                <p className="text-xs text-premium mt-1">REV-{String(driverProfile?.driver?.quote_counter || 0).padStart(3, "0")}</p>
              </Card>

              <Card className="p-6 hover:shadow-elegant transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-premium-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{driverProfile?.driver?.course_counter || 0}</h3>
                <p className="text-sm text-muted-foreground">Courses réalisées</p>
                <p className="text-xs text-premium mt-1">DEV-{String(driverProfile?.driver?.course_counter || 0).padStart(3, "0")}</p>
              </Card>

              <Card className="p-6 hover:shadow-elegant transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{driverProfile?.driver?.invoice_counter || 0}</h3>
                <p className="text-sm text-muted-foreground">Factures émises</p>
                <p className="text-xs text-premium mt-1">FAC-{String(driverProfile?.driver?.invoice_counter || 0).padStart(3, "0")}</p>
              </Card>

              <Card className="p-6 hover:shadow-elegant transition-all bg-gradient-premium">
                <div className="mb-4">
                  <div className="w-12 h-12 bg-premium-foreground/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-premium-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-premium-foreground mb-1">
                  {driverProfile?.driver?.rating?.toFixed(1) || "0.0"} ⭐
                </h3>
                <p className="text-sm text-premium-foreground/80">Note moyenne</p>
              </Card>
            </div>

            {/* QR Code Section */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-premium-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Votre QR Code</h2>
                  <p className="text-sm text-muted-foreground">Pour l'inscription de clients exclusifs</p>
                </div>
              </div>

              {loadingQR ? (
                <div className="bg-secondary rounded-lg p-8 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-card rounded-lg flex items-center justify-center mb-4">
                      <QrCode className="w-32 h-32 text-muted-foreground animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">Génération du QR code...</p>
                  </div>
                </div>
              ) : qrCode?.qr_code_image ? (
                <>
                  <div className="bg-secondary rounded-lg p-8 flex items-center justify-center mb-4">
                    <img
                      src={qrCode.qr_code_image}
                      alt="QR Code"
                      className="w-64 h-64 rounded-lg shadow-elegant"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="bg-accent/50 rounded-lg p-4 border border-border">
                      <p className="text-sm text-muted-foreground mb-1">Scans effectués</p>
                      <p className="text-2xl font-bold text-premium">{qrCode.scans_count || 0}</p>
                    </div>
                    <Button onClick={downloadQRCode} className="w-full bg-gradient-dark hover:opacity-90">
                      Télécharger le QR Code
                    </Button>
                    <Button onClick={fetchQRCode} variant="outline" className="w-full">
                      Régénérer le QR Code
                    </Button>
                  </div>
                </>
              ) : (
                <div className="bg-secondary rounded-lg p-8 flex flex-col items-center justify-center mb-4">
                  <QrCode className="w-32 h-32 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun QR code généré</p>
                  <Button onClick={fetchQRCode} className="bg-gradient-premium">
                    Générer mon QR Code
                  </Button>
                </div>
              )}
            </Card>
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
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
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

              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="font-semibold mb-4">Informations Professionnelles</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Nom de l'entreprise</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Transport Dupont SARL"
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
              </div>
            </Card>

            <Button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full bg-gradient-premium hover:opacity-90"
              size="lg"
            >
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DriverDashboard;
