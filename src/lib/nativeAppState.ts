/**
 * Bridge Capacitor App state -> subscriptionManager + realtimeHealthLogger.
 *
 * Sur native, `visibilitychange` ne se déclenche pas de façon fiable dans la
 * WebView Android quand l'OS suspend l'app. On utilise `App.addListener('appStateChange')`
 * et `App.addListener('resume')` pour forcer un healthcheck Realtime à chaque
 * retour au premier plan, et logger les transitions pour l'observabilité.
 */
import { subscriptionManager } from '@/lib/subscriptionManager';
import { realtimeHealthLogger } from '@/lib/realtimeHealthLogger';

let initialized = false;

export async function initNativeAppStateBridge() {
  if (initialized) return;
  initialized = true;

  try {
    const isCapacitor = typeof (window as any)?.Capacitor !== 'undefined';
    if (!isCapacitor) return;

    const { App } = await import('@capacitor/app');

    App.addListener('appStateChange', ({ isActive }) => {
      realtimeHealthLogger.log({
        event_type: isActive ? 'app_state_resume' : 'app_state_pause',
        details: { source: 'capacitor_app_state' },
      });
      if (isActive) {
        // Petit délai pour laisser le réseau revenir
        setTimeout(() => subscriptionManager.healthCheck('capacitor_resume'), 250);
      } else {
        // Flush immédiat avant suspension probable
        realtimeHealthLogger.flush(true);
      }
    });

    App.addListener('resume', () => {
      realtimeHealthLogger.log({
        event_type: 'app_state_resume',
        details: { source: 'capacitor_resume_event' },
      });
      setTimeout(() => subscriptionManager.healthCheck('capacitor_resume_event'), 250);
    });
  } catch (err) {
    console.warn('[nativeAppState] init failed (probably web)', err);
  }
}
