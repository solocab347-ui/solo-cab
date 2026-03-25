import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'solocab_overlay_permission';
const SNOOZE_KEY = 'solocab_overlay_snoozed_until';

export type OverlayPermissionStatus = 'granted' | 'denied' | 'not_asked';

export function useOverlayPermission(driverId: string | null) {
  const [status, setStatus] = useState<OverlayPermissionStatus>('not_asked');
  const [snoozed, setSnoozed] = useState(false);

  const storageKey = driverId ? `${STORAGE_KEY}_${driverId}` : null;
  const snoozeStorageKey = driverId ? `${SNOOZE_KEY}_${driverId}` : null;

  useEffect(() => {
    if (!storageKey || !snoozeStorageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored === 'granted') {
      setStatus('granted');
    } else {
      setStatus('not_asked');
      // Check if snoozed (user clicked "Plus tard")
      const snoozedUntil = localStorage.getItem(snoozeStorageKey);
      if (snoozedUntil && Date.now() < Number(snoozedUntil)) {
        setSnoozed(true);
      } else {
        localStorage.removeItem(snoozeStorageKey);
        setSnoozed(false);
      }
    }
  }, [storageKey, snoozeStorageKey]);

  const grant = useCallback(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, 'granted');
    setStatus('granted');
    setSnoozed(false);
  }, [storageKey]);

  // "Plus tard" — snooze for 1 hour, then re-ask
  const deny = useCallback(() => {
    if (!snoozeStorageKey) return;
    const oneHour = Date.now() + 60 * 60 * 1000;
    localStorage.setItem(snoozeStorageKey, String(oneHour));
    setSnoozed(true);
  }, [snoozeStorageKey]);

  const reset = useCallback(() => {
    if (!storageKey || !snoozeStorageKey) return;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(snoozeStorageKey);
    setStatus('not_asked');
    setSnoozed(false);
  }, [storageKey, snoozeStorageKey]);

  const isEnabled = status === 'granted';
  const shouldPrompt = !isEnabled && !snoozed;

  return { status, grant, deny, reset, shouldPrompt, isEnabled };
}
