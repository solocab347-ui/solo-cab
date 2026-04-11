import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Users } from "lucide-react";
import AdminDriverFinanceDetail from "./AdminDriverFinanceDetail";

interface DriverFinance {
  driver_id: string;
  driver_name: string;
  company_name: string | null;
  stripe_account_id: string | null;
  stripe_active: boolean;
  courses_count: number;
  gross_total: number;
  solocab_fees: number;
  net_total: number;
  payment_status: string;
  pending_balance: number;
}

interface Props {
  periodStart: string;
  periodEnd: string;
}

const AdminDriversFinanceTable = ({ periodStart, periodEnd }: Props) => {
  const [drivers, setDrivers] = useState<DriverFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, [periodStart, periodEnd]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_drivers_finance", {
        p_week_start: periodStart,
        p_period_end: periodEnd,
      });
      if (error) throw error;
      setDrivers((data as any[]) || []);
    } catch (err) {
      console.error("Error fetching drivers finance:", err);
    } finally {
      setLoading(false);
    }
  };

  if (selectedDriver) {
    const AdminDriverDetailView = require("../AdminDriverDetailView").default;
    return (
      <AdminDriverDetailView
        driverId={selectedDriver}
        onBack={() => setSelectedDriver(null)}
      />
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Finances par chauffeur
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          {new Date(periodStart).toLocaleDateString("fr-FR")} → {new Date(periodEnd).toLocaleDateString("fr-FR")}
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : drivers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucune donnée</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead className="text-right">CA brut</TableHead>
                <TableHead className="text-right">Frais</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.filter(d => Number(d.courses_count) > 0 || Number(d.pending_balance) > 0).map((d) => (
                <TableRow key={d.driver_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{d.driver_name}</p>
                      {d.company_name && (
                        <p className="text-xs text-muted-foreground">{d.company_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{d.courses_count}</TableCell>
                  <TableCell className="text-right">{Number(d.gross_total).toFixed(2)}€</TableCell>
                  <TableCell className="text-right text-violet-600">{Number(d.solocab_fees).toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-bold">{Number(d.net_total).toFixed(2)}€</TableCell>
                  <TableCell>
                    {d.payment_status === "no_stripe" ? (
                      <Badge variant="destructive" className="text-[10px]">Sans Stripe</Badge>
                    ) : d.payment_status === "none" ? (
                      <Badge variant="secondary" className="text-[10px]">—</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">En attente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setSelectedDriver(d.driver_id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDriversFinanceTable;
