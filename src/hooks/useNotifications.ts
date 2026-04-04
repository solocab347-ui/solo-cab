import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  category?: string;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, message, type, is_read, created_at, link, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100); // Augmenté pour voir plus de notifications

      if (error) throw error;

      // ✅ PLUS DE DÉDUPLICATION - Afficher TOUTES les notifications
      // Chaque notification est unique et importante
      const allNotifications = data || [];

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    // Mise à jour optimiste IMMÉDIATE
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        // Pas de rollback pour éviter les sauts d'UI
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    // Mise à jour optimiste
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    // Mise à jour optimiste
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("Error deleting notification:", error);
        // Recharger en cas d'erreur
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadNotifications = async () => {
      if (isMounted) {
        await fetchNotifications();
      }
    };

    loadNotifications();

    // Subscribe to realtime notifications
    const cleanup = subscriptionManager.subscribe(
      `notifications-${user.id}`,
      {
        table: "notifications",
        event: "*",
        filter: `user_id=eq.${user.id}`,
        debounceMs: 500 // Réduit pour une réactivité accrue
      },
      () => {
        if (isMounted) {
          fetchNotifications();
        }
      }
    );

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
};
