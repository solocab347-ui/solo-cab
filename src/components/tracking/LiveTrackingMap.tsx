import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface LiveTrackingMapProps {
  driverLat: number | null;
  driverLng: number | null;
  driverPhoto: string | null;
  driverName: string;
  pickupLat: number | null;
  pickupLng: number | null;
  destLat: number | null;
  destLng: number | null;
  status: string;
  /** Tailwind height class — defaults to h-48 (registered client). Guest may pass h-56 / h-64. */
  heightClass?: string;
}

/**
 * Carte de suivi en temps réel (Mapbox).
 * Composant unifié — utilisé pour les clients inscrits ET les invités (guests)
 * sur la page de suivi de course (approche + en cours).
 */
export function LiveTrackingMap({
  driverLat, driverLng, driverPhoto, driverName,
  pickupLat, pickupLng,
  destLat, destLng,
  status,
  heightClass = "h-48",
}: LiveTrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);

  const { token: mapboxToken } = useMapboxToken();

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;

    const center: [number, number] = driverLng && driverLat
      ? [driverLng, driverLat]
      : pickupLng && pickupLat
        ? [pickupLng, pickupLat]
        : [2.3522, 48.8566];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 13,
      attributionControl: false,
    });

    if (pickupLat && pickupLng) {
      const pickupEl = document.createElement('div');
      pickupEl.innerHTML = `<div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🧑</div>`;
      pickupMarker.current = new mapboxgl.Marker({ element: pickupEl })
        .setLngLat([pickupLng, pickupLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Point de prise en charge'))
        .addTo(map.current);
    }

    if (destLat && destLng) {
      const destEl = document.createElement('div');
      destEl.innerHTML = `<div style="background:#ef4444;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🏁</div>`;
      destMarker.current = new mapboxgl.Marker({ element: destEl })
        .setLngLat([destLng, destLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Destination'))
        .addTo(map.current);
    }

    const driverEl = document.createElement('div');
    if (driverPhoto) {
      driverEl.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;border:3px solid hsl(var(--primary));overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.4);"><img src="${driverPhoto}" style="width:100%;height:100%;object-fit:cover;" /></div>`;
    } else {
      driverEl.innerHTML = `<div style="background:hsl(var(--primary));color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🚗</div>`;
    }
    driverMarker.current = new mapboxgl.Marker({ element: driverEl })
      .setLngLat(driverLng && driverLat ? [driverLng, driverLat] : center)
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(driverName))
      .addTo(map.current);

    const bounds = new mapboxgl.LngLatBounds();
    if (pickupLat && pickupLng) bounds.extend([pickupLng, pickupLat]);
    if (destLat && destLng) bounds.extend([destLng, destLat]);
    if (driverLat && driverLng) bounds.extend([driverLng, driverLat]);
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }

    return () => { map.current?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Real-time driver position update
  useEffect(() => {
    if (!driverLat || !driverLng || !driverMarker.current) return;
    driverMarker.current.setLngLat([driverLng, driverLat]);
    if ((status === 'driver_approaching' || status === 'in_progress') && map.current) {
      map.current.easeTo({ center: [driverLng, driverLat], duration: 1000 });
    }
  }, [driverLat, driverLng, status]);

  return (
    <div ref={mapContainer} className={`w-full ${heightClass} rounded-xl overflow-hidden border border-border`} />
  );
}
