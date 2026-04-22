/**
 * Composant invisible qui enregistre l'appareil natif (FCM/APNS) au token push
 * dès qu'un utilisateur est connecté. Doit être monté à la racine de l'app.
 */
import { useNativePushRegistration } from '@/hooks/useNativePushRegistration';

export function NativePushRegistrar() {
  useNativePushRegistration();
  return null;
}
