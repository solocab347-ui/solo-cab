/**
 * Realtime Idle Manager (Phase 3 cost-opt)
 *
 * Quand l'app reste cachée (onglet en arrière-plan / app mise en background)
 * pendant plus de IDLE_THRESHOLD_MS, on déconnecte le socket Realtime Supabase
 * pour libérer la connexion WebSocket (facturée en concurrence).
 *
 * À la reprise (visibilitychange → visible), on reconnecte automatiquement.
 * Les channels existants sont rejoués par supabase-js sans intervention.
 *
 * Effet : pas de WS ouvert pour un user inactif >5 min. Économie ~30-50%
 * sur les connexions realtime concurrentes en heures creuses.
 *
 * IMPORTANT : ne s'active QUE quand document.hidden, donc aucun impact
 * sur les chauffeurs en course / clients en attente actifs.
 */

import { supabase } from '@/integrations/supabase/client';

const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let disconnectedForIdle = false;

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleDisconnect() {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    try {
      if (document.hidden && !disconnectedForIdle) {
        supabase.realtime.disconnect();
        disconnectedForIdle = true;
        console.log('[realtimeIdleManager] WS realtime déconnecté (idle >5min)');
      }
    } catch (e) {
      console.warn('[realtimeIdleManager] disconnect failed', e);
    }
  }, IDLE_THRESHOLD_MS);
}

function handleVisibility() {
  if (document.hidden) {
    scheduleIdleDisconnect();
  } else {
    clearIdleTimer();
    if (disconnectedForIdle) {
      try {
        supabase.realtime.connect();
        disconnectedForIdle = false;
        console.log('[realtimeIdleManager] WS realtime reconnecté (foreground)');
      } catch (e) {
        console.warn('[realtimeIdleManager] reconnect failed', e);
      }
    }
  }
}

export function initRealtimeIdleManager() {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', handleVisibility);
  // Initial state : si on démarre déjà caché (rare), planifier
  if (document.hidden) scheduleIdleDisconnect();
}
