import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-solocab.png";
import { Building2, User, Mail, Phone, Eye, EyeOff, Check, Loader2, XCircle } from "lucide-react";
import { sanitizeString, sanitizeEmail, sanitizePhone } from "@/lib/inputSanitizer";

interface InvitationData {
  id: string;
  company_id: string;
  email: string | null;
  employee_name: string | null;
  department: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  company_name: string;
}

export default function RegisterCompanyEmployee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    jobTitle: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError("Lien d'invitation invalide");
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from("company_employee_invitations")
        .select(`
          id,
          company_id,
          email,
          employee_name,
          department,
          can_create_courses,
          can_view_invoices,
          companies!inner(company_name)
        `)
        .eq("token", token)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        setError("Ce lien d'invitation est invalide ou a expiré");
        return;
      }

      const companyData = data.companies as unknown as { company_name: string };
      
      setInvitation({
        id: data.id,
        company_id: data.company_id,
        email: data.email,
        employee_name: data.employee_name,
        department: data.department,
        can_create_courses: data.can_create_courses,
        can_view_invoices: data.can_view_invoices,
        company_name: companyData.company_name,
      });
      
      // Pré-remplir les champs si l'invitation contient des infos
      setFormData(prev => ({
        ...prev,
        fullName: data.employee_name || "",
        email: data.email || "",
        department: data.department || "",
      }));
    } catch (err) {
      console.error("Erreur validation token:", err);
      setError("Erreur lors de la validation de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizeEmail(formData.email),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: sanitizeString(formData.fullName),
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // 2. Attendre que le profil soit créé
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Mettre à jour le profil avec le téléphone
      if (formData.phone) {
        await supabase
          .from("profiles")
          .update({ phone: sanitizePhone(formData.phone) })
          .eq("id", authData.user.id);
      }

      // 4. Créer l'entrée company_employees
      const { error: employeeError } = await supabase
        .from("company_employees")
        .insert({
          company_id: invitation.company_id,
          user_id: authData.user.id,
          invitation_id: invitation.id,
          department: formData.department ? sanitizeString(formData.department) : null,
          job_title: formData.jobTitle ? sanitizeString(formData.jobTitle) : null,
          can_create_courses: invitation.can_create_courses,
          can_view_invoices: invitation.can_view_invoices,
        });

      if (employeeError) throw employeeError;

      // 5. Ajouter le rôle client (les employés entreprise utilisent le rôle client)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "client" as const,
        });

      if (roleError) throw roleError;

      // 6. Marquer l'invitation comme utilisée
      await supabase
        .from("company_employee_invitations")
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          used_by_user_id: authData.user.id,
        })
        .eq("id", invitation.id);

      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      navigate("/login");
      
    } catch (error: any) {
      console.error("Erreur inscription employé:", error);
      if (error.code === "user_already_exists" || error.message?.includes("already registered")) {
        toast.error("Cette adresse email est déjà utilisée");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation invalide</h2>
            <p className="text-muted-foreground mb-4">
              {error || "Ce lien d'invitation est invalide ou a expiré."}
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-elegant">
        <CardHeader className="text-center pb-2">
          <img src={logo} alt="SoloCab" className="w-16 h-16 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">{invitation.company_name}</span>
          </div>
          <CardTitle className="text-2xl">Rejoindre l'entreprise</CardTitle>
          <CardDescription>
            Créez votre compte collaborateur pour accéder aux services VTC
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Jean Dupont"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jean.dupont@entreprise.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  disabled={!!invitation.email}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Service</Label>
                <Input
                  id="department"
                  name="department"
                  placeholder="Marketing, RH..."
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Poste</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                placeholder="Directeur commercial, Assistante..."
                value={formData.jobTitle}
                onChange={handleChange}
              />
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

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            Vous avez déjà un compte ?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
