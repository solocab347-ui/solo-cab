import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Circle as LeafletCircle, CircleMarker, LayerGroup, Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';

// Dark map tiles similar to Uber/Bolt style
const TILE_PROVIDERS: Array<{
  url: string;
  options: L.TileLayerOptions;
}> = [
  {
    // OSM France - noms en français garantis (Île-de-France, pas Island of France)
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    options: {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 20,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap France',
    },
  },
  {
    // CARTO Voyager fallback
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
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
];

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

const createDriverIcon = (driver: NearbyDriver, isSelected: boolean) => {
  const price = driver.estimated_price;
  const photoUrl = driver.profile_photo_url;
  const initials = (driver.display_name || driver.company_name || 'VTC')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const borderColor = isSelected ? '#3b82f6' : '#ffffff';
  const glowColor = isSelected ? 'rgba(59,130,246,0.5)' : 'rgba(0,0,0,0.3)';
  const priceDisplay = price && price > 0 ? `${price.toFixed(0)}€` : '';

  const avatarContent = photoUrl
    ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:100%;height:100%;border-radius:50%;background:#3b82f6;color:white;font-size:12px;font-weight:700;align-items:center;justify-content:center;">${initials}</div>`
    : `<div style="width:100%;height:100%;border-radius:50%;background:#3b82f6;color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">${initials}</div>`;

  return L.divIcon({
    className: 'driver-avatar-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;transform:translateY(-6px);filter:drop-shadow(0 4px 12px ${glowColor});">
        <div style="width:44px;height:44px;border-radius:50%;border:3px solid ${borderColor};overflow:hidden;background:#1a1a2e;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
          ${avatarContent}
        </div>
        ${priceDisplay ? `<div style="padding:2px 8px;border-radius:12px;background:${isSelected ? '#3b82f6' : '#1a1a2e'};color:white;font-size:11px;font-weight:700;white-space:nowrap;border:1.5px solid ${isSelected ? '#60a5fa' : '#334155'};box-shadow:0 2px 8px rgba(0,0,0,0.3);">${priceDisplay}</div>` : ''}
      </div>
    `,
    iconSize: [52, 62],
    iconAnchor: [26, 50],
  });
};

const pickupIcon = L.divIcon({
  className: 'pickup-marker',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(59,130,246,0.5));">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);border:3px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #3b82f6;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M20 21a8 8 0 1 0-16 0"/>
        </svg>
      </div>
      <div style="padding:1px 6px;border-radius:8px;background:#3b82f6;color:white;font-size:9px;font-weight:700;margin-top:2px;white-space:nowrap;border:1.5px solid white;">Vous</div>
    </div>
  `,
  iconSize: [48, 58],
  iconAnchor: [24, 50],
});

const destinationIcon = L.divIcon({
  className: 'destination-marker',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(239,68,68,0.5));">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);border:3px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #ef4444;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15" stroke="white" stroke-width="2"/>
        </svg>
      </div>
      <div style="padding:1px 6px;border-radius:8px;background:#ef4444;color:white;font-size:9px;font-weight:700;margin-top:2px;white-space:nowrap;border:1.5px solid white;">Arrivée</div>
    </div>
  `,
  iconSize: [48, 56],
  iconAnchor: [24, 48],
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
  const pickupMarkerRef = useRef<Marker | null>(null);
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
        setMapError('Le fond de carte ne peut pas se charger.');
        return;
      }

      tileLayerRef.current?.remove();
      tileProviderIndexRef.current = providerIndex;

      const tileLayer = L.tileLayer(provider.url, provider.options);
      let hasLoadedTiles = false;

      tileLayer.on('load', () => {
        hasLoadedTiles = true;
        setMapStatus('ready');
        setMapError(null);
        requestAnimationFrame(() => map.invalidateSize());
      });

      tileLayer.on('tileerror', () => {
        if (hasLoadedTiles) return;
        const nextIndex = providerIndex + 1;
        if (nextIndex < TILE_PROVIDERS.length) {
          attachTileLayer(nextIndex);
        } else {
          setMapStatus('error');
          setMapError('Le fond de carte ne peut pas se charger.');
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
      pickupMarkerRef.current = null;
      radiusCircleRef.current = null;
      destinationMarkerRef.current = null;
    };
  }, [clientPosition]);

  // Update route layer (pickup, destination, radius)
  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();
    pickupMarkerRef.current = null;
    radiusCircleRef.current = null;
    destinationMarkerRef.current = null;

    if (!clientPosition) return;

    // Pickup marker
    pickupMarkerRef.current = L.marker([clientPosition.lat, clientPosition.lng], {
      icon: pickupIcon,
      zIndexOffset: 1000,
    }).addTo(routeLayer);

    // Search radius circle
    if (searchRadius) {
      radiusCircleRef.current = L.circle([clientPosition.lat, clientPosition.lng], {
        radius: searchRadius * 1000,
        color: '#3b82f6',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.06,
        dashArray: '6 4',
      }).addTo(routeLayer);
    }

    // Destination marker + route line
    if (destinationPosition) {
      destinationMarkerRef.current = L.marker([destinationPosition.lat, destinationPosition.lng], {
        icon: destinationIcon,
        zIndexOffset: 900,
      }).addTo(routeLayer);

      // Curved dotted route line
      L.polyline(
        [
          [clientPosition.lat, clientPosition.lng],
          [destinationPosition.lat, destinationPosition.lng],
        ],
        {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10 8',
          lineCap: 'round',
        }
      ).addTo(routeLayer);
    }

    // Fit bounds — prioritize client position + nearby drivers
    const nearbyBounds = L.latLngBounds([[clientPosition.lat, clientPosition.lng]]);

    // Add driver positions to bounds (they are close to client)
    drivers.forEach((driver) => {
      if (driver.latitude != null && driver.longitude != null) {
        nearbyBounds.extend([driver.latitude, driver.longitude]);
      }
    });

    if (nearbyBounds.isValid()) {
      if (drivers.length > 0) {
        // Focus on client + drivers — user can zoom out to see destination
        map.fitBounds(nearbyBounds, {
          padding: [60, 60],
          maxZoom: 14,
        });
      } else if (destinationPosition) {
        // No drivers yet — show full route overview
        const fullBounds = nearbyBounds.extend([destinationPosition.lat, destinationPosition.lng]);
        map.fitBounds(fullBounds, {
          padding: [50, 50],
          maxZoom: 13,
        });
      } else {
        // Only client position
        map.fitBounds(nearbyBounds, {
          padding: [50, 50],
          maxZoom: searchRadius && searchRadius <= 5 ? 13 : 12,
        });
      }
    }
  }, [clientPosition, destinationPosition, drivers, searchRadius]);

  // Update driver markers
  useEffect(() => {
    const driverLayer = driverLayerRef.current;
    if (!driverLayer) return;

    driverLayer.clearLayers();

    drivers.forEach((driver) => {
      if (driver.latitude == null || driver.longitude == null) return;

      const isSelected = selectedDriverIds.has(driver.driver_id);
      const marker = L.marker([driver.latitude, driver.longitude], {
        icon: createDriverIcon(driver, isSelected),
        zIndexOffset: isSelected ? 500 : 0,
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
    <div className="relative w-full min-h-[280px] overflow-hidden rounded-2xl border border-border/30 shadow-2xl sm:min-h-[380px]">
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {(tokenLoading || mapStatus === 'loading') && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1a1a2e]/80 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#334155] border-t-[#3b82f6]" />
          <p className="text-sm text-[#94a3b8]">Chargement de la carte…</p>
        </div>
      )}

      {mapStatus === 'error' && mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1a2e]/90 px-4 text-center backdrop-blur-sm">
          <p className="text-sm text-[#94a3b8]">{mapError}</p>
        </div>
      )}

      {!clientPosition && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1a2e]/80 px-4 text-center backdrop-blur-sm">
          <p className="text-sm text-[#94a3b8]">Entrez votre adresse de départ pour voir les chauffeurs sur la carte</p>
        </div>
      )}
    </div>
  );
}
