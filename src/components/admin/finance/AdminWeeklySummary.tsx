import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Car, Users, TrendingUp, Calendar } from "lucide-react";

interface Props {
  stats: {
    courses_week: number;
    ca_week: number;
    fees_week: number;
    net_drivers_week: number;
    pending_settlement: number;
    drivers_to_pay: number;
    ca_month: number;
    fees_month: number;
  };
}

const AdminWeeklySummary = ({ stats }: Props) => {
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));

  const items = [
    { label: "Courses semaine", value: stats.courses_week, icon: Car },
    { label: "CA brut semaine", value: `${Number(stats.ca_week).toFixed(2)}€`, icon: Euro },
    { label: "Frais SoloCab semaine", value: `${Number(stats.fees_week).toFixed(2)}€`, icon: TrendingUp },
    { label: "Net chauffeurs semaine", value: `${Number(stats.net_drivers_week).toFixed(2)}€`, icon: Euro },
    { label: "Virements lundi", value: `${Number(stats.pending_settlement).toFixed(2)}€`, icon: Euro },
    { label: "Chauffeurs à payer", value: stats.drivers_to_pay, icon: Users },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Vue hebdomadaire
          <span className="text-xs text-muted-foreground ml-auto">
            Prochain virement : {nextMonday.toLocaleDateString("fr-FR")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 p-2 rounded-lg bg-violet-500/10 flex justify-between items-center">
          <span className="text-sm font-medium">CA mensuel</span>
          <span className="font-bold text-violet-600">{Number(stats.ca_month).toFixed(2)}€</span>
        </div>
        <div className="mt-1 p-2 rounded-lg bg-emerald-500/10 flex justify-between items-center">
          <span className="text-sm font-medium">Frais SoloCab mensuel</span>
          <span className="font-bold text-emerald-600">{Number(stats.fees_month).toFixed(2)}€</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminWeeklySummary;
