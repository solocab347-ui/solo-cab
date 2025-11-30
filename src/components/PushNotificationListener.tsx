import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { logger } from '@/lib/productionLogger';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const PushNotificationListener = () => {
  const { user } = useAuth();
  const { permission, showNotification } = usePushNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || permission !== 'granted') return;

    logger.info('Démarrage écoute notifications en temps réel');

    // S'abonner aux nouvelles notifications
    channelRef.current = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('Nouvelle notification reçue:', payload.new);
          
          const notification = payload.new as {
            title: string;
            message: string;
            type: string;
            link?: string;
          };

          // Afficher la notification du navigateur
          showNotification(notification.title, {
            body: notification.message,
            tag: `solocab-${payload.new.id}`,
            data: {
              url: notification.link || '/notifications'
            },
            requireInteraction: false,
            silent: false
          });
        }
      )
      .subscribe();

    return () => {
      logger.info('Arrêt écoute notifications en temps réel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, permission, showNotification]);

  return null;
};