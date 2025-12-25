import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, UserCheck, Building2, CreditCard, ArrowRight, FileCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface FleetRemovalNoticeProps {
  userId: string;
  driverId: string;
}

export const FleetRemovalNotice = ({ userId, driverId }: FleetRemovalNoticeProps) => {
  const [showNotice, setShowNotice] = useState(false);
  const [removalInfo, setRemovalInfo] = useState<{
    removedAt: string;
    reason: string;
    fleetName: string;
  } | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [convertingToIndependent, setConvertingToIndependent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkRemovalStatus();
  }, [driverId]);

  const checkRemovalStatus = async () => {
    try {
      // Check if driver was recently removed from a fleet
      const { data: removalData, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          removed_at,
          removed_reason,
          fleet_manager:fleet_managers(company_name)
        `)
        .eq("driver_id", driverId)
        .eq("removed_by_manager", true)
        .order("removed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (removalData?.removed_at) {
        // Check if already dismissed
        const dismissKey = `fleet_removal_dismissed_${removalData.removed_at}`;
        const dismissed = localStorage.getItem(dismissKey);
        
        if (!dismissed) {
          // Show notice if removal was within last 30 days
          const removalDate = new Date(removalData.removed_at);
          const daysSinceRemoval = (Date.now() - removalDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceRemoval <= 30) {
            setRemovalInfo({
              removedAt: removalData.removed_at,
              reason: removalData.removed_reason || "Non spécifié",
              fleetName: (removalData.fleet_manager as any)?.company_name || "La flotte",
            });
            setDismissedKey(dismissKey);
            setShowNotice(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking removal status:", error);
    }
  };

  const handleDismiss = () => {
    if (dismissedKey) {
      localStorage.setItem(dismissedKey, "true");
    }
    setShowNotice(false);
  };

  const handleGoToSubscription = () => {
    handleDismiss();
    navigate("/driver-dashboard?tab=subscription");
  };

  const handleConvertToIndependent = async () => {
    setConvertingToIndependent(true);
    try {
      // Mettre à jour le statut du chauffeur pour devenir indépendant
      const { error } = await supabase
        .from("drivers")
        .update({
          status: "pending", // En attente de validation admin
          documents_status: "pending", // Documents à soumettre
          documents_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours pour soumettre
          subscription_paid: false,
          subscription_status: "inactive",
        })
        .eq("id", driverId);

      if (error) throw error;

      // Créer une notification pour l'admin
      const { data: adminProfiles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminProfiles) {
        for (const admin of adminProfiles) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "🔄 Nouveau chauffeur indépendant",
            message: "Un chauffeur détaché d'une flotte souhaite devenir indépendant et attend la validation de ses documents.",
            type: "info",
            link: "/admin-dashboard?tab=drivers",
          });
        }
      }

      toast.success("Votre demande de conversion en chauffeur indépendant a été envoyée. Soumettez vos documents pour validation.");
      handleDismiss();
      navigate("/driver-dashboard?tab=documents");
    } catch (error) {
      console.error("Error converting to independent:", error);
      toast.error("Erreur lors de la conversion");
    } finally {
      setConvertingToIndependent(false);
    }
  };

  if (!showNotice || !removalInfo) return null;

  return (
    <Dialog open={showNotice} onOpenChange={setShowNotice}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Vous avez été retiré d'une flotte
          </DialogTitle>
          <DialogDescription>
            {removalInfo.fleetName} vous a retiré de son équipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Motif indiqué</AlertTitle>
            <AlertDescription>{removalInfo.reason}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Votre compte reste actif. Voici vos options :
            </p>

            <div className="space-y-3">
              <button 
                onClick={handleConvertToIndependent}
                disabled={convertingToIndependent}
                className="w-full flex items-start gap-3 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  {convertingToIndependent ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Devenir chauffeur indépendant</h4>
                  <p className="text-sm text-muted-foreground">
                    Soumettez vos documents pour validation par l'administrateur SoloCab et souscrivez à l'abonnement (9,99€/mois)
                  </p>
                </div>
              </button>

              <div className="flex items-start gap-3 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Rejoindre un autre gestionnaire</h4>
                  <p className="text-sm text-muted-foreground">
                    Utilisez un lien d'invitation d'un autre gestionnaire de flotte pour rejoindre son équipe
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Important :</strong> En tant que chauffeur indépendant, vos documents seront validés par l'administrateur SoloCab 
              (et non plus par votre ancien gestionnaire de flotte). Une fois validé, vous pourrez gérer votre activité en toute autonomie.
            </AlertDescription>
          </Alert>

          <Alert className="bg-green-50 border-green-200">
            <CreditCard className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Abonnement :</strong> L'abonnement chauffeur indépendant est de 9,99€/mois et vous donne accès à toutes les fonctionnalités :
              gestion des clients, courses, devis, factures, profil public et QR code personnalisé.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss}>
            Je verrai plus tard
          </Button>
          <Button onClick={handleGoToSubscription} className="gap-2">
            Voir les abonnements
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
