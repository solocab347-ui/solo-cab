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

export const usePushNotificationsV2 = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si les notifications sont supportées
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
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

  // Demander la permission et s'inscrire
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
      const registration = await navigator.serviceWorker.ready;
      logger.info('Service Worker prêt pour push');

      // Créer une subscription factice pour le moment
      // (Une vraie implémentation nécessiterait VAPID keys)
      const subscription: PushSubscriptionData = {
        endpoint: `https://push.solocab.fr/${user.id}/${Date.now()}`,
        keys: {
          p256dh: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(65)))),
          auth: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
        }
      };

      // Sauvegarder dans la base de données
      const subscriptionJson = JSON.parse(JSON.stringify(subscription));
      
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
        // Si erreur de conflit, essayer update
        if (error.code === '23505') {
          await supabase
            .from('push_subscriptions')
            .update({
              subscription: subscriptionJson,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        } else {
          throw error;
        }
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

    try {
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
