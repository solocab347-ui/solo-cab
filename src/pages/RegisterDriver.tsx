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
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [invitationToken, setInvitationToken] = useState<string>("");
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [isPassport, setIsPassport] = useState(false);
  
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

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setInvitationToken(token);
      checkToken(token);
    }
  }, [searchParams]);

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
      toast.success("Accès gratuit activé");
    } catch (err) {
      setIsTokenValid(false);
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      const result = registrationSchema.safeParse(formData);
      if (!result.success) {
        const error = result.error.errors[0];
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Check existing email
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email.trim().toLowerCase())
        .single();

      if (existing) {
        toast.error("Email déjà utilisé");
        setLoading(false);
        return;
      }

      // Create auth account
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
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erreur de création de compte");
        setLoading(false);
        return;
      }

      const newUserId = authData.user.id;
      setUserId(newUserId);

      // Wait for profile trigger
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add driver role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: newUserId, role: "driver" });

      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Role error:", roleError);
      }

      // Create driver profile
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: newUserId,
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
          quote_counter: 0,
          invoice_counter: 0,
          course_counter: 0,
          reservation_counter: 0
        })
        .select()
        .single();

      if (driverError) {
        toast.error("Erreur création profil chauffeur");
        setLoading(false);
        return;
      }

      setDriverId(driverData.id);

      // Grant free access if token valid
      if (invitationToken && isTokenValid) {
        await supabase
          .from("drivers")
          .update({
            free_access_granted: true,
            free_access_type: "unlimited",
            free_access_start_date: new Date().toISOString(),
            subscription_status: "active"
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
      }

      toast.success("Compte créé avec succès !");
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(2);

    } catch (error: any) {
      console.error("Error step 1:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
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

      // Upload all documents
      const urls: Record<string, string> = {};
      
      for (const [key, file] of Object.entries(documents)) {
        if (file) {
          urls[key] = await uploadFile(file, key);
        }
      }

      // Update driver with documents
      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          documents: urls
        })
        .eq("id", driverId);

      if (updateError) {
        toast.error("Erreur sauvegarde documents");
        setLoading(false);
        return;
      }

      toast.success("Documents téléchargés avec succès !");
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(3);

    } catch (error: any) {
      console.error("Error step 2:", error);
      toast.error(error.message || "Erreur téléchargement documents");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();

    // If free access via token, skip payment
    if (invitationToken && isTokenValid) {
      navigate("/registration-success");
      return;
    }

    // Otherwise redirect to Stripe
    toast.info("Redirection vers le paiement...");
    // TODO: Implement Stripe checkout
    navigate("/registration-success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center justify-center mb-8">
          <Car className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-3xl font-bold">Inscription Chauffeur</h1>
        </div>

        <div className="flex justify-between mb-8">
          <StepIndicator step={1} current={currentStep} label="Informations" />
          <StepIndicator step={2} current={currentStep} label="Documents" />
          <StepIndicator step={3} current={currentStep} label="Paiement" />
        </div>

        {currentStep === 1 && (
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
              label="Kbis"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-lg font-semibold mb-2">
                    Abonnement mensuel : 49,99 €
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Accès complet à toutes les fonctionnalités
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
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
}) => (
  <div>
    <Label>
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="mt-2">
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="hidden"
        id={`file-${label}`}
      />
      <label
        htmlFor={`file-${label}`}
        className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
      >
        {file ? (
          <div className="text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">Cliquer pour changer</p>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Cliquer pour télécharger</p>
          </div>
        )}
      </label>
    </div>
  </div>
);

export default RegisterDriver;
