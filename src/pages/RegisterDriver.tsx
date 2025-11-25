import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isPassport, setIsPassport] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  
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

  // Vérifier le token d'invitation au chargement
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      console.log("🎟️ Token détecté:", token);
      setInvitationToken(token);
      verifyToken(token);
    }
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("invitation_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (error || !data) {
        console.error("❌ Token invalide:", error);
        setIsTokenValid(false);
        toast.error("Token invalide", {
          description: "Ce lien d'inscription n'est pas valide ou a déjà été utilisé.",
        });
        return;
      }

      console.log("✅ Token valide:", data);
      setIsTokenValid(true);
      toast.success("Inscription test validée", {
        description: "Vous bénéficiez de l'accès gratuit illimité à la plateforme.",
      });
    } catch (error) {
      console.error("Erreur vérification token:", error);
      setIsTokenValid(false);
    }
  };

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

      if (signUpError) {
        console.error("❌ Erreur signup:", signUpError);
        throw signUpError;
      }
      if (!authData.user) {
        console.error("❌ Pas d'utilisateur créé");
        throw new Error("Erreur lors de la création du compte");
      }

      console.log("✅ Compte créé:", authData.user.id);
      const createdUserId = authData.user.id;
      setUserId(createdUserId);

      // Attendre que le profil soit créé
      console.log("⏳ Attente création profil...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Ajouter le rôle driver
      console.log("👤 Ajout rôle driver...");
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: createdUserId,
          role: "driver",
        });

      if (roleError) {
        console.error("❌ Erreur ajout rôle:", roleError);
        if (!roleError.message.includes("duplicate")) {
          throw new Error("Impossible d'ajouter le rôle driver");
        }
      }

      console.log("✅ Rôle driver ajouté");

      // Créer le profil chauffeur
      console.log("🚗 Création profil chauffeur...");
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: createdUserId,
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
      const createdDriverId = driverData.id;
      setDriverId(createdDriverId);

      // Si inscription avec token test, accorder accès gratuit illimité
      if (invitationToken && isTokenValid) {
        console.log("🎁 Octroi accès gratuit illimité pour test...");
        const { error: freeAccessError } = await supabase
          .from("drivers")
          .update({
            free_access_granted: true,
            free_access_type: "unlimited",
            free_access_start_date: new Date().toISOString(),
            subscription_status: "active",
          })
          .eq("id", createdDriverId);

        if (freeAccessError) {
          console.error("❌ Erreur octroi accès gratuit:", freeAccessError);
        } else {
          console.log("✅ Accès gratuit illimité accordé");
        }

        // Marquer le token comme utilisé
        const { error: tokenError } = await supabase
          .from("invitation_tokens")
          .update({
            used: true,
            used_by_driver_id: createdDriverId,
            used_at: new Date().toISOString(),
          })
          .eq("token", invitationToken);

        if (tokenError) {
          console.error("❌ Erreur marquage token:", tokenError);
        } else {
          console.log("✅ Token marqué comme utilisé");
        }
      }

      toast.success("Compte créé avec succès !");
      await new Promise(resolve => setTimeout(resolve, 500));
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
    // Si inscription avec token test, passer directement à la validation
    if (invitationToken && isTokenValid) {
      console.log("✅ Inscription test complétée, redirection...");
      toast.success("Inscription complétée ! Votre dossier sera validé sous 24-48h.");
      navigate("/driver-pending-validation");
      return;
    }

    setLoading(true);
    try {
      console.log("💳 Étape 3: Redirection vers paiement Stripe...");

      const { data, error } = await supabase.functions.invoke("create-driver-subscription", {
        body: { driver_id: driverId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

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
          
          {invitationToken && isTokenValid && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-sm text-green-600 font-medium">
                Inscription test - Accès gratuit illimité validé
              </p>
            </div>
          )}
        </div>

        {renderStepIndicator()}

        {/* Étape 1 */}
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Étape 2 */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="isPassport"
                  checked={isPassport}
                  onCheckedChange={(checked) => setIsPassport(checked as boolean)}
                />
                <Label htmlFor="isPassport" className="text-white">
                  J'utilise un passeport au lieu d'une carte d'identité
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white font-medium">
                    {isPassport ? "Passeport *" : "Carte d'identité recto *"}
                  </Label>
                  <div className="mt-2">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors bg-white/5">
                      <Upload className="w-5 h-5 mr-2 text-white" />
                      <span className="text-sm text-white">
                        {documents.id_recto ? documents.id_recto.name : "Choisir un fichier"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("id_recto", e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                {!isPassport && (
                  <div>
                    <Label className="text-white font-medium">Carte d'identité verso *</Label>
                    <div className="mt-2">
                      <label className="cursor-pointer flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors bg-white/5">
                        <Upload className="w-5 h-5 mr-2 text-white" />
                        <span className="text-sm text-white">
                          {documents.id_verso ? documents.id_verso.name : "Choisir un fichier"}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("id_verso", e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-white font-medium">Carte VTC recto *</Label>
                  <div className="mt-2">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors bg-white/5">
                      <Upload className="w-5 h-5 mr-2 text-white" />
                      <span className="text-sm text-white">
                        {documents.vtc_recto ? documents.vtc_recto.name : "Choisir un fichier"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("vtc_recto", e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-white font-medium">Carte VTC verso *</Label>
                  <div className="mt-2">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors bg-white/5">
                      <Upload className="w-5 h-5 mr-2 text-white" />
                      <span className="text-sm text-white">
                        {documents.vtc_verso ? documents.vtc_verso.name : "Choisir un fichier"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("vtc_verso", e.target.files?.[0] || null)}
                        />
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-white font-medium">Carte grise *</Label>
                  <div className="mt-2">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors bg-white/5">
                      <Upload className="w-5 h-5 mr-2 text-white" />
                      <span className="text-sm text-white">
                        {documents.carte_grise ? documents.carte_grise.name : "Choisir un fichier"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("carte_grise", e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-white font-medium">Attestation d'assurance *</Label>
                  <div className="mt-2">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 rounded-lg hover:border-primary/50 transition-colors bg-white/5">
                      <Upload className="w-5 h-5 mr-2 text-white" />
                      <span className="text-sm text-white">
                        {documents.assurance ? documents.assurance.name : "Choisir un fichier"}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("assurance", e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Étape 3 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              {invitationToken && isTokenValid ? (
                <>
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Inscription Test Validée</h2>
                  <div className="bg-green-500/10 p-6 rounded-lg border border-green-500/20">
                    <p className="text-xl font-bold text-green-400 mb-2">Accès Gratuit Illimité</p>
                    <p className="text-muted-foreground">
                      Vous faites partie des 50 chauffeurs test
                    </p>
                  </div>
                  <ul className="text-left space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Accès complet gratuit à la plateforme
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Gestion de vos clients
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Création de devis et factures
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Sans commission sur vos courses
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Validation sous 24-48h
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Abonnement SoloCab</h2>
                  <div className="bg-primary/10 p-6 rounded-lg border border-primary/20">
                    <p className="text-4xl font-bold text-white mb-2">49,99€</p>
                    <p className="text-muted-foreground">par mois</p>
                  </div>
                  <ul className="text-left space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Accès complet à la plateforme
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Gestion de vos clients
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Création de devis et factures
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      Sans commission sur vos courses
                    </li>
                  </ul>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={handleStep3Submit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {invitationToken && isTokenValid ? "Finalisation..." : "Redirection..."}
                  </>
                ) : (
                  invitationToken && isTokenValid ? "Terminer l'inscription" : "Procéder au paiement"
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
