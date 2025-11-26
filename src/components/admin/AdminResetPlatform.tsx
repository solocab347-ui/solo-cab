import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminResetPlatform = () => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    console.log("🚀 Démarrage réinitialisation plateforme...");

    try {
      const { data, error } = await supabase.functions.invoke("reset-platform", {
        method: "POST"
      });

      if (error) {
        console.error("❌ Erreur:", error);
        throw error;
      }

      console.log("✅ Réponse:", data);

      if (data.success) {
        toast.success("Plateforme réinitialisée avec succès", {
          description: `${data.stats?.drivers_deleted || 0} chauffeurs et ${data.stats?.clients_deleted || 0} clients supprimés. Admin préservé.`,
          duration: 10000
        });
        
        // Recharger la page après 2 secondes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (error: any) {
      console.error("💥 Erreur réinitialisation:", error);
      toast.error("Erreur lors de la réinitialisation", {
        description: error.message || "Une erreur est survenue",
        duration: 8000
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zone Dangereuse - Réinitialisation Complète
          </CardTitle>
          <CardDescription>
            Cette action supprimera TOUS les chauffeurs et clients de la plateforme.
            Seul le compte admin sera conservé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-background rounded-lg p-4 space-y-2">
            <p className="font-semibold text-sm">⚠️ Cette action est IRRÉVERSIBLE et supprimera :</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
              <li>Tous les chauffeurs (profils drivers)</li>
              <li>Tous les clients (profils clients)</li>
              <li>Toutes les courses</li>
              <li>Tous les devis et factures</li>
              <li>Tous les messages et conversations</li>
              <li>Toutes les notifications</li>
              <li>Tous les QR codes</li>
              <li>Toutes les promotions et campagnes</li>
              <li>Tous les litiges et feedbacks</li>
            </ul>
            <p className="font-semibold text-sm mt-4 text-primary">✅ Sera conservé :</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
              <li>Compte administrateur uniquement</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Réinitialisation en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Réinitialiser la Plateforme
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Êtes-vous absolument sûr ?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p className="font-semibold">
                    Cette action supprimera DÉFINITIVEMENT tous les chauffeurs et clients.
                  </p>
                  <p>
                    Toutes les données associées (courses, devis, factures, messages) seront également supprimées.
                  </p>
                  <p className="text-destructive font-bold">
                    Cette action est IRRÉVERSIBLE.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isResetting}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  disabled={isResetting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Réinitialisation...
                    </>
                  ) : (
                    "Oui, réinitialiser"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground text-center">
            Cette fonctionnalité est conçue pour repartir à zéro sur la plateforme.
            Utilisez-la avec précaution.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
