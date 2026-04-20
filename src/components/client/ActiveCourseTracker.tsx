import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedUser } from "@/lib/cachedAuth";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin, Clock, CheckCircle, XCircle, Car,
  Navigation, ArrowLeft, Loader2, CreditCard, X, ShieldCheck,
  Star, Heart, Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { RideChatPanel } from "@/components/chat/RideChatPanel";
import { useETACalculation } from "@/hooks/useETACalculation";
import { ETADisplay } from "@/components/tracking/ETADisplay";
import { LiveJourneyProgress } from "@/components/tracking/LiveJourneyProgress";
import { BookingCardStep } from "@/components/client/booking/BookingCardStep";
import { useMapboxToken } from "@/hooks/useMapboxToken";
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
  rating: number | null;
  total_rides: number | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
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

function getPrivacySafeName(fullName: string | null, companyName: string | null): string {
  if (companyName) return companyName;
  if (!fullName) return "Chauffeur";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

// ── Realistic top-down car SVG (rotates with bearing) ──
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="44" height="88">
  <defs>
    <linearGradient id="bodyGrad" x1="0" x2="1">
      <stop offset="0" stop-color="#1f2937"/>
      <stop offset="0.5" stop-color="#111827"/>
      <stop offset="1" stop-color="#1f2937"/>
    </linearGradient>
    <linearGradient id="glassGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#60a5fa" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#1e3a8a" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="carShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#carShadow)">
    <!-- body -->
    <rect x="8" y="6" width="48" height="116" rx="16" fill="url(#bodyGrad)" stroke="#0b1220" stroke-width="1"/>
    <!-- hood lines -->
    <rect x="14" y="14" width="36" height="2" rx="1" fill="#0b1220" opacity="0.6"/>
    <!-- windshield (front) -->
    <path d="M14 24 Q32 18 50 24 L48 42 Q32 38 16 42 Z" fill="url(#glassGrad)"/>
    <!-- roof -->
    <rect x="14" y="44" width="36" height="34" rx="6" fill="#0b1220" opacity="0.55"/>
    <!-- rear window -->
    <path d="M16 80 Q32 84 48 80 L50 98 Q32 104 14 98 Z" fill="url(#glassGrad)" opacity="0.85"/>
    <!-- side mirrors -->
    <rect x="3" y="38" width="6" height="6" rx="2" fill="#1f2937"/>
    <rect x="55" y="38" width="6" height="6" rx="2" fill="#1f2937"/>
    <!-- headlights (front = top of svg) -->
    <rect x="13" y="7" width="9" height="4" rx="2" fill="#fef3c7"/>
    <rect x="42" y="7" width="9" height="4" rx="2" fill="#fef3c7"/>
    <!-- tail lights (rear = bottom) -->
    <rect x="13" y="117" width="9" height="3" rx="1.5" fill="#dc2626"/>
    <rect x="42" y="117" width="9" height="3" rx="1.5" fill="#dc2626"/>
  </g>
</svg>`;

function buildDriverMarkerEl(): { el: HTMLDivElement; carEl: HTMLDivElement } {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;width:48px;height:96px;display:flex;align-items:center;justify-content:center;";
  // pulse ring
  const pulse = document.createElement("div");
  pulse.style.cssText = "position:absolute;width:60px;height:60px;border-radius:50%;background:hsl(217 91% 60% / 0.25);animation:pulseRing 2s ease-out infinite;";
  wrap.appendChild(pulse);
  // car (rotates)
  const car = document.createElement("div");
  car.style.cssText = "position:relative;width:44px;height:88px;transform-origin:center center;transition:transform 800ms ease-out;";
  car.innerHTML = CAR_SVG;
  wrap.appendChild(car);
  // inject keyframes once
  if (!document.getElementById("__driver-pulse-kf")) {
    const style = document.createElement("style");
    style.id = "__driver-pulse-kf";
    style.textContent = `@keyframes pulseRing { 0% { transform:scale(0.6); opacity:0.7; } 100% { transform:scale(1.6); opacity:0; } }`;
    document.head.appendChild(style);
  }
  return { el: wrap, carEl: car };
}

function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── Live Map (with route tracing + realistic car marker) ──
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
  const driverCarEl = useRef<HTMLDivElement | null>(null);
  const lastDriverPos = useRef<{ lat: number; lng: number } | null>(null);
  const currentBearing = useRef<number>(0);
  const lastRouteFetch = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const { token: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();

  // Determine route target based on phase
  const routeTarget = (status === "driver_approaching")
    ? (pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null)
    : (status === "in_progress" || status === "driver_arrived")
      ? (destLat && destLng ? { lat: destLat, lng: destLng } : null)
      : null;

  // Fetch + draw route line
  const refreshRoute = useCallback(async () => {
    if (!map.current || !mapboxToken || !driverLat || !driverLng || !routeTarget) return;
    const key = `${driverLat.toFixed(4)},${driverLng.toFixed(4)}->${routeTarget.lat.toFixed(4)},${routeTarget.lng.toFixed(4)}`;
    const now = Date.now();
    // Throttle: refetch only if key changed AND >8s since last fetch
    if (key === lastRouteFetch.current.key && now - lastRouteFetch.current.at < 8000) return;
    lastRouteFetch.current = { key, at: now };
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLng},${driverLat};${routeTarget.lng},${routeTarget.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const geom = data.routes?.[0]?.geometry;
      if (!geom || !map.current) return;
      const src = map.current.getSource("route") as mapboxgl.GeoJSONSource | undefined;
      const feature = { type: "Feature" as const, geometry: geom, properties: {} };
      if (src) {
        src.setData(feature as any);
      } else {
        map.current.addSource("route", { type: "geojson", data: feature as any });
        map.current.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#1e40af", "line-width": 8, "line-opacity": 0.55 },
        });
        map.current.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#3b82f6", "line-width": 4 },
        });
      }
    } catch (e) {
      console.warn("[LiveMap] route fetch error:", e);
    }
  }, [mapboxToken, driverLat, driverLng, routeTarget?.lat, routeTarget?.lng]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;

    const center: [number, number] = driverLng && driverLat
      ? [driverLng, driverLat]
      : pickupLng && pickupLat ? [pickupLng, pickupLat] : [2.3522, 48.8566];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center, zoom: 14, attributionControl: false,
    });

    map.current.on("load", () => {
      refreshRoute();
    });

    if (pickupLat && pickupLng) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);font-size:16px;font-weight:bold;">A</div>`;
      new mapboxgl.Marker({ element: el }).setLngLat([pickupLng, pickupLat]).addTo(map.current);
    }

    if (destLat && destLng) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#ef4444;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);font-size:16px;font-weight:bold;">B</div>`;
      new mapboxgl.Marker({ element: el }).setLngLat([destLng, destLat]).addTo(map.current);
    }

    const { el: driverEl, carEl } = buildDriverMarkerEl();
    driverCarEl.current = carEl;
    driverMarker.current = new mapboxgl.Marker({ element: driverEl, anchor: "center" })
      .setLngLat(driverLng && driverLat ? [driverLng, driverLat] : center)
      .addTo(map.current);

    const bounds = new mapboxgl.LngLatBounds();
    if (pickupLat && pickupLng) bounds.extend([pickupLng, pickupLat]);
    if (destLat && destLng) bounds.extend([destLng, destLat]);
    if (driverLat && driverLng) bounds.extend([driverLng, driverLat]);
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });

    return () => { map.current?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Driver position updates: move marker, rotate car, refetch route, recenter
  useEffect(() => {
    if (!driverLat || !driverLng || !driverMarker.current) return;
    driverMarker.current.setLngLat([driverLng, driverLat]);

    // Compute bearing from previous position so the car points where it goes
    const prev = lastDriverPos.current;
    if (prev && (prev.lat !== driverLat || prev.lng !== driverLng)) {
      const b = bearingBetween(prev.lat, prev.lng, driverLat, driverLng);
      currentBearing.current = b;
      if (driverCarEl.current) {
        driverCarEl.current.style.transform = `rotate(${b}deg)`;
      }
    }
    lastDriverPos.current = { lat: driverLat, lng: driverLng };

    if ((status === "driver_approaching" || status === "in_progress") && map.current) {
      map.current.easeTo({ center: [driverLng, driverLat], duration: 1000 });
    }
    refreshRoute();
  }, [driverLat, driverLng, status, refreshRoute]);

  if (tokenLoading) {
    return (
      <div className="w-full h-72 rounded-xl border border-border flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (tokenError || !mapboxToken) {
    return (
      <div className="w-full h-72 rounded-xl border border-border flex flex-col items-center justify-center bg-muted/30 gap-2 p-4 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Carte temporairement indisponible</p>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-72 rounded-xl overflow-hidden border border-border" />;
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);

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
      .select("id, company_name, card_photo_url, contact_phone, show_phone, current_latitude, current_longitude, rating, total_rides, vehicle_brand, vehicle_model, vehicle_color, profiles!drivers_user_id_fkey(full_name, phone, profile_photo_url)")
      .eq("id", data.driver_id)
      .single();

    if (driverData) {
      const profile = (driverData as any).profiles;
      const driverPhoto = (driverData as any).card_photo_url || profile?.profile_photo_url || null;
      setDriver({
        id: driverData.id,
        company_name: driverData.company_name,
        profile_photo_url: driverPhoto,
        contact_phone: driverData.show_phone ? (driverData.contact_phone || profile?.phone) : null,
        show_phone: driverData.show_phone ?? false,
        full_name: profile?.full_name || null,
        current_latitude: driverData.current_latitude,
        current_longitude: driverData.current_longitude,
        rating: (driverData as any).rating ?? null,
        total_rides: (driverData as any).total_rides ?? null,
        vehicle_brand: (driverData as any).vehicle_brand ?? null,
        vehicle_model: (driverData as any).vehicle_model ?? null,
        vehicle_color: (driverData as any).vehicle_color ?? null,
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
      const { data: { user } } = await getCachedUser();
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

  // Load favorite state for this client+driver
  useEffect(() => {
    if (!course?.client_id || !driver?.id) return;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("favorite_driver_id")
        .eq("id", course.client_id!)
        .maybeSingle();
      setIsFavorite(data?.favorite_driver_id === driver.id);
    })();
  }, [course?.client_id, driver?.id]);

  const toggleFavorite = useCallback(async () => {
    if (!course?.client_id || !driver?.id || favoriteSaving) return;

    // ⚡ Optimistic UI : flip immédiatement, rollback si erreur
    const previousFavorite = isFavorite;
    const nextFavorite = !previousFavorite;
    setIsFavorite(nextFavorite);
    setFavoriteSaving(true);

    try {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("driver_ids, is_exclusive")
        .eq("id", course.client_id)
        .maybeSingle();

      const currentIds: string[] = clientRow?.driver_ids || [];
      let newDriverIds = currentIds;

      if (nextFavorite && !currentIds.includes(driver.id)) {
        newDriverIds = [...currentIds, driver.id];
      }

      const updates: Record<string, any> = {
        favorite_driver_id: nextFavorite ? driver.id : null,
        updated_at: new Date().toISOString(),
      };
      if (nextFavorite && !clientRow?.is_exclusive && newDriverIds !== currentIds) {
        updates.driver_ids = newDriverIds;
      }

      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", course.client_id);
      if (error) throw error;

      toast.success(nextFavorite ? "Ajouté à vos chauffeurs favoris ❤️" : "Retiré de vos favoris");
    } catch (err) {
      console.error(err);
      setIsFavorite(previousFavorite); // rollback
      toast.error("Impossible de mettre à jour vos favoris");
    } finally {
      setFavoriteSaving(false);
    }
  }, [course?.client_id, driver?.id, isFavorite, favoriteSaving]);

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
                <Card className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                        <AvatarImage src={driver.profile_photo_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {driverName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate">{driverName}</p>
                        {(driver.rating || driver.total_rides) && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {driver.rating != null && driver.rating > 0 && (
                              <div className="flex items-center gap-0.5 text-xs">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {driver.total_rides != null && driver.total_rides > 0 && (
                              <span className="text-xs text-muted-foreground">
                                · {driver.total_rides} course{driver.total_rides > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                        {(driver.vehicle_brand || driver.vehicle_model) && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {[driver.vehicle_brand, driver.vehicle_model, driver.vehicle_color]
                              .filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <Button
                        variant={isFavorite ? "default" : "outline"}
                        size="icon"
                        onClick={toggleFavorite}
                        disabled={favoriteSaving || !course.client_id}
                        className="h-9 w-9 shrink-0"
                        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      >
                        <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {driver.contact_phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <a href={`tel:${driver.contact_phone}`}>
                            <Phone className="h-4 w-4 mr-1.5" /> Appeler
                          </a>
                        </Button>
                      )}
                      {rideRequestId && isActive && course.client_id && (
                        <div className="flex-1">
                          <RideChatPanel
                            rideId={rideRequestId}
                            senderType="client"
                            senderId={course.client_id}
                            otherName={driverName}
                          />
                        </div>
                      )}
                    </div>
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
