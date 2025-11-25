import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

const RegisterClientDriver = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const driverId = searchParams.get("driver_id");

  useEffect(() => {
    if (!driverId) {
      toast.error("Chauffeur non spécifié");
      navigate("/chauffeurs");
      return;
    }

    fetchDriverInfo();
  }, [driverId]);

  const fetchDriverInfo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          vehicle_model,
          vehicle_brand,
          vehicle_color,
          vehicle_year,
          vehicle_photos,
          bio,
          company_name,
          profiles (
            full_name,
            profile_photo_url
          )
        `)
        .eq("id", driverId)
        .eq("public_profile_enabled", true)
        .eq("status", "validated")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Chauffeur non trouvé");

      setDriverInfo(data);
    } catch (error: any) {
      console.error("Error fetching driver:", error);
      toast.error("Chauffeur non trouvé ou profil non public");
      setTimeout(() => navigate("/chauffeurs"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If user is already logged in, just register them with this driver
    if (user) {
      setRegistering(true);
      try {
        const { data: clientData, error: clientError } = await supabase.functions.invoke(
          "register-client-driver",
          {
            body: { driver_id: driverId },
          }
        );

        if (clientError) throw clientError;
        if (clientData.error) {
          toast.error(clientData.error);
          return;
        }

        toast.success("Inscription réussie avec ce chauffeur !");
        setTimeout(() => navigate("/client-dashboard"), 1500);
      } catch (error: any) {
        console.error("Registration error:", error);
        toast.error(error.message || "Erreur lors de l'inscription");
      } finally {
        setRegistering(false);
      }
      return;
    }
    
    // Otherwise, create new account
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setRegistering(true);
    try {
      // Step 1: Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // Step 2: Register as client with this driver
      const { data: clientData, error: clientError } = await supabase.functions.invoke(
        "register-client-driver",
        {
          body: { driver_id: driverId },
        }
      );

      if (clientError) throw clientError;
      if (clientData.error) {
        toast.error(clientData.error);
        return;
      }

      // Step 3: Send welcome email
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            type: "client_welcome",
            data: {
              clientName: fullName,
            },
          },
        });
      } catch (emailErr) {
        console.error("⚠️ Erreur envoi email (non bloquant):", emailErr);
      }

      toast.success("Compte créé ! Vous êtes maintenant client de ce chauffeur.");
      setTimeout(() => navigate("/client-dashboard"), 1500);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </Card>
      </div>
    );
  }

  if (!driverInfo) {
    return null;
  }

  const driver = driverInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="p-8 shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                <Car className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                SoloCab
              </span>
            </Link>
            <h1 className="text-4xl font-bold mb-3 text-slate-900 dark:text-white">Créer mon compte</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Inscrivez-vous pour réserver avec ce chauffeur
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col items-center text-center gap-6">
              {driver.profiles?.profile_photo_url ? (
                <img
                  src={driver.profiles.profile_photo_url}
                  alt={driver.profiles.full_name}
                  className="w-28 h-28 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-slate-700"
                />
              ) : (
                <div className="w-28 h-28 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-700">
                  <Car className="w-14 h-14 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{driver.profiles?.full_name}</h3>
                {driver.company_name && driver.company_name.trim() && 
                 !driver.company_name.toLowerCase().includes('compléter') && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{driver.company_name}</p>
                )}
                {(() => {
                  const hasValidBrand = driver.vehicle_brand && !driver.vehicle_brand.toLowerCase().includes('compléter');
                  const hasValidModel = driver.vehicle_model && !driver.vehicle_model.toLowerCase().includes('compléter');
                  const hasValidColor = driver.vehicle_color && !driver.vehicle_color.toLowerCase().includes('compléter');
                  const hasValidYear = driver.vehicle_year && driver.vehicle_year > 1900;
                  
                  if (!hasValidBrand && !hasValidModel && !hasValidColor && !hasValidYear) return null;
                  
                  return (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {hasValidBrand && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{driver.vehicle_brand}</Badge>
                      )}
                      {hasValidModel && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{driver.vehicle_model}</Badge>
                      )}
                      {hasValidColor && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{driver.vehicle_color}</Badge>
                      )}
                      {hasValidYear && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{driver.vehicle_year}</Badge>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 mb-8 border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Avantages Client Libre
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>Prix fixés d'avance sans surprises</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>Devis automatiques instantanés</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>Factures en ligne accessibles 24/7</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>Réservation facile en quelques clics</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>Accès à plusieurs chauffeurs</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                <span>Suivi en temps réel</span>
              </div>
            </div>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Vous êtes déjà connecté. Cliquez ci-dessous pour vous inscrire automatiquement avec ce chauffeur.
                </p>
              </div>
              <Button
                onClick={handleRegister}
                disabled={registering}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white shadow-lg"
                size="lg"
              >
                {registering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Inscription en cours...
                  </>
                ) : (
                  "S'inscrire avec ce chauffeur"
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Nom complet *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={registering}
                  required
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={registering}
                  required
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={registering}
                    required
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Minimum 6 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={registering}
                    required
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={registering}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white shadow-lg"
                size="lg"
              >
                {registering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Création du compte...
                  </>
                ) : (
                  "Créer mon compte et m'inscrire"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Vous avez déjà un compte ?{" "}
              <Link to="/login" className="text-slate-900 dark:text-white font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterClientDriver;
