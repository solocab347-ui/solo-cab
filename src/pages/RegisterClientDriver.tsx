import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, UserCheck, CheckCircle } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";

const RegisterClientDriver = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale, t } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const driverId = searchParams.get("driver_id");
  
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ full_name: string; company_name: string | null } | null>(null);
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

  useEffect(() => {
    if (!driverId) {
      toast.error("Lien d'inscription invalide");
      navigate("/");
    }
  }, [driverId, navigate]);

  // Charger les infos du chauffeur
  useEffect(() => {
    const loadDriverInfo = async () => {
      if (!driverId) return;
      
      try {
        // Utiliser la vue publique pour récupérer les infos basiques
        const { data, error } = await supabase
          .from('public_driver_profiles')
          .select('company_name, display_driver_name, display_company_name')
          .eq('id', driverId)
          .maybeSingle();
        
        if (!error && data) {
          // Pour la vue publique, on utilise le nom d'entreprise ou un générique
          const displayName = data.company_name || "votre chauffeur";
          setDriverInfo({
            full_name: displayName,
            company_name: data.company_name
          });
        }
      } catch (error) {
        console.error("Erreur chargement chauffeur:", error);
      }
    };
    
    loadDriverInfo();
  }, [driverId]);

  // Vérifier si l'utilisateur est déjà connecté et inscrit avec ce chauffeur
  useEffect(() => {
    const checkExistingRegistration = async () => {
      if (authLoading) return;
      
      if (!user) {
        setCheckingExisting(false);
        return;
      }

      // Utilisateur connecté - vérifier s'il est déjà inscrit avec ce chauffeur
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("id, driver_id, driver_ids, is_exclusive")
          .eq("user_id", user.id)
          .maybeSingle();

        if (client) {
          const alreadyWithDriver = 
            client.driver_id === driverId || 
            client.driver_ids?.includes(driverId);

          if (alreadyWithDriver) {
            setIsAlreadyRegistered(true);
            setCheckingExisting(false);
            return;
          }

          // Client existe mais pas avec ce chauffeur - l'ajouter directement
          if (!client.is_exclusive) {
            await registerExistingClientWithDriver();
            return;
          }
        } else {
          // L'utilisateur est connecté mais pas encore client - l'inscrire directement
          await registerExistingClientWithDriver();
          return;
        }
      } catch (error) {
        console.error("Erreur vérification:", error);
      }
      
      setCheckingExisting(false);
    };

    checkExistingRegistration();
  }, [user, authLoading, driverId]);

  const registerExistingClientWithDriver = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("register-client-driver", {
        body: { driver_id: driverId },
      });

      if (error) throw error;
      if (data.error) {
        // Si déjà inscrit, afficher le message approprié
        if (data.error.includes("déjà inscrit")) {
          setIsAlreadyRegistered(true);
          setCheckingExisting(false);
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      setRegistrationSuccess(true);
      toast.success("Inscription réussie avec ce chauffeur !");
    } catch (error: any) {
      console.error("Erreur inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
      setCheckingExisting(false);
    } finally {
      setLoading(false);
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

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // CRITIQUE: Attendre que le profil soit créé par le trigger handle_new_user
      await new Promise(resolve => setTimeout(resolve, 1000));

      // CRITIQUE: Mettre à jour le profil avec le téléphone et l'adresse
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone: formData.phone,
          address: formData.address,
          preferred_language: locale 
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error("Erreur mise à jour profil:", updateError);
      }

      // Appeler l'edge function pour créer le client
      const { data, error } = await supabase.functions.invoke("register-client-driver", {
        body: { driver_id: driverId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Inscription réussie ! Bienvenue chez SoloCab");
      navigate("/client-dashboard");
    } catch (error: any) {
      console.error("Erreur inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const driverDisplayName = driverInfo 
    ? (driverInfo.company_name ? `${driverInfo.full_name} - ${driverInfo.company_name}` : driverInfo.full_name)
    : "ce chauffeur";

  // Loading state
  if (authLoading || checkingExisting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Vérification en cours...</p>
        </Card>
      </div>
    );
  }

  // Already registered state
  if (isAlreadyRegistered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Déjà inscrit !</h1>
          <p className="text-muted-foreground mb-6">
            Vous êtes déjà inscrit avec <strong>{driverDisplayName}</strong>. 
            Vous pouvez le retrouver dans votre tableau de bord.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/client-dashboard")}
              className="w-full"
            >
              Mon tableau de bord
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/chauffeurs")}
              className="w-full"
            >
              Retour à la vitrine
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Registration success state (for logged-in users)
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Inscription réussie !</h1>
          <p className="text-muted-foreground mb-6">
            Vous êtes maintenant inscrit avec <strong>{driverDisplayName}</strong>. 
            Vous pouvez commander des courses dès maintenant !
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/client-dashboard")}
              className="w-full"
            >
              Commander une course
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/chauffeurs")}
              className="w-full"
            >
              Retour à la vitrine
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // New user registration form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleGoBack}
        className="fixed top-4 left-4 z-50 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>
      
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-2">{t('register.title')}</h1>
        {driverInfo && (
          <p className="text-sm text-primary font-medium mb-4">
            Inscription avec {driverDisplayName}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          {t('register.subtitle')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">{t('register.fullName')}</Label>
            <Input
              id="fullName"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
              {t('register.phoneHint')}
            </p>
          </div>
          <div>
            <Label htmlFor="address">{t('register.address')}</Label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address) => setFormData({ ...formData, address })}
              placeholder={t('register.addressPlaceholder')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('register.addressHint')}
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('register.submitting')}
              </>
            ) : (
              t('register.submit')
            )}
          </Button>
        </form>
        
        {/* Lien connexion si déjà inscrit */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => navigate(`/auth?redirect=/register-client-driver?driver_id=${driverId}`)}
            >
              Se connecter
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterClientDriver;
