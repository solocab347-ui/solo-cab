import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RegistrationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const driverId = searchParams.get("driver_id");

  useEffect(() => {
    const updateDriverPaymentStatus = async () => {
      if (!driverId) {
        toast.error("Driver ID manquant");
        setLoading(false);
        return;
      }

      try {
        // Mettre à jour le statut de paiement du driver
        const { error } = await supabase
          .from("drivers")
          .update({ subscription_paid: true })
          .eq("id", driverId);

        if (error) throw error;

        console.log("✅ Paiement validé pour le driver:", driverId);
        
        // Envoyer un email de confirmation à l'admin
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "new_driver_registration",
              data: {
                driver_id: driverId,
              },
            },
          });
        } catch (emailErr) {
          console.error("⚠️ Erreur envoi email admin (non bloquant):", emailErr);
        }

        toast.success("Inscription terminée avec succès !");
      } catch (error: any) {
        console.error("❌ Erreur mise à jour paiement:", error);
        toast.error("Erreur lors de la validation du paiement");
      } finally {
        setLoading(false);
      }
    };

    updateDriverPaymentStatus();
  }, [driverId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e35] to-[#1a2942] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-[#1a2332]/95 border-primary/20 backdrop-blur-sm text-center">
        {loading ? (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Validation du paiement...
            </h1>
            <p className="text-muted-foreground">
              Veuillez patienter quelques instants
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Inscription réussie !
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Votre paiement a été validé avec succès.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Prochaines étapes
              </h2>
              <p className="text-muted-foreground mb-4">
                Votre dossier est maintenant en cours de validation par notre équipe administrative.
                Vous recevrez un email de confirmation une fois votre compte validé (généralement sous 24-48h).
              </p>
              <ul className="text-left text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Vérification de vos documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Validation de votre profil</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>Activation de votre compte</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 text-lg"
            >
              Aller à la page de connexion
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default RegistrationSuccess;
