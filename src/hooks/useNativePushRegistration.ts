/**
 * Enregistre l'appareil natif (Android FCM / iOS APNS) dans la table push_tokens
 * dès que l'utilisateur est connecté ET que la permission est accordée.
 *
 * Sur web, ce hook est un no-op (le système web push utilise déjà usePushNotificationsV2).
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useNativePushRegistration() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform() || registeredRef.current) return;

    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { Device } = await import('@capacitor/device');
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // 1. Créer le canal Android haute priorité
        if (Capacitor.getPlatform() === 'android') {
          await LocalNotifications.createChannel({
            id: 'solocab_rides',
            name: 'Nouvelles courses',
            description: 'Alertes de courses entrantes (réveil immédiat)',
            importance: 5, // IMPORTANCE_HIGH
            visibility: 1,
            sound: 'ride_alert.wav',
            vibration: true,
            lights: true,
            lightColor: '#FF6B00',
          }).catch(() => {/* déjà créé */});
        }

        // 2. Vérifier permission, sinon demander
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive !== 'granted') {
          const req = await PushNotifications.requestPermissions();
          if (req.receive !== 'granted') return;
        }

        // 3. S'enregistrer auprès de FCM/APNS
        await PushNotifications.register();

        // 4. Récupérer le token et le persister
        const tokenHandle = await PushNotifications.addListener('registration', async (token) => {
          try {
            const deviceInfo = await Device.getInfo();
            const deviceId = await Device.getId();
            await supabase.from('push_tokens').upsert({
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform() as 'android' | 'ios',
              device_id: deviceId.identifier,
              device_model: deviceInfo.model,
              app_version: deviceInfo.osVersion,
              is_active: true,
              last_used_at: new Date().toISOString(),
            }, { onConflict: 'user_id,token' });
            registeredRef.current = true;
          } catch (err) {
            console.error('[NativePush] persist token error', err);
          }
        });

        // 5. Erreur d'enregistrement
        const errHandle = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[NativePush] registration error', err);
        });

        // 6. Push reçu en foreground → afficher local notif full-screen
        const recvHandle = await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          const data = notification.data || {};
          if (data.type === 'incoming_ride') {
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 100000,
                title: notification.title || '🚖 Nouvelle course !',
                body: notification.body || 'Course disponible',
                channelId: 'solocab_rides',
                sound: 'ride_alert.wav',
                ongoing: false,
                autoCancel: true,
                extra: data,
              }],
            });
          }
        });

        // 7. User tape sur la notification → router vers le dashboard
        const actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data || {};
          if (data.type === 'incoming_ride') {
            window.location.href = '/driver-dashboard?view=map';
          }
        });

        cleanup = () => {
          tokenHandle.remove();
          errHandle.remove();
          recvHandle.remove();
          actionHandle.remove();
        };
      } catch (err) {
        console.error('[NativePush] init error', err);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [user?.id]);
}
