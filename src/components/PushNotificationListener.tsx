import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/productionLogger';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const PushNotificationListener = () => {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastNotificationRef = useRef<string | null>(null);

  const showBrowserNotification = useCallback(async (title: string, body: string, link?: string, notificationId?: string) => {
    // Vérifier la permission
    if (Notification.permission !== 'granted') {
      logger.warn('Notifications non autorisées');
      return;
    }

    try {
      // Éviter les doublons
      const tag = notificationId || `${title}-${Date.now()}`;
      if (lastNotificationRef.current === tag) {
        logger.info('Notification déjà affichée, ignorée');
        return;
      }
      lastNotificationRef.current = tag;

      const options: NotificationOptions = {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag,
        data: { url: link || '/notifications' },
        requireInteraction: false
      };

      // Essayer via Service Worker d'abord
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        logger.info('Notification push affichée via SW:', { title });
      } else {
        // Fallback vers Notification API standard
        new Notification(title, options);
        logger.info('Notification affichée via API standard:', { title });
      }

      // Reset après 5 secondes pour permettre de nouvelles notifications
      setTimeout(() => {
        if (lastNotificationRef.current === tag) {
          lastNotificationRef.current = null;
        }
      }, 5000);

    } catch (error) {
      logger.error('Erreur affichage notification:', { error });
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Demander la permission si pas encore fait
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        logger.info('Permission notifications:', { permission });
      });
    }

    logger.info('Démarrage écoute notifications en temps réel pour:', { userId: user.id });

    // S'abonner aux nouvelles notifications avec un canal unique
    const channelName = `notifications-realtime-${user.id}-${Date.now()}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('📬 Nouvelle notification reçue via realtime:', { payload: payload.new });
          
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
            link?: string;
          };

          // Afficher la notification push du navigateur
          if (Notification.permission === 'granted') {
            showBrowserNotification(
              notification.title,
              notification.message,
              notification.link,
              `solocab-${notification.id}`
            );
          }
        }
      )
      .subscribe((status) => {
        logger.info('Statut subscription realtime:', { status });
      });

    return () => {
      logger.info('Arrêt écoute notifications en temps réel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, showBrowserNotification]);

  return null;
};