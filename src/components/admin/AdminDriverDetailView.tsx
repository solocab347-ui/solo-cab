import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, User, CreditCard, Star, Car, Euro, TrendingUp, Wallet,
  MapPin, Clock, Settings as SettingsIcon, Shield, Building2, Phone, Mail,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  driverId: string;
  onBack: () => void;
}

type CourseRow = {
  id: string;
  course_number?: string | null;
  pickup_address?: string | null;
  destination_address?: string | null;
  final_payment_amount?: number | null;
  payment_method_used?: string | null;
  payment_status?: string | null;
  status: string;
  updated_at: string;
  created_at: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  stripe_payment_intent_id?: string | null;
  client_id?: string | null;
  clients?: any;
};

type BalanceRow = {
  id: string;
  course_id: string | null;
  gross_amount: number | null;
  solocab_fee: number | null;
  stripe_fee: number | null;
  net_amount: number | null;
  payment_type: string | null;
  status: string | null;
  created_at: string;
};

const STATUS_TAB_DEFS = [
  { key: "completed", label: "Terminées" },
  { key: "in_progress", label: "En cours" },
  { key: "scheduled", label: "Planifiées" },
  { key: "pending", label: "En attente" },
  { key: "cancelled", label: "Annulées" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  scheduled: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/30",
};

const AdminDriverDetailView = ({ driverId, onBack }: Props) => {
  const [driver, setDriver] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<CourseRow[]>([]);
  const [balanceRows, setBalanceRows] = useState<BalanceRow[]>([]);
  const [feesLedger, setFeesLedger] = useState<any[]>([]);
  const [sharedSent, setSharedSent] = useState<any[]>([]);
  const [sharedReceived, setSharedReceived] = useState<any[]>([]);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [stripePayouts, setStripePayouts] = useState<any[]>([]);
  const [stripeBalance, setStripeBalance] = useState<any>(null);
  const [stripePIs, setStripePIs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<"week" | "month" | "year" | "all">("month");
  const [statusTab, setStatusTab] = useState<typeof STATUS_TAB_DEFS[number]["key"]>("completed");

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

      const [
        driverRes,
        coursesRes,
        ratingsRes,
        sharedSentRes,
        sharedRecvRes,
        balanceRes,
        feesRes,
        schedulesRes,
        vehiclesRes,
      ] = await Promise.all([
        supabase.from("drivers").select("*, profiles:user_id(first_name, last_name, email, phone, full_name, profile_photo_url)").eq("id", driverId).single(),
        // ⬇️ ALL statuses (not only completed) so admin sees the full reality
        supabase
          .from("courses")
          .select("id, course_number, pickup_address, destination_address, final_payment_amount, payment_method_used, payment_status, status, updated_at, created_at, cancelled_at, cancellation_reason, stripe_payment_intent_id, client_id, clients(profiles:user_id(full_name))")
          .eq("driver_id", driverId)
          .gte("created_at", filterDate)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("course_ratings").select("rating").eq("driver_id", driverId),
        supabase.from("shared_courses").select("id, course_amount, commission_amount, commission_percentage, payment_status, status, completed_at, created_at, receiver_driver_id").eq("sender_driver_id", driverId).gte("created_at", filterDate).order("created_at", { ascending: false }).limit(50),
        supabase.from("shared_courses").select("id, course_amount, commission_amount, commission_percentage, payment_status, status, completed_at, created_at, sender_driver_id").eq("receiver_driver_id", driverId).gte("created_at", filterDate).order("created_at", { ascending: false }).limit(50),
        // ⬇️ Real fees from driver_balance_pending
        supabase
          .from("driver_balance_pending")
          .select("id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, status, created_at")
          .eq("driver_id", driverId)
          .gte("created_at", filterDate)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("driver_fees_ledger")
          .select("*")
          .eq("driver_id", driverId)
          .gte("created_at", filterDate)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("driver_work_schedules").select("*").eq("driver_id", driverId).order("day_of_week"),
        supabase.from("driver_vehicles").select("*").eq("driver_id", driverId),
      ]);

      const driverData = driverRes.data;
      setDriver(driverData);
      setAllCourses((coursesRes.data as any) || []);
      setSharedSent(sharedSentRes.data || []);
      setSharedReceived(sharedRecvRes.data || []);
      setBalanceRows((balanceRes.data as any) || []);
      setFeesLedger(feesRes.data || []);
      setSchedules(schedulesRes.data || []);
      setVehicles(vehiclesRes.data || []);

      // Fetch Stripe data if account exists
      if (driverData?.stripe_connect_account_id) {
        try {
          const [accountRes, payoutsRes, balanceStripeRes, piRes] = await Promise.all([
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "get_account", params: { account_id: driverData.stripe_connect_account_id } },
            }),
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "list_payouts", params: { account_id: driverData.stripe_connect_account_id, limit: 10 } },
            }),
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "get_balance", params: { account_id: driverData.stripe_connect_account_id } },
            }),
            supabase.functions.invoke("admin-stripe-data", {
              body: { action: "list_payment_intents", params: { account_id: driverData.stripe_connect_account_id, limit: 25 } },
            }),
          ]);

          if (accountRes.data && !accountRes.data.error) setStripeAccount(accountRes.data);
          if (payoutsRes.data?.data) setStripePayouts(payoutsRes.data.data);
          if (balanceStripeRes.data && !balanceStripeRes.data.error) setStripeBalance(balanceStripeRes.data);
          if (piRes.data?.data) setStripePIs(piRes.data.data);
        } catch (e) {
          console.error("Stripe data error:", e);
        }
      }

      // ratings
      const ratingsList = ratingsRes.data || [];
      const avgRating = ratingsList.length > 0
        ? ratingsList.reduce((s: number, r: any) => s + Number(r.rating), 0) / ratingsList.length
        : 0;
      setStats((prev) => ({ ...prev, avgRating }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============= REAL fee aggregation =============
  // Gross / fees / net derived from driver_balance_pending (truth source)
  const aggregated = (() => {
    const gross = balanceRows.reduce((s, r) => s + Number(r.gross_amount || 0), 0);
    const solocab = balanceRows.reduce((s, r) => s + Number(r.solocab_fee || 0), 0);
    const stripeF = balanceRows.reduce((s, r) => s + Number(r.stripe_fee || 0), 0);
    const net = balanceRows.reduce((s, r) => s + Number(r.net_amount || 0), 0);
    return { gross, solocab, stripeF, net };
  })();

  // Build a map: course_id -> fees breakdown (for per-row display)
  const feesByCourse = new Map<string, BalanceRow>();
  balanceRows.forEach((r) => { if (r.course_id) feesByCourse.set(r.course_id, r); });

  // Build map: course_id -> Stripe application_fee_amount (in €)
  const piByCourse = new Map<string, { application_fee: number; stripe_fee: number; amount: number }>();
  stripePIs.forEach((pi: any) => {
    const courseId = pi?.metadata?.course_id || pi?.metadata?.solocab_course_id;
    if (!courseId) return;
    piByCourse.set(courseId, {
      application_fee: Number(pi.application_fee_amount || 0) / 100,
      stripe_fee: Number(pi?.charges?.data?.[0]?.balance_transaction?.fee || 0) / 100,
      amount: Number(pi.amount || 0) / 100,
    });
  });

  const [stats, setStats] = useState({ avgRating: 0 });

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  if (!driver) return <div className="p-8 text-center">Chauffeur introuvable</div>;

  const profile = driver.profiles as any;
  const driverName = profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "N/A";

  const counts: Record<string, number> = STATUS_TAB_DEFS.reduce((acc, t) => ({ ...acc, [t.key]: 0 }), {} as any);
  allCourses.forEach((c) => {
    const k = c.status as string;
    if (k in counts) counts[k]++;
  });
  const filteredCourses = allCourses.filter((c) => c.status === statusTab);

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
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{profile?.email}</p>
              {profile?.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</p>}
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant={driver.status === "validated" ? "default" : "secondary"}>{driver.status}</Badge>
                {driver.stripe_connect_charges_enabled ? (
                  <Badge variant="outline" className="border-emerald-400 text-emerald-600">Stripe ✓</Badge>
                ) : (
                  <Badge variant="destructive">Sans Stripe</Badge>
                )}
                {driver.is_pioneer && <Badge className="bg-amber-500">Pionnier</Badge>}
                {driver.is_fleet_driver && <Badge variant="outline">Flotte</Badge>}
                {driver.partnerships_suspended && <Badge variant="destructive">Partenariats suspendus</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <div><span className="text-muted-foreground">Stripe ID:</span> <code className="text-xs">{driver.stripe_connect_account_id || "—"}</code></div>
            <div><span className="text-muted-foreground">Entreprise:</span> {driver.company_name || "—"}</div>
            <div><span className="text-muted-foreground">SIRET:</span> {driver.siret || "—"}</div>
            <div><span className="text-muted-foreground">TVA:</span> {driver.tva_number || "—"}{driver.tva_rate ? ` (${driver.tva_rate}%)` : ""}</div>
            <div><span className="text-muted-foreground">Inscrit:</span> {format(new Date(driver.created_at), "d MMM yyyy", { locale: fr })}</div>
            <div><span className="text-muted-foreground">Véhicule:</span> {driver.vehicle_brand || ""} {driver.vehicle_model || "—"} {driver.vehicle_year ? `(${driver.vehicle_year})` : ""}</div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards — REAL fees from driver_balance_pending */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card><CardContent className="p-3 text-center">
          <Car className="w-4 h-4 mx-auto mb-1 text-blue-500" />
          <p className="text-xl font-bold">{counts.completed || 0}</p>
          <p className="text-[10px] text-muted-foreground">Courses terminées</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Euro className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-xl font-bold">{aggregated.gross.toFixed(2)}€</p>
          <p className="text-[10px] text-muted-foreground">CA brut (réel)</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-violet-500" />
          <p className="text-xl font-bold">{(aggregated.solocab + aggregated.stripeF).toFixed(2)}€</p>
          <p className="text-[10px] text-muted-foreground">
            Frais réels (S:{aggregated.solocab.toFixed(2)} + St:{aggregated.stripeF.toFixed(2)})
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Wallet className="w-4 h-4 mx-auto mb-1 text-green-500" />
          <p className="text-xl font-bold">{aggregated.net.toFixed(2)}€</p>
          <p className="text-[10px] text-muted-foreground">Net chauffeur</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Star className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-xl font-bold">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}</p>
          <p className="text-[10px] text-muted-foreground">Note moyenne</p>
        </CardContent></Card>
      </div>

      {/* === DRIVER PROFILE AUDIT (full visibility for admin) === */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Profil chauffeur — vision complète
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {driver.bio && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Bio</p>
              <p className="text-xs whitespace-pre-wrap">{driver.bio}</p>
            </div>
          )}

          {/* Tarifs */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Tarification</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><span className="text-muted-foreground">Prise en charge:</span> {driver.base_fare ?? "—"}€</div>
              <div><span className="text-muted-foreground">Min:</span> {driver.minimum_price ?? "—"}€</div>
              <div><span className="text-muted-foreground">Tarif km:</span> {driver.per_km_rate ?? "—"}€</div>
              <div><span className="text-muted-foreground">Tarif h:</span> {driver.hourly_rate ?? "—"}€</div>
              <div><span className="text-muted-foreground">Surcharge soir:</span> {driver.evening_surcharge ?? 0}%</div>
              <div><span className="text-muted-foreground">Surcharge week-end:</span> {driver.weekend_surcharge ?? 0}%</div>
              <div><span className="text-muted-foreground">Surcharge aéroport:</span> {driver.airport_surcharge ?? 0}€</div>
              <div><span className="text-muted-foreground">TVA incluse:</span> {driver.tva_included ? "Oui" : "Non"}</div>
            </div>
          </div>

          {/* Secteurs / zones */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Secteurs & zones
            </p>
            <div className="flex flex-wrap gap-1">
              {(driver.working_sectors || []).length > 0 ? (
                (driver.working_sectors as string[]).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Aucun secteur défini</span>
              )}
            </div>
            {(driver.preferred_zones || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground">Zones préférées :</span>
                {(driver.preferred_zones as string[]).map((z) => (
                  <Badge key={z} variant="outline" className="text-[10px]">{z}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Horaires */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Horaires de travail
            </p>
            {schedules.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-1 rounded border border-border/50 px-2 py-1">
                    <span className="font-medium">{s.day_of_week}</span>
                    {s.is_active ? (
                      <span className="text-muted-foreground">{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</span>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">Off</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Pas d'horaires configurés</span>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">
              Acceptation auto partenaires : {driver.auto_accept_from_partners ? "✓" : "✗"} ·
              Réservations futures : {driver.accept_future_bookings ? "✓" : "✗"} ·
              Max courses/jour : {driver.max_daily_courses ?? "—"}
            </div>
          </div>

          {/* Services & équipements */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <SettingsIcon className="w-3 h-3" /> Services & équipements
            </p>
            <div className="flex flex-wrap gap-1">
              {(driver.services_offered || []).map((s: string) => (
                <Badge key={`srv-${s}`} variant="secondary" className="text-[10px]">{s}</Badge>
              ))}
              {(driver.vehicle_equipment || []).map((e: string) => (
                <Badge key={`eq-${e}`} variant="outline" className="text-[10px]">{e}</Badge>
              ))}
              {((driver.services_offered || []).length + (driver.vehicle_equipment || []).length === 0) && (
                <span className="text-xs text-muted-foreground italic">Aucun service/équipement déclaré</span>
              )}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Catégorie véhicule : {driver.vehicle_category || "—"} · Sièges : {driver.vehicle_seats ?? driver.max_passengers ?? "—"} · Couleur : {driver.vehicle_color || "—"} · Plaque : {driver.vehicle_plate || "—"}
            </div>
          </div>

          {/* Visibilité & paiements */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Visibilité & paiements
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px]">
              <div>Profil public : {driver.public_profile_enabled ? "✓" : "✗"}</div>
              <div>Vu par flottes : {driver.visible_to_fleet_managers ? "✓" : "✗"}</div>
              <div>Vu par entreprises : {driver.visible_to_companies ? "✓" : "✗"}</div>
              <div>Vu par chauffeurs : {driver.visible_to_drivers ? "✓" : "✗"}</div>
              <div>Téléphone affiché : {driver.show_phone ? "✓" : "✗"}</div>
              <div>Email affiché : {driver.show_email ? "✓" : "✗"}</div>
              <div>Note publique : {driver.show_rating_public ? "✓" : "✗"}</div>
              <div>Partage dispo : {driver.sharing_available ? "✓" : "✗"}</div>
              <div>Méthodes paiement : {(driver.accepted_payment_methods || []).join(", ") || "—"}</div>
            </div>
          </div>

          {/* Véhicules supplémentaires */}
          {vehicles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Véhicules ({vehicles.length})</p>
              <div className="flex flex-wrap gap-2">
                {vehicles.map((v) => (
                  <div key={v.id} className="text-[11px] border border-border/50 rounded px-2 py-1">
                    {v.brand} {v.model} {v.year ? `(${v.year})` : ""} · {v.plate || "—"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Course History — ALL statuses with tabs */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Historique courses (total {allCourses.length})
            </CardTitle>
            <div className="flex gap-1">
              {(["week", "month", "year", "all"] as const).map((f) => (
                <Button key={f} variant={courseFilter === f ? "default" : "ghost"} size="sm" className="text-xs h-7 px-2" onClick={() => setCourseFilter(f)}>
                  {f === "week" ? "7j" : f === "month" ? "30j" : f === "year" ? "1an" : "Tout"}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {STATUS_TAB_DEFS.map((t) => (
              <Button
                key={t.key}
                variant={statusTab === t.key ? "default" : "outline"}
                size="sm"
                className="text-[11px] h-7"
                onClick={() => setStatusTab(t.key)}
              >
                {t.label}
                <span className="ml-1 px-1 rounded bg-background/30">{counts[t.key] || 0}</span>
              </Button>
            ))}
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
                <TableHead className="text-right">Frais SoloCab</TableHead>
                <TableHead className="text-right">Frais Stripe</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-4">Aucune course pour ce statut</TableCell></TableRow>
              ) : filteredCourses.map((c) => {
                const balance = feesByCourse.get(c.id);
                const piData = piByCourse.get(c.id);

                // Truth source priority: driver_balance_pending → Stripe PI → estimation
                const gross = balance?.gross_amount != null
                  ? Number(balance.gross_amount)
                  : (piData?.amount ?? Number(c.final_payment_amount || 0));
                const solocabFee = balance?.solocab_fee != null
                  ? Number(balance.solocab_fee)
                  : (piData?.application_fee ?? 0);
                const stripeFee = balance?.stripe_fee != null
                  ? Number(balance.stripe_fee)
                  : (piData?.stripe_fee ?? 0);
                const net = balance?.net_amount != null
                  ? Number(balance.net_amount)
                  : Math.max(0, gross - solocabFee - stripeFee);

                const source = balance ? "DB" : piData ? "Stripe" : "—";
                const clientName = (c.clients as any)?.profiles?.full_name || (c as any).guest_name || "—";

                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">
                      {format(new Date(c.updated_at || c.created_at), "dd/MM HH:mm")}
                      {c.cancelled_at && (
                        <div className="text-[9px] text-red-600">Annulée: {format(new Date(c.cancelled_at), "dd/MM HH:mm")}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">{clientName}</TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate" title={`${c.pickup_address} → ${c.destination_address}`}>
                      {c.pickup_address?.split(",")[0]} → {c.destination_address?.split(",")[0]}
                    </TableCell>
                    <TableCell className="text-right text-sm">{gross > 0 ? `${gross.toFixed(2)}€` : "—"}</TableCell>
                    <TableCell className="text-right text-xs text-violet-600">{solocabFee > 0 ? `${solocabFee.toFixed(2)}€` : "—"}</TableCell>
                    <TableCell className="text-right text-xs text-blue-600">{stripeFee > 0 ? `${stripeFee.toFixed(2)}€` : "—"}</TableCell>
                    <TableCell className="text-right text-sm font-bold text-emerald-600">{net > 0 ? `${net.toFixed(2)}€` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.payment_method_used || c.payment_status || "—"}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[c.status] || ""}`}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px]" title={source === "DB" ? "Issu de driver_balance_pending" : source === "Stripe" ? "Issu de application_fee_amount Stripe" : "Pas de données financières"}>
                        {source}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fees ledger (audit trail) */}
      {feesLedger.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Journal des frais SoloCab ({feesLedger.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Course</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feesLedger.slice(0, 50).map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{format(new Date(f.created_at), "dd/MM HH:mm")}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{f.fee_type}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-medium">{Number(f.amount_cents || 0) / 100}€</TableCell>
                    <TableCell><Badge variant={f.status === "paid" ? "default" : "secondary"} className="text-[10px]">{f.status}</Badge></TableCell>
                    <TableCell className="text-[10px] font-mono max-w-[100px] truncate">{f.course_id || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Courses partagées — cohérence chauffeur ↔ admin */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Courses partagées
            <Badge variant="outline" className="ml-2 text-[10px]">Émises : {sharedSent.length}</Badge>
            <Badge variant="outline" className="text-[10px]">Reçues : {sharedReceived.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { title: "En tant qu'émetteur (commission perçue)", rows: sharedSent, isSender: true },
            { title: "En tant que receveur (revenus nets)", rows: sharedReceived, isSender: false },
          ].map((block) => (
            <div key={block.title}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{block.title}</p>
              {block.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucune entrée sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-right text-xs">Montant TTC</TableHead>
                      <TableHead className="text-right text-xs">{block.isSender ? "Commission %" : "Net receveur"}</TableHead>
                      <TableHead className="text-xs">Paiement</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.rows.map((s: any) => {
                      const amount = Number(s.course_amount || 0);
                      const commission = Number(s.commission_amount || 0);
                      const net = block.isSender ? commission : Math.max(0, amount - commission);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{format(new Date(s.created_at), "dd/MM HH:mm")}</TableCell>
                          <TableCell className="text-right text-sm">{amount.toFixed(2)}€</TableCell>
                          <TableCell className="text-right text-sm font-bold text-emerald-600">
                            {block.isSender ? `${commission.toFixed(2)}€ (${s.commission_percentage}%)` : `${net.toFixed(2)}€`}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{s.payment_status || "—"}</Badge></TableCell>
                          <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDriverDetailView;
