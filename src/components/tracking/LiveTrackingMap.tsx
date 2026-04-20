import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useETACalculation } from "@/hooks/useETACalculation";
import carTopView from "@/assets/car-top-view.png";

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
  const lastDriverPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const driverCarElRef = useRef<HTMLDivElement | null>(null);

  const { token: mapboxToken } = useMapboxToken();
  const routeTarget = useMemo(() => {
    if (status === "accepted" || status === "driver_approaching") {
      return pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null;
    }
    if (status === "driver_arrived" || status === "in_progress") {
      return destLat && destLng ? { lat: destLat, lng: destLng } : null;
    }
    return null;
  }, [status, pickupLat, pickupLng, destLat, destLng]);

  const { eta } = useETACalculation({
    driverLocation: driverLat && driverLng ? { lat: driverLat, lng: driverLng } : null,
    targetLocation: routeTarget,
    enabled: !!mapboxToken && !!driverLat && !!driverLng && !!routeTarget,
  });

  const computeBearing = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  const syncRouteLayer = (geometry: GeoJSON.LineString | null | undefined) => {
    if (!map.current?.isStyleLoaded()) return;
    // Bright orange line — high contrast on every Mapbox base style and
    // matches the requirement to clearly retrace the driver→target path.
    const ROUTE_ORANGE = "#F97316";
    const ROUTE_ORANGE_DARK = "#9A3412";
    const existing = map.current.getSource("live-route") as mapboxgl.GeoJSONSource | undefined;
    if (!geometry) {
      if (existing) {
        existing.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
          properties: {},
        } as GeoJSON.Feature<GeoJSON.LineString>);
      }
      return;
    }

    const feature = { type: "Feature", geometry, properties: {} } as GeoJSON.Feature<GeoJSON.LineString>;
    if (existing) {
      existing.setData(feature);
      return;
    }

    map.current.addSource("live-route", { type: "geojson", data: feature });
    map.current.addLayer({
      id: "live-route-casing",
      type: "line",
      source: "live-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ROUTE_ORANGE_DARK, "line-width": 9, "line-opacity": 0.55 },
    });
    map.current.addLayer({
      id: "live-route-line",
      type: "line",
      source: "live-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ROUTE_ORANGE, "line-width": 5 },
    });
  };

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

    // Pickup marker — only relevant BEFORE the client is in the car.
    // Once 'in_progress', client is with the driver, so hide the pickup pin
    // to avoid the confusing "two people in different places" UI.
    const showPickup = pickupLat && pickupLng && status !== 'in_progress';
    if (showPickup) {
      const pickupEl = document.createElement('div');
      pickupEl.innerHTML = `<div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🧑</div>`;
      pickupMarker.current = new mapboxgl.Marker({ element: pickupEl })
        .setLngLat([pickupLng, pickupLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Point de prise en charge'))
        .addTo(map.current);
    }

    // Destination marker — only relevant once the trip has started.
    // During 'driver_approaching', the focus is the pickup point.
    const showDest = destLat && destLng && (status === 'in_progress' || status === 'driver_arrived' || status === 'accepted');
    if (showDest) {
      const destEl = document.createElement('div');
      destEl.innerHTML = `<div style="background:#ef4444;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🏁</div>`;
      destMarker.current = new mapboxgl.Marker({ element: destEl })
        .setLngLat([destLng, destLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Destination'))
        .addTo(map.current);
    }

    const driverEl = document.createElement('div');
    driverEl.innerHTML = `<div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:4px;border-radius:9999px;background:hsl(var(--primary)/0.16);animation:pulse-driver 2s ease-out infinite;"></div><div data-driver-car style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;transition:transform .8s ease;transform-origin:center center;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35));"><img src="${carTopView}" alt="Véhicule" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" /></div></div>`;
    if (!document.getElementById("live-tracking-driver-pulse")) {
      const style = document.createElement("style");
      style.id = "live-tracking-driver-pulse";
      style.textContent = `@keyframes pulse-driver{0%{transform:scale(.7);opacity:.7}100%{transform:scale(1.5);opacity:0}}`;
      document.head.appendChild(style);
    }
    driverCarElRef.current = driverEl.querySelector('[data-driver-car]') as HTMLDivElement | null;
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

  // Real-time driver position update + smooth follow
  useEffect(() => {
    if (!driverLat || !driverLng || !driverMarker.current) return;
    const prev = lastDriverPosRef.current;
    if (prev && driverCarElRef.current) {
      const bearing = computeBearing(prev, { lat: driverLat, lng: driverLng });
      driverCarElRef.current.style.transform = `rotate(${bearing + 90}deg)`;
    }
    lastDriverPosRef.current = { lat: driverLat, lng: driverLng };
    driverMarker.current.setLngLat([driverLng, driverLat]);
    if ((status === 'driver_approaching' || status === 'in_progress') && map.current) {
      map.current.easeTo({ center: [driverLng, driverLat], duration: 1000 });
    }
  }, [driverLat, driverLng, status]);

  useEffect(() => {
    if (map.current?.isStyleLoaded()) {
      syncRouteLayer(eta?.routeGeometry);
      return;
    }
    const instance = map.current;
    if (!instance) return;
    const onLoad = () => syncRouteLayer(eta?.routeGeometry);
    instance.once("load", onLoad);
    return () => {
      instance.off("load", onLoad);
    };
  }, [eta?.routeGeometry]);

  // Sync pickup/destination markers when phase changes
  // (pickup hidden during in_progress, destination hidden during approach)
  useEffect(() => {
    if (!map.current) return;

    const wantPickup = !!pickupLat && !!pickupLng && status !== 'in_progress';
    const wantDest = !!destLat && !!destLng && (status === 'in_progress' || status === 'driver_arrived' || status === 'accepted');

    if (wantPickup && !pickupMarker.current) {
      const el = document.createElement('div');
      el.innerHTML = `<div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🧑</div>`;
      pickupMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([pickupLng!, pickupLat!])
        .addTo(map.current);
    } else if (!wantPickup && pickupMarker.current) {
      pickupMarker.current.remove();
      pickupMarker.current = null;
    }

    if (wantDest && !destMarker.current) {
      const el = document.createElement('div');
      el.innerHTML = `<div style="background:#ef4444;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:18px;">🏁</div>`;
      destMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([destLng!, destLat!])
        .addTo(map.current);
    } else if (!wantDest && destMarker.current) {
      destMarker.current.remove();
      destMarker.current = null;
    }
  }, [status, pickupLat, pickupLng, destLat, destLng]);

  return (
    <div ref={mapContainer} className={`w-full ${heightClass} rounded-xl overflow-hidden border border-border`} />
  );
}
