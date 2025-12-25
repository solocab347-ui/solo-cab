import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Loader2, 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Phone,
  Building2,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoSolocab from "@/assets/logo-solocab.png";

interface FleetManagerInfo {
  id: string;
  company_name: string;
  logo_url: string | null;
}

const RegisterClientFleet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fleetManagerId = searchParams.get("fm");

  const [loading, setLoading] = useState(false);
  const [fetchingFleet, setFetchingFleet] = useState(true);
  const [fleetManager, setFleetManager] = useState<FleetManagerInfo | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (fleetManagerId) {
      fetchFleetManager();
    } else {
      setFetchingFleet(false);
    }
  }, [fleetManagerId]);

  const fetchFleetManager = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select("id, company_name, logo_url, status")
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;
      
      // Accepter les gestionnaires pending, active ou validated
      if (!data || (data.status !== "active" && data.status !== "pending" && data.status !== "validated")) {
        toast.error("Gestionnaire de flotte non disponible");
        return;
      }
      
      setFleetManager(data);
    } catch (error) {
      console.error("Error fetching fleet manager:", error);
      toast.error("Gestionnaire de flotte non trouvé");
    } finally {
      setFetchingFleet(false);
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

    if (!fleetManager) {
      toast.error("Gestionnaire de flotte invalide");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // 2. Update profile with phone
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // 3. Create client record linked to fleet manager
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: authData.user.id,
          fleet_manager_id: fleetManager.id,
          is_exclusive: true, // Fleet clients are exclusive to that fleet
          total_rides: 0,
          total_spent: 0,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // 4. Add client role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "client",
        });

      if (roleError) {
        console.error("Role insert error:", roleError);
      }

      // 5. Link to fleet_manager_clients table
      const { error: linkError } = await supabase
        .from("fleet_manager_clients")
        .insert({
          fleet_manager_id: fleetManager.id,
          client_id: clientData.id,
        });

      if (linkError) {
        console.error("Fleet link error:", linkError);
      }

      toast.success("Compte créé avec succès ! Bienvenue chez " + fleetManager.company_name);
      navigate("/fleet-client-dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Cette adresse email est déjà utilisée");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchingFleet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fleetManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground mb-6">
              Le lien d'inscription est invalide ou a expiré.
            </p>
            <Link to="/">
              <Button>Retour à l'accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-transparent">
        <div className="container mx-auto px-4 py-8">
          <Link 
            to={`/flotte/${fleetManagerId}`} 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-card rounded-2xl p-2 border border-border/50 shadow-lg">
              {fleetManager.logo_url ? (
                <img src={fleetManager.logo_url} alt={fleetManager.company_name} className="w-full h-full object-contain" />
              ) : (
                <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Inscription client</h1>
              <p className="text-muted-foreground">{fleetManager.company_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Créer votre compte</CardTitle>
            <CardDescription>
              Inscrivez-vous pour réserver vos trajets avec {fleetManager.company_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Jean Dupont"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Créer mon compte
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Déjà un compte ?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterClientFleet;
