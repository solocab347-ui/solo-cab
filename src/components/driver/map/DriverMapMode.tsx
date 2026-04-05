import { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Navigation, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { motion, AnimatePresence } from 'framer-motion';

interface DriverMapModeProps {
  driverId: string;
  onSwitchToDashboard: () => void;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';

export const DriverMapMode = memo(({ driverId, onSwitchToDashboard }: DriverMapModeProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetPos = useRef<{ lat: number; lng: number } | null>(null);
  const currentPos = useRef<{ lat: number; lng: number } | null>(null);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState(false);

  // GPS tracking — always active
  const { latitude, longitude, isTracking } = useDriverLocationTracker({
    driverId,
    enabled: true,
    updateIntervalMs: 5000,
  });

  // Fetch today's revenue
  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const { data } = await supabase.rpc('get_driver_dashboard_stats', {
          p_driver_id: driverId,
          p_period: 'day',
        });
        if (data && Array.isArray(data) && data.length > 0) {
          setTodayRevenue((data[0] as any)?.total_revenue_cents ? (data[0] as any).total_revenue_cents / 100 : 0);
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

    const defaultCenter: [number, number] = [48.8566, 2.3522]; // Paris
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    setIsMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Create / update car icon
  const carIcon = useRef(
    L.divIcon({
      html: `<div style="
        width: 48px; height: 48px;
        background: hsl(var(--primary));
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
        transition: transform 0.3s ease;
      ">🚗</div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      className: '',
    })
  );

  // Smooth marker animation
  const animateMarker = useCallback(() => {
    if (!currentPos.current || !targetPos.current || !markerRef.current) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const t = 0.08; // smoothness

    currentPos.current = {
      lat: lerp(currentPos.current.lat, targetPos.current.lat, t),
      lng: lerp(currentPos.current.lng, targetPos.current.lng, t),
    };

    markerRef.current.setLatLng([currentPos.current.lat, currentPos.current.lng]);

    // Continue animating if not close enough
    const dist = Math.abs(currentPos.current.lat - targetPos.current.lat) + Math.abs(currentPos.current.lng - targetPos.current.lng);
    if (dist > 0.000001) {
      animFrameRef.current = requestAnimationFrame(animateMarker);
    }
  }, []);

  // Update marker position when GPS updates
  useEffect(() => {
    if (!latitude || !longitude || !mapRef.current || !isMapReady) return;

    const newPos = { lat: latitude, lng: longitude };
    targetPos.current = newPos;

    if (!markerRef.current) {
      // First position — create marker and center map
      currentPos.current = newPos;
      markerRef.current = L.marker([latitude, longitude], { icon: carIcon.current }).addTo(mapRef.current);
      mapRef.current.setView([latitude, longitude], 16, { animate: true });
    } else {
      // Animate to new position
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animateMarker);
    }
  }, [latitude, longitude, isMapReady, animateMarker]);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

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

      {/* Top overlay — today's revenue */}
      <div className="absolute top-0 left-0 right-0 z-[41] pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex justify-center pt-3 px-4">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className="pointer-events-auto bg-card/90 backdrop-blur-xl border-border/50 shadow-xl px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aujourd'hui</p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">
                    {todayRevenue.toFixed(2).replace('.', ',')} €
                  </p>
                </div>
                {isTracking && (
                  <Badge variant="outline" className="text-[10px] border-success/30 text-success bg-success/10">
                    GPS
                  </Badge>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-[41] pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-between items-end px-4 pb-6">
          {/* Switch to dashboard */}
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

          {/* Recenter button */}
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
