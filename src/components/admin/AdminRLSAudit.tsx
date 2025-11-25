import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, AlertTriangle, CheckCircle, Info, Play } from "lucide-react";
import {
  auditRLSSecurity,
  generateAuditReport,
  securityValidationChecklist,
} from "@/lib/rlsSecurityAuditor";

export const AdminRLSAudit = () => {
  const [auditResult, setAuditResult] = useState<any>(null);

  const handleRunAudit = () => {
    const issues = auditRLSSecurity();
    const report = generateAuditReport(issues);
    setAuditResult(report);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "medium":
        return <Info className="w-5 h-5 text-primary" />;
      case "low":
        return <CheckCircle className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Audit de Sécurité RLS</h2>
        <p className="text-muted-foreground">
          Analyse automatisée des Row Level Security policies
        </p>
      </div>

      {/* Validation Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Points de Sécurité Validés
          </CardTitle>
          <CardDescription>Architecture de sécurité implémentée</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(securityValidationChecklist).map(([key, check]: [string, any]) => (
            <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold mb-1">{check.description}</div>
                <div className="text-sm text-muted-foreground">{check.implementation}</div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Validé
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Run Audit */}
      <Card>
        <CardHeader>
          <CardTitle>Lancer Audit Complet</CardTitle>
          <CardDescription>
            Analyse détaillée de toutes les RLS policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunAudit} className="w-full">
            <Play className="w-4 h-4 mr-2" />
            Démarrer Audit
          </Button>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {auditResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé de l'Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className={auditResult.summary.critical > 0 ? "border-destructive" : ""}>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-destructive">
                      {auditResult.summary.critical}
                    </div>
                    <div className="text-sm text-muted-foreground">Critiques</div>
                  </CardContent>
                </Card>
                <Card className={auditResult.summary.high > 0 ? "border-destructive/50" : ""}>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-destructive">
                      {auditResult.summary.high}
                    </div>
                    <div className="text-sm text-muted-foreground">Élevées</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-primary">
                      {auditResult.summary.medium}
                    </div>
                    <div className="text-sm text-muted-foreground">Moyennes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {auditResult.summary.low}
                    </div>
                    <div className="text-sm text-muted-foreground">Faibles</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{auditResult.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
              </div>

              {auditResult.criticalIssues.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>Attention Critique</AlertTitle>
                  <AlertDescription>
                    {auditResult.criticalIssues.length} problème(s) critique(s) détecté(s) nécessitant une
                    attention immédiate
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Issues by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Détails par Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(auditResult.byCategory).map(
                  ([category, issues]: [string, any]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <span className="font-semibold capitalize">
                            {category.replace(/_/g, " ")}
                          </span>
                          <Badge variant="outline">{issues.length} issue(s)</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {issues.map((issue: any, idx: number) => (
                            <Card key={idx}>
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-3">
                                  {getSeverityIcon(issue.severity)}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant={getSeverityColor(issue.severity) as any}>
                                        {issue.severity}
                                      </Badge>
                                      <span className="font-semibold">{issue.table}</span>
                                      {issue.policy && (
                                        <span className="text-xs text-muted-foreground">
                                          / {issue.policy}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm mb-2">{issue.issue}</div>
                                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                      💡 {issue.recommendation}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                )}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
