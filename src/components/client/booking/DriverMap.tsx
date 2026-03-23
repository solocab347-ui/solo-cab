import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';

interface DriverMapProps {
  clientPosition: { lat: number; lng: number } | null;
  destinationPosition?: { lat: number; lng: number } | null;
  drivers: NearbyDriver[];
  selectedDriverIds: Set<string>;
  onDriverClick: (driverId: string) => void;
  searchRadius?: number | null;
  mapboxToken?: string | null;
  tokenLoading?: boolean;
}

export function DriverMap({
  clientPosition,
  destinationPosition,
  drivers,
  selectedDriverIds,
  onDriverClick,
  searchRadius,
  mapboxToken,
  tokenLoading = false,
}: DriverMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clientMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mapLoadedRef = useRef(false);
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mapError, setMapError] = useState<string | null>(null);

  const resizeMap = useCallback(() => {
    if (!map.current) return;

    requestAnimationFrame(() => {
      map.current?.resize();
    });
  }, []);

  const fitMapBounds = useCallback(() => {
    if (!map.current || !clientPosition || !mapLoadedRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([clientPosition.lng, clientPosition.lat]);

    if (destinationPosition) {
      bounds.extend([destinationPosition.lng, destinationPosition.lat]);
    }

    drivers.forEach((d) => {
      if (d.latitude != null && d.longitude != null) {
        bounds.extend([d.longitude, d.latitude]);
      }
    });

    if (!destinationPosition && drivers.length === 0 && searchRadius) {
      map.current.flyTo({
        center: [clientPosition.lng, clientPosition.lat],
        zoom: searchRadius <= 5 ? 12 : searchRadius <= 10 ? 11 : 10,
        duration: 800,
      });
      return;
    }

    map.current.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 40, right: 40 },
      maxZoom: 14,
      duration: 800,
    });
  }, [clientPosition, destinationPosition, drivers, searchRadius]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    setMapStatus('loading');
    setMapError(null);
    mapboxgl.accessToken = mapboxToken;

    const initialCenter: [number, number] = clientPosition
      ? [clientPosition.lng, clientPosition.lat]
      : [2.3522, 46.6034];

    const instance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: clientPosition ? 11 : 5,
      attributionControl: false,
      antialias: true,
      fadeDuration: 0,
    });

    map.current = instance;

    instance.on('load', () => {
      mapLoadedRef.current = true;
      setMapStatus('ready');
      resizeMap();
      window.setTimeout(resizeMap, 150);
      window.setTimeout(() => {
        resizeMap();
        fitMapBounds();
      }, 350);
    });

    instance.on('style.load', () => {
      resizeMap();
    });

    instance.on('error', (event) => {
      console.error('Mapbox error:', event?.error || event);

      if (!mapLoadedRef.current) {
        setMapStatus('error');
        setMapError('La carte n’a pas pu se charger correctement.');
      }
    });

    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    instance.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapLoadedRef.current = false;
      map.current?.remove();
      map.current = null;
    };
  }, [clientPosition, fitMapBounds, mapboxToken, resizeMap]);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const handleResize = () => resizeMap();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    if ('ResizeObserver' in window) {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = new ResizeObserver(() => {
        resizeMap();
      });
      resizeObserverRef.current.observe(mapContainer.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [resizeMap]);

  // Update client marker
  useEffect(() => {
    if (!map.current || !clientPosition || !mapLoadedRef.current) return;

    if (clientMarkerRef.current) {
      clientMarkerRef.current.setLngLat([clientPosition.lng, clientPosition.lat]);
    } else {
      const el = document.createElement('div');
      el.className = 'client-marker';
      el.innerHTML = `
        <div style="width: 20px; height: 20px; background: hsl(var(--primary)); border: 3px solid white; border-radius: 50%; box-shadow: 0 0 12px hsl(var(--primary) / 0.6); position: relative;">
          <div style="position: absolute; inset: -6px; border: 2px solid hsl(var(--primary) / 0.3); border-radius: 50%; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        </div>
      `;
      clientMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([clientPosition.lng, clientPosition.lat])
        .addTo(map.current);
    }

    // Fit to show client and drivers
    fitMapBounds();
  }, [clientPosition, drivers, fitMapBounds]);

  // Update destination marker
  useEffect(() => {
    if (!map.current || !mapLoadedRef.current) return;

    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    if (destinationPosition) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="width: 16px; height: 16px; background: hsl(var(--destructive)); border: 3px solid white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transform: rotate(45deg);"></div>
      `;
      destMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([destinationPosition.lng, destinationPosition.lat])
        .addTo(map.current);
    }

    fitMapBounds();
  }, [destinationPosition, fitMapBounds]);

  // Update driver markers
  useEffect(() => {
    if (!map.current || !mapLoadedRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    drivers.forEach(driver => {
      if (driver.latitude == null || driver.longitude == null) return;

      const isSelected = selectedDriverIds.has(driver.driver_id);
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          width: 40px; height: 40px; border-radius: 12px;
          background: ${isSelected ? 'hsl(var(--primary))' : 'hsl(var(--card))'};
          border: 2px solid ${isSelected ? 'white' : 'hsl(var(--border))'};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.2s;
          font-size: 18px;
        ">🚗</div>
        <div style="
          position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
          background: ${isSelected ? 'hsl(var(--primary))' : 'hsl(var(--card))'};
          color: ${isSelected ? 'white' : 'hsl(var(--foreground))'};
          font-size: 10px; font-weight: 700; padding: 1px 6px;
          border-radius: 6px; white-space: nowrap;
          border: 1px solid ${isSelected ? 'white' : 'hsl(var(--border))'};
        ">${driver.estimated_price ? driver.estimated_price.toFixed(0) + '€' : ''}</div>
      `;

      el.addEventListener('click', () => onDriverClick(driver.driver_id));

      const marker = new mapboxgl.Marker(el)
        .setLngLat([driver.longitude, driver.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [drivers, selectedDriverIds, onDriverClick]);

  useEffect(() => {
    if (mapStatus === 'ready') {
      resizeMap();
      fitMapBounds();
    }
  }, [mapStatus, fitMapBounds, resizeMap]);

  return (
    <div className="mapbox-driver-map relative w-full min-h-[250px] overflow-hidden rounded-xl border border-border/50 bg-muted/40 shadow-lg sm:min-h-[350px]">
      <div ref={mapContainer} className="absolute inset-0 h-full w-full" />

      {(tokenLoading || mapStatus === 'loading' || mapStatus === 'idle') && mapboxToken && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/65 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Chargement de la carte…</p>
        </div>
      )}

      {!mapboxToken && !tokenLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/90 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground text-center px-4">
            Impossible d’initialiser la carte pour le moment.
          </p>
        </div>
      )}

      {mapStatus === 'error' && mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/90 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground text-center px-4">
            {mapError}
          </p>
        </div>
      )}

      {!clientPosition && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground text-center px-4">
            Entrez votre adresse de départ pour voir les chauffeurs sur la carte
          </p>
        </div>
      )}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
