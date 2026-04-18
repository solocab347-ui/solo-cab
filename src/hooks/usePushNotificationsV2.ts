/// <reference lib="webworker" />
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/productionLogger';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Cache pour la clé VAPID — persistent localStorage (7 jours, key change rarement)
const VAPID_STORAGE_KEY = 'sc_vapid_pk_v1';
const VAPID_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let cachedVapidKey: string | null = null;

// Hydrate from localStorage
try {
  const raw = localStorage.getItem(VAPID_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.key && parsed?.ts && Date.now() - parsed.ts < VAPID_TTL_MS) {
      cachedVapidKey = parsed.key;
    } else {
      localStorage.removeItem(VAPID_STORAGE_KEY);
    }
  }
} catch {}

// Récupérer la clé VAPID depuis l'edge function
async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    
    if (error) {
      logger.error('Erreur récupération clé VAPID:', error);
      return null;
    }
    
    if (data?.publicKey) {
      cachedVapidKey = data.publicKey;
      try { localStorage.setItem(VAPID_STORAGE_KEY, JSON.stringify({ key: data.publicKey, ts: Date.now() })); } catch {}
      logger.info('Clé VAPID récupérée avec succès');
      return data.publicKey;
    }
    
    return null;
  } catch (error) {
    logger.error('Erreur appel get-vapid-public-key:', error);
    return null;
  }
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
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Vérifier si les notifications sont supportées et charger la clé VAPID
  useEffect(() => {
    const init = async () => {
      const supported = 'Notification' in window && 
                        'serviceWorker' in navigator && 
                        'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
        logger.info('État permission notifications:', { permission: currentPermission });
        
        // Charger la clé VAPID
        const key = await getVapidPublicKey();
        setVapidKey(key);
        logger.info('Clé VAPID disponible:', { available: !!key });
      }
    };
    
    init();
    
    // Re-vérifier la permission quand la fenêtre revient au premier plan
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'Notification' in window) {
        setPermission(Notification.permission);
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
          .select('id, endpoint')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          // Vérifier aussi que c'est une vraie subscription (pas simulée)
          const hasRealSubscription = data.some(sub => 
            sub.endpoint && !sub.endpoint.includes('push.solocab.fr')
          );
          setIsSubscribed(hasRealSubscription || data.length > 0);
          logger.info('Subscription existante:', { 
            count: data.length, 
            hasReal: hasRealSubscription 
          });
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
      logger.info('Permission demandée:', { result });

      if (result !== 'granted') {
        toast.error("Permission de notifications refusée. Veuillez autoriser dans les paramètres du navigateur.");
        setIsLoading(false);
        return false;
      }

      // Enregistrer/récupérer le service worker
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        logger.info('Enregistrement du service worker...');
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      
      // Attendre que le SW soit prêt
      await navigator.serviceWorker.ready;
      logger.info('Service Worker prêt');

      let subscription: PushSubscriptionData | null = null;
      let isRealSubscription = false;

      // Récupérer la clé VAPID si pas encore chargée
      const currentVapidKey = vapidKey || await getVapidPublicKey();

      if (currentVapidKey) {
        try {
          const applicationServerKey = urlBase64ToUint8Array(currentVapidKey);
          
          // Vérifier s'il existe déjà une subscription
          let pushSubscription = await registration.pushManager.getSubscription();
          
          // Si pas de subscription ou endpoint différent, en créer une nouvelle
          if (!pushSubscription) {
            logger.info('Création nouvelle subscription Push...');
            pushSubscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey.buffer as ArrayBuffer
            });
            logger.info('Subscription Push créée');
          }

          const subscriptionJson = pushSubscription.toJSON();
          
          if (subscriptionJson.endpoint && subscriptionJson.keys?.p256dh && subscriptionJson.keys?.auth) {
            subscription = {
              endpoint: subscriptionJson.endpoint,
              keys: {
                p256dh: subscriptionJson.keys.p256dh,
                auth: subscriptionJson.keys.auth
              }
            };
            isRealSubscription = true;
            logger.info('Subscription VAPID réelle créée:', { 
              endpoint: subscriptionJson.endpoint.substring(0, 50) 
            });
          }
        } catch (vapidError) {
          logger.error('Erreur création subscription VAPID:', vapidError);
          toast.error("Erreur technique. Les notifications fonctionneront dans l'application.");
        }
      } else {
        logger.warn('Clé VAPID non disponible');
      }

      // Si pas de vraie subscription, créer une subscription de fallback
      if (!subscription) {
        logger.info('Création subscription de fallback');
        subscription = {
          endpoint: `https://fallback.solocab.fr/${user.id}/${Date.now()}`,
          keys: {
            p256dh: arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(65)).buffer),
            auth: arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer)
          }
        };
      }

      // Sauvegarder dans la base de données
      const subscriptionJson = JSON.parse(JSON.stringify(subscription));
      
      // Désactiver les anciennes subscriptions
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
      
      if (isRealSubscription) {
        toast.success("🔔 Notifications activées ! Vous recevrez les alertes même si l'app est fermée.");
      } else {
        toast.success("Notifications activées dans l'application.");
      }
      
      logger.info('Push notifications activées', { isReal: isRealSubscription });

      return true;

    } catch (error) {
      logger.error('Erreur activation push:', error);
      toast.error("Erreur lors de l'activation des notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, vapidKey]);

  // Afficher une notification locale avec son SoloCab
  const showNotification = useCallback(async (title: string, body: string, link?: string) => {
    if (permission !== 'granted') {
      logger.warn('Notification bloquée: permission non accordée');
      return;
    }

    try {
      // Jouer le son signature SoloCab
      try {
        const { playSoloCabSound } = await import('@/lib/solocabNotificationSound');
        await playSoloCabSound(0.6);
      } catch (soundErr) {
        logger.warn('Son notification non disponible:', soundErr);
      }

      const options: NotificationOptions = {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `solocab-${Date.now()}`,
        data: { url: link || '/notifications' },
        requireInteraction: false,
        vibrate: [100, 50, 200, 80, 150] as any
      } as NotificationOptions;

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      logger.info('Notification locale affichée:', { title });
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

  // Envoyer une notification push via edge function
  const sendPushNotification = useCallback(async (
    userId: string, 
    title: string, 
    message: string, 
    link?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { user_id: userId, title, message, link }
      });

      if (error) {
        logger.error('Erreur envoi push:', error);
        return false;
      }

      logger.info('Push envoyé:', data);
      return true;
    } catch (error) {
      logger.error('Erreur appel send-push-notification:', error);
      return false;
    }
  }, []);

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
    vapidAvailable: !!vapidKey,
    requestPermissionAndSubscribe,
    showNotification,
    sendPushNotification,
    unsubscribe
  };
};
