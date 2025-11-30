import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/productionLogger';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Vérifier si les notifications sont supportées
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur cet appareil');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        logger.info('Permission de notifications accordée');
        
        // Mettre à jour les préférences dans la base de données
        if (user) {
          const { error } = await supabase
            .from('notification_preferences')
            .upsert({
              user_id: user.id,
              push_enabled: true
            }, {
              onConflict: 'user_id'
            });

          if (error) {
            logger.error('Erreur mise à jour préférences notifications:', error);
          }
        }

        toast.success('Notifications activées avec succès');
        return true;
      } else {
        toast.error('Permission de notifications refusée');
        return false;
      }
    } catch (error) {
      logger.error('Erreur demande permission notifications:', error);
      toast.error('Erreur lors de la demande de permission');
      return false;
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      logger.warn('Permission notifications non accordée');
      return;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Utiliser le service worker pour afficher la notification
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          badge: '/pwa-192x192.png',
          icon: '/pwa-192x192.png',
          ...options
        });
      } else {
        // Fallback: utiliser l'API Notification directement
        new Notification(title, {
          badge: '/pwa-192x192.png',
          icon: '/pwa-192x192.png',
          ...options
        });
      }
    } catch (error) {
      logger.error('Erreur affichage notification:', error);
    }
  };

  const disableNotifications = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ push_enabled: false })
        .eq('user_id', user.id);

      if (error) {
        logger.error('Erreur désactivation notifications:', error);
        toast.error('Erreur lors de la désactivation');
      } else {
        toast.success('Notifications désactivées');
      }
    } catch (error) {
      logger.error('Erreur désactivation notifications:', error);
      toast.error('Erreur lors de la désactivation');
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    disableNotifications
  };
};