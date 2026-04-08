/**
 * Persists and restores storefront search state via sessionStorage
 * so that navigating to a driver profile and back doesn't lose results.
 */

const STORAGE_KEY = 'solocab_storefront_state';

export interface StorefrontState {
  pickupAddress: string;
  destinationAddress: string;
  pickupCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  mode: 'reservation' | 'immediate';
  scheduledDate: string;
  scheduledTime: string;
  maxSearchRadiusKm: number;
  clientPaymentMethod: 'card' | 'cash' | null;
  routeDistanceKm: number | null;
  routeDurationMin: number | null;
  hasSearched: boolean;
  selectedDriverIds: string[];
  // Guest info
  guestName: string;
  guestPhone: string;
  guestEmail: string;
}

export function saveStorefrontState(state: StorefrontState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail on quota
  }
}

export function loadStorefrontState(): StorefrontState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StorefrontState;
  } catch {
    return null;
  }
}

export function clearStorefrontState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
