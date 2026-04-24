import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/productionLogger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Système de sons contextuels
import { playNotificationSoundByType } from '@/lib/notificationSounds';
import { playSoloCabSound } from '@/lib/solocabNotificationSound';

export const PushNotificationListener = () => {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastNotificationRef = useRef<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const showBrowserNotification = useCallback(async (title: string, body: string, link?: string, notificationId?: string, notificationType?: string) => {
    // Jouer le son adapté au type de notification
    await playNotificationSoundByType(notificationType, title);

    // Vérifier la permission
    if (!('Notification' in window)) {
      logger.warn('Notifications non supportées par ce navigateur', {});
      // Montrer via toast en fallback
      toast.info(title, { 
        description: body,
        action: link ? {
          label: 'Voir',
          onClick: () => window.location.href = link
        } : undefined
      });
      return;
    }

    if (Notification.permission !== 'granted') {
      logger.warn('Notifications non autorisées', { permission: Notification.permission });
      // Montrer via toast en fallback
      toast.info(title, { 
        description: body,
        action: link ? {
          label: 'Voir',
          onClick: () => window.location.href = link
        } : undefined
      });
      return;
    }

    try {
      // Éviter les doublons
      const tag = notificationId || `${title}-${Date.now()}`;
      if (lastNotificationRef.current === tag) {
        logger.info('Notification déjà affichée, ignorée', { tag });
        return;
      }
      lastNotificationRef.current = tag;

      const options: NotificationOptions = {
        body,
        icon: '/app-icon-1024.png',
        badge: '/app-icon-1024.png',
        tag,
        data: { url: link || '/notifications' },
        requireInteraction: false,
        silent: false // Permettre le son système aussi
      };

      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        if (link) window.location.href = link;
        notification.close();
      };
      logger.info('Notification affichée via API standard', { title });

      // Reset après 5 secondes pour permettre de nouvelles notifications
      setTimeout(() => {
        if (lastNotificationRef.current === tag) {
          lastNotificationRef.current = null;
        }
      }, 5000);

    } catch (error) {
      logger.error('Erreur affichage notification', { error });
      // Montrer via toast en dernier recours
      toast.info(title, { 
        description: body,
        action: link ? {
          label: 'Voir',
          onClick: () => window.location.href = link
        } : undefined
      });
    }
  }, []);

  // Le son SoloCab est généré à la demande via Web Audio API (pas besoin de préchargement)

  // Demander la permission au montage si pas encore fait
  useEffect(() => {
    if (!user) return;

    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        logger.info('Demande de permission notifications', {});
        try {
          const permission = await Notification.requestPermission();
          logger.info('Permission notifications obtenue', { permission });
        } catch (error) {
          logger.error('Erreur demande permission', { error });
        }
      }
    };

    requestNotificationPermission();
  }, [user]);

  // Écouter les notifications en temps réel
  useEffect(() => {
    if (!user) {
      setIsListening(false);
      return;
    }

    logger.info('Démarrage écoute notifications', { userId: user.id });

    // S'abonner via centralized manager
    const cleanup = subscriptionManager.subscribe(
      `push-notifications-${user.id}`,
      { table: 'notifications', event: 'INSERT', filter: `user_id=eq.${user.id}` },
      (payload) => {
        const notification = payload.new as {
          id: string;
          title: string;
          message: string;
          type: string;
          link?: string;
        };

        logger.info('Nouvelle notification reçue', {
          id: notification.id,
          title: notification.title,
          type: notification.type
        });

        showBrowserNotification(
          notification.title,
          notification.message,
          notification.link,
          `solocab-${notification.id}`,
          notification.type
        );
      }
    );

    setIsListening(true);

    return () => {
      logger.info('Arrêt écoute notifications', {});
      cleanup();
      setIsListening(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Log d'état pour debug
  useEffect(() => {
    if (user && isListening) {
      logger.info('Système de notifications push actif', { email: user.email });
    }
  }, [user, isListening]);

  return null;
};
