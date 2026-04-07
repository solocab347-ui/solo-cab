import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, CreditCard, FileText } from "lucide-react";

interface Props {
  driverId: string;
  onBack: () => void;
}

const AdminDriverFinanceDetail = ({ driverId, onBack }: Props) => {
  const [driver, setDriver] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [pendingTotal, setPendingTotal] = useState({ gross: 0, fees: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [driverId]);

  const fetchAll = async () => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const ws = weekStart.toISOString();

      const [driverRes, coursesRes, feesRes, settlementsRes, pendingRes] = await Promise.all([
        supabase.from("drivers").select("*, profiles:user_id(first_name, last_name, email)").eq("id", driverId).single(),
        supabase.from("courses").select("*").eq("driver_id", driverId).eq("status", "completed").gte("updated_at", ws).order("updated_at", { ascending: false }).limit(50),
        supabase.from("solo_admin_ledger").select("*").eq("driver_id", driverId).gte("created_at", ws).order("created_at", { ascending: false }),
        supabase.from("driver_weekly_balances").select("*, weekly_settlements(week_start, week_end)").eq("driver_id", driverId).order("created_at", { ascending: false }).limit(10),
        supabase.from("driver_balance_pending").select("gross_amount, solocab_fee, net_amount").eq("driver_id", driverId).eq("status", "pending"),
      ]);

      setDriver(driverRes.data);
      setCourses(coursesRes.data || []);
      setFees(feesRes.data || []);
      setSettlements(settlementsRes.data || []);

      const p = (pendingRes.data || []).reduce(
        (acc: any, r: any) => ({
          gross: acc.gross + Number(r.gross_amount || 0),
          fees: acc.fees + Number(r.solocab_fee || 0),
          net: acc.net + Number(r.net_amount || 0),
        }),
        { gross: 0, fees: 0, net: 0 }
      );
      setPendingTotal(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  if (!driver) return <div className="p-8 text-center">Chauffeur introuvable</div>;

  const profile = driver.profiles as any;
  const driverName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "N/A";

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>

      {/* Driver info */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {driverName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Email :</span> {profile?.email || "N/A"}</div>
            <div><span className="text-muted-foreground">Stripe ID :</span> <code className="text-xs">{driver.stripe_connect_account_id || "—"}</code></div>
            <div>
              <span className="text-muted-foreground">Stripe actif :</span>{" "}
              {driver.stripe_connect_charges_enabled ? (
                <Badge variant="outline" className="border-emerald-400 text-emerald-600 text-[10px]">Oui</Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px]">Non</Badge>
              )}
            </div>
            <div><span className="text-muted-foreground">Entreprise :</span> {driver.company_name || "—"}</div>
          </div>

          {/* Pending summary */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-center">
              <p className="text-lg font-bold">{pendingTotal.gross.toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">Brut en attente</p>
            </div>
            <div className="p-2 rounded-lg bg-violet-500/10 text-center">
              <p className="text-lg font-bold">{pendingTotal.fees.toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">Frais SoloCab</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
              <p className="text-lg font-bold">{pendingTotal.net.toFixed(2)}€</p>
              <p className="text-[10px] text-muted-foreground">Net à virer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses this week */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Courses semaine</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucune course</TableCell></TableRow>
              ) : courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-mono">{c.course_number || c.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{new Date(c.updated_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right font-medium">{Number(c.final_payment_amount || 0).toFixed(2)}€</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{c.payment_method_used || c.payment_method || "—"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{c.payment_status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fees */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Frais SoloCab semaine</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Frais</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun frais</TableCell></TableRow>
              ) : fees.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-xs">{new Date(f.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right font-medium text-violet-600">{Number(f.fee_amount).toFixed(2)}€</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{f.fee_type}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlements history */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Historique virements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semaine</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Stripe ID</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun virement</TableCell></TableRow>
              ) : settlements.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">
                    {s.weekly_settlements?.week_start ? new Date(s.weekly_settlements.week_start).toLocaleDateString("fr-FR") : "—"}
                    {" → "}
                    {s.weekly_settlements?.week_end ? new Date(s.weekly_settlements.week_end).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold">{Number(s.net_amount || 0).toFixed(2)}€</TableCell>
                  <TableCell className="text-xs font-mono">{s.stripe_transfer_id || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={s.transfer_status === "completed" ? "default" : s.transfer_status === "failed" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {s.transfer_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDriverFinanceDetail;
