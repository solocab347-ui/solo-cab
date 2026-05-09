/**
 * Permission "Affichage par-dessus les autres apps" (Android SYSTEM_ALERT_WINDOW).
 *
 * Cette permission est INDISPENSABLE pour que la popup d'incoming course
 * s'affiche par-dessus n'importe quelle autre app (style Uber/Bolt) quand
 * SoloCab est en arrière-plan.
 *
 * Implémentation :
 *  - Web / iOS / Android < 6 : `unsupported` → `isEnabled = true` (pas de blocage UI).
 *  - Android 6+ natif : on appelle réellement `Settings.canDrawOverlays(...)` via le
 *    plugin Capacitor custom `SoloCabPermissions`. `grant()` ouvre l'écran système
 *    `ACTION_MANAGE_OVERLAY_PERMISSION` et re-vérifie au retour.
 *  - "Plus tard" (`deny`) : snooze de 1 h pour ne pas spammer le chauffeur.
 *
 * NOTE : avant cette refonte, le hook stockait juste un flag localStorage et
 * mentait à l'utilisateur (jamais de vraie demande système). Corrigé.
 */
import { useState, useEffect, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface SoloCabPermissionsPlugin {
  openOverlaySettings(): Promise<{ overlay?: boolean }>;
  checkSpecialPermissions(): Promise<{ overlay?: boolean }>;
}
const SoloCabPermissions = registerPlugin<SoloCabPermissionsPlugin>('SoloCabPermissions');

const SNOOZE_KEY = 'solocab_overlay_snoozed_until';

export type OverlayPermissionStatus = 'granted' | 'denied' | 'not_asked' | 'unsupported';

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export function useOverlayPermission(driverId: string | null) {
  const [status, setStatus] = useState<OverlayPermissionStatus>(
    isAndroidNative() ? 'not_asked' : 'unsupported',
  );
  const [snoozed, setSnoozed] = useState(false);

  const snoozeStorageKey = driverId ? `${SNOOZE_KEY}_${driverId}` : null;

  const refresh = useCallback(async () => {
    if (!isAndroidNative()) {
      setStatus('unsupported');
      return;
    }
    try {
      const r = await SoloCabPermissions.checkSpecialPermissions();
      setStatus(r.overlay ? 'granted' : 'not_asked');
    } catch {
      // Plugin indisponible (APK pas rebuild) → on suppose non-accordé sans bloquer
      setStatus('not_asked');
    }
  }, []);

  // Initial check + snooze restore
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!snoozeStorageKey) return;
    const raw = localStorage.getItem(snoozeStorageKey);
    if (raw && Date.now() < Number(raw)) {
      setSnoozed(true);
    } else {
      localStorage.removeItem(snoozeStorageKey);
      setSnoozed(false);
    }
  }, [snoozeStorageKey]);

  // Re-check au retour foreground (l'utilisateur peut avoir activé la perm)
  useEffect(() => {
    if (!isAndroidNative()) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  const grant = useCallback(async () => {
    if (!isAndroidNative()) {
      setStatus('granted');
      return;
    }
    try {
      const r = await SoloCabPermissions.openOverlaySettings();
      setStatus(r.overlay ? 'granted' : 'not_asked');
      setSnoozed(false);
    } catch {
      // Plugin manquant : best-effort, on tente l'intent fallback
      try {
        window.location.href = `intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;package=com.solocab.app;end`;
      } catch {/* ignore */}
    }
  }, []);

  const deny = useCallback(() => {
    if (!snoozeStorageKey) return;
    const oneHour = Date.now() + 60 * 60 * 1000;
    localStorage.setItem(snoozeStorageKey, String(oneHour));
    setSnoozed(true);
  }, [snoozeStorageKey]);

  const reset = useCallback(() => {
    if (snoozeStorageKey) localStorage.removeItem(snoozeStorageKey);
    setSnoozed(false);
    void refresh();
  }, [snoozeStorageKey, refresh]);

  const isEnabled = status === 'granted' || status === 'unsupported';
  const shouldPrompt = status === 'not_asked' && !snoozed;

  return { status, grant, deny, reset, refresh, shouldPrompt, isEnabled };
}
