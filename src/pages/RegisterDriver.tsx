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
import { useAuth } from "@/hooks/useAuth";

// Validation schema
const registrationSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis (min 2 caractères)"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Téléphone requis (min 10 chiffres)"),
  password: z.string().min(6, "Mot de passe requis (min 6 caractères)"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type Documents = {
  vtc_recto: File | null;
  vtc_verso: File | null;
  identity_recto: File | null;
  identity_verso: File | null;
  driving_license_recto: File | null;
  driving_license_verso: File | null;
  kbis: File | null;
  vehicle_insurance: File | null;
};

const RegisterDriver = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingResume, setLoadingResume] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [invitationToken, setInvitationToken] = useState<string>("");
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [skipDocuments, setSkipDocuments] = useState<boolean>(false);
  const [isPassport, setIsPassport] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [canGoBack, setCanGoBack] = useState(true);
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const [documents, setDocuments] = useState<Documents>({
    vtc_recto: null,
    vtc_verso: null,
    identity_recto: null,
    identity_verso: null,
    driving_license_recto: null,
    driving_license_verso: null,
    kbis: null,
    vehicle_insurance: null
  });

  // Vérifier la reprise d'inscription au chargement
  useEffect(() => {
    const checkResumeRegistration = async () => {
      try {
        // Vérifier token invitation
        const token = searchParams.get("token");
        if (token) {
          setInvitationToken(token);
          await checkToken(token);
        }

        // Si user connecté, vérifier inscription en cours
        if (user) {
          console.log("🔄 Vérification inscription en cours pour:", user.id);
          
          const { data: driver, error } = await supabase
            .from("drivers")
            .select("id, registration_step, registration_data")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) {
            console.error("Erreur vérification driver:", error);
            setLoadingResume(false);
            return;
          }

          // Si pas de driver ou inscription complète, pas de reprise
          if (!driver || !driver.registration_step) {
            console.log("✅ Pas d'inscription en cours");
            setLoadingResume(false);
            return;
          }

          // Reprendre l'inscription
          console.log("📥 Reprise inscription étape:", driver.registration_step);
          setIsResuming(true);
          setUserId(user.id);
          setDriverId(driver.id);
          
          // Bloquer le retour en arrière lors de la reprise
          setCanGoBack(false);
          
          // Charger les données sauvegardées
          if (driver.registration_data) {
            const data = driver.registration_data as any;
            if (data.formData) {
              setFormData(data.formData);
            }
            if (data.isPassport !== undefined) {
              setIsPassport(data.isPassport);
            }
          }

          // Si l'utilisateur a un compte (user.id existe), il ne peut PAS revenir à l'étape 1
          // registration_step représente la PROCHAINE étape à faire
          let nextStep = driver.registration_step || 2;
          
          // Sécurité : minimum étape 2 car étape 1 est déjà complétée (compte créé)
          if (nextStep < 2) {
            console.log("⚠️ Étape invalide, correction vers étape 2");
            nextStep = 2;
          }
          
          setCurrentStep(nextStep);
          toast.success("Reprise de votre inscription", {
            description: nextStep === 2 ? "Documents à télécharger" : "Paiement en attente"
          });
        }
      } catch (error) {
        console.error("Erreur reprise:", error);
      } finally {
        setLoadingResume(false);
      }
    };

    checkResumeRegistration();
  }, [user, searchParams]);

  const checkToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("invitation_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (error || !data) {
        setIsTokenValid(false);
        toast.error("Token invalide");
        return;
      }

      setIsTokenValid(true);
      setSkipDocuments(data.skip_documents || false);
      
      if (data.skip_documents) {
        toast.success("Accès gratuit activé - Inscription simplifiée");
      } else {
        toast.success("Accès gratuit activé - Documents requis");
      }
    } catch (err) {
      setIsTokenValid(false);
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("🚀 DEBUT inscription étape 1");

    try {
      // Validation
      console.log("📋 Validation des données...");
      const result = registrationSchema.safeParse(formData);
      if (!result.success) {
        const error = result.error.errors[0];
        console.error("❌ Validation échouée:", error);
        toast.error(error.message);
        setLoading(false);
        return;
      }
      console.log("✅ Validation réussie");

      // Check existing email
      console.log("🔍 Vérification email existant...");
      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error("❌ Erreur vérification email:", checkError);
        toast.error("Erreur vérification email");
        setLoading(false);
        return;
      }

      if (existing) {
        console.warn("⚠️ Email déjà utilisé");
        toast.error("Email déjà utilisé");
        setLoading(false);
        return;
      }
      console.log("✅ Email disponible");

      // Create auth account
      console.log("👤 Création compte Auth...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim()
          }
        }
      });

      if (authError) {
        console.error("❌ Erreur Auth:", authError);
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        console.error("❌ Pas d'utilisateur créé");
        toast.error("Erreur de création de compte");
        setLoading(false);
        return;
      }

      const newUserId = authData.user.id;
      console.log("✅ Compte Auth créé:", newUserId);
      setUserId(newUserId);

      // Wait for profile trigger
      console.log("⏳ Attente trigger profile...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("✅ Attente terminée");

      // Add driver role
      console.log("🎭 Ajout rôle driver...");
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: newUserId, role: "driver" });

      if (roleError) {
        if (roleError.message.includes("duplicate")) {
          console.log("⚠️ Rôle déjà existant (ignoré)");
        } else {
          console.error("❌ Erreur ajout rôle:", roleError);
          toast.error("Erreur ajout rôle: " + roleError.message);
          setLoading(false);
          return;
        }
      } else {
        console.log("✅ Rôle driver ajouté");
      }

      // Create driver profile
      console.log("🚗 Création profil driver...");
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: newUserId,
          license_number: "PENDING",
          vehicle_model: "PENDING",
          status: "on_hold", // ⚠️ SÉCURITÉ: on_hold jusqu'au paiement
          max_passengers: 4,
          tva_included: false,
          tva_rate: 20.0,
          base_fare: 0,
          per_km_rate: 0,
          hourly_rate: 0,
          subscription_paid: false,
          public_profile_enabled: false,
          quote_counter: 0,
          invoice_counter: 0,
          course_counter: 0,
          reservation_counter: 0
        })
        .select()
        .single();

      if (driverError) {
        console.error("❌ Erreur création driver:", driverError);
        toast.error("Erreur création profil: " + driverError.message);
        setLoading(false);
        return;
      }

      console.log("✅ Profil driver créé:", driverData.id);
      setDriverId(driverData.id);

      // Sauvegarder la progression (étape 1 complète, prochaine étape = 2)
      await supabase
        .from("drivers")
        .update({
          registration_step: 2,
          registration_data: {
            formData: {
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone
            }
          }
        })
        .eq("id", driverData.id);

      // Grant free access if token valid
      if (invitationToken && isTokenValid) {
        console.log("🎁 Attribution accès gratuit...");
        
        // Si skip_documents est activé, finaliser l'inscription immédiatement
        if (skipDocuments) {
          console.log("⚡ Skip documents activé - Finalisation immédiate");
          
          await supabase
            .from("drivers")
            .update({
              status: "pending", // ✅ SÉCURITÉ: statut pending car accès gratuit validé
              free_access_granted: true,
              free_access_type: "unlimited",
              free_access_start_date: new Date().toISOString(),
              subscription_status: "active",
              subscription_paid: false,
              registration_step: null,
              registration_data: null
            })
            .eq("id", driverData.id);

          await supabase
            .from("invitation_tokens")
            .update({
              used: true,
              used_by_driver_id: driverData.id,
              used_at: new Date().toISOString()
            })
            .eq("token", invitationToken);
          
          console.log("✅ Inscription complétée (sans documents ni paiement)");
          toast.success("Inscription complétée avec accès gratuit !");
          navigate(`/registration-success?driver_id=${driverData.id}&token=true`);
          return;
        }
        
        // Sinon, juste marquer l'accès gratuit et continuer vers les documents
        await supabase
          .from("drivers")
          .update({
            free_access_granted: true,
            free_access_type: "unlimited",
            free_access_start_date: new Date().toISOString(),
            subscription_status: "active"
          })
          .eq("id", driverData.id);
        console.log("✅ Accès gratuit accordé - Documents requis");
      }

      console.log("🎉 INSCRIPTION REUSSIE - Passage étape 2");
      toast.success("Compte créé avec succès !");
      
      // Bloquer le retour en arrière après validation étape 1
      setCanGoBack(false);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(2);
      console.log("✅ Étape 2 activée");

    } catch (error: any) {
      console.error("💥 ERREUR GLOBALE:", error);
      console.error("Stack:", error.stack);
      toast.error("Erreur: " + (error.message || "Erreur inconnue"));
    } finally {
      console.log("🔚 Fin handleStep1, setLoading(false)");
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, docType: string): Promise<string> => {
    if (!userId) throw new Error("User ID manquant");

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${docType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("driver-documents")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("driver-documents")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("📄 DEBUT étape 2 - Upload documents");

    try {
      // Validate required documents
      if (!documents.vtc_recto || !documents.vtc_verso) {
        toast.error("Carte VTC recto/verso requise");
        setLoading(false);
        return;
      }

      if (!documents.identity_recto || (!isPassport && !documents.identity_verso)) {
        toast.error("Pièce d'identité requise");
        setLoading(false);
        return;
      }

      if (!documents.driving_license_recto || !documents.driving_license_verso) {
        toast.error("Permis de conduire recto/verso requis");
        setLoading(false);
        return;
      }

      if (!documents.kbis) {
        toast.error("Kbis requis");
        setLoading(false);
        return;
      }

      if (!documents.vehicle_insurance) {
        toast.error("Assurance véhicule requise");
        setLoading(false);
        return;
      }

      console.log("✅ Validation documents réussie");

      // Upload all documents avec gestion d'erreur améliorée
      const urls: Record<string, string> = {};
      const docEntries = Object.entries(documents).filter(([_, file]) => file);
      
      for (let i = 0; i < docEntries.length; i++) {
        const [key, file] = docEntries[i];
        try {
          console.log(`📤 Upload ${key} (${i+1}/${docEntries.length})`);
          urls[key] = await uploadFile(file as File, key);
          console.log(`✅ ${key} uploadé`);
        } catch (uploadError: any) {
          console.error(`❌ Erreur upload ${key}:`, uploadError);
          toast.error(`Erreur lors de l'upload de ${key}: ${uploadError.message}`);
          setLoading(false);
          return;
        }
      }

      console.log("✅ Tous les documents uploadés");

      // Update driver with documents et progression (prochaine étape = 3)
      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          documents: urls,
          registration_step: 3,
          registration_data: {
            formData: {
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone
            },
            isPassport,
            documentsUploaded: true
          }
        })
        .eq("id", driverId);

      if (updateError) {
        console.error("❌ Erreur sauvegarde:", updateError);
        toast.error("Erreur sauvegarde documents");
        setLoading(false);
        return;
      }

      console.log("✅ Documents sauvegardés en base");
      toast.success("Documents téléchargés avec succès !");
      
      // Bloquer le retour en arrière après validation étape 2
      setCanGoBack(false);
      
      // Si token gratuit avec documents, finaliser directement
      if (invitationToken && isTokenValid && !skipDocuments) {
        console.log("🎁 Finalisation avec token gratuit après documents");
        
        await supabase
          .from("invitation_tokens")
          .update({
            used: true,
            used_at: new Date().toISOString(),
            used_by_driver_id: driverId
          })
          .eq("token", invitationToken);

        await supabase
          .from("drivers")
          .update({
            status: "pending", // ✅ SÉCURITÉ: statut pending car accès gratuit validé
            subscription_paid: false,
            registration_step: null,
            registration_data: null
          })
          .eq("id", driverId);
        
        toast.success("Inscription complétée avec accès gratuit !");
        navigate(`/registration-success?driver_id=${driverId}&token=true`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(3);
      console.log("✅ Passage étape 3");

    } catch (error: any) {
      console.error("💥 ERREUR étape 2:", error);
      toast.error(error.message || "Erreur téléchargement documents");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Pas besoin de sauvegarder registration_step 3 car on y est déjà
      // (sauvegardé à l'étape 2)

      // If free access via token, skip payment
      if (invitationToken && isTokenValid) {
        // Marquer le token comme utilisé
        await supabase
          .from("invitation_tokens")
          .update({
            used: true,
            used_at: new Date().toISOString(),
            used_by_driver_id: driverId
          })
          .eq("token", invitationToken);

        // Accorder l'accès gratuit illimité
        await supabase
          .from("drivers")
          .update({
            status: "pending", // ✅ SÉCURITÉ: statut pending car accès gratuit validé
            subscription_paid: false,
            free_access_granted: true,
            free_access_type: "unlimited",
            free_access_start_date: new Date().toISOString(),
            free_access_end_date: null,
            registration_step: null,
            registration_data: null
          })
          .eq("id", driverId);
        
        toast.success("Inscription complétée avec accès gratuit !");
        navigate(`/registration-success?driver_id=${driverId}&token=true`);
        return;
      }

      // PAIEMENT OBLIGATOIRE - Appeler l'edge function Stripe
      const { data, error } = await supabase.functions.invoke(
        "create-driver-subscription",
        {
          body: { driver_id: driverId }
        }
      );

      if (error) {
        console.error("Erreur création session Stripe:", error);
        toast.error("Erreur lors de la création de la session de paiement");
        return;
      }

      if (!data?.url) {
        toast.error("URL de paiement non reçue");
        return;
      }

      // Rediriger vers Stripe pour paiement
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Erreur step 3:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader pendant la vérification de reprise
  if (loadingResume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Vérification de votre inscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        {isResuming && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              ✅ Reprise de votre inscription en cours
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Vous pouvez continuer là où vous vous êtes arrêté
            </p>
          </div>
        )}
        <div className="flex items-center justify-center mb-8">
          <Car className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-3xl font-bold">Inscription Chauffeur</h1>
        </div>

        <div className="flex justify-between mb-8">
          <StepIndicator step={1} current={currentStep} label="Informations" />
          <StepIndicator step={2} current={currentStep} label="Documents" />
          <StepIndicator step={3} current={currentStep} label="Paiement" />
        </div>

        {currentStep === 1 && !isResuming && (
          <form onSubmit={handleStep1} className="space-y-6">
            <div>
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="Jean Dupont"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="jean@exemple.com"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="0612345678"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                "Continuer"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        )}

        {currentStep === 2 && (
          <form onSubmit={handleStep2} className="space-y-6">
            <div className="mb-4">
              <Label>Type de pièce d'identité</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={!isPassport ? "default" : "outline"}
                  onClick={() => setIsPassport(false)}
                >
                  Carte d'identité
                </Button>
                <Button
                  type="button"
                  variant={isPassport ? "default" : "outline"}
                  onClick={() => setIsPassport(true)}
                >
                  Passeport
                </Button>
              </div>
            </div>

            <DocumentUpload
              label="Carte VTC - Recto"
              file={documents.vtc_recto}
              onChange={(file) => setDocuments({...documents, vtc_recto: file})}
              required
            />
            <DocumentUpload
              label="Carte VTC - Verso"
              file={documents.vtc_verso}
              onChange={(file) => setDocuments({...documents, vtc_verso: file})}
              required
            />

            <DocumentUpload
              label={isPassport ? "Passeport" : "Pièce d'identité - Recto"}
              file={documents.identity_recto}
              onChange={(file) => setDocuments({...documents, identity_recto: file})}
              required
            />
            {!isPassport && (
              <DocumentUpload
                label="Pièce d'identité - Verso"
                file={documents.identity_verso}
                onChange={(file) => setDocuments({...documents, identity_verso: file})}
                required
              />
            )}

            <DocumentUpload
              label="Permis de conduire - Recto"
              file={documents.driving_license_recto}
              onChange={(file) => setDocuments({...documents, driving_license_recto: file})}
              required
            />
            <DocumentUpload
              label="Permis de conduire - Verso"
              file={documents.driving_license_verso}
              onChange={(file) => setDocuments({...documents, driving_license_verso: file})}
              required
            />

            <DocumentUpload
              label="Kbis, SIREN et documents équivalents"
              file={documents.kbis}
              onChange={(file) => setDocuments({...documents, kbis: file})}
              required
            />

            <DocumentUpload
              label="Assurance véhicule"
              file={documents.vehicle_insurance}
              onChange={(file) => setDocuments({...documents, vehicle_insurance: file})}
              required
            />

            <div className="flex gap-4">
              {canGoBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (canGoBack) {
                      setCurrentStep(1);
                    } else {
                      toast.warning("Impossible de revenir en arrière après validation");
                    }
                  }}
                  disabled={loading || !canGoBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
            </div>
          </form>
        )}

        {currentStep === 3 && (
          <form onSubmit={handleStep3} className="space-y-6">
            <div className="text-center space-y-4">
              <CreditCard className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Paiement</h2>
              
              {invitationToken && isTokenValid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-green-900">
                    Accès gratuit illimité activé !
                  </p>
                  <p className="text-sm text-green-700 mt-2">
                    Votre inscription test vous donne un accès gratuit à la plateforme.
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-primary rounded-xl p-8 space-y-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary mb-2">
                      49,99 €<span className="text-lg font-normal text-muted-foreground">/mois</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Abonnement mensuel sans engagement
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 text-left space-y-3">
                    <p className="font-semibold text-lg mb-4">Accès complet incluant :</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Gestion illimitée de vos clients et courses</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Génération automatique de devis et factures</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Code QR personnalisé pour inscription clients</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Profil public sur la plateforme SoloCab</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Paiement en ligne sécurisé via Stripe</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Statistiques et suivi de votre activité</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Système de promotions pour vos clients</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Support client dédié</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {canGoBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (canGoBack) {
                      setCurrentStep(2);
                    } else {
                      toast.warning("Impossible de revenir en arrière après validation");
                    }
                  }}
                  disabled={!canGoBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              )}
              <Button type="submit" className="flex-1">
                {invitationToken && isTokenValid ? "Finaliser" : "Payer et finaliser"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

const StepIndicator = ({ step, current, label }: { step: number; current: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
        current >= step ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
      }`}
    >
      {current > step ? <CheckCircle className="h-6 w-6" /> : step}
    </div>
    <span className="text-xs mt-1">{label}</span>
  </div>
);

const DocumentUpload = ({
  label,
  file,
  onChange,
  required
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (selectedFile) {
      // Validation taille fichier (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 10MB)");
        return;
      }
      
      // Validation type fichier
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Format invalide (JPG, PNG, WEBP ou PDF uniquement)");
        return;
      }
      
      console.log(`✅ Fichier sélectionné: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)}KB)`);
    }
    
    onChange(selectedFile);
  };

  return (
    <div>
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="mt-2">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
          id={`file-${label}`}
        />
        <label
          htmlFor={`file-${label}`}
          className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          {file ? (
            <div className="text-center p-4">
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-primary mt-2">Cliquer pour changer</p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Cliquer pour télécharger</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP ou PDF (max 10MB)</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

export default RegisterDriver;
