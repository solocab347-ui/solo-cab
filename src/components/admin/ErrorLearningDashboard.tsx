/**
 * Dashboard d'apprentissage des erreurs pour les admins
 * Affiche les métriques, alertes et permet de configurer l'auto-correction
 */

import { useState } from "react";
import { useErrorLearning } from "@/hooks/useErrorLearning";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Zap,
  TrendingUp,
  Shield,
  Clock,
  BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ErrorLearningDashboard() {
  const { 
    metrics, 
    alerts, 
    stats, 
    isLoading, 
    resolveAlert, 
    toggleAutoFix,
    runLearningCycle,
    refresh 
  } = useErrorLearning();

  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const handleRunCycle = async () => {
    setIsRunningCycle(true);
    try {
      await runLearningCycle();
    } finally {
      setIsRunningCycle(false);
    }
  };

  const handleResolveAlert = () => {
    if (selectedAlertId && resolutionNotes) {
      resolveAlert({ alertId: selectedAlertId, notes: resolutionNotes });
      setResolveDialogOpen(false);
      setSelectedAlertId(null);
      setResolutionNotes("");
    }
  };

  const openResolveDialog = (alertId: string) => {
    setSelectedAlertId(alertId);
    setResolveDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Apprentissage Intelligent des Erreurs
          </h2>
          <p className="text-muted-foreground">
            Système d'auto-correction et d'apprentissage automatique
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button 
            size="sm" 
            onClick={handleRunCycle}
            disabled={isRunningCycle}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isRunningCycle ? "Analyse en cours..." : "Lancer un cycle"}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Patterns détectés</p>
                <p className="text-2xl font-bold">{stats.totalPatterns}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-fix actifs</p>
                <p className="text-2xl font-bold">{stats.autoFixEnabled}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confiance moyenne</p>
                <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
            <Progress value={stats.avgConfidence * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className={stats.criticalAlerts > 0 ? "border-destructive" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertes actives</p>
                <p className="text-2xl font-bold">
                  {stats.unresolvedAlerts}
                  {stats.criticalAlerts > 0 && (
                    <span className="text-destructive ml-2 text-sm">
                      ({stats.criticalAlerts} critiques)
                    </span>
                  )}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 opacity-50 ${stats.criticalAlerts > 0 ? "text-destructive" : "text-yellow-500"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">
            <Shield className="h-4 w-4 mr-2" />
            Patterns ({metrics.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alertes ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Patterns d'erreurs</CardTitle>
              <CardDescription>
                Erreurs détectées avec leur niveau de confiance d'apprentissage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {metrics.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun pattern détecté pour le moment
                    </p>
                  ) : (
                    metrics.map((pattern) => (
                      <div 
                        key={pattern.pattern_id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pattern.pattern_name}</span>
                            <Badge variant={
                              pattern.severity === "critical" ? "destructive" :
                              pattern.severity === "high" ? "destructive" :
                              pattern.severity === "medium" ? "secondary" :
                              "outline"
                            }>
                              {pattern.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{pattern.occurrences_count} occurrences</span>
                            <span>•</span>
                            <span>{pattern.successful_fixes} corrections réussies</span>
                            <span>•</span>
                            <span>Confiance: {(pattern.learning_confidence * 100).toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={pattern.learning_confidence * 100} 
                            className="mt-2 h-1 w-48"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Auto-fix</span>
                            <Switch
                              checked={pattern.auto_fix_enabled}
                              onCheckedChange={(checked) => 
                                toggleAutoFix({ patternId: pattern.pattern_id, enabled: checked })
                              }
                            />
                          </div>
                          {pattern.auto_fix_enabled && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertes actives</CardTitle>
              <CardDescription>
                Erreurs nécessitant une attention ou une action manuelle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">Aucune alerte active</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          alert.alert_type === "critical" ? "border-destructive bg-destructive/5" : "bg-card"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {alert.alert_type === "critical" ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            )}
                            <span className="font-medium">{alert.title}</span>
                            <Badge variant={alert.alert_type === "critical" ? "destructive" : "secondary"}>
                              {alert.alert_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{alert.occurrences_count} occurrence(s)</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openResolveDialog(alert.id)}
                        >
                          Résoudre
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre l'alerte</DialogTitle>
            <DialogDescription>
              Décrivez comment vous avez résolu ce problème pour enrichir l'apprentissage
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Décrivez la solution appliquée..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleResolveAlert} disabled={!resolutionNotes.trim()}>
              Marquer comme résolu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ErrorLearningDashboard;
