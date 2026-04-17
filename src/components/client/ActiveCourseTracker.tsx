import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin, Clock, CheckCircle, XCircle, Car,
  Navigation, ArrowLeft, Loader2, CreditCard, X, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { RideChatPanel } from "@/components/chat/RideChatPanel";
import { useETACalculation } from "@/hooks/useETACalculation";
import { ETADisplay } from "@/components/tracking/ETADisplay";
import { LiveJourneyProgress } from "@/components/tracking/LiveJourneyProgress";
import { BookingCardStep } from "@/components/client/booking/BookingCardStep";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type CoursePhase = "pending" | "accepted" | "driver_approaching" | "driver_arrived" | "in_progress" | "completed" | "cancelled" | "refused";

interface CourseData {
  id: string;
  status: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string | null;
  guest_estimated_price: number | null;
  final_payment_amount: number | null;
  payment_method: string | null;
  driver_id: string;
  client_id: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  stripe_payment_method_id: string | null;
  card_hold_status: string | null;
  distance_km: number | null;
}

interface DriverInfo {
  id: string;
  company_name: string | null;
  profile_photo_url: string | null;
  contact_phone: string | null;
  show_phone: boolean;
  full_name: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
}

const PHASE_ORDER: CoursePhase[] = ["pending", "accepted", "driver_approaching", "driver_arrived", "in_progress", "completed"];

const PHASE_CONFIG: Record<string, { label: string; description: string }> = {
  pending: { label: "En attente", description: "Recherche d'un chauffeur..." },
  accepted: { label: "Course acceptée", description: "Le chauffeur a accepté votre course" },
  driver_approaching: { label: "En approche", description: "Le chauffeur se dirige vers vous" },
  driver_arrived: { label: "Chauffeur arrivé", description: "Le chauffeur est au point de prise en charge" },
  in_progress: { label: "En cours", description: "Vous êtes en route vers votre destination" },
  completed: { label: "Terminée", description: "Votre course est terminée" },
};

const MAPBOX_TOKEN = "pk.eyJ1Ijoic29sb2NhYiIsImEiOiJjbTdtOGdqaWEwNHh3MmpwcjZmeWFoYWkxIn0.u2lNBfdgcxvxrYGgAO2aeg";

function getPrivacySafeName(fullName: string | null, companyName: string | null): string {
  if (companyName) return companyName;
  if (!fullName) return "Chauffeur";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

// ── Live Map (lightweight, scoped to in-dashboard usage) ──
function LiveMap({
  driverLat, driverLng, driverPhoto, driverName,
  pickupLat, pickupLng, destLat, destLng, status,
}: {
  driverLat: number | null; driverLng: number | null;
  driverPhoto: string | null; driverName: string;
  pickupLat: number | null; pickupLng: number | null;
  destLat: number | null; destLng: number | null;
  status: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] = driverLng && driverLat
      ? [driverLng, driverLat]
      : pickupLng && pickupLat ? [pickupLng, pickupLat] : [2.3522, 48.8566];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center, zoom: 13, attributionControl: false,
    });

    if (pickupLat && pickupLng) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🧑</div>`;
      new mapboxgl.Marker({ element: el }).setLngLat([pickupLng, pickupLat]).addTo(map.current);
    }

    if (destLat && destLng) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#ef4444;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🏁</div>`;
      new mapboxgl.Marker({ element: el }).setLngLat([destLng, destLat]).addTo(map.current);
    }

    const driverEl = document.createElement("div");
    if (driverPhoto) {
      driverEl.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;border:3px solid hsl(var(--primary));overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.4);"><img src="${driverPhoto}" style="width:100%;height:100%;object-fit:cover;" /></div>`;
    } else {
      driverEl.innerHTML = `<div style="background:hsl(var(--primary));color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🚗</div>`;
    }
    driverMarker.current = new mapboxgl.Marker({ element: driverEl })
      .setLngLat(driverLng && driverLat ? [driverLng, driverLat] : center)
      .addTo(map.current);

    const bounds = new mapboxgl.LngLatBounds();
    if (pickupLat && pickupLng) bounds.extend([pickupLng, pickupLat]);
    if (destLat && destLng) bounds.extend([destLng, destLat]);
    if (driverLat && driverLng) bounds.extend([driverLng, driverLat]);
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });

    return () => { map.current?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!driverLat || !driverLng || !driverMarker.current) return;
    driverMarker.current.setLngLat([driverLng, driverLat]);
    if ((status === "driver_approaching" || status === "in_progress") && map.current) {
      map.current.easeTo({ center: [driverLng, driverLat], duration: 1000 });
    }
  }, [driverLat, driverLng, status]);

  return <div ref={mapContainer} className="w-full h-56 rounded-xl overflow-hidden border border-border" />;
}

interface ActiveCourseTrackerProps {
  courseId: string;
  open: boolean;
  onClose: () => void;
}

export function ActiveCourseTracker({ courseId, open, onClose }: ActiveCourseTrackerProps) {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; phone: string } | null>(null);

  const isApproaching = course?.status === "driver_approaching";
  const isInProgress = course?.status === "in_progress";
  const etaEnabled = (isApproaching || isInProgress) && !!driver?.current_latitude && !!driver?.current_longitude;

  const etaTarget = isApproaching
    ? (course?.pickup_latitude && course?.pickup_longitude ? { lat: course.pickup_latitude, lng: course.pickup_longitude } : null)
    : (course?.destination_latitude && course?.destination_longitude ? { lat: course.destination_latitude, lng: course.destination_longitude } : null);

  const { eta, loading: etaLoading, forceRefresh: refreshETA } = useETACalculation({
    driverLocation: driver?.current_latitude && driver?.current_longitude
      ? { lat: driver.current_latitude, lng: driver.current_longitude } : null,
    targetLocation: etaTarget,
    enabled: etaEnabled,
  });

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from("courses")
      .select("id, status, pickup_address, destination_address, scheduled_date, guest_estimated_price, final_payment_amount, payment_method, driver_id, client_id, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude, stripe_payment_method_id, card_hold_status, distance_km")
      .eq("id", courseId)
      .single();

    if (error || !data) {
      console.error("Error fetching course:", error);
      setLoading(false);
      return;
    }
    setCourse(data as CourseData);

    const { data: driverData } = await supabase
      .from("drivers")
      .select("id, company_name, contact_phone, show_phone, current_latitude, current_longitude, profiles!drivers_user_id_fkey(full_name, phone, profile_photo_url)")
      .eq("id", data.driver_id)
      .single();

    if (driverData) {
      const profile = (driverData as any).profiles;
      setDriver({
        id: driverData.id,
        company_name: driverData.company_name,
        profile_photo_url: profile?.profile_photo_url || null,
        contact_phone: driverData.show_phone ? (driverData.contact_phone || profile?.phone) : null,
        show_phone: driverData.show_phone ?? false,
        full_name: profile?.full_name || null,
        current_latitude: driverData.current_latitude,
        current_longitude: driverData.current_longitude,
      });
    }

    const { data: rr } = await supabase
      .from("ride_requests")
      .select("id")
      .eq("final_course_id", data.id)
      .limit(1);
    if (rr?.[0]) setRideRequestId(rr[0].id);

    setLoading(false);
  }, [courseId]);

  useEffect(() => { if (open) fetchCourse(); }, [open, fetchCourse]);

  // Fetch user profile for card form
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        setUserInfo({
          name: profile.full_name || "",
          email: profile.email || user.email || "",
          phone: profile.phone || "",
        });
      }
    })();
  }, [open]);

  // Realtime course updates
  useEffect(() => {
    if (!courseId || !open) return;
    const cleanup = subscriptionManager.subscribe(
      `client-tracker-${courseId}`,
      { table: "courses", event: "UPDATE", filter: `id=eq.${courseId}` },
      (payload) => {
        const updated = payload.new as any;
        setCourse(prev => prev ? { ...prev, ...updated } : null);
        if (updated.status === "driver_arrived") toast.info("🚗 Votre chauffeur est arrivé !");
        else if (updated.status === "in_progress") toast.info("🛣️ Course en cours, bon trajet !");
        else if (updated.status === "completed") toast.success("✅ Course terminée !");
      }
    );
    return cleanup;
  }, [courseId, open]);

  // Realtime driver GPS updates
  useEffect(() => {
    if (!driver?.id || !open) return;
    const cleanup = subscriptionManager.subscribe(
      `driver-gps-tracker-${driver.id}`,
      { table: "drivers", event: "UPDATE", filter: `id=eq.${driver.id}`, debounceMs: 2000 },
      (payload) => {
        const updated = payload.new as any;
        if (updated.current_latitude && updated.current_longitude) {
          setDriver(prev => prev ? {
            ...prev,
            current_latitude: updated.current_latitude,
            current_longitude: updated.current_longitude,
          } : null);
        }
      }
    );
    return cleanup;
  }, [driver?.id, open]);

  // Card recording prompt: payment is card AND no card held yet AND course is still pending/accepted
  const needsCard = course?.payment_method === "card" &&
    !course?.stripe_payment_method_id &&
    !course?.card_hold_status &&
    ["pending", "accepted"].includes(course?.status || "");

  useEffect(() => {
    if (needsCard) setShowCardForm(true);
  }, [needsCard]);

  const driverName = getPrivacySafeName(driver?.full_name ?? null, driver?.company_name ?? null);
  const price = course?.final_payment_amount || course?.guest_estimated_price;
  const currentPhaseIndex = course ? PHASE_ORDER.indexOf(course.status as CoursePhase) : -1;
  const isCancelled = course?.status === "cancelled" || course?.status === "refused";
  const isCompleted = course?.status === "completed";
  const isActive = !isCancelled && !isCompleted;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="h-[100vh] max-h-[100vh] w-full p-0 rounded-none overflow-y-auto"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : !course ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
            <XCircle className="w-16 h-16 text-muted-foreground" />
            <h2 className="text-xl font-bold">Course introuvable</h2>
            <Button onClick={onClose} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />Fermer
            </Button>
          </div>
        ) : (
          <div className="flex flex-col min-h-full">
            {/* Sticky header */}
            <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 flex-shrink-0">
                  <X className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-base font-bold truncate">Suivi de votre course</h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {PHASE_CONFIG[course.status]?.label || course.status}
                  </p>
                </div>
              </div>
              {price && (
                <Badge variant="outline" className="font-bold text-sm shrink-0">
                  {price.toFixed(2)}€
                </Badge>
              )}
            </header>

            <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full">
              {/* ─── Status banner ─── */}
              <Card className={isCompleted ? "bg-success/10 border-success/30" : isCancelled ? "bg-destructive/10 border-destructive/30" : "bg-primary/5 border-primary/30"}>
                <CardContent className="p-4 flex items-center gap-3">
                  {isCompleted ? <CheckCircle className="h-8 w-8 text-success shrink-0" />
                    : isCancelled ? <XCircle className="h-8 w-8 text-destructive shrink-0" />
                    : <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                        <Navigation className="h-8 w-8 text-primary shrink-0" />
                      </motion.div>}
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{PHASE_CONFIG[course.status]?.label || course.status}</p>
                    <p className="text-xs text-muted-foreground">{PHASE_CONFIG[course.status]?.description || ""}</p>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Card recording (if needed) ─── */}
              {showCardForm && needsCard && userInfo && (
                <Card className="border-warning/30 bg-warning/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="h-6 w-6 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Enregistrez votre carte bancaire</p>
                        <p className="text-xs text-muted-foreground">
                          Pour finaliser votre réservation par carte, ajoutez votre moyen de paiement.
                          Aucun prélèvement immédiat.
                        </p>
                      </div>
                    </div>
                    <BookingCardStep
                      isAuthenticated={true}
                      guestName={userInfo.name}
                      guestEmail={userInfo.email}
                      guestPhone={userInfo.phone}
                      estimatedPrice={price || undefined}
                      onCardReady={async ({ paymentMethodId }) => {
                        if (paymentMethodId && course) {
                          await supabase.from("courses")
                            .update({ payment_method_id_held: paymentMethodId } as any)
                            .eq("id", course.id);
                        }
                        toast.success("Carte enregistrée — votre course est sécurisée !");
                        setShowCardForm(false);
                        fetchCourse();
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* ─── Live map ─── */}
              {isActive && (
                <LiveMap
                  driverLat={driver?.current_latitude || null}
                  driverLng={driver?.current_longitude || null}
                  driverPhoto={driver?.profile_photo_url || null}
                  driverName={driverName}
                  pickupLat={course.pickup_latitude}
                  pickupLng={course.pickup_longitude}
                  destLat={course.destination_latitude}
                  destLng={course.destination_longitude}
                  status={course.status}
                />
              )}

              {/* ─── NEW: Visual journey progress ─── */}
              {etaEnabled && (
                <LiveJourneyProgress
                  phase={isApproaching ? "approaching" : "in_progress"}
                  eta={eta}
                  totalDistanceKm={course.distance_km}
                  driverPhotoUrl={driver?.profile_photo_url}
                  driverName={driverName}
                  fromLabel={isApproaching ? "Position chauffeur" : course.pickup_address?.split(",")[0]}
                  toLabel={(isApproaching ? course.pickup_address : course.destination_address)?.split(",")[0]}
                />
              )}

              {/* ─── ETA (refresh + timestamp) ─── */}
              {etaEnabled && (
                <ETADisplay
                  eta={eta}
                  loading={etaLoading}
                  onRefresh={refreshETA}
                  phase={isApproaching ? "approaching" : "in_progress"}
                  totalDistanceKm={course.distance_km}
                  pickupAddress={course.pickup_address}
                  destinationAddress={course.destination_address}
                />
              )}

              {/* ─── Driver info ─── */}
              {driver && (
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={driver.profile_photo_url || ""} />
                      <AvatarFallback>{driverName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{driverName}</p>
                      <p className="text-xs text-muted-foreground">Votre chauffeur</p>
                    </div>
                    {rideRequestId && isActive && course.client_id && (
                      <RideChatPanel
                        rideId={rideRequestId}
                        senderType="client"
                        senderId={course.client_id}
                        otherName={driverName}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ─── Trajet ─── */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-success mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Départ</p>
                      <p className="text-sm font-medium">{course.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-destructive mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Arrivée</p>
                      <p className="text-sm font-medium">{course.destination_address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ─── Phase timeline ─── */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Progression</p>
                  <div className="space-y-2">
                    {PHASE_ORDER.filter(p => p !== "pending" || course.status === "pending").map((phase, idx) => {
                      const cfg = PHASE_CONFIG[phase];
                      const idxRef = PHASE_ORDER.filter(p => p !== "pending" || course.status === "pending");
                      const isCurrent = phase === course.status;
                      const isDone = idxRef.indexOf(phase) < idxRef.indexOf(course.status as CoursePhase);
                      return (
                        <div key={phase} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone ? "bg-success text-success-foreground"
                              : isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {isDone ? "✓" : idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${isCurrent ? "font-bold text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                              {cfg.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
