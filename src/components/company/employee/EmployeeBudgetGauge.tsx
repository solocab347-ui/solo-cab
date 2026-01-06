import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Euro, 
  AlertTriangle, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeBudgetGaugeProps {
  currentSpent: number;
  maxBudget: number | null;
  className?: string;
}

export function EmployeeBudgetGauge({ currentSpent, maxBudget, className }: EmployeeBudgetGaugeProps) {
  // Si pas de budget défini, afficher un mode simple
  if (!maxBudget || maxBudget <= 0) {
    return (
      <Card className={cn("relative overflow-hidden border-0 bg-gradient-to-br from-muted/30 via-muted/20 to-transparent shadow-lg", className)}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Dépenses ce mois</p>
              <p className="text-3xl font-bold mt-2">
                {currentSpent.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Pas de budget défini
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Euro className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentage = Math.min((currentSpent / maxBudget) * 100, 100);
  const remaining = Math.max(maxBudget - currentSpent, 0);
  const isOverBudget = currentSpent >= maxBudget;
  const isNearLimit = percentage >= 80 && percentage < 100;
  const isHealthy = percentage < 80;

  // Determine color scheme based on budget status
  const getStatusConfig = () => {
    if (isOverBudget) {
      return {
        gradient: "from-destructive/20 via-destructive/10 to-transparent",
        progressColor: "bg-destructive",
        iconBg: "bg-destructive/20",
        iconColor: "text-destructive",
        textGradient: "from-destructive to-red-400",
        glowColor: "bg-destructive/20",
        Icon: AlertTriangle,
        label: "Budget dépassé !",
        labelColor: "bg-destructive/20 text-destructive border-destructive/30",
      };
    }
    if (isNearLimit) {
      return {
        gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
        progressColor: "bg-amber-500",
        iconBg: "bg-amber-500/20",
        iconColor: "text-amber-500",
        textGradient: "from-amber-500 to-orange-400",
        glowColor: "bg-amber-500/20",
        Icon: AlertCircle,
        label: `${(100 - percentage).toFixed(0)}% restant`,
        labelColor: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
      };
    }
    return {
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      progressColor: "bg-emerald-500",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-500",
      textGradient: "from-emerald-500 to-green-400",
      glowColor: "bg-emerald-500/20",
      Icon: CheckCircle2,
      label: "Dans le budget",
      labelColor: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.Icon;

  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all",
      `bg-gradient-to-br ${config.gradient}`,
      isOverBudget && "animate-pulse ring-2 ring-destructive/50",
      className
    )}>
      {/* Glow Effect */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2",
        config.glowColor
      )} />
      
      <CardContent className="pt-6 relative">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-muted-foreground font-medium">Budget mensuel</p>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.labelColor)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <p className={cn(
                "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                config.textGradient
              )}>
                {currentSpent.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                sur {maxBudget.toFixed(2)}€ de budget
              </p>
            </div>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", config.iconBg)}>
              <Euro className={cn("w-6 h-6", config.iconColor)} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                  config.progressColor,
                  isOverBudget && "animate-pulse"
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute inset-y-0 left-[80%] w-0.5 bg-amber-500/50" />
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>{percentage.toFixed(0)}% utilisé</span>
              </div>
              <div className={cn(
                "font-medium",
                isOverBudget ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-emerald-500"
              )}>
                {isOverBudget ? (
                  <span>Dépassement: {(currentSpent - maxBudget).toFixed(2)}€</span>
                ) : (
                  <span>Reste: {remaining.toFixed(2)}€</span>
                )}
              </div>
            </div>
          </div>

          {/* Warning message for near/over budget */}
          {(isNearLimit || isOverBudget) && (
            <div className={cn(
              "p-3 rounded-xl text-xs flex items-start gap-2",
              isOverBudget 
                ? "bg-destructive/10 border border-destructive/20" 
                : "bg-amber-500/10 border border-amber-500/20"
            )}>
              <StatusIcon className={cn("w-4 h-4 shrink-0 mt-0.5", config.iconColor)} />
              <p className={isOverBudget ? "text-destructive" : "text-amber-600 dark:text-amber-400"}>
                {isOverBudget 
                  ? "Vous avez dépassé votre budget mensuel. Contactez votre administrateur si nécessaire."
                  : "Attention, vous approchez de votre limite de budget mensuel."
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
