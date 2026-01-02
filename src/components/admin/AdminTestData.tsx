import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database } from "lucide-react";
import { AdminSimulationTest } from "./AdminSimulationTest";

export const AdminTestData = () => {
  const [loading, setLoading] = useState(false);

  const createAlexandreTestData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-alexandre-test-data');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Données créées avec succès !`, {
          description: `${data.stats.clients} clients, ${data.stats.courses} courses, ${data.stats.devis} devis, ${data.stats.factures} factures`
        });
      } else {
        throw new Error(data?.error || 'Erreur lors de la création des données');
      }
    } catch (error: any) {
      console.error('Error creating test data:', error);
      toast.error("Erreur lors de la création des données de test", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation de test entremêlée */}
      <AdminSimulationTest />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Données de Test Alexandre Diarra
          </CardTitle>
          <CardDescription>
            Créer des données de test complètes pour Alexandre Diarra (compte démo)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Cette fonction va créer :</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>30 clients exclusifs pour Alexandre</li>
              <li>10 courses classiques par client (300 total) en décembre 2024</li>
              <li>3 courses en mise à disposition par client (90 total)</li>
              <li>Devis automatiques pour chaque course</li>
              <li>Factures pour les courses terminées</li>
              <li>Statuts variés : terminées, en attente, confirmées, annulées</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important :</strong> Alexandre est marqué comme compte démo (is_demo_account=true). 
              Toutes ces données sont EXCLUES des statistiques admin et ne comptent pas dans les revenus.
            </p>
          </div>

          <Button 
            onClick={createAlexandreTestData} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Créer les données de test
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
