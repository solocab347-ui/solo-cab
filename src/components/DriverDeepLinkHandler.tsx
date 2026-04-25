/**
 * Écoute les deep-links solocab://ride/{id}?ride_action=accept|decline
 * déclenchés par les actions inline des notifications push (Android & iOS).
 *
 * Comportement :
 *  - Stocke l'action en sessionStorage (`solocab_pending_ride_action`)
 *  - Redirige vers /driver-dashboard?incoming={id}
 *  - L'overlay GlobalRideOverlay lit l'action et l'exécute automatiquement
 *
 * Sur web : no-op.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function DriverDeepLinkHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | null = null;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appUrlOpen', (event) => {
          try {
            const url = new URL(event.url);
            // Format attendu : solocab://ride/{rideId}?ride_action=accept|decline
            if (url.protocol !== 'solocab:') return;
            // host = "ride", pathname = "/{rideId}"
            if (url.host !== 'ride') return;

            const rideId = url.pathname.replace(/^\//, '');
            const action = url.searchParams.get('ride_action');

            if (!rideId) return;

            try {
              sessionStorage.setItem('solocab_pending_ride', rideId);
              if (action === 'accept' || action === 'decline') {
                sessionStorage.setItem('solocab_pending_ride_action', action);
              }
            } catch {/* ignore */}

            window.location.href = `/driver-dashboard?incoming=${encodeURIComponent(rideId)}${action ? `&action=${action}` : ''}`;
          } catch (err) {
            console.warn('[DeepLink] parse error', err);
          }
        });
        remove = () => handle.remove();
      } catch (err) {
        console.warn('[DeepLink] init failed', err);
      }
    })();

    return () => { remove?.(); };
  }, []);

  return null;
}
