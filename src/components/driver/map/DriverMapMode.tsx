import { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Navigation, Loader2, Wifi, WifiOff, QrCode, Receipt, Car, LayoutGrid } from 'lucide-react';
import { ActiveCourseCard } from './ActiveCourseCard';
import { supabase } from '@/integrations/supabase/client';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { motion } from 'framer-motion';
import { playAvailabilitySound } from '@/lib/availabilitySound';
import carTopView from '@/assets/car-top-view.png';
import { useDriverAvailability } from '@/contexts/DriverAvailabilityContext';

interface DriverMapModeProps {
  driverId: string;
  onSwitchToDashboard: () => void;
  onNavigateTo?: (tab: string) => void;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';

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

// CSS for radar pulse on the map
const radarCSS = `
.map-radar-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid hsl(var(--primary) / 0.4);
  pointer-events: none;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation: mapRadarPulse 2.5s ease-out infinite;
}
.map-radar-ring:nth-child(2) { animation-delay: 0.8s; }
.map-radar-ring:nth-child(3) { animation-delay: 1.6s; }
@keyframes mapRadarPulse {
  0% { width: 20px; height: 20px; opacity: 0.6; }
  100% { width: 120px; height: 120px; opacity: 0; }
}
`;

export const DriverMapMode = memo(({ driverId, onSwitchToDashboard, onNavigateTo }: DriverMapModeProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const radarLayerRef = useRef<L.Marker | null>(null);
  const lastHeading = useRef<number>(0);
  const lastGps = useRef<{ lat: number; lng: number } | null>(null);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [revenueHidden, setRevenueHidden] = useState(false);
  const [hasActiveCourse, setHasActiveCourse] = useState(false);

  const { isAvailable, toggleAvailability } = useDriverAvailability();

  const { latitude, longitude, isTracking, isStale } = useDriverLocationTracker({
    driverId,
    enabled: true,
    updateIntervalMs: 8000,
  });

  const handleToggleAvailability = useCallback(async () => {
    await toggleAvailability();
  }, [toggleAvailability]);

  const fetchRevenue = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_driver_dashboard_stats', {
        p_driver_id: driverId,
      });
      const d = data as any;
      if (d) {
        setTodayRevenue(Number(d?.today_revenue || 0));
      }
    } catch { /* silent */ }
  }, [driverId]);

  useEffect(() => {
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 60000);
    return () => clearInterval(interval);
  }, [fetchRevenue]);

  // Inject radar CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = radarCSS;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

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
    setTimeout(() => map.invalidateSize(), 200);
    setIsMapReady(true);
    return () => {
      if (radarLayerRef.current) {
        try { radarLayerRef.current.remove(); } catch {}
        radarLayerRef.current = null;
      }
      if (markerRef.current) {
        try { markerRef.current.remove(); } catch {}
        markerRef.current = null;
      }
      setIsMapReady(false);
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  const updateRotation = useCallback((heading: number) => {
    if (!markerRef.current) return;
    const el = markerRef.current.getElement();
    if (!el) return;
    const inner = el.querySelector('#car-marker-inner') as HTMLElement;
    if (inner) inner.style.transform = `rotate(${heading}deg)`;
  }, []);

  const calcHeading = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const dLng = to.lng - from.lng;
    const dLat = to.lat - from.lat;
    if (Math.abs(dLat) < 0.00001 && Math.abs(dLng) < 0.00001) return lastHeading.current;
    const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
    lastHeading.current = angle;
    return angle;
  }, []);

  // Update car + radar on map
  useEffect(() => {
    if (!latitude || !longitude || !mapRef.current || !isMapReady) return;
    const newPos: L.LatLngExpression = [latitude, longitude];

    // Radar overlay around car
    if (isAvailable) {
      if (!radarLayerRef.current) {
        const radarIcon = L.divIcon({
          html: `<div style="position:relative;width:120px;height:120px;">
            <div class="map-radar-ring"></div>
            <div class="map-radar-ring"></div>
            <div class="map-radar-ring"></div>
          </div>`,
          iconSize: [120, 120],
          iconAnchor: [60, 60],
          className: 'radar-overlay-icon',
        });
        radarLayerRef.current = L.marker(newPos, { icon: radarIcon, zIndexOffset: 999, interactive: false }).addTo(mapRef.current);
      } else {
        radarLayerRef.current.setLatLng(newPos);
      }
    } else if (radarLayerRef.current) {
      radarLayerRef.current.remove();
      radarLayerRef.current = null;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(newPos, { icon: CAR_ICON, zIndexOffset: 1000 }).addTo(mapRef.current);
      lastGps.current = { lat: latitude, lng: longitude };
      mapRef.current.setView(newPos, 16, { animate: true });
    } else {
      const prev = lastGps.current;
      if (prev) {
        const heading = calcHeading(prev, { lat: latitude, lng: longitude });
        updateRotation(heading);
      }
      lastGps.current = { lat: latitude, lng: longitude };
      markerRef.current.setLatLng(newPos);
    }
  }, [latitude, longitude, isMapReady, isAvailable, calcHeading, updateRotation]);

  const recenter = useCallback(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  }, [latitude, longitude]);

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Active course card */}
      <ActiveCourseCard driverId={driverId} onCourseChange={() => { fetchRevenue(); setHasActiveCourse(false); }} onCourseActive={(active) => setHasActiveCourse(active)} />
      <div className="absolute top-0 left-0 right-0 z-[9990] pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
        <div className="px-4 pt-3">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl px-4 py-3"
          >
             <div className="flex items-center justify-between">
              {/* Revenue */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Aujourd'hui</span>
                  <span className="text-2xl font-black text-foreground tracking-tight leading-none mt-0.5">
                    {revenueHidden ? '••••' : `${todayRevenue.toFixed(2).replace('.', ',')} €`}
                  </span>
                </div>
                <button
                  onClick={() => setRevenueHidden(h => !h)}
                  className="p-1.5 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground"
                  aria-label={revenueHidden ? 'Afficher le CA' : 'Masquer le CA'}
                >
                  {revenueHidden ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {/* Status pill */}
              <button
                onClick={handleToggleAvailability}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 shadow-md ${
                  isAvailable
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-destructive text-destructive-foreground shadow-destructive/30'
                }`}
              >
                {isAvailable ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                    </span>
                    En ligne
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Hors ligne
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Search status indicator */}
        {isAvailable && (
          <div className="flex justify-center mt-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="pointer-events-none"
            >
              <div className="flex items-center gap-2.5 bg-card/85 backdrop-blur-xl border border-primary/20 rounded-full px-4 py-1.5 shadow-lg">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/50"
                    animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/30"
                    animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                  />
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <motion.span
                  className="text-[11px] font-semibold text-foreground"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  Recherche active…
                </motion.span>
              </div>
            </motion.div>
          </div>
        )}

        {!isAvailable && (
          <div className="flex justify-center mt-2">
            <div className="pointer-events-none flex items-center gap-2 bg-card/85 backdrop-blur-xl border border-destructive/30 rounded-full px-4 py-1.5 shadow-lg">
              <WifiOff className="w-3 h-3 text-destructive" />
              <span className="text-[11px] font-medium text-destructive">Réservations uniquement</span>
            </div>
          </div>
        )}
      </div>

      {/* === BOTTOM BAR — hidden when course is active === */}
      {!hasActiveCourse && (
        <div className="absolute bottom-0 left-0 right-0 z-[9990] pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          <div className="px-4 pb-6 space-y-3">
            {/* Quick action buttons */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="pointer-events-auto grid grid-cols-4 gap-2"
            >
              <button
                onClick={onSwitchToDashboard}
                className="flex flex-col items-center gap-1 bg-card/95 backdrop-blur-xl rounded-2xl py-3 px-2 border border-border/50 shadow-xl active:scale-95 transition-transform"
              >
                <LayoutGrid className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-semibold text-foreground">Dashboard</span>
              </button>
              <button
                onClick={() => onNavigateTo?.('encaisser')}
                className="flex flex-col items-center gap-1 bg-card/95 backdrop-blur-xl rounded-2xl py-3 px-2 border border-border/50 shadow-xl active:scale-95 transition-transform"
              >
                <Receipt className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-semibold text-foreground">Encaisser</span>
              </button>
              <button
                onClick={() => onNavigateTo?.('qrcode')}
                className="flex flex-col items-center gap-1 bg-card/95 backdrop-blur-xl rounded-2xl py-3 px-2 border border-border/50 shadow-xl active:scale-95 transition-transform"
              >
                <QrCode className="w-5 h-5 text-blue-500" />
                <span className="text-[10px] font-semibold text-foreground">QR Code</span>
              </button>
              <button
                onClick={() => onNavigateTo?.('courses')}
                className="flex flex-col items-center gap-1 bg-card/95 backdrop-blur-xl rounded-2xl py-3 px-2 border border-border/50 shadow-xl active:scale-95 transition-transform"
              >
                <Car className="w-5 h-5 text-amber-500" />
                <span className="text-[10px] font-semibold text-foreground">Courses</span>
              </button>
            </motion.div>

            {/* Recenter button - floating */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="pointer-events-auto absolute -top-16 right-4"
            >
              <Button
                onClick={recenter}
                size="icon"
                className="rounded-full shadow-xl bg-card text-primary border border-border/50 h-12 w-12 hover:bg-accent"
              >
                <Navigation className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Loading */}
      {!isTracking && (
        <div className="absolute inset-0 z-[42] flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-xl border border-border/50">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Localisation…</span>
          </div>
        </div>
      )}
      {isStale && isTracking && (
        <div className="absolute top-[140px] left-0 right-0 z-[9991] flex justify-center pointer-events-none">
          <div className="bg-amber-500/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg">
            ⚠️ Position GPS obsolète — gardez l'app au premier plan
          </div>
        </div>
      )}
    </div>
  );
});

DriverMapMode.displayName = 'DriverMapMode';
