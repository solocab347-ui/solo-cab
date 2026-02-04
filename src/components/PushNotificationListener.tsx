import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/productionLogger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Son de notification SoloCab - chime court en base64 (WAV)
// Ce son est un simple "ding" de notification
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB/f39/f39/f39/f39/f4CAgICBgYGBgoKCgoKCgoKDg4ODg4ODg4SEhISEhISEhYWFhYWFhYaGhoaGhoaHh4eHh4eHiIiIiIiIiImJiYmJiYmKioqKioqKi4uLi4uLi4yMjIyMjIyNjY2NjY2Njo6Ojo6Ojo+Pj4+Pj4+QkJCQkJCQkZGRkZGRkZKSkpKSkpKTk5OTk5OTlJSUlJSUlJWVlZWVlZWWlpaWlpaWl5eXl5eXl5iYmJiYmJiZmZmZmZmZmpqampqampu b m5ubm5ucnJycnJycnZ2dnZ2dnZ6enp6enp6fn5+fn5+foKCgoKCgoKGhoaGhoaGioqKioqKio6Ojo6Ojo6SkpKSkpKSlpaWlpaWlpqampqampqenp6enp6eoqKioqKioqampqampqaqqqqqqqqqq6urq6urq6ysrKysrKytra2tra2trq6urq6urq+vr6+vr6+wsLCwsLCwsbGxsbGxsbKysrKysrKzs7Ozs7OztLS0tLS0tLW1tbW1tbW2tra2tra2t7e3t7e3t7i4uLi4uLi5ubm5ubm5urq6urq6uru7u7u7u7u8vLy8vLy8vb29vb29vb6+vr6+vr6/v7+/v7+/wMDAwMDAwMHBwcHBwcHCwsLCwsLCw8PDw8PDw8TExMTExMTFxcXFxcXFxsbGxsbGxsfHx8fHx8fIyMjIyMjIycnJycnJycrKysrKysrLy8vLy8vLzMzMzMzMzM3Nzc3Nzc3Ozs7Ozs7Oz8/Pz8/Pz9DQ0NDQ0NDR0dHR0dHR0tLS0tLS0tPT09PT09PU1NTU1NTU1dXV1dXV1dbW1tbW1tbX19fX19fX2NjY2NjY2NnZ2dnZ2dna2tra2tra29vb29vb29zc3Nzc3Nzd3d3d3d3d3t7e3t7e3t/f39/f39/g4ODg4ODg4eHh4eHh4eLi4uLi4uLj4+Pj4+Pj5OTk5OTk5OXl5eXl5eXm5ubm5ubm5+fn5+fn5+jo6Ojo6Ojp6enp6enp6urq6urq6uvr6+vr6+vs7Ozs7Ozs7e3t7e3t7e7u7u7u7u7v7+/v7+/v8PDw8PDw8PHx8fHx8fHy8vLy8vLy8/Pz8/Pz8/T09PT09PT19fX19fX19vb29vb29vf39/f39/f4+Pj4+Pj4+fn5+fn5+fr6+vr6+vr7+/v7+/v7/Pz8/Pz8/P39/f39/f3+/v7+/v7+////';

// Créer et précharger l'audio
let notificationAudio: HTMLAudioElement | null = null;

const initNotificationSound = () => {
  if (typeof window !== 'undefined' && !notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_SOUND_BASE64);
    notificationAudio.volume = 0.8;
  }
};

const playNotificationSound = async () => {
  try {
    initNotificationSound();
    if (notificationAudio) {
      // Reset to start if already playing
      notificationAudio.currentTime = 0;
      await notificationAudio.play();
      logger.info('Son de notification joué', {});
    }
  } catch (error) {
    logger.warn('Impossible de jouer le son de notification', { error });
    // Fallback: utiliser l'API AudioContext pour générer un son simple
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // Note A5
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      logger.info('Son généré via AudioContext', {});
    } catch (audioContextError) {
      logger.warn('AudioContext aussi échoué', { error: audioContextError });
    }
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
          logger.error('Erreur canal notifications', {});
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
  }, [user, showBrowserNotification]);

  // Log d'état pour debug
  useEffect(() => {
    if (user && isListening) {
      logger.info('Système de notifications push actif', { email: user.email });
    }
  }, [user, isListening]);

  return null;
};
