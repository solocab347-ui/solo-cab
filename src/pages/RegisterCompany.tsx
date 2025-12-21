import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-solocab.png";
import { Building2, User, Mail, Phone, MapPin, FileText, Users, ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { sanitizeString, sanitizeEmail, sanitizePhone } from "@/lib/inputSanitizer";

export default function RegisterCompany() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Compte
    email: "",
    password: "",
    confirmPassword: "",
    // Entreprise
    companyName: "",
    siret: "",
    siren: "",
    address: "",
    billingAddress: "",
    // Contact
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    department: "",
    employeeCount: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.companyName || !formData.siret || !formData.address) {
      toast.error("Veuillez remplir les champs obligatoires");
      return false;
    }
    if (formData.siret.replace(/\s/g, '').length !== 14) {
      toast.error("Le SIRET doit contenir 14 chiffres");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.contactName || !formData.contactEmail) {
      toast.error("Veuillez remplir les champs obligatoires");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setLoading(true);
    
    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizeEmail(formData.email),
        password: formData.password,
        options: {
          data: {
            full_name: sanitizeString(formData.contactName),
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // 2. Attendre que le profil soit créé
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Créer l'entrée entreprise
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert({
          user_id: authData.user.id,
          company_name: sanitizeString(formData.companyName),
          siret: formData.siret.replace(/\s/g, ''),
          siren: formData.siren?.replace(/\s/g, '') || null,
          address: sanitizeString(formData.address),
          billing_address: formData.billingAddress ? sanitizeString(formData.billingAddress) : null,
          contact_name: sanitizeString(formData.contactName),
          contact_email: sanitizeEmail(formData.contactEmail),
          contact_phone: formData.contactPhone ? sanitizePhone(formData.contactPhone) : null,
          department: formData.department ? sanitizeString(formData.department) : null,
          employee_count: formData.employeeCount ? parseInt(formData.employeeCount) : null,
          notes: formData.notes ? sanitizeString(formData.notes) : null,
          status: "validated",
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 4. Ajouter le rôle company
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "company",
        });

      if (roleError) throw roleError;

      // 5. Envoyer l'email de confirmation
      try {
        await supabase.functions.invoke("send-company-registration-email", {
          body: { company_id: companyData.id },
        });
        console.log("Email de confirmation envoyé");
      } catch (emailError) {
        console.error("Erreur envoi email:", emailError);
        // Ne pas bloquer l'inscription si l'email échoue
      }

      toast.success("Inscription réussie ! Vous pouvez maintenant vous connecter.");
      navigate("/login");
      
    } catch (error: any) {
      console.error("Erreur inscription entreprise:", error);
      if (error.code === "user_already_exists" || error.message?.includes("already registered")) {
        toast.error("Cette adresse email est déjà utilisée. Veuillez vous connecter ou utiliser une autre adresse.");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-elegant">
        <CardHeader className="text-center pb-2">
          <img src={logo} alt="SoloCab" className="w-20 h-20 mx-auto mb-4" />
          <CardTitle className="text-2xl">Inscription Entreprise</CardTitle>
          <CardDescription>
            Créez votre compte entreprise pour accéder à nos services VTC
          </CardDescription>
          
          {/* Progress steps */}
          <div className="flex justify-center mt-6 gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
            <span>Compte</span>
            <span>Entreprise</span>
            <span>Contact</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          {/* Step 1: Compte */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <Label htmlFor="email">Email de connexion *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contact@entreprise.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className={formData.confirmPassword && formData.password !== formData.confirmPassword ? "border-destructive" : formData.confirmPassword && formData.password === formData.confirmPassword ? "border-green-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Les mots de passe correspondent
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => validateStep1() && setStep(2)}
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Entreprise */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="Ma Société SAS"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="siret"
                      name="siret"
                      placeholder="123 456 789 00012"
                      value={formData.siret}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siren">SIREN</Label>
                  <Input
                    id="siren"
                    name="siren"
                    placeholder="123 456 789"
                    value={formData.siren}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse du siège *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    name="address"
                    placeholder="123 Avenue des Champs-Élysées, 75008 Paris"
                    value={formData.address}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingAddress">Adresse de facturation (si différente)</Label>
                <Input
                  id="billingAddress"
                  name="billingAddress"
                  placeholder="Adresse de facturation"
                  value={formData.billingAddress}
                  onChange={handleChange}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={() => validateStep2() && setStep(3)} className="flex-1">
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nom du contact principal *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contactName"
                    name="contactName"
                    placeholder="Jean Dupont"
                    value={formData.contactName}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email du contact *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      placeholder="contact@email.com"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Service / Département</Label>
                  <Input
                    id="department"
                    name="department"
                    placeholder="Direction, RH, etc."
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeCount">Nombre d'employés</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="employeeCount"
                      name="employeeCount"
                      type="number"
                      placeholder="50"
                      value={formData.employeeCount}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Besoins spécifiques</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Décrivez vos besoins en transport (fréquence, destinations habituelles, etc.)"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? "Inscription..." : "Finaliser l'inscription"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
