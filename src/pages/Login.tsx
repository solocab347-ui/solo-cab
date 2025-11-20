import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Login = () => {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"client" | "driver">("client");
  const [loading, setLoading] = useState(false);

  // Form states for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Form states for signup
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupName || !signupEmail || !signupPassword) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (role === "driver" && (!licenseNumber || !vehicleModel)) {
      toast.error("Veuillez remplir les informations du chauffeur");
      return;
    }

    setLoading(true);
    try {
      const additionalData = role === "driver"
        ? { licenseNumber, vehicleModel, vehiclePlate }
        : { isExclusive: false };

      await signUp(signupEmail, signupPassword, signupName, role, additionalData);
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-7 h-7 text-primary" />
            </div>
            <span className="text-3xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Bienvenue</h1>
          <p className="text-muted-foreground mt-2">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        <Card className="p-6 shadow-elegant">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loading}
                    className="transition-all focus:shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loading}
                    className="transition-all focus:shadow-sm"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" disabled={loading} />
                    <span className="text-muted-foreground">Se souvenir</span>
                  </label>
                  <a href="#" className="text-premium hover:underline">
                    Mot de passe oublié ?
                  </a>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-premium hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connexion...</>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Je suis un...</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={role === "client" ? "default" : "outline"}
                      onClick={() => setRole("client")}
                      disabled={loading}
                      className={role === "client" ? "bg-gradient-premium" : ""}
                    >
                      Client
                    </Button>
                    <Button
                      type="button"
                      variant={role === "driver" ? "default" : "outline"}
                      onClick={() => setRole("driver")}
                      disabled={loading}
                      className={role === "driver" ? "bg-gradient-premium" : ""}
                    >
                      Chauffeur
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nom complet *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={loading}
                    required
                    className="transition-all focus:shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="transition-all focus:shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="transition-all focus:shadow-sm"
                  />
                </div>
                {role === "driver" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="license">Numéro de permis *</Label>
                      <Input
                        id="license"
                        type="text"
                        placeholder="123456789"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        disabled={loading}
                        required
                        className="transition-all focus:shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle">Véhicule *</Label>
                      <Input
                        id="vehicle"
                        type="text"
                        placeholder="Mercedes Classe E"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        disabled={loading}
                        required
                        className="transition-all focus:shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plate">Plaque d'immatriculation</Label>
                      <Input
                        id="plate"
                        type="text"
                        placeholder="AB-123-CD"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        disabled={loading}
                        className="transition-all focus:shadow-sm"
                      />
                    </div>
                  </>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-premium hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...</>
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          En continuant, vous acceptez nos{" "}
          <a href="#" className="text-premium hover:underline">
            conditions d'utilisation
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
