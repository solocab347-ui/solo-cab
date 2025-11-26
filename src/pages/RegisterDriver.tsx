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
      // ===== VALIDATION RENFORCÉE =====
      console.log("📋 Validation des données...");
      const result = registrationSchema.safeParse(formData);
      if (!result.success) {
        const error = result.error.errors[0];
        console.error("❌ Validation échouée:", error);
        toast.error(error.message);
        return;
      }
      console.log("✅ Validation réussie");

      // ===== VÉRIFICATION EMAIL AVEC TIMEOUT =====
      console.log("🔍 Vérification email existant...");
      const emailCheckPromise = supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email.trim().toLowerCase())
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout vérification email")), 10000)
      );

      const { data: existing, error: checkError } = await Promise.race([
        emailCheckPromise,
        timeoutPromise
      ]) as any;

      if (checkError) {
        console.error("❌ Erreur vérification email:", checkError);
        toast.error("Erreur lors de la vérification de l'email");
        return;
      }

      if (existing) {
        console.warn("⚠️ Email déjà utilisé");
        toast.error("Cet email est déjà utilisé. Utilisez un autre email ou connectez-vous.");
        return;
      }
      console.log("✅ Email disponible");

      // ===== CRÉATION COMPTE AUTH AVEC VALIDATION =====
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
        toast.error(`Erreur de création de compte: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        console.error("❌ Pas d'utilisateur créé");
        toast.error("Erreur: Impossible de créer le compte");
        return;
      }

      const newUserId = authData.user.id;
      console.log("✅ Compte Auth créé:", newUserId);
      setUserId(newUserId);

      // ===== ATTENTE TRIGGER PROFILE AVEC VÉRIFICATION =====
      console.log("⏳ Attente trigger profile...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Vérifier que le profile a bien été créé
      const { data: profileCheck } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", newUserId)
        .maybeSingle();
      
      if (!profileCheck) {
        console.error("❌ Profile non créé après trigger");
        toast.error("Erreur: Profile non créé. Veuillez réessayer.");
        return;
      }
      console.log("✅ Profile confirmé");

      // ===== AJOUT RÔLE DRIVER AVEC GESTION DUPLICATE =====
      console.log("🎭 Ajout rôle driver...");
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: newUserId, role: "driver" });

      if (roleError) {
        if (roleError.message.includes("duplicate") || roleError.code === "23505") {
          console.log("⚠️ Rôle déjà existant (ignoré)");
        } else {
          console.error("❌ Erreur ajout rôle:", roleError);
          toast.error(`Erreur d'attribution du rôle: ${roleError.message}`);
          return;
        }
      } else {
        console.log("✅ Rôle driver ajouté");
      }

      // ===== CRÉATION PROFIL DRIVER SÉCURISÉ =====
      console.log("🚗 Création profil driver...");
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: newUserId,
          license_number: "PENDING",
          vehicle_model: "PENDING",
          status: "on_hold", // ⚠️ SÉCURITÉ: on_hold jusqu'au paiement/documents
          max_passengers: 4,
          tva_included: false,
          tva_rate: 20.0,
          base_fare: 0,
          per_km_rate: 0,
          hourly_rate: 0,
          subscription_paid: false,
          subscription_status: "inactive",
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
        toast.error(`Erreur de création du profil: ${driverError.message}`);
        return;
      }

      if (!driverData?.id) {
        console.error("❌ Driver créé mais sans ID");
        toast.error("Erreur: Profil créé mais ID manquant");
        return;
      }

      console.log("✅ Profil driver créé:", driverData.id);
      setDriverId(driverData.id);

      // ===== SAUVEGARDE PROGRESSION AVEC VÉRIFICATION =====
      console.log("💾 Sauvegarde progression...");
      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          registration_step: 2,
          registration_data: {
            formData: {
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone
            },
            timestamp: new Date().toISOString()
          }
        })
        .eq("id", driverData.id);
      
      if (updateError) {
        console.error("⚠️ Erreur sauvegarde progression:", updateError);
        // Non bloquant, on continue
      } else {
        console.log("✅ Progression sauvegardée");
      }

      // ===== GESTION TOKEN ACCÈS GRATUIT AVEC SÉCURITÉ =====
      if (invitationToken && isTokenValid) {
        console.log("🎁 Attribution accès gratuit...");
        
        // Vérifier le token une dernière fois avant utilisation
        const { data: tokenData, error: tokenError } = await supabase
          .from("invitation_tokens")
          .select("*")
          .eq("token", invitationToken)
          .eq("used", false)
          .maybeSingle();
        
        if (tokenError || !tokenData) {
          console.error("❌ Token invalide lors de l'utilisation");
          toast.error("Token d'accès gratuit invalide ou déjà utilisé");
          // Continuer sans accès gratuit
        } else {
          // Si skip_documents est activé, finaliser l'inscription immédiatement
          if (skipDocuments) {
            console.log("⚡ Skip documents activé - Finalisation immédiate");
            
            const { error: updateDriverError } = await supabase
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

            if (updateDriverError) {
              console.error("❌ Erreur mise à jour driver avec accès gratuit:", updateDriverError);
              toast.error("Erreur lors de l'attribution de l'accès gratuit");
              return;
            }

            const { error: updateTokenError } = await supabase
              .from("invitation_tokens")
              .update({
                used: true,
                used_by_driver_id: driverData.id,
                used_at: new Date().toISOString()
              })
              .eq("token", invitationToken);
            
            if (updateTokenError) {
              console.error("⚠️ Erreur mise à jour token (non bloquant):", updateTokenError);
            }
            
            console.log("✅ Inscription complétée (sans documents ni paiement)");
            toast.success("Inscription complétée avec accès gratuit !");
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate(`/registration-success?driver_id=${driverData.id}&token=true`);
            return;
          }
          
          // Sinon, juste marquer l'accès gratuit et continuer vers les documents
          const { error: freeAccessError } = await supabase
            .from("drivers")
            .update({
              free_access_granted: true,
              free_access_type: "unlimited",
              free_access_start_date: new Date().toISOString(),
              subscription_status: "active"
            })
            .eq("id", driverData.id);
          
          if (freeAccessError) {
            console.error("⚠️ Erreur accès gratuit (non bloquant):", freeAccessError);
          } else {
            console.log("✅ Accès gratuit accordé - Documents requis");
          }
        }
      }

      console.log("🎉 INSCRIPTION ÉTAPE 1 RÉUSSIE");
      toast.success("Compte créé avec succès !");
      
      // Bloquer le retour en arrière après validation étape 1
      setCanGoBack(false);
      
      // Petit délai pour que l'utilisateur voit le message de succès
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentStep(2);
      console.log("✅ Passage à l'étape 2");

    } catch (error: any) {
      console.error("💥 ERREUR CRITIQUE ÉTAPE 1:", error);
      console.error("Stack trace:", error.stack);
      
      // Message d'erreur user-friendly
      const errorMessage = error.message?.includes("timeout") 
        ? "La connexion a pris trop de temps. Veuillez réessayer."
        : error.message?.includes("network")
        ? "Problème de connexion. Vérifiez votre internet."
        : `Erreur d'inscription: ${error.message || "Erreur inconnue"}`;
      
      toast.error(errorMessage, {
        duration: 5000,
        description: "Si le problème persiste, contactez le support."
      });
    } finally {
      console.log("🔚 Fin handleStep1");
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, docType: string): Promise<string> => {
    if (!file) {
      throw new Error(`Fichier ${docType} manquant`);
    }

    if (!userId) {
      throw new Error("User ID manquant pour l'upload");
    }

    console.log(`📤 Upload ${docType}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${docType}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("driver-documents")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error(`❌ Erreur Supabase Storage pour ${docType}:`, uploadError);
      throw new Error(`Upload échoué: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("driver-documents")
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error(`URL publique non générée pour ${docType}`);
    }

    console.log(`✅ URL générée pour ${docType}: ${urlData.publicUrl.substring(0, 80)}...`);
    return urlData.publicUrl;
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("📄 DEBUT étape 2 - Upload documents");

    try {
      // ===== VALIDATION RENFORCÉE DOCUMENTS =====
      console.log("📋 Validation documents...");
      
      if (!userId || !driverId) {
        console.error("❌ IDs manquants");
        toast.error("Erreur: Identifiants manquants. Veuillez recommencer l'inscription.");
        navigate("/register-driver");
        return;
      }

      if (!documents.vtc_recto || !documents.vtc_verso) {
        toast.error("Carte VTC recto et verso obligatoires");
        return;
      }

      if (!documents.identity_recto || (!isPassport && !documents.identity_verso)) {
        toast.error(isPassport ? "Passeport obligatoire" : "Pièce d'identité recto et verso obligatoires");
        return;
      }

      if (!documents.driving_license_recto || !documents.driving_license_verso) {
        toast.error("Permis de conduire recto et verso obligatoires");
        return;
      }

      if (!documents.kbis) {
        toast.error("Kbis ou document équivalent obligatoire");
        return;
      }

      if (!documents.vehicle_insurance) {
        toast.error("Assurance véhicule obligatoire");
        return;
      }

      console.log("✅ Validation documents réussie");

      // ===== UPLOAD DOCUMENTS AVEC PROGRESS ET RETRY =====
      const urls: Record<string, string> = {};
      const docEntries = Object.entries(documents).filter(([_, file]) => file);
      const totalDocs = docEntries.length;
      
      console.log(`📤 Upload de ${totalDocs} documents en cours...`);
      
      for (let i = 0; i < docEntries.length; i++) {
        const [key, file] = docEntries[i];
        const docNumber = i + 1;
        
        console.log(`📤 Upload ${key} (${docNumber}/${totalDocs})`);
        
        try {
          // Validation supplémentaire avant upload
          if (!file || !(file instanceof File)) {
            throw new Error(`Fichier ${key} invalide`);
          }
          
          // Timeout par upload: 30 secondes max
          const uploadPromise = uploadFile(file as File, key);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout upload ${key}`)), 30000)
          );
          
          const uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]);
          
          // Vérification critique: URL valide
          if (!uploadedUrl || typeof uploadedUrl !== 'string' || !uploadedUrl.startsWith('http')) {
            throw new Error(`URL invalide retournée pour ${key}: ${uploadedUrl}`);
          }
          
          urls[key] = uploadedUrl;
          console.log(`✅ ${key} uploadé et vérifié (${docNumber}/${totalDocs})`);
          console.log(`   URL: ${uploadedUrl.substring(0, 80)}...`);
          
        } catch (uploadError: any) {
          console.error(`❌ Erreur upload ${key}:`, uploadError);
          console.error(`   Détails erreur:`, {
            message: uploadError.message,
            code: uploadError.code,
            name: uploadError.name
          });
          
          const errorMsg = uploadError.message?.includes("timeout")
            ? `L'upload de ${key} a pris trop de temps (>30s)`
            : `Erreur lors de l'upload de ${key}: ${uploadError.message}`;
          
          toast.error(errorMsg, {
            description: "Vérifiez votre connexion et réessayez.",
            duration: 8000
          });
          setLoading(false);
          return;
        }
      }

      console.log("✅ Tous les documents uploadés avec succès");

      // ===== VÉRIFICATION CRITIQUE: TOUS LES DOCUMENTS OBLIGATOIRES PRÉSENTS =====
      console.log("🔍 Vérification exhaustive des documents uploadés...");
      const requiredDocs = [
        'vtc_recto',
        'vtc_verso',
        'identity_recto',
        isPassport ? null : 'identity_verso', // Verso optionnel si passeport
        'driving_license_recto',
        'driving_license_verso',
        'kbis',
        'vehicle_insurance'
      ].filter(Boolean); // Retirer les null
      
      const missingDocs = requiredDocs.filter(doc => !urls[doc as string]);
      
      if (missingDocs.length > 0) {
        console.error("❌ Documents manquants après upload:", missingDocs);
        toast.error(
          `Documents non sauvegardés: ${missingDocs.join(', ')}`,
          {
            description: "Veuillez réessayer l'upload de ces documents",
            duration: 8000
          }
        );
        setLoading(false);
        return;
      }
      
      console.log("✅ Vérification complète: tous les documents obligatoires sont présents");
      console.log("📋 Documents à sauvegarder:", Object.keys(urls));

      // ===== MISE À JOUR DRIVER AVEC VÉRIFICATION =====
      console.log("💾 Mise à jour profil avec documents...");
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
            documentsUploaded: true,
            documentsCount: Object.keys(urls).length,
            timestamp: new Date().toISOString()
          }
        })
        .eq("id", driverId);

      if (updateError) {
        console.error("❌ Erreur sauvegarde:", updateError);
        toast.error("Erreur sauvegarde documents", {
          description: updateError.message,
          duration: 5000
        });
        setLoading(false);
        return;
      }

      // ===== VÉRIFICATION POST-SAUVEGARDE =====
      console.log("🔄 Vérification post-sauvegarde...");
      const { data: verifyDriver, error: verifyError } = await supabase
        .from("drivers")
        .select("documents, registration_step")
        .eq("id", driverId)
        .single();
      
      if (verifyError || !verifyDriver) {
        console.error("❌ Impossible de vérifier la sauvegarde:", verifyError);
        toast.error("Erreur de vérification. Veuillez vérifier vos documents dans l'admin.");
      } else {
        const savedDocsCount = Object.keys(verifyDriver.documents || {}).length;
        console.log(`✅ Vérification OK: ${savedDocsCount} documents sauvegardés`);
        
        if (savedDocsCount !== Object.keys(urls).length) {
          console.error(`⚠️ ALERTE: ${Object.keys(urls).length} uploadés mais ${savedDocsCount} sauvegardés`);
          toast.error("Certains documents n'ont pas été sauvegardés. Contactez le support.");
          setLoading(false);
          return;
        }
      }

      console.log("✅ Documents sauvegardés et vérifiés en base");
      toast.success(`${Object.keys(urls).length} documents enregistrés avec succès !`);
      
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
      console.error("💥 ERREUR CRITIQUE ÉTAPE 2:", error);
      console.error("Stack trace:", error.stack);
      
      const errorMessage = error.message?.includes("timeout")
        ? "L'upload a pris trop de temps. Vérifiez votre connexion."
        : error.message?.includes("storage")
        ? "Erreur de stockage des documents. Réessayez."
        : `Erreur: ${error.message || "Erreur inconnue"}`;
      
      toast.error(errorMessage, {
        duration: 5000,
        description: "Si le problème persiste, contactez le support."
      });
    } finally {
      console.log("🔚 Fin handleStep2");
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ===== VALIDATION INITIALE RENFORCÉE =====
    if (!driverId) {
      console.error("❌ Driver ID manquant pour paiement");
      toast.error("Erreur: Identifiant chauffeur manquant", {
        description: "Veuillez recommencer l'inscription"
      });
      navigate("/register-driver");
      return;
    }

    if (!userId) {
      console.error("❌ User ID manquant pour paiement");
      toast.error("Erreur: Identifiant utilisateur manquant");
      return;
    }

    setLoading(true);
    console.log("💳 DEBUT étape 3 - Paiement Stripe");
    console.log("🔑 Driver ID:", driverId);
    console.log("🔑 User ID:", userId);

    try {
      // ===== GESTION ACCÈS GRATUIT SI TOKEN =====
      if (invitationToken && isTokenValid) {
        console.log("🎁 Accès gratuit via token - Skip paiement");
        
        // Vérifier que le token est toujours valide
        const { data: tokenCheck } = await supabase
          .from("invitation_tokens")
          .select("used, id")
          .eq("token", invitationToken)
          .maybeSingle();
        
        if (!tokenCheck || tokenCheck.used) {
          console.error("❌ Token déjà utilisé ou invalide");
          toast.error("Token d'accès gratuit invalide ou déjà utilisé");
          return;
        }
        
        // Marquer le token comme utilisé
        const { error: tokenError } = await supabase
          .from("invitation_tokens")
          .update({
            used: true,
            used_at: new Date().toISOString(),
            used_by_driver_id: driverId
          })
          .eq("token", invitationToken);

        if (tokenError) {
          console.error("❌ Erreur marquage token:", tokenError);
          toast.error("Erreur lors du marquage du token");
          return;
        }

        // Accorder l'accès gratuit illimité
        const { error: driverError } = await supabase
          .from("drivers")
          .update({
            status: "pending", // ✅ SÉCURITÉ: statut pending car accès gratuit validé
            subscription_paid: false,
            free_access_granted: true,
            free_access_type: "unlimited",
            free_access_start_date: new Date().toISOString(),
            free_access_end_date: null,
            subscription_status: "active",
            registration_step: null,
            registration_data: null
          })
          .eq("id", driverId);

        if (driverError) {
          console.error("❌ Erreur mise à jour driver:", driverError);
          toast.error("Erreur lors de l'octroi de l'accès gratuit");
          return;
        }
        
        console.log("✅ Accès gratuit accordé - Redirection...");
        toast.success("Inscription complétée avec accès gratuit !");
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate(`/registration-success?driver_id=${driverId}&token=true`);
        return;
      }

      // ===== VÉRIFICATION DRIVER AVANT PAIEMENT =====
      console.log("🔍 Vérification driver avant paiement...");
      const { data: driverCheck, error: checkError } = await supabase
        .from("drivers")
        .select("id, user_id, subscription_paid, free_access_granted")
        .eq("id", driverId)
        .maybeSingle();
      
      if (checkError || !driverCheck) {
        console.error("❌ Driver non trouvé:", checkError);
        toast.error("Erreur: Profil chauffeur introuvable");
        return;
      }
      
      if (driverCheck.user_id !== userId) {
        console.error("❌ User ID ne correspond pas au driver");
        toast.error("Erreur de sécurité: Utilisateur incorrect");
        return;
      }
      
      if (driverCheck.subscription_paid || driverCheck.free_access_granted) {
        console.log("✅ Paiement déjà effectué ou accès gratuit");
        toast.success("Paiement déjà validé !");
        navigate(`/registration-success?driver_id=${driverId}`);
        return;
      }
      
      console.log("✅ Vérification driver OK - Procédure de paiement");

      // ===== APPEL EDGE FUNCTION AVEC TIMEOUT =====
      console.log("📞 Appel create-driver-subscription...");
      toast.info("Préparation du paiement sécurisé...", { duration: 2000 });
      
      const invokePromise = supabase.functions.invoke("create-driver-subscription", {
        body: { driver_id: driverId }
      });
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_ERROR")), 30000)
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      // ===== GESTION ERREURS APPEL FUNCTION =====
      if (error) {
        console.error("❌ Erreur function:", error);
        throw new Error(error.message || "Erreur création session paiement");
      }

      if (!data) {
        console.error("❌ Pas de réponse de la function");
        throw new Error("Pas de réponse du serveur de paiement");
      }

      console.log("📦 Réponse function reçue");

      // ===== VALIDATION RÉPONSE STRIPE =====
      if (data.error) {
        console.error("❌ Erreur dans réponse:", data.error);
        throw new Error(data.error);
      }

      if (!data.url || typeof data.url !== "string") {
        console.error("❌ URL Stripe invalide:", data);
        throw new Error("URL de paiement invalide");
      }

      if (!data.url.startsWith("https://checkout.stripe.com")) {
        console.error("❌ URL Stripe suspecte:", data.url);
        throw new Error("URL de paiement non sécurisée");
      }

      console.log("✅ URL Stripe valide:", data.url.substring(0, 50) + "...");

      // ===== REDIRECTION VERS STRIPE AVEC MULTI-MÉTHODE =====
      console.log("🔄 Redirection vers Stripe Checkout...");
      toast.success("Redirection vers le paiement sécurisé...", { duration: 2000 });
      
      // Attente pour que l'utilisateur voit le message
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Méthode 1: Redirection principale dans le même onglet
      console.log("🔗 Méthode 1: window.location.href");
      window.location.href = data.url;
      
      // Méthode 2: Fallback après 2 secondes si la redirection ne fonctionne pas
      const fallbackTimer = setTimeout(() => {
        console.log("⚠️ Fallback: Ouverture nouvel onglet");
        const stripeWindow = window.open(data.url, "_blank");
        
        if (!stripeWindow || stripeWindow.closed || typeof stripeWindow.closed === "undefined") {
          console.error("❌ Pop-up bloqué");
          toast.error("Impossible d'ouvrir la page de paiement", {
            duration: 10000,
            description: "Veuillez autoriser les pop-ups et réessayer",
            action: {
              label: "Réessayer",
              onClick: () => window.open(data.url, "_blank")
            }
          });
          setLoading(false);
        } else {
          console.log("✅ Stripe ouvert dans nouvel onglet");
          toast.info("Page de paiement ouverte dans un nouvel onglet", {
            duration: 5000
          });
        }
      }, 2000);
      
      // Cleanup timer si la redirection fonctionne
      window.addEventListener("beforeunload", () => clearTimeout(fallbackTimer));

    } catch (error: any) {
      console.error("💥 ERREUR CRITIQUE PAIEMENT:", error);
      console.error("Stack trace:", error.stack);
      
      // Messages d'erreur user-friendly
      let errorMessage = "Erreur lors de la préparation du paiement";
      let errorDescription = "Veuillez réessayer";
      
      if (error.message === "TIMEOUT_ERROR") {
        errorMessage = "La connexion a pris trop de temps";
        errorDescription = "Vérifiez votre connexion internet et réessayez";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Problème de connexion";
        errorDescription = "Vérifiez votre connexion internet";
      } else if (error.message?.includes("unauthorized") || error.message?.includes("permission")) {
        errorMessage = "Erreur d'autorisation";
        errorDescription = "Reconnectez-vous et réessayez";
      } else {
        errorDescription = error.message || errorDescription;
      }
      
      toast.error(errorMessage, {
        duration: 8000,
        description: errorDescription,
        action: {
          label: "Contacter le support",
          onClick: () => window.open("mailto:support@solocab.fr", "_blank")
        }
      });
      
    } finally {
      console.log("🔚 Fin handleStep3");
      // Ne pas setLoading(false) si on redirige vers Stripe
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 text-gray-900">
      <Card className="w-full max-w-2xl p-8 bg-white text-gray-900">
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
          <h1 className="text-3xl font-bold text-gray-900">Inscription Chauffeur</h1>
        </div>

        <div className="flex justify-between mb-8">
          <StepIndicator step={1} current={currentStep} label="Informations" />
          <StepIndicator step={2} current={currentStep} label="Documents" />
          <StepIndicator step={3} current={currentStep} label="Paiement" />
        </div>

        {currentStep === 1 && !isResuming && (
          <form onSubmit={handleStep1} className="space-y-6">
            <div>
              <Label htmlFor="fullName" className="text-gray-700 font-medium">Nom complet</Label>
              <Input
                variant="light"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="Jean Dupont"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                variant="light"
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="jean@exemple.com"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-700 font-medium">Téléphone</Label>
              <Input
                variant="light"
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="0612345678"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">Mot de passe</Label>
              <div className="relative">
                <Input
                  variant="light"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-gray-100"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-gray-600" /> : <Eye className="h-4 w-4 text-gray-600" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirmer mot de passe</Label>
              <div className="relative">
                <Input
                  variant="light"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-gray-100"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-600" /> : <Eye className="h-4 w-4 text-gray-600" />}
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

            <p className="text-center text-sm text-gray-600">
              Déjà inscrit ?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
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
                  className={!isPassport ? "" : "bg-background hover:bg-muted border-2 text-foreground font-medium"}
                  onClick={() => setIsPassport(false)}
                >
                  Carte d'identité
                </Button>
                <Button
                  type="button"
                  variant={isPassport ? "default" : "outline"}
                  className={isPassport ? "" : "bg-background hover:bg-muted border-2 text-foreground font-medium"}
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
              <h2 className="text-2xl font-bold text-gray-900">Paiement</h2>
              
              {invitationToken && isTokenValid ? (
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-green-700 rounded-lg p-6 shadow-lg">
                  <CheckCircle className="h-12 w-12 text-white mx-auto mb-4" />
                  <p className="text-xl font-bold text-white">
                    Accès gratuit illimité activé !
                  </p>
                  <p className="text-base text-white/95 mt-2">
                    Votre inscription test vous donne un accès gratuit à la plateforme.
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-primary rounded-xl p-8 space-y-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary mb-2">
                      49,99 €<span className="text-lg font-normal text-gray-600">/mois</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Abonnement mensuel sans engagement
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 text-left space-y-3">
                    <p className="font-semibold text-lg mb-4 text-gray-900">Accès complet incluant :</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Gestion illimitée de vos clients et courses</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Génération automatique de devis et factures</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Code QR personnalisé pour inscription clients</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Profil public sur la plateforme SoloCab</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Paiement en ligne sécurisé via Stripe</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Statistiques et suivi de votre activité</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Système de promotions pour vos clients</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">Support client dédié</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Message de sécurité */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-blue-700 rounded-lg p-4 shadow-lg">
                    <p className="text-base text-white font-bold">
                      🔒 Paiement 100% sécurisé par Stripe
                    </p>
                    <p className="text-sm text-white/95 mt-1">
                      Vous serez redirigé vers notre page de paiement sécurisée. 
                      Si la page ne s'ouvre pas automatiquement, cliquez sur "Réessayer".
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {canGoBack && !loading && (
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
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirection en cours...
                  </>
                ) : invitationToken && isTokenValid ? (
                  "Finaliser"
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Procéder au paiement
                  </>
                )}
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
        current >= step ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-600"
      }`}
    >
      {current > step ? <CheckCircle className="h-6 w-6" /> : step}
    </div>
    <span className="text-xs mt-1 text-gray-700">{label}</span>
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
      <Label className="text-gray-900">
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
          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white"
        >
          {file ? (
            <div className="text-center p-4">
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-gray-600 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-primary mt-2">Cliquer pour changer</p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Cliquer pour télécharger</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP ou PDF (max 10MB)</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

export default RegisterDriver;
