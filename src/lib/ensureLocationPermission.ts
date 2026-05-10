/**
 * ensureLocationPermission — déclenche le prompt système de localisation
 * AVANT toute action qui en dépend (passage en ligne, démarrage de course...).
 *
 * Sur Android natif :
 *   1. Vérifie l'état actuel via @capacitor/geolocation.
 *   2. Si non accordée, appelle requestPermissions({ permissions: ['location','coarseLocation'] })
 *      → l'OS affiche la boîte de dialogue système ("Autoriser SoloCab à accéder à la position").
 *   3. Renvoie un booléen indiquant si la permission est désormais accordée (au moins coarse).
 *
 * Sur web : utilise navigator.geolocation.getCurrentPosition pour déclencher le prompt navigateur.
 *
 * Toutes les erreurs sont catchées : la fonction renvoie false plutôt que de throw,
 * pour ne jamais bloquer le flow en cas de plugin manquant.
 */
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export type LocationPermissionResult = 'granted' | 'denied' | 'prompt' | 'unavailable';

export async function ensureLocationPermission(opts: { silent?: boolean } = {}): Promise<LocationPermissionResult> {
  const silent = !!opts.silent;
  try {
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');

      // 1. État actuel
      let status = await Geolocation.checkPermissions();
      const isGranted = (s: any) =>
        s?.location === 'granted' || s?.coarseLocation === 'granted';

      if (isGranted(status)) return 'granted';

      // 2. Demande explicite (déclenche le prompt système Android)
      try {
        status = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation'],
        } as any);
      } catch (e) {
        console.warn('[ensureLocationPermission] requestPermissions failed', e);
      }

      if (isGranted(status)) return 'granted';

      if (status?.location === 'denied' || status?.coarseLocation === 'denied') {
        if (!silent) {
          toast.error("Localisation refusée", {
            description: "Active la localisation dans Réglages > Applications > SoloCab > Autorisations.",
            duration: 8000,
          });
        }
        return 'denied';
      }
      return 'prompt';
    }

    // Web fallback
    if ('geolocation' in navigator) {
      const granted = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
      return granted ? 'granted' : 'denied';
    }
    return 'unavailable';
  } catch (e) {
    console.warn('[ensureLocationPermission] error', e);
    return 'unavailable';
  }
}
