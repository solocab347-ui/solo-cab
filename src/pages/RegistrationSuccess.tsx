import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RegistrationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const driverId = searchParams.get("driver_id");

  useEffect(() => {
    const finalizeRegistration = async () => {
      console.log("🔍 FINALISATION INSCRIPTION - Driver ID:", driverId);
      
      if (!driverId) {
        console.error("❌ Driver ID manquant dans URL");
        setError("Identifiant chauffeur manquant");
        setLoading(false);
        setTimeout(() => navigate("/login"), 4000);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(driverId)) {
        console.error("❌ Driver ID invalide:", driverId);
        setError("Identifiant chauffeur invalide");
        setLoading(false);
        setTimeout(() => navigate("/login"), 4000);
        return;
      }

      try {
        console.log("🔎 Vérification driver dans DB...");
        const { data: driver, error: driverCheckError } = await supabase
          .from("drivers")
          .select("id, user_id, status")
          .eq("id", driverId)
          .single();

        if (driverCheckError || !driver) {
          console.error("❌ Driver introuvable:", driverCheckError);
          setError("Profil chauffeur introuvable");
          setLoading(false);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        console.log("✅ Driver trouvé, statut:", driver.status);

        // Mise à jour statut vers 'pending' (en attente de validation documents)
        console.log("🔄 Mise à jour statut vers 'pending'...");
        const { error: updateError } = await supabase
          .from("drivers")
          .update({
            status: "pending",
            registration_step: null,
            registration_data: null
          })
          .eq("id", driverId);

        if (updateError) {
          console.error("❌ Erreur mise à jour statut:", updateError);
        } else {
          console.log("✅ Statut mis à jour");
        }

        // Envoi email bienvenue
        console.log("📧 Envoi email bienvenue...");
        const { data: driverData } = await supabase
          .from("drivers")
          .select(`
            id,
            user_id,
            profiles:user_id(full_name, email)
          `)
          .eq("id", driverId)
          .single();

        if (driverData?.profiles?.email) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: driverData.profiles.email,
              type: "driver_welcome",
              data: { driverName: driverData.profiles.full_name }
            }
          }).catch(err => console.error("⚠️ Erreur email:", err));
          console.log("✅ Email envoyé");
        }

        toast.success("Inscription terminée avec succès !");
        console.log("🎉 INSCRIPTION COMPLETE");
        
        setTimeout(() => {
          navigate(`/driver-welcome?driver_id=${driverId}&pioneer=false`);
        }, 1500);
        
      } catch (error: any) {
        console.error("💥 ERREUR VALIDATION:", error);
        setError("Une erreur est survenue: " + (error.message || "Erreur inconnue"));
      } finally {
        setLoading(false);
      }
    };

    finalizeRegistration();
  }, [driverId, searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 bg-card text-card-foreground">
        {loading ? (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Finalisation de l'inscription...
            </h1>
            <p className="text-muted-foreground">
              Veuillez patienter quelques instants
            </p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Erreur
            </h1>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full h-12"
            >
              Retour à la page de connexion
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Inscription réussie !
            </h1>
            <p className="text-muted-foreground mb-6">
              Redirection vers la configuration de votre espace...
            </p>
            <Button
              onClick={() => navigate(`/driver-welcome?driver_id=${driverId}&pioneer=false`)}
              className="w-full h-12"
            >
              Continuer
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RegistrationSuccess;
