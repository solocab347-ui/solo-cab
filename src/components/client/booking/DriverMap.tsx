import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic29sb2NhYiIsImEiOiJjbTdtOGdqaWEwNHh3MmpwcjZmeWFoYWkxIn0.u2lNBfdgcxvxrYGgAO2aeg';

interface DriverMapProps {
  clientPosition: { lat: number; lng: number } | null;
  destinationPosition?: { lat: number; lng: number } | null;
  drivers: NearbyDriver[];
  selectedDriverIds: Set<string>;
  onDriverClick: (driverId: string) => void;
  searchRadius?: number | null;
}

export function DriverMap({
  clientPosition,
  destinationPosition,
  drivers,
  selectedDriverIds,
  onDriverClick,
  searchRadius,
}: DriverMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clientMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [2.3522, 46.6034], // France center
      zoom: 5,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update client marker
  useEffect(() => {
    if (!map.current || !clientPosition) return;

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
  }, [clientPosition, drivers]);

  // Update destination marker
  useEffect(() => {
    if (!map.current) return;

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
  }, [destinationPosition]);

  // Update driver markers
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    drivers.forEach(driver => {
      // Drivers from RPC don't have lat/lng directly, they have distance_meters
      // We need to compute approximate positions using client position + bearing
      // For now, if we don't have exact positions, skip map markers
      // The RPC returns home_latitude/home_longitude in driver data
      if (!(driver as any).home_latitude || !(driver as any).home_longitude) return;

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
        .setLngLat([(driver as any).home_longitude, (driver as any).home_latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [drivers, selectedDriverIds, onDriverClick]);

  const fitMapBounds = useCallback(() => {
    if (!map.current || !clientPosition) return;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([clientPosition.lng, clientPosition.lat]);

    if (destinationPosition) {
      bounds.extend([destinationPosition.lng, destinationPosition.lat]);
    }

    drivers.forEach(d => {
      if ((d as any).home_latitude && (d as any).home_longitude) {
        bounds.extend([(d as any).home_longitude, (d as any).home_latitude]);
      }
    });

    // If only client position, zoom to search radius
    if (!destinationPosition && drivers.length === 0 && searchRadius) {
      map.current.flyTo({
        center: [clientPosition.lng, clientPosition.lat],
        zoom: searchRadius <= 5 ? 12 : searchRadius <= 10 ? 11 : 10,
        duration: 1000,
      });
      return;
    }

    map.current.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 40, right: 40 },
      maxZoom: 14,
      duration: 1000,
    });
  }, [clientPosition, destinationPosition, drivers, searchRadius]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border/50 shadow-lg">
      <div ref={mapContainer} className="w-full h-[300px] sm:h-[400px]" />
      {!clientPosition && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
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
