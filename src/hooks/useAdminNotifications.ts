import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AdminNotificationSummary {
  total: number;
  byCategory: Record<string, number>;
  pending: {
    driverRegistrations: number;
    driverDocuments: number;
    vehicleDocuments: number;
    errorReports: number;
    feedbacks: number;
    disputes: number;
    assistantRequests: number;
  };
}

export const useAdminNotifications = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AdminNotificationSummary>({
    total: 0,
    byCategory: {},
    pending: {
      driverRegistrations: 0,
      driverDocuments: 0,
      vehicleDocuments: 0,
      errorReports: 0,
      feedbacks: 0,
      disputes: 0,
      assistantRequests: 0,
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch unread notifications count by category
      const { data: notifications } = await supabase
        .from("notifications")
        .select("category")
        .eq("user_id", user.id)
        .eq("is_read", false);

      const byCategory: Record<string, number> = {};
      notifications?.forEach(n => {
        if (n.category) {
          byCategory[n.category] = (byCategory[n.category] || 0) + 1;
        }
      });

      // Fetch pending counts from various tables
      const [
        driversResult,
        documentsResult,
        vehicleDocsResult,
        errorsResult,
        assistantResult
      ] = await Promise.all([
        // Pending driver registrations
        supabase
          .from("drivers")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        // Pending driver documents
        supabase
          .from("drivers")
          .select("*", { count: "exact", head: true })
          .eq("documents_status", "submitted"),
        // Pending vehicle documents
        supabase
          .from("driver_vehicle_documents")
          .select("*", { count: "exact", head: true })
          .eq("status", "submitted"),
        // Unresolved error reports
        supabase
          .from("error_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        // Pending assistant requests
        supabase
          .from("assistant_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
      ]);

      setSummary({
        total: notifications?.length || 0,
        byCategory,
        pending: {
          driverRegistrations: driversResult.count || 0,
          driverDocuments: documentsResult.count || 0,
          vehicleDocuments: vehicleDocsResult.count || 0,
          errorReports: errorsResult.count || 0,
          feedbacks: 0,
          disputes: 0,
          assistantRequests: assistantResult.count || 0,
        }
      });
    } catch (error) {
      console.error("Error fetching admin notification summary:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchSummary();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchSummary()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        () => fetchSummary()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'error_reports'
        },
        () => fetchSummary()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSummary]);

  return { summary, loading, refresh: fetchSummary };
};
