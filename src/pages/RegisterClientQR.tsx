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

      // 4. Utiliser la fonction edge sécurisée pour créer le client exclusif
      const { data: clientData, error: clientError } = await supabase.functions.invoke(
        "register-client-qr",
        {
          body: { qr_code_id: qrId },
        }
      );

      if (clientError) throw clientError;
      if (clientData?.error) throw new Error(clientData.error);

      // 6. Envoyer l'email de bienvenue
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: email.trim(),
            type: "client_welcome",
            data: {
              clientName: fullName.trim(),
            },
          },
        });
      } catch (emailErr) {
        console.error("⚠️ Erreur envoi email (non bloquant):", emailErr);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="p-8 shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Car className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3 text-slate-900 dark:text-white">Inscription Client</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Créez votre compte pour réserver avec {driver.profiles?.full_name}
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850 rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-6">
              {driver.profiles?.profile_photo_url ? (
                <img
                  src={driver.profiles.profile_photo_url}
                  alt={driver.profiles.full_name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-md">
                  <Car className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">{driver.profiles?.full_name}</h3>
                {driver.company_name && driver.company_name.trim() && 
                 !driver.company_name.toLowerCase().includes('compléter') && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{driver.company_name}</p>
                )}
                {(() => {
                  const hasValidModel = driver.vehicle_model && !driver.vehicle_model.toLowerCase().includes('compléter');
                  const hasValidColor = driver.vehicle_color && !driver.vehicle_color.toLowerCase().includes('compléter');
                  
                  if (!hasValidModel && !hasValidColor) return null;
                  
                  return (
                    <div className="flex flex-wrap gap-2">
                      {hasValidModel && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{driver.vehicle_model}</Badge>
                      )}
                      {hasValidColor && (
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{driver.vehicle_color}</Badge>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl p-6 mb-8 border border-emerald-200 dark:border-emerald-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Avantages Client Exclusif
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Service personnalisé avec votre chauffeur attitré</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Prix fixés d'avance sans surprises</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Devis automatiques instantanés</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Factures en ligne accessibles 24/7</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Réservation facile en quelques clics</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Suivi en temps réel de vos courses</span>
              </div>
            </div>
          </div>

          {/* Formulaire d'inscription complet */}
          <div className="space-y-6">{/* Removed conditional rendering - always show registration form */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground font-medium">Nom complet *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                    className="h-12 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean.dupont@example.com"
                    required
                    className="h-12 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground font-medium">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    required
                    className="h-12 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-12 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Minimum 6 caractères</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-12 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>
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
                  "S'inscrire et devenir client exclusif"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterClientQR;
