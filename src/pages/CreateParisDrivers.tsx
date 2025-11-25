import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreateParisDrivers() {
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCleanup = async () => {
    setCleanupLoading(true);
    setResult(null);

    try {
      console.log("🧹 Nettoyage des chauffeurs de test...");
      
      const { data, error } = await supabase.functions.invoke('cleanup-test-paris-drivers', {
        body: {}
      });

      if (error) {
        console.error("❌ Erreur:", error);
        toast.error(`Erreur de nettoyage: ${error.message}`);
        return;
      }

      console.log("✅ Nettoyage terminé:", data);
      
      if (data.success) {
        toast.success(`${data.deleted} comptes de test supprimés !`);
      } else {
        toast.error("Erreur lors du nettoyage");
      }
    } catch (error: any) {
      console.error("❌ Erreur:", error);
      toast.error(error.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCreateDrivers = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("🚀 Appel de la fonction create-paris-drivers...");
      
      const { data, error } = await supabase.functions.invoke('create-paris-drivers', {
        body: {}
      });

      if (error) {
        console.error("❌ Erreur:", error);
        toast.error(`Erreur: ${error.message}`);
        return;
      }

      console.log("✅ Résultat:", data);
      setResult(data);
      
      if (data.success) {
        toast.success(`${data.created} chauffeurs créés avec succès !`);
      } else {
        toast.error("Erreur lors de la création des chauffeurs");
      }
    } catch (error: any) {
      console.error("❌ Erreur:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Créer 20 Chauffeurs Parisiens</h1>
        <p className="text-muted-foreground mb-8">
          Cette fonction va créer 20 profils de chauffeurs parisiens complets avec photos professionnelles,
          tous les paramètres configurés et profils publics activés.
        </p>

        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            📋 Processus en 2 étapes
          </h3>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-decimal list-inside">
            <li>D'abord, allez sur <a href="/upload-driver-photos" className="underline font-semibold">/upload-driver-photos</a> pour uploader les 20 photos dans le storage</li>
            <li>Ensuite, revenez ici et cliquez sur le bouton ci-dessous pour créer les chauffeurs</li>
          </ol>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleCleanup} 
            disabled={cleanupLoading || loading}
            size="lg"
            variant="destructive"
            className="w-full"
          >
            {cleanupLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Nettoyage en cours...
              </>
            ) : (
              '🧹 Nettoyer les comptes de test existants'
            )}
          </Button>

          <Button 
            onClick={handleCreateDrivers} 
            disabled={loading || cleanupLoading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer les 20 chauffeurs'
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                ✅ Résultat
              </h3>
              <p className="text-green-700 dark:text-green-400">
                {result.message}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                {result.created} chauffeurs créés avec succès
              </p>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                  ❌ Erreurs ({result.errors.length})
                </h3>
                <div className="space-y-2">
                  {result.errors.map((err: any, idx: number) => (
                    <div key={idx} className="text-sm text-red-700 dark:text-red-400">
                      <strong>{err.email}:</strong> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                📋 Informations
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Tous les chauffeurs sont basés à Paris</li>
                <li>• Profils publics activés pour apparaître dans la vitrine</li>
                <li>• Photos professionnelles générées par IA</li>
                <li>• Paramètres complets (tarifs, véhicules, secteurs)</li>
                <li>• QR codes générés automatiquement</li>
                <li>• Statut: validé (accès immédiat)</li>
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
