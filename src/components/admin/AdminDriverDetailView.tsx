import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, CreditCard, Star, Car, Euro, TrendingUp, Calendar, ExternalLink, Wallet } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  driverId: string;
  onBack: () => void;
}

const AdminDriverDetailView = ({ driverId, onBack }: Props) => {
  const [driver, setDriver] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [sharedSent, setSharedSent] = useState<any[]>([]);
  const [sharedReceived, setSharedReceived] = useState<any[]>([]);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [stripePayouts, setStripePayouts] = useState<any[]>([]);
  const [stripeBalance, setStripeBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<"week" | "month" | "year" | "all">("month");
  const [stats, setStats] = useState({ totalCourses: 0, grossTotal: 0, feesTotal: 0, netTotal: 0, avgRating: 0 });

  useEffect(() => {
    fetchAll();
  }, [driverId, courseFilter]);

  const getFilterDate = () => {
    const now = new Date();
    switch (courseFilter) {
      case "week": { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString(); }
      case "month": { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString(); }
      case "year": { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString(); }
      case "all": return "2020-01-01T00:00:00Z";
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const filterDate = getFilterDate();
      
      const [driverRes, coursesRes, ratingsRes] = await Promise.all([
        supabase.from("drivers").select("*, profiles:user_id(first_name, last_name, email, phone, full_name, profile_photo_url)").eq("id", driverId).single(),
        supabase.from("courses").select("id, course_number, pickup_address, destination_address, final_payment_amount, payment_method_used, payment_status, status, updated_at, created_at, stripe_payment_intent_id, client_id, clients(profiles:user_id(full_name))").eq("driver_id", driverId).eq("status", "completed").gte("updated_at", filterDate).order("updated_at", { ascending: false }).limit(100),
        supabase.from("course_ratings").select("rating").eq("driver_id", driverId),
      ]);

      const driverData = driverRes.data;
      setDriver(driverData);
      setCourses(coursesRes.data || []);

      // Calculate stats
      const coursesList = coursesRes.data || [];
      const ratingsList = ratingsRes.data || [];
      const grossTotal = coursesList.reduce((s: number, c: any) => s + Number(c.final_payment_amount || 0), 0);
      const avgRating = ratingsList.length > 0 
        ? ratingsList.reduce((s: number, r: any) => s + Number(r.rating), 0) / ratingsList.length 
        : 0;

      // Estimate fees (0.50€ per course)
      const feesTotal = coursesList.length * 0.50;
      const stripeFees = grossTotal * 0.015 + coursesList.length * 0.25;

      setStats({
        totalCourses: coursesList.length,
        grossTotal,
        feesTotal: feesTotal + stripeFees,
        netTotal: grossTotal - feesTotal - stripeFees,
        avgRating,
      });

      // Fetch Stripe data if account exists
      if (driverData?.stripe_connect_account_id) {
        try {
          const [accountRes, payoutsRes, balanceRes] = await Promise.all([
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "get_account", params: { account_id: driverData.stripe_connect_account_id } },
            }),
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "list_payouts", params: { account_id: driverData.stripe_connect_account_id, limit: 10 } },
            }),
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "get_balance", params: { account_id: driverData.stripe_connect_account_id } },
            }),
          ]);
          
          if (accountRes.data && !accountRes.data.error) setStripeAccount(accountRes.data);
          if (payoutsRes.data?.data) setStripePayouts(payoutsRes.data.data);
          if (balanceRes.data && !balanceRes.data.error) setStripeBalance(balanceRes.data);
        } catch (e) {
          console.error("Stripe data error:", e);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  if (!driver) return <div className="p-8 text-center">Chauffeur introuvable</div>;

  const profile = driver.profiles as any;
  const driverName = profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "N/A";

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>

      {/* Driver Profile Card */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {profile?.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={driverName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{driverName}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              {profile?.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant={driver.status === "validated" ? "default" : "secondary"}>{driver.status}</Badge>
                {driver.stripe_connect_charges_enabled ? (
                  <Badge variant="outline" className="border-emerald-400 text-emerald-600">Stripe ✓</Badge>
                ) : (
                  <Badge variant="destructive">Sans Stripe</Badge>
                )}
                {driver.is_pioneer && <Badge className="bg-amber-500">Pionnier</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <div><span className="text-muted-foreground">Stripe ID:</span> <code className="text-xs">{driver.stripe_connect_account_id || "—"}</code></div>
            <div><span className="text-muted-foreground">Entreprise:</span> {driver.company_name || "—"}</div>
            <div><span className="text-muted-foreground">Inscrit:</span> {format(new Date(driver.created_at), "d MMM yyyy", { locale: fr })}</div>
            <div><span className="text-muted-foreground">Véhicule:</span> {driver.vehicle_model || "—"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card><CardContent className="p-3 text-center">
          <Car className="w-4 h-4 mx-auto mb-1 text-blue-500" />
          <p className="text-xl font-bold">{stats.totalCourses}</p>
          <p className="text-[10px] text-muted-foreground">Courses</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Euro className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-xl font-bold">{stats.grossTotal.toFixed(0)}€</p>
          <p className="text-[10px] text-muted-foreground">CA brut</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-violet-500" />
          <p className="text-xl font-bold">{stats.feesTotal.toFixed(2)}€</p>
          <p className="text-[10px] text-muted-foreground">Frais totaux</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Wallet className="w-4 h-4 mx-auto mb-1 text-green-500" />
          <p className="text-xl font-bold">{stats.netTotal.toFixed(0)}€</p>
          <p className="text-[10px] text-muted-foreground">Net chauffeur</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Star className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-xl font-bold">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}</p>
          <p className="text-[10px] text-muted-foreground">Note moyenne</p>
        </CardContent></Card>
      </div>

      {/* Stripe Account Info */}
      {stripeAccount && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Compte Stripe Connect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Charges:</span> {stripeAccount.charges_enabled ? "✅" : "❌"}</div>
              <div><span className="text-muted-foreground">Payouts:</span> {stripeAccount.payouts_enabled ? "✅" : "❌"}</div>
              <div><span className="text-muted-foreground">Email:</span> {stripeAccount.email || "—"}</div>
              <div>
                <span className="text-muted-foreground">Payout schedule:</span>{" "}
                {stripeAccount.settings?.payouts?.schedule?.interval || "—"} / {stripeAccount.settings?.payouts?.schedule?.weekly_anchor || "—"}
              </div>
            </div>
            {stripeBalance && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
                  <p className="text-lg font-bold">{((stripeBalance.available?.[0]?.amount || 0) / 100).toFixed(2)}€</p>
                  <p className="text-[10px] text-muted-foreground">Disponible</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-center">
                  <p className="text-lg font-bold">{((stripeBalance.pending?.[0]?.amount || 0) / 100).toFixed(2)}€</p>
                  <p className="text-[10px] text-muted-foreground">En attente</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stripe Payouts */}
      {stripePayouts.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Virements Stripe récents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Payout ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripePayouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{format(new Date(p.arrival_date * 1000), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell className="text-right font-bold">{(p.amount / 100).toFixed(2)}€</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : "outline"} className="text-[10px]">
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono">{p.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Course History */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Historique courses ({courses.length})
            </CardTitle>
            <div className="flex gap-1">
              {(["week", "month", "year", "all"] as const).map((f) => (
                <Button key={f} variant={courseFilter === f ? "default" : "ghost"} size="sm" className="text-xs h-7 px-2" onClick={() => setCourseFilter(f)}>
                  {f === "week" ? "7j" : f === "month" ? "30j" : f === "year" ? "1an" : "Tout"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Trajet</TableHead>
                <TableHead className="text-right">Brut</TableHead>
                <TableHead className="text-right">Frais</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>PI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aucune course</TableCell></TableRow>
              ) : courses.map((c) => {
                const gross = Number(c.final_payment_amount || 0);
                const stripeFee = gross * 0.015 + 0.25;
                const solocabFee = 0.50;
                const net = gross - stripeFee - solocabFee;
                const clientName = (c.clients as any)?.profiles?.full_name || "—";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{format(new Date(c.updated_at), "dd/MM HH:mm")}</TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">{clientName}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={`${c.pickup_address} → ${c.destination_address}`}>
                      {c.pickup_address?.split(",")[0]} → {c.destination_address?.split(",")[0]}
                    </TableCell>
                    <TableCell className="text-right text-sm">{gross.toFixed(2)}€</TableCell>
                    <TableCell className="text-right text-sm text-violet-600">{(stripeFee + solocabFee).toFixed(2)}€</TableCell>
                    <TableCell className="text-right text-sm font-bold text-emerald-600">{net.toFixed(2)}€</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.payment_method_used || "—"}</Badge></TableCell>
                    <TableCell className="text-[10px] font-mono max-w-[80px] truncate">{c.stripe_payment_intent_id || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDriverDetailView;
