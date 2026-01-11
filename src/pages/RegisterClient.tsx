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
        <p className="text-sm text-muted-foreground mb-6">
          Inscrivez-vous gratuitement pour accéder à tous les chauffeurs VTC
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
