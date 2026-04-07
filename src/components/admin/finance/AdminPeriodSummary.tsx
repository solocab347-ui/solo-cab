import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Car, Users, TrendingUp, Share2, Zap } from "lucide-react";

interface Props {
  stats: {
    courses_period: number;
    ca_period: number;
    fees_period: number;
    net_drivers_period: number;
    courses_cancelled_period: number;
    courses_shared_period: number;
    spontaneous_period: number;
    drivers_active_period: number;
    period_start: string;
    period_end: string;
  };
  preset: string;
}

const presetLabels: Record<string, string> = {
  week: "cette semaine",
  month: "ce mois",
  year: "cette année",
  custom: "la période sélectionnée",
};

const AdminPeriodSummary = ({ stats, preset }: Props) => {
  const label = presetLabels[preset] || "la période";

  const items = [
    { label: "Courses", value: stats.courses_period, icon: Car, color: "text-blue-600" },
    { label: "CA brut", value: `${Number(stats.ca_period).toFixed(2)}€`, icon: Euro, color: "text-emerald-600" },
    { label: "Frais SoloCab", value: `${Number(stats.fees_period).toFixed(2)}€`, icon: TrendingUp, color: "text-violet-600" },
    { label: "Net chauffeurs", value: `${Number(stats.net_drivers_period).toFixed(2)}€`, icon: Euro, color: "text-blue-600" },
    { label: "Annulées", value: stats.courses_cancelled_period, icon: Car, color: "text-red-600" },
    { label: "Partagées", value: stats.courses_shared_period, icon: Share2, color: "text-purple-600" },
    { label: "Spontanés", value: stats.spontaneous_period, icon: Zap, color: "text-cyan-600" },
    { label: "Chauffeurs actifs", value: stats.drivers_active_period, icon: Users, color: "text-emerald-600" },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          📅 Résumé pour {label}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          {new Date(stats.period_start).toLocaleDateString("fr-FR")} → {new Date(stats.period_end).toLocaleDateString("fr-FR")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                <div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPeriodSummary;
