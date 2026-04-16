import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";

export interface ActiveCourse {
  id: string;
  status: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string | null;
  guest_estimated_price: number | null;
  final_payment_amount: number | null;
  payment_method: string | null;
  driver_id: string;
  created_at: string;
}

const ACTIVE_STATUSES = [
  "pending",
  "accepted",
  "driver_approaching",
  "driver_arrived",
  "in_progress",
];

/**
 * Detects in real-time if the logged-in client has an "active" course
 * (immediate ride OR scheduled ride that the driver has accepted and is currently ongoing).
 *
 * Used to surface the in-dashboard tracking banner + dedicated tab.
 */
export function useActiveClientCourse(clientId: string | null | undefined) {
  const [activeCourse, setActiveCourse] = useState<ActiveCourse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    if (!clientId) {
      setActiveCourse(null);
      setLoading(false);
      return;
    }

    try {
      // Priority order:
      // 1. in_progress, driver_arrived, driver_approaching (live ride)
      // 2. accepted (driver confirmed, awaiting departure soon)
      // 3. pending (waiting for driver acceptance) — only immediate or scheduled-soon
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, status, pickup_address, destination_address, scheduled_date, guest_estimated_price, final_payment_amount, payment_method, driver_id, created_at"
        )
        .eq("client_id", clientId)
        .in("status", ACTIVE_STATUSES)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      setActiveCourse((data?.[0] as ActiveCourse) || null);
    } catch (err) {
      console.error("[useActiveClientCourse] error:", err);
      setActiveCourse(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Realtime subscription on courses for this client
  useEffect(() => {
    if (!clientId) return;
    const cleanup = subscriptionManager.subscribe(
      `active-course-client-${clientId}`,
      { table: "courses", event: "*", filter: `client_id=eq.${clientId}` },
      () => {
        fetchActive();
      }
    );
    return cleanup;
  }, [clientId, fetchActive]);

  // Polling fallback every 20s in case realtime drops
  useEffect(() => {
    if (!clientId) return;
    const id = setInterval(fetchActive, 20000);
    return () => clearInterval(id);
  }, [clientId, fetchActive]);

  return { activeCourse, loading, refresh: fetchActive };
}
