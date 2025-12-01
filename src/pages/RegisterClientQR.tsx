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
import { Loader2, Star, Car, CheckCircle, Eye, EyeOff } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { sanitizeString, sanitizeEmail, sanitizePhone, sanitizeAddress } from "@/lib/inputSanitizer";
import { getServiceIcon, getServiceLabel, getEquipmentIcon, getEquipmentLabel } from "@/lib/vehicleEquipmentDisplay";

const RegisterClientQR = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qrCodeId = searchParams.get("qr") || searchParams.get("qr_code_id");
  
  const [loading, setLoading] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(true);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
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
      // SÉCURITÉ: SELECT explicite excluant scans_count (données sensibles)
      const { data: qrData, error: qrError } = await supabase
        .from("qr_codes")
        .select(`
          id,
          driver_id,
          code,
          is_active,
          qr_code_image
        `)
        .eq("id", qrCodeId)
        .eq("is_active", true)
        .maybeSingle();

      if (qrError || !qrData) {
        toast.error("QR code invalide ou expiré");
        navigate("/");
        return;
      }

      // Récupérer les infos complètes du driver avec le profile
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          company_name,
          bio,
          service_description,
          vehicle_model,
          vehicle_brand,
          vehicle_color,
          vehicle_year,
          vehicle_plate,
          vehicle_equipment,
          services_offered,
          vehicle_photos,
          gallery_photos,
          card_photo_url,
          rating,
          total_rides,
          status,
          display_driver_name,
          display_company_name
        `)
        .eq("id", qrData.driver_id)
        .single();

      if (driverError || !driverData) {
        toast.error("Chauffeur introuvable");
        navigate("/");
        return;
      }

      // Récupérer le profil du chauffeur
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, profile_photo_url")
        .eq("id", driverData.user_id)
        .single();

      if (profileError) {
        console.error("Erreur profil:", profileError);
      }

      // Combiner les données - PRIORITÉ à card_photo_url
      const completeDriverInfo = {
        ...driverData,
        profile: profileData || {},
        // Utiliser card_photo_url en priorité, sinon profile_photo_url
        display_photo: driverData.card_photo_url || profileData?.profile_photo_url
      };

      if (qrError || !qrData) {
        toast.error("QR code invalide ou expiré");
        navigate("/");
        return;
      }

      if (completeDriverInfo.status !== "validated") {
        toast.error("Ce chauffeur n'est pas encore validé");
        navigate("/");
        return;
      }

      setDriverInfo(completeDriverInfo);
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
    
    // Validation des mots de passe
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    
    setLoading(true);

    try {
      // Sanitize les inputs avant envoi
      const cleanFullName = sanitizeString(formData.fullName);
      const cleanEmail = sanitizeEmail(formData.email);
      const cleanPhone = sanitizePhone(formData.phone);
      const cleanAddress = sanitizeAddress(formData.address);
      
      // Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: cleanPhone,
            address: cleanAddress,
          },
        },
      });

      if (authError) {
        throw authError;
      }
      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte");
      }

      // Attendre un peu pour s'assurer que le profil est créé
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Appeler l'edge function pour créer le client
      const { data, error } = await supabase.functions.invoke("register-client-qr", {
        body: { qr_code_id: qrCodeId },
      });

      if (error) {
        throw new Error("Erreur lors de l'inscription: " + error.message);
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Inscription réussie ! Bienvenue chez SoloCab");
      navigate("/client-dashboard");
    } catch (error: any) {
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
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-xl border-2">
        {!showRegistrationForm ? (
          // Affichage du profil du chauffeur
          <div className="space-y-8">
            {/* En-tête élégant */}
            <div className="text-center space-y-2 pb-6 border-b">
              <h1 className="text-3xl font-bold text-foreground">Rejoignez votre chauffeur VTC</h1>
              <p className="text-muted-foreground text-base">Découvrez le profil de votre chauffeur</p>
            </div>

            {/* Carte profil chauffeur - Design sobre et professionnel */}
            <div className="bg-gradient-to-br from-card via-background to-card border-2 border-border rounded-2xl p-8 shadow-lg">
              {/* Photo et nom - Bien centré */}
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Photo avec cadrage parfait */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl" />
                  <Avatar className="relative w-40 h-40 border-4 border-background shadow-2xl ring-2 ring-primary/20">
                    <AvatarImage 
                      src={driverInfo.display_photo} 
                      alt={driverInfo.profile?.full_name}
                      className="object-cover object-center"
                    />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      {driverInfo.profile?.full_name?.charAt(0) || driverInfo.company_name?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Nom et badges - Alignés proprement */}
                <div className="space-y-4 w-full">
                  <div className="space-y-2">
                    {driverInfo.display_driver_name && driverInfo.profile?.full_name && (
                      <h2 className="text-3xl font-bold text-foreground tracking-tight">
                        {driverInfo.profile.full_name}
                      </h2>
                    )}
                    {driverInfo.display_company_name && driverInfo.company_name && (
                      <p className="text-lg font-medium text-muted-foreground">
                        {driverInfo.company_name}
                      </p>
                    )}
                  </div>

                  {/* Badges harmonieux */}
                  <div className="flex flex-wrap gap-3 justify-center items-center">
                    <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors px-4 py-1.5 flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-primary" />
                      <span className="font-semibold">{driverInfo.rating?.toFixed(1) || "5.0"}</span>
                    </Badge>
                    <Badge className="bg-muted/50 text-foreground border border-border hover:bg-muted transition-colors px-4 py-1.5 flex items-center gap-1.5">
                      <Car className="w-4 h-4" />
                      <span className="font-semibold">{driverInfo.total_rides || 0} course{(driverInfo.total_rides || 0) > 1 ? "s" : ""}</span>
                    </Badge>
                    <Badge className="bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors px-4 py-1.5 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-semibold">Vérifié</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Séparateur élégant */}
              <div className="my-8 border-t border-border" />

              {/* Véhicule - Design sobre */}
              {(driverInfo.vehicle_model || driverInfo.vehicle_brand) && (
                <div className="bg-muted/30 rounded-xl p-6 text-center space-y-2 border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Véhicule</p>
                  <p className="text-xl font-semibold text-foreground">
                    {driverInfo.vehicle_brand && `${driverInfo.vehicle_brand} `}
                    {driverInfo.vehicle_model}
                    {driverInfo.vehicle_color && ` • ${driverInfo.vehicle_color}`}
                    {driverInfo.vehicle_year && ` • ${driverInfo.vehicle_year}`}
                  </p>
                </div>
              )}

              {/* Présentation - Texte bien aligné */}
              {(driverInfo.service_description || driverInfo.bio) && (
                <div className="mt-6 space-y-3 text-center">
                  <h3 className="text-lg font-semibold text-foreground">Présentation</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {driverInfo.service_description || driverInfo.bio}
                  </p>
                </div>
              )}

              {/* Services proposés */}
              {driverInfo.services_offered && driverInfo.services_offered.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-center">Services proposés</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {driverInfo.services_offered.map((service: string) => (
                      <Badge key={service} variant="secondary" className="px-3 py-1 text-base">
                        <span className="mr-1.5">{getServiceIcon(service)}</span>
                        {getServiceLabel(service)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Équipements véhicule */}
              {driverInfo.vehicle_equipment && driverInfo.vehicle_equipment.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-center">Équipements du véhicule</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {driverInfo.vehicle_equipment.map((equipment: string) => (
                      <Badge key={equipment} variant="outline" className="px-3 py-1 text-base">
                        <span className="mr-1.5">{getEquipmentIcon(equipment)}</span>
                        {getEquipmentLabel(equipment)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos du véhicule */}
              {driverInfo.vehicle_photos && driverInfo.vehicle_photos.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-center">Photos du véhicule</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {driverInfo.vehicle_photos.slice(0, 4).map((photo: string, index: number) => (
                      <div key={index} className="aspect-video rounded-lg overflow-hidden border-2 border-border/50">
                        <img 
                          src={photo} 
                          alt={`Véhicule ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bouton d'inscription - Sobre et efficace */}
            <Button 
              onClick={() => setShowRegistrationForm(true)}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-primary to-primary/90 hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              S'inscrire avec ce chauffeur
            </Button>

            <p className="text-center text-sm text-muted-foreground leading-relaxed">
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirmer le mot de passe"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                )}
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
                <Label htmlFor="address">Adresse de mon domicile</Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(address) => setFormData({ ...formData, address })}
                  placeholder="Commencez à taper votre adresse..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cette adresse facilitera la réservation de vos courses
                </p>
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
