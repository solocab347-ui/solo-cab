import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Euro,
  Car,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  Edit2,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TokenData {
  id: string;
  token: string;
  driver_id: string;
  course_id: string | null;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  pickup_address: string | null;
  destination_address: string | null;
  scheduled_date: string | null;
  estimated_price: number | null;
  is_used: boolean;
  expires_at: string;
}

interface DriverInfo {
  id: string;
  company_name: string | null;
  card_photo_url: string | null;
  working_sectors: string[] | null;
}

const RegisterGuestClient = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError("Lien d'inscription invalide");
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      // Fetch token data
      const { data: tokenResult, error: tokenError } = await supabase
        .from("guest_registration_tokens")
        .select("*")
        .eq("token", token)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tokenError) throw tokenError;
      
      if (!tokenResult) {
        setError("Ce lien d'inscription a expiré ou a déjà été utilisé");
        setLoading(false);
        return;
      }

      setTokenData(tokenResult as TokenData);
      
      // Pre-fill form with token data
      setFullName(tokenResult.guest_name || "");
      setPhone(tokenResult.guest_phone || "");
      setEmail(tokenResult.guest_email || "");
      
      // Fetch driver info
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, company_name, card_photo_url, working_sectors")
        .eq("id", tokenResult.driver_id)
        .single();

      if (!driverError && driverData) {
        setDriverInfo(driverData);
      }

    } catch (err) {
      console.error("Token validation error:", err);
      setError("Erreur lors de la validation du lien");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenData) return;
    
    if (!email.trim()) {
      toast.error("L'email est requis");
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
    
    setSubmitting(true);

    try {
      // Call edge function to register guest as exclusive client
      const { data: registerData, error: registerError } = await supabase.functions.invoke(
        "register-guest-client",
        {
          body: {
            email: email.trim().toLowerCase(),
            password,
            full_name: fullName.trim(),
            phone: phone.trim(),
            driver_id: tokenData.driver_id,
            registration_token: token,
          },
        }
      );

      if (registerError) {
        console.error("Registration error:", registerError);
        toast.error("Erreur lors de l'inscription");
        return;
      }

      if (!registerData?.success) {
        toast.error(registerData?.error || "Erreur lors de l'inscription");
        return;
      }

      // Mark token as used
      await supabase
        .from("guest_registration_tokens")
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          used_by_user_id: registerData.user_id,
        })
        .eq("id", tokenData.id);

      // If there's a course_id, link the client to it
      if (tokenData.course_id && registerData.client_id) {
        await supabase
          .from("courses")
          .update({
            client_id: registerData.client_id,
            is_guest_booking: false,
          })
          .eq("id", tokenData.course_id);
      }

      setStep("success");
      toast.success("Inscription réussie !");

      // Redirect to login after a delay
      setTimeout(() => {
        navigate("/login?registered=true");
      }, 3000);

    } catch (error) {
      console.error("Registration exception:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Inscription réussie !</h2>
            <p className="text-muted-foreground mb-2">
              Bienvenue sur SoloCab, {fullName} !
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Vous allez être redirigé vers la page de connexion...
            </p>
            <Button onClick={() => navigate("/login")} className="bg-primary">
              Connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bienvenue sur SoloCab</h1>
          <p className="text-muted-foreground mt-2">
            Finalisez votre inscription pour profiter de tous les avantages
          </p>
        </div>

        {/* Welcome Message */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-foreground leading-relaxed">
                <span className="font-semibold">Bonjour{tokenData?.guest_name ? ` ${tokenData.guest_name.split(' ')[0]}` : ''} !</span>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Vous avez récemment effectué une course avec l'un de nos chauffeurs partenaires. 
                Pour simplifier vos prochaines réservations et bénéficier d'un service personnalisé, 
                nous vous invitons à créer votre compte SoloCab.
              </p>
              <div className="bg-background/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">En vous inscrivant, vous bénéficiez de :</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Réservations simplifiées avec votre chauffeur attitré
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Historique complet de vos courses
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Devis et factures accessibles à tout moment
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    Service client privilégié
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Info */}
        {driverInfo && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Votre chauffeur partenaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {driverInfo.card_photo_url ? (
                    <img src={driverInfo.card_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-lg">{driverInfo.company_name || "Chauffeur VTC"}</p>
                  <p className="text-sm text-muted-foreground">
                    {driverInfo.working_sectors?.[0] && `${driverInfo.working_sectors[0]} • `}Chauffeur professionnel
                  </p>
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Vérifié SoloCab
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Info if available */}
        {tokenData && (tokenData.pickup_address || tokenData.destination_address) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Course associée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tokenData.pickup_address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{tokenData.pickup_address}</span>
                </div>
              )}
              {tokenData.destination_address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{tokenData.destination_address}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                {tokenData.scheduled_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(tokenData.scheduled_date), "d MMM yyyy HH:mm", { locale: fr })}
                  </span>
                )}
                {tokenData.estimated_price && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Euro className="h-3 w-3" />
                    {tokenData.estimated_price.toFixed(2)} €
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Vos informations
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-primary"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                {isEditing ? "Annuler" : "Modifier"}
              </Button>
            </CardTitle>
            <CardDescription>
              Vérifiez et complétez vos informations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pre-filled info display or edit fields */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom complet *
                  </Label>
                  {isEditing ? (
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="bg-background"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted/50 rounded-md">
                      {fullName || <span className="text-muted-foreground">Non renseigné</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Téléphone *
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="bg-background"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted/50 rounded-md">
                      {phone || <span className="text-muted-foreground">Non renseigné</span>}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Email and Password - always editable */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Mot de passe *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      required
                      className="bg-background pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirmer le mot de passe *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez votre mot de passe"
                      required
                      className="bg-background pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showConfirmPassword ? "Masquer" : "Afficher"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-destructive">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
              </div>

              <Alert className="border-primary/30 bg-primary/5">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  Vous serez automatiquement lié à votre chauffeur et pourrez réserver vos prochaines courses facilement.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full bg-primary"
                disabled={submitting || !email || password.length < 6 || password !== confirmPassword}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inscription en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Créer mon compte
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterGuestClient;
