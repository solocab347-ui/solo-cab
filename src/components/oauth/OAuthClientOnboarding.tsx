import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface Props {
  user: any;
}

export const OAuthClientOnboarding = ({ user }: Props) => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(
    user.user_metadata?.full_name || user.user_metadata?.name || ""
  );
  const [phone, setPhone] = useState("");
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!acceptCGU) {
      toast.error("Veuillez accepter les conditions d'utilisation");
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: user.email,
          onboarding_completed: true,
        });

      if (profileError) throw profileError;

      // Create client record
      const { error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: user.id,
          is_exclusive: false,
        });

      if (clientError && !clientError.message.includes("duplicate")) throw clientError;

      // Assign client role via RPC
      const { error: roleError } = await supabase.rpc("assign_user_role", {
        p_user_id: user.id,
        p_role: "client",
      });

      if (roleError) throw roleError;

      localStorage.removeItem("solocab_oauth_signup_type");
      toast.success("Bienvenue sur SoloCab !");
      navigate("/client-dashboard", { replace: true });
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
      }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logo} alt="SoloCab" className="w-12 h-12 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm text-primary font-medium">Compte créé</span>
          </div>
          <h1 className="text-xl font-bold">Finalisez votre inscription</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quelques informations pour profiter de SoloCab
          </p>
        </div>

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Prénom et nom *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                required
              />
              <p className="text-xs text-muted-foreground">
                Obligatoire pour communiquer avec votre chauffeur
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="cgu"
                checked={acceptCGU}
                onCheckedChange={(v) => setAcceptCGU(!!v)}
              />
              <label htmlFor="cgu" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                J'accepte les{" "}
                <a href="/mentions-legales" className="text-primary hover:underline" target="_blank">
                  conditions générales d'utilisation
                </a>
              </label>
            </div>

            <Button type="submit" className="w-full bg-gradient-premium" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalisation...</>
              ) : (
                "Accéder à mon espace"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
