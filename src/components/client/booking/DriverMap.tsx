import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Circle as LeafletCircle, CircleMarker, LayerGroup, Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';

const TILE_PROVIDERS = [
  {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
] as const;

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

const createDriverIcon = (isSelected: boolean, price?: number) =>
  L.divIcon({
    className: 'driver-map-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; transform: translateY(-8px);">
        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${isSelected ? 'hsl(var(--primary))' : 'hsl(var(--card))'}; border: 2px solid ${isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--border))'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px hsl(var(--foreground) / 0.16); font-size: 18px;">🚗</div>
        ${price ? `<div style="padding: 2px 6px; border-radius: 999px; background: ${isSelected ? 'hsl(var(--primary))' : 'hsl(var(--background))'}; color: ${isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}; border: 1px solid hsl(var(--border)); font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 6px 20px hsl(var(--foreground) / 0.12);">${price.toFixed(0)}€</div>` : ''}
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 40],
  });

const destinationIcon = L.divIcon({
  className: 'driver-map-destination-icon',
  html: '<div style="width: 18px; height: 18px; background: hsl(var(--destructive)); border: 3px solid hsl(var(--background)); border-radius: 4px; transform: rotate(45deg); box-shadow: 0 10px 20px hsl(var(--foreground) / 0.18);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 18],
});

export function DriverMap({
  clientPosition,
  destinationPosition,
  drivers,
  selectedDriverIds,
  onDriverClick,
  searchRadius,
  tokenLoading = false,
}: DriverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const driverLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const clientMarkerRef = useRef<CircleMarker | null>(null);
  const radiusCircleRef = useRef<LeafletCircle | null>(null);
  const destinationMarkerRef = useRef<Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const tileProviderIndexRef = useRef(0);
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    setMapStatus('loading');
    setMapError(null);

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    }).setView(clientPosition ? [clientPosition.lat, clientPosition.lng] : [46.6034, 2.3522], clientPosition ? 11 : 5);

    const attachTileLayer = (providerIndex: number) => {
      const provider = TILE_PROVIDERS[providerIndex];
      if (!provider) {
        setMapStatus('error');
        setMapError('Le fond de carte ne peut pas se charger pour le moment.');
        return;
      }

      tileLayerRef.current?.remove();
      tileProviderIndexRef.current = providerIndex;

      const tileLayer = L.tileLayer(provider.url, provider.options);
      let hasLoadedTiles = false;

      tileLayer.on('loading', () => {
        setMapStatus('loading');
      });

      tileLayer.on('load', () => {
        hasLoadedTiles = true;
        setMapStatus('ready');
        setMapError(null);
        requestAnimationFrame(() => map.invalidateSize());
      });

      tileLayer.on('tileerror', () => {
        if (hasLoadedTiles) return;

        const nextProviderIndex = providerIndex + 1;
        if (nextProviderIndex < TILE_PROVIDERS.length) {
          attachTileLayer(nextProviderIndex);
        } else {
          setMapStatus('error');
          setMapError('Le fond de carte ne peut pas se charger pour le moment.');
        }
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;
    };

    attachTileLayer(0);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    driverLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const handleResize = () => requestAnimationFrame(() => map.invalidateSize());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    if ('ResizeObserver' in window) {
      resizeObserverRef.current = new ResizeObserver(() => handleResize());
      resizeObserverRef.current.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      driverLayerRef.current = null;
      routeLayerRef.current = null;
      clientMarkerRef.current = null;
      radiusCircleRef.current = null;
      destinationMarkerRef.current = null;
    };
  }, [clientPosition]);

  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();
    clientMarkerRef.current = null;
    radiusCircleRef.current = null;
    destinationMarkerRef.current = null;

    if (!clientPosition) return;

    clientMarkerRef.current = L.circleMarker([clientPosition.lat, clientPosition.lng], {
      radius: 10,
      color: 'hsl(var(--background))',
      weight: 3,
      fillColor: 'hsl(var(--primary))',
      fillOpacity: 1,
    }).addTo(routeLayer);

    if (searchRadius) {
      radiusCircleRef.current = L.circle([clientPosition.lat, clientPosition.lng], {
        radius: searchRadius * 1000,
        color: 'hsl(var(--primary))',
        weight: 1.5,
        fillColor: 'hsl(var(--primary))',
        fillOpacity: 0.08,
      }).addTo(routeLayer);
    }

    if (destinationPosition) {
      destinationMarkerRef.current = L.marker([destinationPosition.lat, destinationPosition.lng], {
        icon: destinationIcon,
      }).addTo(routeLayer);

      L.polyline(
        [
          [clientPosition.lat, clientPosition.lng],
          [destinationPosition.lat, destinationPosition.lng],
        ],
        {
          color: 'hsl(var(--accent))',
          weight: 3,
          opacity: 0.85,
          dashArray: '8 10',
        }
      ).addTo(routeLayer);
    }

    const bounds = L.latLngBounds([[clientPosition.lat, clientPosition.lng]]);

    if (destinationPosition) {
      bounds.extend([destinationPosition.lat, destinationPosition.lng]);
    }

    drivers.forEach((driver) => {
      if (driver.latitude != null && driver.longitude != null) {
        bounds.extend([driver.latitude, driver.longitude]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: destinationPosition || drivers.length > 0 ? 14 : searchRadius && searchRadius <= 5 ? 12 : 11,
      });
    }
  }, [clientPosition, destinationPosition, drivers, searchRadius]);

  useEffect(() => {
    const driverLayer = driverLayerRef.current;
    if (!driverLayer) return;

    driverLayer.clearLayers();

    drivers.forEach((driver) => {
      if (driver.latitude == null || driver.longitude == null) return;

      const marker = L.marker([driver.latitude, driver.longitude], {
        icon: createDriverIcon(selectedDriverIds.has(driver.driver_id), driver.estimated_price),
      });

      marker.on('click', () => onDriverClick(driver.driver_id));
      marker.addTo(driverLayer);
    });
  }, [drivers, selectedDriverIds, onDriverClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    requestAnimationFrame(() => mapRef.current?.invalidateSize());
  }, [mapStatus, drivers.length]);

  return (
    <div className="relative w-full min-h-[250px] overflow-hidden rounded-xl border border-border/50 bg-muted shadow-lg sm:min-h-[350px]">
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {(tokenLoading || mapStatus === 'loading') && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Chargement de la carte…</p>
        </div>
      )}

      {mapStatus === 'error' && mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/90 px-4 text-center backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">{mapError}</p>
        </div>
      )}

      {!clientPosition && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 px-4 text-center backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Entrez votre adresse de départ pour voir les chauffeurs sur la carte</p>
        </div>
      )}
    </div>
  );
}
