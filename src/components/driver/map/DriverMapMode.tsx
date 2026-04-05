import { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Navigation, Loader2, Euro, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { motion } from 'framer-motion';
import carTopView from '@/assets/car-top-view.png';

interface DriverMapModeProps {
  driverId: string;
  onSwitchToDashboard: () => void;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';

// Stable car icon — created once, rotation updated via DOM
const CAR_ICON = L.divIcon({
  html: `<div id="car-marker-inner" style="
    width: 52px; height: 52px;
    transform: rotate(0deg);
    transition: transform 1s ease-out;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    will-change: transform;
  ">
    <img src="${carTopView}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" />
  </div>`,
  iconSize: [52, 52],
  iconAnchor: [26, 26],
  className: 'car-marker-stable',
});

export const DriverMapMode = memo(({ driverId, onSwitchToDashboard }: DriverMapModeProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lastHeading = useRef<number>(0);
  const lastGps = useRef<{ lat: number; lng: number } | null>(null);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [coursesToday, setCoursesToday] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // GPS tracking
  const { latitude, longitude, isTracking, updateAvailability } = useDriverLocationTracker({
    driverId,
    enabled: true,
    updateIntervalMs: 5000,
  });

  // Fetch initial availability
  useEffect(() => {
    supabase.from('drivers').select('is_available_now').eq('id', driverId).maybeSingle()
      .then(({ data }) => { if (data) setIsAvailable(data.is_available_now ?? false); });
  }, [driverId]);

  const handleToggleAvailability = useCallback(async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    await updateAvailability(next);
  }, [isAvailable, updateAvailability]);

  // Fetch today's revenue
  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const { data } = await supabase.rpc('get_driver_dashboard_stats', {
          p_driver_id: driverId,
          p_period: 'day',
        });
        if (data && Array.isArray(data) && data.length > 0) {
          const d = data[0] as any;
          setTodayRevenue(d?.total_revenue_cents ? d.total_revenue_cents / 100 : 0);
          setCoursesToday(d?.total_courses || 0);
        }
      } catch {
        // silent
      }
    };
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 60000);
    return () => clearInterval(interval);
  }, [driverId]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [48.8566, 2.3522],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    // Force resize after mount to avoid grey tiles
    setTimeout(() => map.invalidateSize(), 200);
    setIsMapReady(true);

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update rotation via DOM (no icon recreation)
  const updateRotation = useCallback((heading: number) => {
    if (!markerRef.current) return;
    const el = markerRef.current.getElement();
    if (!el) return;
    const inner = el.querySelector('#car-marker-inner') as HTMLElement;
    if (inner) {
      inner.style.transform = `rotate(${heading}deg)`;
    }
  }, []);

  // Calculate heading from movement
  const calcHeading = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const dLng = to.lng - from.lng;
    const dLat = to.lat - from.lat;
    if (Math.abs(dLat) < 0.00001 && Math.abs(dLng) < 0.00001) return lastHeading.current;
    const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
    lastHeading.current = angle;
    return angle;
  }, []);

  // Update marker position when GPS updates — simple & stable
  useEffect(() => {
    if (!latitude || !longitude || !mapRef.current || !isMapReady) return;

    const newPos: L.LatLngExpression = [latitude, longitude];

    if (!markerRef.current) {
      // First position: create marker once
      markerRef.current = L.marker(newPos, {
        icon: CAR_ICON,
        zIndexOffset: 1000,
      }).addTo(mapRef.current);
      lastGps.current = { lat: latitude, lng: longitude };
      mapRef.current.setView(newPos, 16, { animate: true });
    } else {
      // Subsequent: move smoothly with CSS transition on the Leaflet marker element
      const prev = lastGps.current;
      if (prev) {
        const heading = calcHeading(prev, { lat: latitude, lng: longitude });
        updateRotation(heading);
      }
      lastGps.current = { lat: latitude, lng: longitude };

      // Use Leaflet's built-in smooth move
      markerRef.current.setLatLng(newPos);
    }
  }, [latitude, longitude, isMapReady, calcHeading, updateRotation]);

  // Re-center on driver
  const recenter = useCallback(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  }, [latitude, longitude]);

  return (
    <div className="fixed inset-0 z-40 bg-background">
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Top overlay — revenue + stats */}
      <div className="absolute top-0 left-0 right-0 z-[9990] pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
        <div className="flex justify-between items-start pt-4 px-4 gap-3">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex-1"
          >
            <Card className="pointer-events-auto bg-card/90 backdrop-blur-xl border-border/50 shadow-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15">
                  <Euro className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aujourd'hui</p>
                  <p className="text-xl font-bold text-foreground tracking-tight">
                    {todayRevenue.toFixed(2).replace('.', ',')} €
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {isTracking && (
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/10 px-1.5">
                      GPS
                    </Badge>
                  )}
                </div>
              </div>
              {coursesToday > 0 && (
                <div className="flex items-center gap-1 mt-1.5 ml-13">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{coursesToday} course{coursesToday > 1 ? 's' : ''}</span>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Animated search radar indicator */}
        {isAvailable && (
          <div className="flex justify-center mt-2 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="pointer-events-auto flex items-center gap-3 bg-card/90 backdrop-blur-xl border border-primary/30 rounded-full px-5 py-2.5 shadow-lg">
                {/* Radar animation */}
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/40"
                    animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/30"
                    animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                    animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
                  />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                <div>
                  <motion.span
                    className="text-xs font-semibold text-foreground block"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Recherche de courses…
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground">Vous êtes visible des clients</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Disconnected indicator */}
        {!isAvailable && (
          <div className="flex justify-center mt-2 px-4">
            <div className="pointer-events-auto flex items-center gap-2 bg-card/90 backdrop-blur-xl border border-destructive/30 rounded-full px-4 py-2 shadow-lg">
              <WifiOff className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">Hors ligne · Réservations uniquement</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[9990] pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
        <div className="flex justify-between items-end px-4 pb-8">
          {/* Left: Dashboard button */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="pointer-events-auto"
          >
            <Button
              onClick={onSwitchToDashboard}
              size="lg"
              className="rounded-full shadow-xl bg-card text-foreground hover:bg-accent border border-border/50 gap-2 h-14 px-6"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="font-semibold">Dashboard</span>
            </Button>
          </motion.div>

          {/* Center: Availability toggle */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto"
          >
            <Button
              onClick={handleToggleAvailability}
              size="lg"
              className={`rounded-full shadow-xl h-14 px-5 gap-2 transition-all duration-300 ${
                isAvailable
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400'
                  : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              }`}
            >
              {isAvailable ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              <span className="font-semibold text-sm">{isAvailable ? 'En ligne' : 'Hors ligne'}</span>
            </Button>
          </motion.div>

          {/* Right: Recenter button */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="pointer-events-auto"
          >
            <Button
              onClick={recenter}
              size="icon"
              className="rounded-full shadow-xl bg-primary text-primary-foreground h-14 w-14"
            >
              <Navigation className="w-6 h-6" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Loading state */}
      {!isTracking && (
        <div className="absolute inset-0 z-[42] flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none">
          <Card className="p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Localisation en cours...</span>
          </Card>
        </div>
      )}
    </div>
  );
});

DriverMapMode.displayName = 'DriverMapMode';
