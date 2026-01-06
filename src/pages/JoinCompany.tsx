import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  LogIn,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface InvitationData {
  id: string;
  email: string;
  company_id: string;
  expires_at: string;
  is_used: boolean;
  companies?: {
    company_name: string;
  };
}

export default function JoinCompany() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      const { data, error: fetchError } = await supabase
        .from("company_admin_invitations")
        .select(`
          id,
          email,
          company_id,
          expires_at,
          is_used,
          companies:company_id (
            company_name
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Cette invitation n'existe pas ou a été supprimée");
        return;
      }

      if (data.is_used) {
        setError("Cette invitation a déjà été utilisée");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("Cette invitation a expiré");
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error("Erreur:", err);
      setError("Erreur lors de la validation de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!user || !invitation) return;

    setJoining(true);
    try {
      // Vérifier si l'utilisateur est déjà admin de cette entreprise
      const { data: existingAdmin } = await supabase
        .from("company_administrators")
        .select("id")
        .eq("company_id", invitation.company_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingAdmin) {
        toast.info("Vous êtes déjà administrateur de cette entreprise");
        navigate("/company-dashboard");
        return;
      }

      // Ajouter l'utilisateur comme admin
      const { error: insertError } = await supabase
        .from("company_administrators")
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          role: "admin",
          accepted_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Marquer l'invitation comme utilisée
      await supabase
        .from("company_admin_invitations")
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          used_by_user_id: user.id,
        })
        .eq("id", invitation.id);

      // Ajouter le rôle company dans user_roles si pas déjà présent
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "company")
        .maybeSingle();

      if (!existingRole) {
        await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            role: "company",
          });
      }

      setSuccess(true);
      toast.success("Vous avez rejoint l'entreprise avec succès !");

      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate("/company-dashboard");
      }, 2000);

    } catch (err) {
      console.error("Erreur:", err);
      toast.error("Erreur lors de l'acceptation de l'invitation");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur border-border/50">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-white">Invitation invalide</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur border-border/50">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-white">Bienvenue !</h2>
            <p className="text-muted-foreground mb-4">
              Vous êtes maintenant administrateur de {invitation?.companies?.company_name}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirection vers le tableau de bord...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="max-w-md w-full bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <img src={logo} alt="SoloCab" className="w-full h-full" />
          </div>
          <CardTitle className="text-xl text-white">Invitation à rejoindre</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre l'espace entreprise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entreprise */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {invitation?.companies?.company_name}
                </p>
                <p className="text-sm text-muted-foreground">Entreprise</p>
              </div>
            </div>
          </div>

          {/* Avertissement */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                En acceptant, vous aurez accès à toutes les informations de l'entreprise : courses, factures, collaborateurs et partenaires.
              </span>
            </p>
          </div>

          {/* Actions */}
          {user ? (
            <Button 
              onClick={handleJoinCompany} 
              disabled={joining}
              className="w-full"
              size="lg"
            >
              {joining ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accepter l'invitation
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Connectez-vous ou créez un compte pour accepter l'invitation
              </p>
              <Button 
                onClick={() => navigate(`/login?redirect=/join-company?token=${token}`)}
                className="w-full"
                size="lg"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Se connecter
              </Button>
            </div>
          )}

          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="w-full text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
