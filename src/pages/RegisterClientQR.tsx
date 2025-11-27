import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Star, Car, CheckCircle } from "lucide-react";

const RegisterClientQR = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrCodeId = searchParams.get("qr") || searchParams.get("qr_code_id");
  
  const [loading, setLoading] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(true);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (!qrCodeId) {
      toast.error("Code QR invalide");
      navigate("/");
      return;
    }
    loadDriverInfo();
  }, [qrCodeId, navigate]);

  const loadDriverInfo = async () => {
    try {
      setLoadingDriver(true);
      
      // Récupérer les informations du QR code et du chauffeur
      const { data: qrData, error: qrError } = await supabase
        .from("qr_codes")
        .select(`
          *,
          drivers:driver_id (
            id,
            user_id,
            company_name,
            bio,
            service_description,
            vehicle_model,
            vehicle_brand,
            vehicle_color,
            vehicle_year,
            rating,
            total_rides,
            status,
            display_driver_name,
            display_company_name,
            profiles:user_id (
              full_name,
              profile_photo_url
            )
          )
        `)
        .eq("id", qrCodeId)
        .eq("is_active", true)
        .maybeSingle();

      if (qrError || !qrData) {
        toast.error("QR code invalide ou expiré");
        navigate("/");
        return;
      }

      if (qrData.drivers?.status !== "validated") {
        toast.error("Ce chauffeur n'est pas encore validé");
        navigate("/");
        return;
      }

      setDriverInfo(qrData.drivers);
    } catch (error) {
      console.error("Erreur chargement chauffeur:", error);
      toast.error("Erreur lors du chargement des informations");
      navigate("/");
    } finally {
      setLoadingDriver(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting registration with QR code:", qrCodeId);
      
      // Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            address: formData.address,
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }
      if (!authData.user) {
        console.error("No user returned from signUp");
        throw new Error("Erreur lors de la création du compte");
      }

      console.log("User created:", authData.user.id);

      // Attendre un peu pour s'assurer que le profil est créé
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Appeler l'edge function pour créer le client
      console.log("Calling register-client-qr edge function");
      const { data, error } = await supabase.functions.invoke("register-client-qr", {
        body: { qr_code_id: qrCodeId },
      });

      console.log("Edge function response:", data, error);

      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Erreur lors de l'inscription: " + error.message);
      }
      if (data?.error) {
        console.error("Edge function returned error:", data.error);
        throw new Error(data.error);
      }

      toast.success("Inscription réussie ! Bienvenue chez SoloCab");
      navigate("/client-dashboard");
    } catch (error: any) {
      console.error("Erreur inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  if (loadingDriver) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement des informations...</p>
        </Card>
      </div>
    );
  }

  if (!driverInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6">
        {!showRegistrationForm ? (
          // Affichage du profil du chauffeur
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Rejoignez votre chauffeur VTC</h1>
              <p className="text-muted-foreground">Découvrez le profil de votre chauffeur</p>
            </div>

            {/* Carte profil chauffeur */}
            <div className="bg-gradient-premium rounded-lg p-6 space-y-6">
              {/* Photo et nom */}
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-32 h-32 border-4 border-white shadow-elegant">
                  <AvatarImage 
                    src={driverInfo.profiles?.profile_photo_url} 
                    alt={driverInfo.profiles?.full_name}
                  />
                  <AvatarFallback className="text-3xl">
                    {driverInfo.profiles?.full_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  {driverInfo.display_driver_name && (
                    <h2 className="text-2xl font-bold text-premium-foreground">
                      {driverInfo.profiles?.full_name}
                    </h2>
                  )}
                  {driverInfo.display_company_name && driverInfo.company_name && (
                    <p className="text-lg font-semibold text-premium-foreground/90">
                      {driverInfo.company_name}
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge className="bg-premium-foreground text-premium flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {driverInfo.rating?.toFixed(1) || "5.0"}
                  </Badge>
                  <Badge variant="outline" className="bg-premium-foreground/10 text-premium-foreground border-premium-foreground/20">
                    <Car className="w-3 h-3 mr-1" />
                    {driverInfo.total_rides || 0} courses
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Chauffeur vérifié
                  </Badge>
                </div>
              </div>

              {/* Véhicule */}
              {(driverInfo.vehicle_model || driverInfo.vehicle_brand) && (
                <div className="bg-premium-foreground/10 rounded-lg p-4 text-center">
                  <p className="text-sm text-premium-foreground/70 mb-1">Véhicule</p>
                  <p className="text-lg font-semibold text-premium-foreground">
                    {driverInfo.vehicle_brand && `${driverInfo.vehicle_brand} `}
                    {driverInfo.vehicle_model}
                    {driverInfo.vehicle_color && ` • ${driverInfo.vehicle_color}`}
                    {driverInfo.vehicle_year && ` • ${driverInfo.vehicle_year}`}
                  </p>
                </div>
              )}

              {/* Présentation */}
              {(driverInfo.service_description || driverInfo.bio) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-premium-foreground">Présentation</h3>
                  <p className="text-premium-foreground/80 leading-relaxed">
                    {driverInfo.service_description || driverInfo.bio}
                  </p>
                </div>
              )}
            </div>

            {/* Bouton d'inscription */}
            <Button 
              onClick={() => setShowRegistrationForm(true)}
              className="w-full h-12 text-lg bg-premium hover:bg-premium/90"
              size="lg"
            >
              S'inscrire avec ce chauffeur
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              En vous inscrivant, vous deviendrez client exclusif de ce chauffeur
            </p>
          </div>
        ) : (
          // Formulaire d'inscription
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Inscription Client</h1>
              <p className="text-muted-foreground">
                Complétez vos informations pour finaliser l'inscription
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean.dupont@email.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 caractères"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue de Paris, 75001 Paris"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowRegistrationForm(false)}
                  className="flex-1"
                  disabled={loading}
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    "S'inscrire"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RegisterClientQR;
