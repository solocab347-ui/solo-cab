/**
 * Composant invisible qui enregistre l'appareil natif (FCM/APNS) au token push
 * dès qu'un utilisateur est connecté, et déclenche le flush des notifications
 * en attente (queue fallback) au login + au retour online.
 */
import { useNativePushRegistration } from '@/hooks/useNativePushRegistration';
import { useFlushPendingPushes } from '@/hooks/useFlushPendingPushes';

export function NativePushRegistrar() {
  useNativePushRegistration();
  useFlushPendingPushes();
  return null;
}

