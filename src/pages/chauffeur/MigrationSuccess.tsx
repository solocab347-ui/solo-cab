import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function MigrationSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      verifyMigration(sessionId);
    } else {
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyMigration = async (sessionId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Update driver record to mark migration as complete
      const { error } = await supabase
        .from("drivers")
        .update({
          migration_required: false,
          migrated_at: new Date().toISOString(),
          subscription_paid: true,
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating migration status:", error);
      }

      setSuccess(true);

      toast.success("Migration réussie !");
    } catch (err) {
      console.error("Verification error:", err);
      toast.error("Erreur lors de la vérification");
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification de votre paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <PartyPopper className="h-6 w-6 text-primary" />
            Migration réussie !
          </CardTitle>
          <CardDescription>
            Votre abonnement SoloCab est maintenant actif. Vous pouvez continuer à utiliser 
            toutes les fonctionnalités de l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              Merci pour votre confiance ! Votre compte a été mis à jour et vous avez 
              désormais accès à toutes les fonctionnalités premium de SoloCab.
            </p>
          </div>
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => navigate("/chauffeur")}
          >
            Accéder à mon tableau de bord
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
