import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Car, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RegisterClientQR = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [registering, setRegistering] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const qrId = searchParams.get("qr");

  useEffect(() => {
    if (!qrId) {
      toast.error("QR code invalide");
      navigate("/");
      return;
    }

    verifyQRCode();
  }, [qrId]);

  const verifyQRCode = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/qr-code-manager?action=verify&qr_id=${qrId}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "QR code invalide");
      }

      setDriverInfo(result);
    } catch (error: any) {
      console.error("QR verification error:", error);
      toast.error(error.message || "QR code invalide ou expiré");
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setRegistering(true);
    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // 2. Créer le profil
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          roles: ["client"],
        });

      if (profileError) throw profileError;

      // 3. Ajouter le rôle
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "client",
        });

      if (roleError) throw roleError;

      // 4. Créer le client exclusif via Edge Function
      const { data, error } = await supabase.functions.invoke("register-client-qr", {
        body: { qr_code_id: qrId },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Inscription réussie ! Bienvenue sur SoloCab 🎉");
      setTimeout(() => navigate("/client-dashboard"), 2000);
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
          <p className="text-muted-foreground">Vérification du QR code...</p>
        </Card>
      </div>
    );
  }

  if (!driverInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">QR Code Invalide</h2>
          <p className="text-muted-foreground mb-6">
            Ce QR code n'est pas valide ou a expiré.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  const driver = driverInfo.drivers;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-premium rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-10 h-10 text-premium-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Inscription Client</h1>
            <p className="text-muted-foreground">
              Créez votre compte pour réserver avec {driver.profiles?.full_name}
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              {driver.profiles?.profile_photo_url ? (
                <img
                  src={driver.profiles.profile_photo_url}
                  alt={driver.profiles.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-dark rounded-full flex items-center justify-center">
                  <Car className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">{driver.profiles?.full_name}</h3>
                {driver.company_name && (
                  <p className="text-sm text-muted-foreground mb-2">{driver.company_name}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{driver.vehicle_model}</Badge>
                  {driver.vehicle_color && (
                    <Badge variant="outline">{driver.vehicle_color}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-accent/50 rounded-lg p-6 mb-8 border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-premium" />
              Avantages Client Exclusif
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Service personnalisé avec votre chauffeur attitré</li>
              <li>✓ Tarification préférentielle</li>
              <li>✓ Priorité sur les réservations</li>
              <li>✓ Facturation simplifiée</li>
            </ul>
          </div>

          {user ? (
            // Si déjà connecté, juste lier avec le chauffeur
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground mb-4">
                Vous êtes connecté en tant que {user.email}
              </p>
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
                  "Devenir client exclusif de ce chauffeur"
                )}
              </Button>
            </div>
          ) : (
            // Formulaire d'inscription complet
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean.dupont@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
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
                  "S'inscrire et devenir client exclusif"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </p>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Vous avez déjà un compte ?
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full"
                >
                  Se connecter
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegisterClientQR;
