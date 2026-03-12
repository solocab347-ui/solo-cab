import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/productionLogger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Son signature SoloCab — Swoosh + Ding
import { playSoloCabSound } from '@/lib/solocabNotificationSound';

const playNotificationSound = async () => {
  try {
    await playSoloCabSound(0.7);
    logger.info('Son SoloCab joué', {});
  } catch (error) {
    logger.warn('Impossible de jouer le son SoloCab:', { error });
  }
};

export const PushNotificationListener = () => {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastNotificationRef = useRef<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const showBrowserNotification = useCallback(async (title: string, body: string, link?: string, notificationId?: string) => {
    // Jouer le son d'alerte
    await playNotificationSound();

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
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag,
        data: { url: link || '/notifications' },
        requireInteraction: false,
        silent: false // Permettre le son système aussi
      };

      // Essayer via Service Worker d'abord (requis pour notifications mobiles)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
          logger.info('Notification push affichée via SW', { title, body });
        } catch (swError) {
          logger.warn('SW notification échouée, fallback API', { error: swError });
          // Fallback vers Notification API standard avec gestionnaire de clic
          const notification = new Notification(title, { body, icon: '/pwa-192x192.png', tag });
          notification.onclick = () => {
            window.focus();
            if (link) window.location.href = link;
            notification.close();
          };
          logger.info('Notification affichée via API standard', { title });
        }
      } else {
        // Fallback vers Notification API standard avec gestionnaire de clic
        const notification = new Notification(title, { body, icon: '/pwa-192x192.png', tag });
        notification.onclick = () => {
          window.focus();
          if (link) window.location.href = link;
          notification.close();
        };
        logger.info('Notification affichée via API standard', { title });
      }

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

  // Précharger le son au montage
  useEffect(() => {
    initNotificationSound();
  }, []);

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

    // Nettoyer l'ancien canal s'il existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // S'abonner aux nouvelles notifications avec un canal unique
    const channelName = `push-notifications-${user.id}-${Date.now()}`;
    
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

          // Afficher la notification push du navigateur
          showBrowserNotification(
            notification.title,
            notification.message,
            notification.link,
            `solocab-${notification.id}`
          );
        }
      )
      .subscribe((status) => {
        const statusStr = String(status);
        logger.info('Statut écoute notifications', { status: statusStr });
        setIsListening(statusStr === 'SUBSCRIBED');
        
        if (statusStr === 'SUBSCRIBED') {
          logger.info('Écoute notifications activée', {});
        } else if (statusStr === 'CHANNEL_ERROR') {
          // Log silencieux, pas de reconnexion automatique pour éviter les boucles
          console.warn('[Notifications] Canal en erreur, pas de reconnexion automatique');
        }
      });

    return () => {
      logger.info('Arrêt écoute notifications', {});
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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
