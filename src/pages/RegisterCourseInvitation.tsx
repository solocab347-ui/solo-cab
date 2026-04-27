import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { checkEmailExists, buildExistingAccountMessage } from "@/lib/checkEmailExists";
import { Loader2, Eye, EyeOff, MapPin, Navigation, Clock, Euro, User, Car, AlertCircle } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/hooks/useLocale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InvitationDetails {
  id: string;
  token: string;
  driver_id: string;
  course_id: string;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  duration_minutes: number;
  estimated_price: number;
  price_details: any;
  status: string;
  expires_at: string;
  driver_name: string;
  driver_company: string;
  driver_photo: string;
}

const RegisterCourseInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    address: "",
  });

  const { t } = useLocale();

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide");
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase.rpc("get_course_invitation_by_token", {
        p_token: token
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setError("Cette invitation a expiré ou n'existe plus");
        return;
      }

      const inv = data[0];
      
      // Fetch driver info separately
      const { data: driverData } = await supabase
        .from("drivers")
        .select("company_name, user_id")
        .eq("id", inv.driver_id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, profile_photo_url")
        .eq("id", driverData?.user_id)
        .single();

      setInvitation({
        ...inv,
        driver_name: profileData?.full_name || "Chauffeur",
        driver_company: driverData?.company_name || "",
        driver_photo: profileData?.profile_photo_url || "",
      });
    } catch (err: any) {
      console.error("Erreur:", err);
      setError("Erreur lors du chargement de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (!formData.phone) {
      toast.error("Le numéro de téléphone est obligatoire");
      return;
    }
    
    setSubmitting(true);

    try {
      // 1. Créer le compte utilisateur
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

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // Attendre que le profil soit créé
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Appeler l'edge function pour finaliser l'inscription
      const { data, error } = await supabase.functions.invoke("complete-course-invitation", {
        body: { 
          token: token,
          user_id: authData.user.id
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Inscription réussie ! Bienvenue chez SoloCab", {
        description: "Votre devis vous attend dans votre espace client"
      });
      
      navigate("/client-dashboard");
    } catch (error: any) {
      console.error("Erreur inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Invitation non valide</h1>
          <p className="text-muted-foreground mb-4">
            {error || "Cette invitation a expiré ou n'existe plus."}
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {/* Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      <div className="max-w-lg mx-auto space-y-6">
        {/* En-tête avec infos chauffeur */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={invitation.driver_photo || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {invitation.driver_name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-bold text-lg">
                {invitation.driver_name || "Votre chauffeur"}
              </h2>
              {invitation.driver_company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Car className="w-4 h-4" />
                  {invitation.driver_company}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Vous a envoyé un devis pour une course VTC. Inscrivez-vous pour confirmer votre réservation.
          </p>
        </Card>

        {/* Détails de la course */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Détails de votre course
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-success mt-1.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="font-medium">{invitation.pickup_address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive mt-1.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="font-medium">{invitation.destination_address}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Navigation className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{invitation.distance_km?.toFixed(1)} km</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{invitation.duration_minutes} min</p>
                <p className="text-xs text-muted-foreground">Durée</p>
              </div>
              <div className="text-center">
                <Euro className="w-5 h-5 mx-auto text-success mb-1" />
                <p className="text-lg font-bold text-success">{invitation.estimated_price?.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">Prix TTC</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Formulaire d'inscription */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Créez votre compte
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">{t('register.fullName')} *</Label>
              <Input
                id="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>
            
            <div>
              <Label htmlFor="email">{t('auth.email')} *</Label>
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
                Pour que votre chauffeur puisse vous contacter
              </p>
            </div>
            
            <div>
              <Label htmlFor="password">{t('auth.password')} *</Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirmez votre mot de passe"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{t('auth.passwordMismatch')}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="address">{t('register.address')}</Label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
                placeholder="Votre adresse (optionnel)"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-success to-trust" 
              disabled={submitting}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inscription en cours...
                </>
              ) : (
                "M'inscrire et voir mon devis"
              )}
            </Button>
          </form>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterCourseInvitation;
