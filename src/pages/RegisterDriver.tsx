import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, CheckCircle, Loader2, Eye, EyeOff, ArrowLeft, Upload, FileText, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";

// Schema de validation
const driverRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom complet doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().min(10, "Numéro de téléphone invalide").max(20),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const RegisterDriver = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isPassport, setIsPassport] = useState(false);
  
  // Form states - Étape 1
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Documents - Étape 2
  const [documents, setDocuments] = useState({
    id_recto: null as File | null,
    id_verso: null as File | null,
    vtc_recto: null as File | null,
    vtc_verso: null as File | null,
    carte_grise: null as File | null,
    assurance: null as File | null,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof typeof documents, file: File | null) => {
    setDocuments(prev => ({ ...prev, [field]: file }));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation avec Zod
    try {
      driverRegistrationSchema.parse(formData);
    } catch (error: any) {
      if (error.errors && error.errors[0]) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Étape 1: Création du compte...");
      
      // Créer le compte utilisateur
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      console.log("✅ Compte créé:", authData.user.id);
      setUserId(authData.user.id);

      // Attendre que le profil soit créé
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attendre que les triggers de base se finalisent
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Ajouter le rôle driver AVANT de créer le profil driver
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "driver",
        });

      if (roleError) {
        console.error("❌ Erreur ajout rôle:", roleError);
        throw new Error("Impossible d'ajouter le rôle driver");
      }

      console.log("✅ Rôle driver ajouté");

      // Créer le profil chauffeur avec tous les champs obligatoires
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: authData.user.id,
          license_number: "PENDING",
          vehicle_model: "PENDING",
          status: "pending",
          max_passengers: 4,
          tva_included: false,
          tva_rate: 20.0,
          base_fare: 0,
          per_km_rate: 0,
          hourly_rate: 0,
          subscription_paid: false,
          public_profile_enabled: false,
        })
        .select()
        .single();

      if (driverError) {
        console.error("❌ Erreur création driver:", driverError);
        throw new Error("Impossible de créer le profil chauffeur");
      }

      console.log("✅ Profil chauffeur créé:", driverData.id);
      setDriverId(driverData.id);

      toast.success("Compte créé avec succès !");
      setCurrentStep(2);

    } catch (error: any) {
      console.error("❌ Erreur étape 1:", error);
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, documentType: string): Promise<string> => {
    if (!userId) throw new Error("User ID manquant");

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('driver-documents')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('driver-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation des documents obligatoires
    if (!documents.id_recto) {
      toast.error("La pièce d'identité recto est obligatoire");
      return;
    }
    if (!isPassport && !documents.id_verso) {
      toast.error("La pièce d'identité verso est obligatoire (sauf passeport)");
      return;
    }
    if (!documents.vtc_recto || !documents.vtc_verso) {
      toast.error("La carte VTC recto et verso sont obligatoires");
      return;
    }
    if (!documents.carte_grise) {
      toast.error("La carte grise est obligatoire");
      return;
    }
    if (!documents.assurance) {
      toast.error("L'attestation d'assurance est obligatoire");
      return;
    }

    setLoading(true);
    try {
      console.log("📄 Étape 2: Upload des documents...");

      const documentUrls: any = {};

      // Upload chaque document
      if (documents.id_recto) {
        documentUrls.id_recto = await uploadDocument(documents.id_recto, 'id_recto');
      }
      if (documents.id_verso && !isPassport) {
        documentUrls.id_verso = await uploadDocument(documents.id_verso, 'id_verso');
      }
      if (documents.vtc_recto) {
        documentUrls.vtc_recto = await uploadDocument(documents.vtc_recto, 'vtc_recto');
      }
      if (documents.vtc_verso) {
        documentUrls.vtc_verso = await uploadDocument(documents.vtc_verso, 'vtc_verso');
      }
      if (documents.carte_grise) {
        documentUrls.carte_grise = await uploadDocument(documents.carte_grise, 'carte_grise');
      }
      if (documents.assurance) {
        documentUrls.assurance = await uploadDocument(documents.assurance, 'assurance');
      }

      // Mettre à jour le profil driver avec les URLs des documents
      const { error: updateError } = await supabase
        .from("drivers")
        .update({ documents: documentUrls })
        .eq("id", driverId);

      if (updateError) throw updateError;

      console.log("✅ Documents uploadés avec succès");
      toast.success("Documents enregistrés !");
      setCurrentStep(3);

    } catch (error: any) {
      console.error("❌ Erreur étape 2:", error);
      toast.error(error.message || "Erreur lors de l'upload des documents");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    setLoading(true);
    try {
      console.log("💳 Étape 3: Redirection vers paiement Stripe...");

      // Créer une session de paiement Stripe
      const { data, error } = await supabase.functions.invoke("create-driver-subscription", {
        body: { driver_id: driverId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Rediriger vers Stripe Checkout
      window.location.href = data.url;

    } catch (error: any) {
      console.error("❌ Erreur étape 3:", error);
      toast.error(error.message || "Erreur lors de la création du paiement");
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-8">
      <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${currentStep >= 1 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
          1
        </div>
        <span className="ml-2 text-sm font-medium hidden md:inline">Info</span>
      </div>
      <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted-foreground'}`} />
      <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${currentStep >= 2 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
          2
        </div>
        <span className="ml-2 text-sm font-medium hidden md:inline">Documents</span>
      </div>
      <div className={`w-16 h-0.5 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted-foreground'}`} />
      <div className={`flex items-center ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${currentStep >= 3 ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
          3
        </div>
        <span className="ml-2 text-sm font-medium hidden md:inline">Paiement</span>
      </div>
    </div>
  );

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
              <p className="text-muted-foreground">
                Étape {currentStep}/3: {currentStep === 1 ? "Vos informations" : currentStep === 2 ? "Documents" : "Paiement"}
              </p>
            </div>
          </div>
        </div>

        {renderStepIndicator()}

        {/* Étape 1: Informations */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-white font-medium">Nom complet *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Jean Dupont"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="jean@example.com"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white font-medium">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white font-medium">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Min. 6 caractères"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white font-medium">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Étape 2: Documents */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="passport"
                  checked={isPassport}
                  onCheckedChange={(checked) => setIsPassport(checked as boolean)}
                />
                <label
                  htmlFor="passport"
                  className="text-sm font-medium text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  J'ai un passeport (le verso n'est pas requis)
                </label>
              </div>

              <div>
                <Label className="text-white font-medium">Pièce d'identité - Recto *</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange("id_recto", e.target.files?.[0] || null)}
                  required
                  className="bg-white/10 border-white/20 text-white file:text-white"
                />
              </div>

              <div>
                <Label className="text-white font-medium">
                  Pièce d'identité - Verso {isPassport && "(Optionnel)"}
                  {!isPassport && " *"}
                </Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange("id_verso", e.target.files?.[0] || null)}
                  required={!isPassport}
                  className="bg-white/10 border-white/20 text-white file:text-white"
                />
              </div>

              <div>
                <Label className="text-white font-medium">Carte VTC - Recto *</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange("vtc_recto", e.target.files?.[0] || null)}
                  required
                  className="bg-white/10 border-white/20 text-white file:text-white"
                />
              </div>

              <div>
                <Label className="text-white font-medium">Carte VTC - Verso *</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange("vtc_verso", e.target.files?.[0] || null)}
                  required
                  className="bg-white/10 border-white/20 text-white file:text-white"
                />
              </div>

              <div>
                <Label className="text-white font-medium">Carte grise du véhicule *</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange("carte_grise", e.target.files?.[0] || null)}
                  required
                  className="bg-white/10 border-white/20 text-white file:text-white"
                />
              </div>

              <div>
                <Label className="text-white font-medium">Attestation d'assurance *</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange("assurance", e.target.files?.[0] || null)}
                  required
                  className="bg-white/10 border-white/20 text-white file:text-white"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Upload...
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Étape 3: Paiement */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
              <CreditCard className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Abonnement SoloCab</h2>
              <p className="text-4xl font-bold text-primary mb-4">49,99 €</p>
              <p className="text-muted-foreground mb-6">
                Paiement unique pour l'inscription et l'accès à la plateforme
              </p>
              <ul className="text-left text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Accès complet à la plateforme
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Gestion de vos clients et courses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Génération automatique de devis et factures
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Support prioritaire
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
              </Button>
              <Button
                onClick={handleStep3Submit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Procéder au paiement
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RegisterDriver;
