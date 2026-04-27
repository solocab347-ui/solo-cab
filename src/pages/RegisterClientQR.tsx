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
import { checkEmailExists, buildExistingAccountMessage } from "@/lib/checkEmailExists";
import { Loader2, Star, Car, CheckCircle, Eye, EyeOff } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { sanitizeString, sanitizeEmail, sanitizePhone, sanitizeAddress } from "@/lib/inputSanitizer";
import { getServiceIcon, getServiceLabel, getEquipmentIcon, getEquipmentLabel } from "@/lib/vehicleEquipmentDisplay";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/hooks/useLocale";

const RegisterClientQR = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, locale } = useLocale();
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
      
      // Récupérer les informations du QR code
      const { data: qrData, error: qrError } = await supabase
        .from("qr_codes")
        .select(`id, driver_id, code, is_active, qr_code_image`)
        .eq("id", qrCodeId)
        .eq("is_active", true)
        .maybeSingle();

      if (qrError || !qrData) {
        toast.error("QR code invalide ou expiré");
        navigate("/");
        return;
      }

      // Utiliser la fonction RPC unifiée pour obtenir les données du chauffeur (bypass RLS)
      // Cette fonction gère automatiquement: validés, pionniers, nouveaux inscrits (30j)
      const { data: driverData, error: driverError } = await supabase
        .rpc("get_public_driver_profile_by_id", { driver_id_param: qrData.driver_id });

      // La fonction RPC retourne un tableau
      const driverDataArray = Array.isArray(driverData) ? driverData : (driverData ? [driverData] : []);

      if (driverError || driverDataArray.length === 0) {
        console.error("Erreur driver RPC:", driverError);
        toast.error("Chauffeur introuvable");
        navigate("/");
        return;
      }

      const driver = driverDataArray[0];

      // Combiner les données - La RPC retourne déjà toutes les infos nécessaires
      const completeDriverInfo = {
        ...driver,
        card_photo_url: driver.profile_photo_url,
        status: driver.status,
        is_pioneer: driver.is_pioneer,
        profile: {
          full_name: driver.profile_full_name,
          email: driver.profile_email,
          phone: driver.profile_phone,
          profile_photo_url: driver.profile_photo_url,
        },
        // Photo: priorité à profile_photo_url de la RPC
        display_photo: driver.profile_photo_url
      };

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
      
      // Vérification préalable email déjà utilisé
      const existing = await checkEmailExists(cleanEmail);
      if (existing.exists) {
        const { message, loginPath } = buildExistingAccountMessage(existing.role);
        toast.error("Email déjà utilisé", {
          description: message,
          duration: 8000,
          action: {
            label: "Se connecter",
            onClick: () => navigate(loginPath),
          },
        });
        setLoading(false);
        return;
      }

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

      // Attendre un peu pour s'assurer que le profil est créé par le trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // CRITIQUE: Mettre à jour le profil avec le téléphone et l'adresse
      // Le trigger handle_new_user ne récupère pas toujours les métadonnées correctement
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone: cleanPhone,
          address: cleanAddress,
          preferred_language: locale 
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error("Erreur mise à jour profil:", updateError);
      }

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
          <p className="text-muted-foreground">{t('fleetPublic.loadingInfo')}</p>
        </Card>
      </div>
    );
  }

  if (!driverInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background flex items-center justify-center p-4">
      {/* Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      <Card className="w-full max-w-2xl p-8 shadow-xl border-2">
        {!showRegistrationForm ? (
          // Affichage du profil du chauffeur
          <div className="space-y-8">
            {/* En-tête élégant */}
            <div className="text-center space-y-2 pb-6 border-b">
              <h1 className="text-3xl font-bold text-foreground">{t('register.joinDriver')}</h1>
              <p className="text-muted-foreground text-base">{t('register.discoverDriver')}</p>
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
                    {driverInfo.is_pioneer && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-lg px-4 py-1.5 flex items-center gap-1.5">
                        🏆
                        <span className="font-semibold">Pionnier SoloCab</span>
                      </Badge>
                    )}
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
                      <span className="font-semibold">{t('fleetPublic.verified')}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Séparateur élégant */}
              <div className="my-8 border-t border-border" />

              {/* Véhicule - Design sobre */}
              {(driverInfo.vehicle_model || driverInfo.vehicle_brand) && (
                <div className="bg-muted/30 rounded-xl p-6 text-center space-y-2 border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('fleetPublic.vehicle')}</p>
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
                  <h3 className="text-lg font-semibold text-foreground">{t('fleetPublic.presentation')}</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {driverInfo.service_description || driverInfo.bio}
                  </p>
                </div>
              )}

              {/* Services proposés */}
              {driverInfo.services_offered && driverInfo.services_offered.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground text-center">{t('fleetPublic.servicesOffered')}</h3>
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
                  <h3 className="text-lg font-semibold text-foreground text-center">{t('fleetPublic.vehicleEquipment')}</h3>
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
                  <h3 className="text-lg font-semibold text-foreground text-center">{t('fleetPublic.vehiclePhotos')}</h3>
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
              {t('register.withThisDriver')}
            </Button>

            <p className="text-center text-sm text-muted-foreground leading-relaxed">
              {t('register.exclusiveNote')}
            </p>

            {/* Séparateur */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Bouton réservation sans inscription */}
            <Button 
              variant="outline"
              onClick={() => navigate(`/reservation-rapide/${driverInfo.id}`)}
              className="w-full h-12 text-base font-medium border-2 hover:bg-muted/50 transition-all"
              size="lg"
            >
              {t('fleetPublic.bookWithoutRegister')}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t('fleetPublic.quickBookNote')}
            </p>
          </div>
        ) : (
          // Formulaire d'inscription
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">{t('register.title')}</h1>
              <p className="text-muted-foreground">
                {t('register.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">{t('register.fullName')}</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="email">{t('auth.email')}</Label>
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
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('auth.passwordMinLength')}
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
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder={t('auth.confirmPassword')}
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
                  <p className="text-sm text-destructive mt-1">{t('auth.passwordMismatch')}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">{t('register.phone')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('fleetPublic.phoneRequired')}
                </p>
              </div>
              <div>
                <Label htmlFor="address">{t('register.address')}</Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(address) => setFormData({ ...formData, address })}
                  placeholder="Commencez à taper votre adresse..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('register.addressHint')}
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
                  {t('common.back')}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('register.submitting')}
                    </>
                  ) : (
                    t('register.submit')
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
