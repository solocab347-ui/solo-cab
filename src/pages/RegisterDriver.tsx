import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, CheckCircle, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

// Schema de validation
const driverRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom complet doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().min(10, "Numéro de téléphone invalide").max(20),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
  licenseNumber: z.string().trim().min(5, "Numéro de licence invalide").max(50),
  vehicleModel: z.string().trim().min(2, "Modèle de véhicule requis").max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const RegisterDriver = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    vehicleModel: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation avec Zod
    try {
      driverRegistrationSchema.parse(formData);
    } catch (error: any) {
      if (error.errors && error.errors[0]) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Veuillez vérifier tous les champs");
      }
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Début de l'inscription chauffeur...");
      
      // Étape 1: Créer le compte utilisateur
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/driver-dashboard`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      console.log("✅ Compte utilisateur créé:", authData.user.id);

      // Attendre un peu pour que le trigger de création de profil s'exécute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Étape 2: Créer le profil chauffeur
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: authData.user.id,
          license_number: formData.licenseNumber.trim(),
          vehicle_model: formData.vehicleModel.trim(),
          status: "pending",
          max_passengers: 4,
          tva_included: false,
          tva_rate: 20.0,
          base_fare: 0,
          per_km_rate: 0,
          hourly_rate: 0,
        })
        .select()
        .single();

      if (driverError) {
        console.error("❌ Erreur création driver:", driverError);
        throw driverError;
      }

      console.log("✅ Profil chauffeur créé:", driverData.id);

      // Étape 3: Ajouter le rôle driver
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "driver",
        });

      if (roleError) {
        console.error("❌ Erreur création rôle:", roleError);
        throw roleError;
      }

      console.log("✅ Rôle driver assigné");

      // Étape 4: Envoyer l'email de bienvenue
      try {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: formData.email.trim(),
            type: "driver_welcome",
            data: {
              driverName: formData.fullName.trim(),
            },
          },
        });

        if (emailError) {
          console.error("⚠️ Erreur envoi email (non bloquant):", emailError);
        } else {
          console.log("✅ Email de bienvenue envoyé");
        }
      } catch (emailErr) {
        console.error("⚠️ Erreur envoi email (non bloquant):", emailErr);
      }

      // Succès !
      toast.success("Inscription réussie ! Votre compte est en cours de validation.");
      
      // Redirection vers la page de connexion après 2 secondes
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error: any) {
      console.error("❌ Erreur inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e35] to-[#1a2942] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 md:p-8 bg-[#1a2332]/95 border-primary/20 backdrop-blur-sm">
        <div className="mb-8">
          <Link 
            to="/devenir-chauffeur" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Car className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Inscription Chauffeur</h1>
              <p className="text-muted-foreground">Rejoignez SoloCab en quelques minutes</p>
            </div>
          </div>
          
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 mt-4">
            ⏱️ Validation sous 24-48h
          </Badge>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              Informations personnelles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-white">Nom complet *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Jean Dupont"
                  required
                  className="bg-background/50 border-primary/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="06 12 34 56 78"
                  required
                  className="bg-background/50 border-primary/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-white">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="jean.dupont@example.com"
                required
                className="bg-background/50 border-primary/20 text-white"
              />
            </div>
          </div>

          {/* Informations professionnelles */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-400" />
              Informations professionnelles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="licenseNumber" className="text-white">Numéro de licence VTC *</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                  placeholder="Ex: VTC123456"
                  required
                  className="bg-background/50 border-primary/20 text-white"
                />
              </div>

              <div>
                <Label htmlFor="vehicleModel" className="text-white">Modèle du véhicule *</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={(e) => handleInputChange("vehicleModel", e.target.value)}
                  placeholder="Ex: Mercedes Classe E"
                  required
                  className="bg-background/50 border-primary/20 text-white"
                />
              </div>
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Sécurité
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-white">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Min. 6 caractères"
                    required
                    className="bg-background/50 border-primary/20 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    required
                    className="bg-background/50 border-primary/20 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>ℹ️ Prochaines étapes :</strong> Une fois votre inscription validée par notre équipe, 
              vous recevrez un email et pourrez accéder à votre tableau de bord chauffeur pour configurer 
              vos tarifs et commencer à recevoir des clients.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Inscription en cours...
              </>
            ) : (
              <>
                <Car className="w-5 h-5 mr-2" />
                Créer mon compte chauffeur
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default RegisterDriver;
