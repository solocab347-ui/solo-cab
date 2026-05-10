import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export interface GpsDebugFix {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracy?: number | null;
  speed?: number | null;
  bearing?: number | null;
  provider?: string | null;
  timestamp?: number | string | Date | null;
}

const PARIS_HARDCODED_POINTS = [
  { label: 'Paris centre DEFAULT', lat: 48.8566, lng: 2.3522 },
  { label: 'Beaubourg DEFAULT', lat: 48.8606, lng: 2.3522 },
  { label: 'Paris rounded DEFAULT', lat: 48.86, lng: 2.35 },
];

let lastToastAt = 0;

export function isGpsDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const override = window.localStorage.getItem('solocab_gps_debug');
  if (override === '0') return false;
  if (override === '1') return true;
  // Mode debug temporaire demandé : actif par défaut uniquement dans l'app native.
  return Capacitor.isNativePlatform();
}

export function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number'
    && typeof lng === 'number'
    && Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
    && !(lat === 0 && lng === 0);
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getParisFallbackMatch(fix: GpsDebugFix): string | null {
  if (!isValidCoordinate(fix.latitude, fix.longitude)) return null;
  const match = PARIS_HARDCODED_POINTS.find((p) => distanceMeters(fix.latitude!, fix.longitude!, p.lat, p.lng) < 120);
  return match?.label ?? null;
}

export function shouldRejectGpsFix(fix: GpsDebugFix): boolean {
  if (!isValidCoordinate(fix.latitude, fix.longitude)) return true;
  const parisMatch = getParisFallbackMatch(fix);
  const accuracy = typeof fix.accuracy === 'number' ? fix.accuracy : null;
  // On rejette uniquement les points Paris typiques sans précision réelle.
  // Un vrai chauffeur à Paris avec accuracy GPS > 1m reste autorisé.
  return !!parisMatch && (accuracy == null || accuracy <= 1);
}

export function logGpsDebug(stage: string, fix: GpsDebugFix, extra: Record<string, unknown> = {}) {
  const timestamp = fix.timestamp instanceof Date
    ? fix.timestamp.toISOString()
    : typeof fix.timestamp === 'number'
      ? new Date(fix.timestamp).toISOString()
      : fix.timestamp || new Date().toISOString();
  const parisFallback = getParisFallbackMatch(fix);
  const payload = {
    stage,
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.accuracy ?? null,
    provider: fix.provider || 'unknown',
    timestamp,
    speed: fix.speed ?? null,
    bearing: fix.bearing ?? null,
    parisFallback,
    rejected: shouldRejectGpsFix(fix),
    ...extra,
  };

  if (parisFallback || payload.rejected) console.warn('[GPS DEBUG]', payload);
  else console.log('[GPS DEBUG]', payload);

  if (!isGpsDebugEnabled()) return;
  const now = Date.now();
  if (now - lastToastAt < 12_000) return;
  lastToastAt = now;
  toast.info(`GPS ${stage}`, {
    description: `lat ${Number(fix.latitude).toFixed(6)} · lng ${Number(fix.longitude).toFixed(6)} · ±${Math.round(fix.accuracy ?? 0)}m · ${fix.provider || 'unknown'}`,
    duration: 4500,
  });
}