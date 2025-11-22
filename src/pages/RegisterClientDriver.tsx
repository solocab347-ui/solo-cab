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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
                <Car className="w-7 h-7 text-primary" />
              </div>
              <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
                SoloCab
              </span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">Créer mon compte</h1>
            <p className="text-muted-foreground">
              Inscrivez-vous pour réserver avec ce chauffeur
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-6 mb-8">
            <div className="flex flex-col items-center text-center gap-4 mb-4">
              {driver.profiles?.profile_photo_url ? (
                <img
                  src={driver.profiles.profile_photo_url}
                  alt={driver.profiles.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-dark rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <Car className="w-12 h-12 text-primary-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold mb-1">{driver.profiles?.full_name}</h3>
                {driver.company_name && (
                  <p className="text-sm text-muted-foreground mb-2">{driver.company_name}</p>
                )}
              </div>
            </div>
            {(driver.vehicle_brand || driver.vehicle_model) && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">Véhicule</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {driver.vehicle_brand && (
                    <Badge variant="outline">{driver.vehicle_brand}</Badge>
                  )}
                  {driver.vehicle_model && (
                    <Badge variant="outline">{driver.vehicle_model}</Badge>
                  )}
                  {driver.vehicle_color && (
                    <Badge variant="outline">{driver.vehicle_color}</Badge>
                  )}
                  {driver.vehicle_year && (
                    <Badge variant="outline">{driver.vehicle_year}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-accent/50 rounded-lg p-6 mb-8 border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-premium" />
              Client Libre - En vous inscrivant
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Réservez facilement des courses avec ce chauffeur</li>
              <li>✓ Vous pouvez aussi réserver avec d'autres chauffeurs</li>
              <li>✓ Suivez l'historique de vos trajets</li>
              <li>✓ Gérez vos devis et factures</li>
              <li>✓ Accès à la vitrine publique pour découvrir plus de chauffeurs</li>
            </ul>
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
                className="w-full bg-gradient-premium"
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
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={registering}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={registering}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={registering}
                    required
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
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={registering}
                    required
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
              </div>

              <Button
                type="submit"
                disabled={registering}
                className="w-full bg-gradient-premium"
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
            <p className="text-sm text-muted-foreground">
              Vous avez déjà un compte ?{" "}
              <Link to="/login" className="text-premium hover:underline">
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
