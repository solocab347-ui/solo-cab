import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Database, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";
import {
  healthCheck,
  runFullMigration,
  synchronizeClientDriverAssociations,
  cleanupOrphanCourses,
  generateMissingQRCodes,
} from "@/lib/dataMigration";

export const AdminDataIntegrity = () => {
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const handleHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await healthCheck();
      setHealthStatus(result);
      
      if (result.healthy) {
        toast.success("Base de données saine !");
      } else {
        toast.warning(`${result.issues.length} problème(s) détecté(s)`);
      }
    } catch (error) {
      console.error("Health check error:", error);
      toast.error("Erreur lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleFullMigration = async () => {
    if (!confirm("Lancer la migration complète ? Cette opération peut prendre plusieurs minutes.")) {
      return;
    }

    setLoading(true);
    setMigrationResult(null);

    try {
      const result = await runFullMigration();
      setMigrationResult(result);

      if (result.success) {
        toast.success("Migration terminée avec succès !");
      } else {
        toast.warning("Migration terminée avec des erreurs");
      }

      // Re-run health check
      await handleHealthCheck();
    } catch (error) {
      console.error("Migration error:", error);
      toast.error("Erreur lors de la migration");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncClients = async () => {
    setLoading(true);
    try {
      const result = await synchronizeClientDriverAssociations();
      
      toast.success(
        `Synchronisation terminée: ${result.recordsFixed}/${result.recordsProcessed} clients corrigés`
      );

      if (result.errors.length > 0) {
        console.error("Sync errors:", result.errors);
      }

      await handleHealthCheck();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOrphans = async () => {
    setLoading(true);
    try {
      const result = await cleanupOrphanCourses();
      
      toast.success(
        `Nettoyage terminé: ${result.recordsFixed} courses orphelines corrigées`
      );

      await handleHealthCheck();
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error("Erreur lors du nettoyage");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCodes = async () => {
    setLoading(true);
    try {
      const result = await generateMissingQRCodes();
      
      toast.success(
        `QR codes générés: ${result.recordsFixed} codes créés`
      );

      await handleHealthCheck();
    } catch (error) {
      console.error("QR generation error:", error);
      toast.error("Erreur lors de la génération des QR codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Intégrité des Données</h2>
        <p className="text-muted-foreground">
          Vérification et maintenance de la base de données
        </p>
      </div>

      {/* Health Check Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            État de Santé
          </CardTitle>
          <CardDescription>
            Vérification de l'intégrité et des statistiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleHealthCheck}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Lancer Vérification
          </Button>

          {healthStatus && (
            <div className="space-y-4 mt-4">
              <Alert variant={healthStatus.healthy ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {healthStatus.healthy ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <AlertTitle>
                    {healthStatus.healthy ? "Base de données saine" : "Problèmes détectés"}
                  </AlertTitle>
                </div>
                {healthStatus.issues.length > 0 && (
                  <AlertDescription className="mt-2">
                    <ul className="list-disc list-inside space-y-1">
                      {healthStatus.issues.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                )}
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{healthStatus.stats.totalDrivers}</div>
                    <div className="text-sm text-muted-foreground">Chauffeurs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{healthStatus.stats.totalClients}</div>
                    <div className="text-sm text-muted-foreground">Clients</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{healthStatus.stats.totalCourses}</div>
                    <div className="text-sm text-muted-foreground">Courses</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-warning">
                      {healthStatus.stats.driversWithoutQR}
                    </div>
                    <div className="text-sm text-muted-foreground">Sans QR code</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-destructive">
                      {healthStatus.stats.inconsistentClients}
                    </div>
                    <div className="text-sm text-muted-foreground">Clients incohérents</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions de Maintenance</CardTitle>
          <CardDescription>Opérations individuelles de réparation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleSyncClients}
            disabled={loading}
            variant="outline"
            className="w-full justify-start"
          >
            Synchroniser associations clients-drivers
          </Button>

          <Button
            onClick={handleCleanupOrphans}
            disabled={loading}
            variant="outline"
            className="w-full justify-start"
          >
            Nettoyer courses orphelines
          </Button>

          <Button
            onClick={handleGenerateQRCodes}
            disabled={loading}
            variant="outline"
            className="w-full justify-start"
          >
            Générer QR codes manquants
          </Button>
        </CardContent>
      </Card>

      {/* Full Migration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Migration Complète</CardTitle>
          <CardDescription>
            Exécute toutes les opérations de maintenance en une fois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleFullMigration}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            Lancer Migration Complète
          </Button>

          {migrationResult && (
            <div className="mt-4 space-y-3">
              <Alert variant={migrationResult.success ? "default" : "destructive"}>
                <AlertTitle>
                  {migrationResult.success ? "Migration réussie" : "Migration avec erreurs"}
                </AlertTitle>
              </Alert>

              {Object.entries(migrationResult.results).map(([key, result]: [string, any]) => (
                <Card key={key}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{key}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Succès" : "Erreurs"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.recordsFixed}/{result.recordsProcessed} enregistrements corrigés
                    </div>
                    {result.errors.length > 0 && (
                      <div className="mt-2 text-xs text-destructive">
                        {result.errors.length} erreur(s)
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
