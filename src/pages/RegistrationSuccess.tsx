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
        navigate("/login");
        return;
      }

      // Si c'est un accès gratuit via token, pas besoin de vérifier Stripe
      const isTokenAccess = searchParams.get("token") === "true";

      try {
        // Vérifier que le driver existe et a les bons accès
        const { data: driver, error: driverCheckError } = await supabase
          .from("drivers")
          .select("id, subscription_paid, free_access_granted, user_id")
          .eq("id", driverId)
          .single();

        if (driverCheckError || !driver) {
          toast.error("Driver introuvable");
          navigate("/login");
          return;
        }

        // Si accès gratuit via token, tout est déjà configuré
        if (isTokenAccess && driver.free_access_granted) {
          console.log("✅ Accès gratuit validé pour le driver:", driverId);
          // Récupérer infos pour email
          const { data: driverData } = await supabase
            .from("drivers")
            .select(`profiles:profiles!inner(full_name, email)`)
            .eq("id", driverId)
            .single();

          if (driverData?.profiles?.email) {
            await supabase.functions.invoke("send-email", {
              body: {
                to: driverData.profiles.email,
                type: "driver_welcome",
                data: { driverName: driverData.profiles.full_name }
              }
            }).catch(console.error);
          }

          toast.success("Inscription complétée avec accès gratuit !");
          setLoading(false);
          return;
        }

        // SINON : Vérifier que c'est bien un retour Stripe valide
        // Note: Le webhook Stripe a déjà mis à jour subscription_paid=true
        // On vérifie juste que c'est le cas
        if (!driver.subscription_paid) {
          toast.error("Paiement non confirmé. Veuillez contacter le support.");
          navigate("/login");
          return;
        }

        console.log("✅ Paiement Stripe validé pour le driver:", driverId);
        
        // ⚠️ SÉCURITÉ CRITIQUE: Changer status à "pending" SEULEMENT après paiement
        await supabase
          .from("drivers")
          .update({
            status: "pending",
            registration_step: null,
            registration_data: null
          })
          .eq("id", driverId);

        // Récupérer infos pour email
        const { data: driverData } = await supabase
          .from("drivers")
          .select(`profiles:profiles!inner(full_name, email)`)
          .eq("id", driverId)
          .single();

        if (driverData?.profiles?.email) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: driverData.profiles.email,
              type: "driver_welcome",
              data: { driverName: driverData.profiles.full_name }
            }
          }).catch(console.error);
        }

        toast.success("Inscription terminée avec succès !");
      } catch (error: any) {
        console.error("❌ Erreur validation:", error);
        toast.error("Erreur lors de la validation");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    updateDriverPaymentStatus();
  }, [driverId, searchParams, navigate]);

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
