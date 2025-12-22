import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Car, AlertTriangle, CheckCircle, Eye, EyeOff, Building2, Percent, FileText, Handshake } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const RegisterDriverFleet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [fleetManager, setFleetManager] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [commissionAccepted, setCommissionAccepted] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide. Veuillez demander un nouveau lien à votre gestionnaire de flotte.");
      setLoading(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data: invitationData, error: invError } = await supabase
        .from("fleet_driver_invitations")
        .select(`
          *,
          fleet_manager:fleet_managers(
            id,
            company_name,
            contact_name,
            status
          )
        `)
        .eq("token", token)
        .eq("used", false)
        .single();

      if (invError || !invitationData) {
        setError("Ce lien d'invitation n'est plus valide ou a déjà été utilisé.");
        setLoading(false);
        return;
      }

      if (invitationData.expires_at && new Date(invitationData.expires_at) < new Date()) {
        setError("Ce lien d'invitation a expiré. Veuillez demander un nouveau lien à votre gestionnaire.");
        setLoading(false);
        return;
      }

      if (invitationData.fleet_manager?.status !== "validated") {
        setError("Le gestionnaire de flotte n'est pas encore validé. Veuillez patienter.");
        setLoading(false);
        return;
      }

      setInvitation(invitationData);
      setFleetManager(invitationData.fleet_manager);
      if (invitationData.email) {
        setEmail(invitationData.email);
      }
    } catch (err) {
      console.error("Error validating token:", err);
      setError("Une erreur est survenue lors de la validation du lien.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    // Check commission acceptance for independent drivers
    if (invitation?.driver_type === "independent" && !commissionAccepted) {
      toast.error("Vous devez accepter les conditions de commission pour continuer");
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName,
          phone 
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Calculate deadline (7 days from now)
      const documentsDeadline = new Date();
      documentsDeadline.setDate(documentsDeadline.getDate() + 7);

      // Create driver profile linked to fleet manager
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: authData.user.id,
          license_number: licenseNumber,
          vehicle_model: vehicleModel,
          vehicle_brand: vehicleBrand,
          status: "pending",
          fleet_manager_id: fleetManager.id,
          is_fleet_driver: true,
          can_manage_clients: false,
          can_create_courses: false,
          public_profile_enabled: true,
          fleet_documents_status: "pending",
          fleet_documents_deadline: documentsDeadline.toISOString(),
        })
        .select()
        .single();

      if (driverError) throw driverError;

      // Link driver to fleet manager with commission settings
      const { error: linkError } = await supabase
        .from("fleet_manager_drivers")
        .insert({
          fleet_manager_id: fleetManager.id,
          driver_id: driverData.id,
          status: "active",
          commission_type: invitation.driver_type === "independent" ? "percentage" : "none",
          commission_percentage: invitation.driver_type === "independent" ? invitation.commission_percentage : 0,
          is_salaried: invitation.driver_type === "salaried",
          payment_agreement_signed: invitation.driver_type === "independent",
          payment_agreement_signed_at: invitation.driver_type === "independent" ? new Date().toISOString() : null,
        });

      if (linkError) throw linkError;

      // Mark invitation as used with commission acceptance
      await supabase
        .from("fleet_driver_invitations")
        .update({
          used: true,
          used_at: new Date().toISOString(),
          used_by_driver_id: driverData.id,
          commission_accepted: invitation.driver_type === "independent" ? commissionAccepted : null,
          commission_accepted_at: invitation.driver_type === "independent" ? new Date().toISOString() : null,
        })
        .eq("id", invitation.id);

      // Create user role
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "driver",
      });

      // Update fleet manager driver count
      await supabase
        .from("fleet_managers")
        .update({
          total_drivers: (fleetManager.total_drivers || 0) + 1,
        })
        .eq("id", fleetManager.id);

      toast.success("Inscription réussie ! Vous devez maintenant fournir vos documents.");
      navigate("/registration-success");
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("Cet email est déjà utilisé. Veuillez vous connecter.");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => navigate("/")} variant="outline">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isIndependent = invitation?.driver_type === "independent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={logo} alt="SoloCab" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Inscription Chauffeur Flotte</h1>
            <p className="text-muted-foreground mt-2">
              Rejoignez l'équipe de chauffeurs de {fleetManager?.company_name}
            </p>
          </div>

          {/* Fleet Manager Info */}
          <Alert className="mb-6 bg-primary/5 border-primary/20">
            <Building2 className="w-4 h-4 text-primary" />
            <AlertDescription className="flex items-center gap-2">
              <span>Vous êtes invité par</span>
              <Badge variant="outline" className="font-semibold">
                {fleetManager?.company_name}
              </Badge>
            </AlertDescription>
          </Alert>

          {/* Commission Agreement (for independent drivers) */}
          {isIndependent && (
            <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Handshake className="w-5 h-5 text-yellow-600" />
                  Accord de commission
                </CardTitle>
                <CardDescription>
                  En tant que chauffeur indépendant, vous devez accepter les conditions suivantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                  <div className="p-3 bg-yellow-500/10 rounded-full">
                    <Percent className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-2xl">{invitation?.commission_percentage}%</p>
                    <p className="text-sm text-muted-foreground">Taux de commission</p>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>En acceptant ces conditions, vous vous engagez à :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Reverser {invitation?.commission_percentage}% de vos courses effectuées via {fleetManager?.company_name}</li>
                    <li>Fournir tous les documents requis dans les 7 jours</li>
                    <li>Respecter les conditions générales de la plateforme</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="commission-accept"
                    checked={commissionAccepted}
                    onCheckedChange={(checked) => setCommissionAccepted(checked as boolean)}
                  />
                  <Label htmlFor="commission-accept" className="text-sm cursor-pointer">
                    J'accepte le taux de commission de <strong>{invitation?.commission_percentage}%</strong> et m'engage à reverser ce montant pour chaque course effectuée via {fleetManager?.company_name}.
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Benefits */}
          {!isIndependent && (
            <Alert className="mb-6 bg-muted">
              <CheckCircle className="w-4 h-4 text-success" />
              <AlertDescription>
                En tant que chauffeur utilisant l'équipement du gestionnaire, vous n'avez pas de commission à reverser.
                Votre planning sera géré par {fleetManager?.company_name}.
              </AlertDescription>
            </Alert>
          )}

          {/* Documents Info */}
          <Alert className="mb-6">
            <FileText className="w-4 h-4" />
            <AlertDescription>
              Après votre inscription, vous aurez <strong>7 jours</strong> pour fournir tous les documents requis 
              (carte VTC, assurance, carte grise, etc.) avant de pouvoir être validé.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Vos informations
              </CardTitle>
              <CardDescription>
                Remplissez le formulaire pour créer votre compte chauffeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@email.com"
                    required
                    disabled={!!invitation?.email}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Informations véhicule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">N° de licence VTC *</Label>
                      <Input
                        id="licenseNumber"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="VTC-12345"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicleBrand">Marque du véhicule *</Label>
                      <Input
                        id="vehicleBrand"
                        value={vehicleBrand}
                        onChange={(e) => setVehicleBrand(e.target.value)}
                        placeholder="Mercedes"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel">Modèle du véhicule *</Label>
                      <Input
                        id="vehicleModel"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Classe E"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitting || (isIndependent && !commissionAccepted)}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Inscription en cours...
                    </>
                  ) : (
                    "Créer mon compte chauffeur"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{" "}
            <Button variant="link" className="p-0" onClick={() => navigate("/login")}>
              Connectez-vous
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterDriverFleet;
