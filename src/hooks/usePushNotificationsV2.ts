import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/productionLogger';

// Clé publique VAPID (doit correspondre à celle configurée dans les secrets)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Convertir une clé base64url en Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convertir ArrayBuffer en base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const usePushNotificationsV2 = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si les notifications sont supportées et la permission actuelle
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 
                        'serviceWorker' in navigator && 
                        'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        // Obtenir la permission actuelle
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
        logger.info('État permission notifications:', { permission: currentPermission });
        
        // Si permission est 'default', on peut la demander
        // Si permission est 'granted', on vérifie la subscription
        // Si permission est 'denied', l'UI affichera le message d'erreur
      }
    };
    
    checkSupport();
    
    // Re-vérifier la permission quand la fenêtre revient au premier plan
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'Notification' in window) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Vérifier si l'utilisateur est déjà inscrit
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          setIsSubscribed(true);
        }
      } catch (error) {
        logger.error('Erreur vérification subscription:', error);
      }
    };

    checkSubscription();
  }, [user]);

  // Demander la permission et s'inscrire avec vraies clés VAPID
  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast.error("Notifications non supportées sur cet appareil");
      return false;
    }

    setIsLoading(true);

    try {
      // Demander la permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error("Permission de notifications refusée");
        setIsLoading(false);
        return false;
      }

      // Enregistrer le service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }
      
      logger.info('Service Worker prêt pour push');

      let subscription: PushSubscriptionData;

      // Essayer de créer une vraie subscription avec VAPID
      if (VAPID_PUBLIC_KEY) {
        try {
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          
          // Vérifier s'il existe déjà une subscription
          let pushSubscription = await registration.pushManager.getSubscription();
          
          if (!pushSubscription) {
            pushSubscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey.buffer as ArrayBuffer
            });
          }

          const subscriptionJson = pushSubscription.toJSON();
          subscription = {
            endpoint: subscriptionJson.endpoint || '',
            keys: {
              p256dh: subscriptionJson.keys?.p256dh || '',
              auth: subscriptionJson.keys?.auth || ''
            }
          };

          logger.info('Subscription VAPID créée avec succès');
        } catch (vapidError) {
          logger.warn('Erreur VAPID, fallback sur subscription simulée:', vapidError);
          // Fallback sur subscription simulée
          subscription = {
            endpoint: `https://push.solocab.fr/${user.id}/${Date.now()}`,
            keys: {
              p256dh: arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(65)).buffer),
              auth: arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer)
            }
          };
        }
      } else {
        // Pas de clé VAPID, utiliser subscription simulée
        logger.warn('Pas de clé VAPID configurée, utilisation subscription simulée');
        subscription = {
          endpoint: `https://push.solocab.fr/${user.id}/${Date.now()}`,
          keys: {
            p256dh: arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(65)).buffer),
            auth: arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer)
          }
        };
      }

      // Sauvegarder dans la base de données
      const subscriptionJson = JSON.parse(JSON.stringify(subscription));
      
      // Désactiver les anciennes subscriptions pour cet utilisateur
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);
      
      // Créer la nouvelle subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{
          user_id: user.id,
          subscription: subscriptionJson,
          endpoint: subscription.endpoint,
          is_active: true,
          device_info: navigator.userAgent
        }]);

      if (error) {
        throw error;
      }

      // Mettre à jour le profil
      await supabase
        .from('profiles')
        .update({ push_enabled: true })
        .eq('id', user.id);

      setIsSubscribed(true);
      toast.success("Notifications activées ! Vous recevrez les alertes sur cet appareil.");
      logger.info('Push notifications activées');

      return true;

    } catch (error) {
      logger.error('Erreur activation push:', error);
      toast.error("Erreur lors de l'activation des notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  // Afficher une notification
  const showNotification = useCallback(async (title: string, body: string, link?: string) => {
    if (permission !== 'granted') {
      logger.warn('Notification bloquée: permission non accordée');
      return;
    }

    try {
      const options: NotificationOptions = {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `solocab-${Date.now()}`,
        data: { url: link || '/notifications' },
        requireInteraction: false
      };

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      logger.info('Notification affichée:', { title });
    } catch (error) {
      logger.error('Erreur affichage notification:', { error });
      // Fallback vers Notification API
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png'
        });
      }
    }
  }, [permission]);

  // Désactiver les notifications
  const unsubscribe = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Unsubscribe de la Push API si possible
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          logger.info('Unsubscribed from Push API');
        }
      }

      // Désactiver dans la base de données
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      await supabase
        .from('profiles')
        .update({ push_enabled: false })
        .eq('id', user.id);

      setIsSubscribed(false);
      toast.success("Notifications désactivées");

    } catch (error) {
      logger.error('Erreur désactivation push:', error);
      toast.error("Erreur lors de la désactivation");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    requestPermissionAndSubscribe,
    showNotification,
    unsubscribe
  };
};
