import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SimulationResult {
  success: boolean;
  summary?: {
    totalCoursesRequested: number;
    coursesCreated: number;
    devisCreated: number;
    facturesCreated: number;
    errorsCount: number;
    integrityCheck: {
      passed: boolean;
      issues: string[];
    };
    numberRanges: Record<string, { first: string; last: string; count: number }>;
  };
  errors?: string[];
  sampleNumbers?: Record<string, string[]>;
  error?: string;
}

export const AdminSimulationTest = () => {
  const [loading, setLoading] = useState(false);
  const [totalCourses, setTotalCourses] = useState(100);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setResult(null);

    try {
      toast.info(`🚀 Démarrage de la simulation avec ${totalCourses} courses entremêlées...`);

      const { data, error } = await supabase.functions.invoke("test-interleaved-courses", {
        body: { totalCourses }
      });

      if (error) throw error;

      setResult(data);

      if (data.success && data.summary?.integrityCheck?.passed) {
        toast.success(`✅ Simulation réussie! ${data.summary.coursesCreated} courses créées sans collision.`);
      } else if (data.success && !data.summary?.integrityCheck?.passed) {
        toast.error(`⚠️ Simulation terminée avec des problèmes d'intégrité!`);
      } else {
        toast.error(`❌ Échec de la simulation: ${data.error}`);
      }
    } catch (error: any) {
      console.error("Erreur simulation:", error);
      toast.error(`Erreur: ${error.message}`);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Test de Simulation - Numérotation Entremêlée
        </CardTitle>
        <CardDescription>
          Crée des courses en alternant entre 2 chauffeurs pour vérifier l'isolation des numéros RES-XXX
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalCourses">Nombre de courses à créer</Label>
            <Input
              id="totalCourses"
              type="number"
              min={10}
              max={10000}
              value={totalCourses}
              onChange={(e) => setTotalCourses(parseInt(e.target.value) || 100)}
              className="w-32"
              disabled={loading}
            />
          </div>
          <Button
            onClick={runSimulation}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulation en cours...
              </>
            ) : (
              "Lancer la simulation"
            )}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Cette simulation crée {totalCourses} courses ({Math.floor(totalCourses / 2)} par chauffeur) 
          en alternant: Course 1 → Alexandre, Course 2 → Abdallah, Course 3 → Alexandre, etc.
        </p>

        {result && (
          <div className="mt-6 space-y-4">
            {/* Statut global */}
            <div className={`p-4 rounded-lg ${
              result.success && result.summary?.integrityCheck?.passed 
                ? "bg-green-100 border border-green-300" 
                : "bg-red-100 border border-red-300"
            }`}>
              <div className="flex items-center gap-2">
                {result.success && result.summary?.integrityCheck?.passed ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <span className="font-semibold text-lg">
                  {result.success && result.summary?.integrityCheck?.passed 
                    ? "✅ Système de numérotation VALIDE" 
                    : "❌ Problèmes détectés"}
                </span>
              </div>
            </div>

            {/* Statistiques */}
            {result.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-primary">{result.summary.coursesCreated}</div>
                  <div className="text-sm text-muted-foreground">Courses créées</div>
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.devisCreated}</div>
                  <div className="text-sm text-muted-foreground">Devis créés</div>
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">{result.summary.facturesCreated}</div>
                  <div className="text-sm text-muted-foreground">Factures créées</div>
                </div>
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-red-600">{result.summary.errorsCount}</div>
                  <div className="text-sm text-muted-foreground">Erreurs</div>
                </div>
              </div>
            )}

            {/* Plages de numéros par chauffeur */}
            {result.summary?.numberRanges && (
              <div className="space-y-2">
                <h4 className="font-semibold">Plages de numéros par chauffeur:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(result.summary.numberRanges).map(([driver, range]) => (
                    <div key={driver} className="p-3 bg-background rounded-lg border">
                      <div className="font-medium">{driver}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{range.first}</Badge>
                        <span>→</span>
                        <Badge variant="outline">{range.last}</Badge>
                        <span className="text-sm text-muted-foreground">({range.count} courses)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Échantillon de numéros */}
            {result.sampleNumbers && (
              <div className="space-y-2">
                <h4 className="font-semibold">Échantillon des premiers numéros:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(result.sampleNumbers).map(([driver, numbers]) => (
                    <div key={driver} className="p-3 bg-background rounded-lg border">
                      <div className="font-medium mb-2">{driver}</div>
                      <div className="flex flex-wrap gap-1">
                        {numbers.map((num, idx) => (
                          <Badge key={idx} variant="secondary" className="font-mono text-xs">
                            {num}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Problèmes d'intégrité */}
            {result.summary?.integrityCheck?.issues?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Problèmes d'intégrité:</h4>
                <ScrollArea className="h-40 border rounded-lg p-3 bg-red-50">
                  {result.summary.integrityCheck.issues.map((issue, idx) => (
                    <div key={idx} className="text-sm text-red-700 py-1">
                      • {issue}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* Erreurs */}
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-600">Erreurs rencontrées ({result.errors.length}):</h4>
                <ScrollArea className="h-40 border rounded-lg p-3 bg-orange-50">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-orange-700 py-1">
                      • {error}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
