import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Truck, ArrowLeft, Eye, EyeOff, Building2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import logo from "@/assets/logo-solocab.png";

const RegisterFleetManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    siret: "",
    siren: "",
    address: "",
    contactName: "",
    contactPhone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.contactName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // Wait for profile to be created by trigger
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 2. Create fleet manager profile
      const { error: fleetError } = await supabase.from("fleet_managers").insert({
        user_id: authData.user.id,
        company_name: formData.companyName,
        siret: formData.siret,
        siren: formData.siren || null,
        address: formData.address,
        contact_name: formData.contactName,
        contact_email: formData.email,
        contact_phone: formData.contactPhone || null,
        status: "pending",
      });

      if (fleetError) throw fleetError;

      // 3. Add fleet_manager role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "fleet_manager",
      });

      if (roleError) throw roleError;

      // 4. Send welcome email with document reminder
      try {
        await supabase.functions.invoke("send-fleet-manager-document-reminder", {
          body: { 
            fleetManagerId: authData.user.id,
            reminderType: "registration"
          }
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // Don't block registration if email fails
      }

      toast.success("Compte créé avec succès ! Vous pouvez maintenant accéder à votre espace et soumettre vos documents.");
      navigate("/fleet-manager");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={logo} alt="SoloCab" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold">Devenir Gestionnaire de Flotte</h1>
          <p className="text-muted-foreground mt-2">
            Gérez votre équipe de chauffeurs VTC
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Inscription Gestionnaire de Flotte
            </CardTitle>
            <CardDescription>
              Créez votre compte pour gérer vos chauffeurs et clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Info */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Informations Entreprise
                </h3>
                
                <div>
                  <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    placeholder="Ma Société VTC"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siret">SIRET *</Label>
                    <Input
                      id="siret"
                      name="siret"
                      value={formData.siret}
                      onChange={handleChange}
                      required
                      placeholder="12345678901234"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <Label htmlFor="siren">SIREN</Label>
                    <Input
                      id="siren"
                      name="siren"
                      value={formData.siren}
                      onChange={handleChange}
                      placeholder="123456789"
                      maxLength={9}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Adresse *</Label>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(address) => setFormData({ ...formData, address })}
                    placeholder="123 Rue de Paris, 75001 Paris"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactName">Nom du responsable *</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    required
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="contact@masociete.fr"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="••••••••"
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

                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Déjà inscrit ?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterFleetManager;
