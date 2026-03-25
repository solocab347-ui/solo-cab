import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'solocab_overlay_permission';

export type OverlayPermissionStatus = 'granted' | 'denied' | 'not_asked';

export function useOverlayPermission(driverId: string | null) {
  const [status, setStatus] = useState<OverlayPermissionStatus>('not_asked');

  const storageKey = driverId ? `${STORAGE_KEY}_${driverId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored === 'granted' || stored === 'denied') {
      setStatus(stored);
    } else {
      setStatus('not_asked');
    }
  }, [storageKey]);

  const grant = useCallback(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, 'granted');
    setStatus('granted');
  }, [storageKey]);

  const deny = useCallback(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, 'denied');
    setStatus('denied');
  }, [storageKey]);

  const reset = useCallback(() => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    setStatus('not_asked');
  }, [storageKey]);

  const shouldPrompt = status !== 'granted';
  const isEnabled = status === 'granted';

  return { status, grant, deny, reset, shouldPrompt, isEnabled };
}
