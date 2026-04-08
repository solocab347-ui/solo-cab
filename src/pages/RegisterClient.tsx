import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle, Users, Search } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";

const RegisterClient = () => {
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
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

  // If user is already logged in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      // Check if already a client
      const checkClientStatus = async () => {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingClient) {
          navigate("/client-dashboard");
        } else {
          // User logged in but not a client yet - create client record
          await createClientRecord(user.id);
        }
      };
      checkClientStatus();
    }
  }, [user, authLoading, navigate]);

  const createClientRecord = async (userId: string) => {
    try {
      setLoading(true);

      // Create client record without driver (free client without driver)
      const { data: newClient, error: insertError } = await supabase
        .from("clients")
        .insert({
          user_id: userId,
          is_exclusive: false,
          driver_ids: [], // Empty - no drivers yet
          driver_id: null,
          favorite_driver_id: null,
        })
        .select()
        .single();

      if (insertError) {
        // If already exists, just redirect
        if (insertError.code === '23505') {
          navigate("/client-dashboard");
          return;
        }
        throw insertError;
      }

      // Create client role
      await supabase
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "client"
        }, { onConflict: 'user_id,role' });

      setRegistrationSuccess(true);
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error("Erreur lors de la création du compte client");
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
    
    setLoading(true);

    try {
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

      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with phone
      await supabase
        .from('profiles')
        .update({ 
          phone: formData.phone,
          address: formData.address,
          preferred_language: locale 
        })
        .eq('id', authData.user.id);

      // Create client record
      await createClientRecord(authData.user.id);

      toast.success("Compte créé avec succès !");
    } catch (error: any) {
      console.error("Error registering:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Cette adresse email est déjà utilisée");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </Card>
      </div>
    );
  }

  // Registration success
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Bienvenue sur SoloCab !</h1>
          <p className="text-muted-foreground mb-6">
            Votre compte a été créé avec succès. Pour commencer à réserver des courses, 
            vous devez d'abord ajouter un chauffeur à votre compte.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/chauffeurs")}
              className="w-full gap-2"
            >
              <Search className="w-4 h-4" />
              Trouver un chauffeur
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/client-dashboard")}
              className="w-full gap-2"
            >
              <Users className="w-4 h-4" />
              Mon tableau de bord
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Registration form for new users
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
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
        <h1 className="text-2xl font-bold mb-2">Créer un compte client</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Inscrivez-vous gratuitement pour accéder à tous les chauffeurs VTC
        </p>

        {/* Google OAuth signup */}
        <Button
          variant="outline"
          className="w-full h-11 gap-3 mb-4"
          onClick={async () => {
            try {
              localStorage.setItem("solocab_oauth_signup_type", "client");
              const { lovable } = await import("@/integrations/lovable/index");
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin + "/oauth-onboarding",
              });
              if (result.error) toast.error(result.error.message);
            } catch (e: any) {
              toast.error(e.message);
            }
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          S'inscrire avec Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ou par email</span></div>
        </div>
        
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
                Création en cours...
              </>
            ) : (
              "Créer mon compte"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => navigate("/auth?redirect=/client-dashboard")}
            >
              Se connecter
            </Button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RegisterClient;
