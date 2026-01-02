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
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50); // Limiter pour performance

      if (error) throw error;

      // Dédupliquer les notifications par titre + message + date (même jour)
      const seen = new Map<string, boolean>();
      const uniqueNotifications = (data || []).filter((n) => {
        const dateKey = new Date(n.created_at).toDateString();
        const key = `${n.title}-${n.message}-${dateKey}`;
        if (seen.has(key)) {
          return false;
        }
        seen.set(key, true);
        return true;
      });

      setNotifications(uniqueNotifications);
      setUnreadCount(uniqueNotifications.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
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

    // Subscribe to realtime notifications avec subscriptionManager
    const cleanup = subscriptionManager.subscribe(
      `notifications-${user.id}`,
      {
        table: "notifications",
        event: "*",
        filter: `user_id=eq.${user.id}`,
        debounceMs: 1000
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
    refresh: fetchNotifications,
  };
};
