import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export function useUserBlock(otherUserId?: string | null) {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !otherUserId) {
      setIsBlocked(false);
      return;
    }
    const { data } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUserId)
      .maybeSingle();
    setIsBlocked(!!data);
  }, [user, otherUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const block = useCallback(
    async (reason?: string) => {
      if (!user || !otherUserId) return false;
      setLoading(true);
      try {
        const { error } = await supabase.from("user_blocks").insert({
          blocker_id: user.id,
          blocked_id: otherUserId,
          reason: reason || null,
        });
        if (error) throw error;
        setIsBlocked(true);
        toast.success("Utilisateur bloqué. Vous ne recevrez plus ses messages.");
        return true;
      } catch (e: any) {
        console.error("[block]", e);
        toast.error("Impossible de bloquer cet utilisateur");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, otherUserId]
  );

  const unblock = useCallback(async () => {
    if (!user || !otherUserId) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", otherUserId);
      if (error) throw error;
      setIsBlocked(false);
      toast.success("Utilisateur débloqué");
      return true;
    } catch (e: any) {
      console.error("[unblock]", e);
      toast.error("Impossible de débloquer");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, otherUserId]);

  return { isBlocked, loading, block, unblock, refresh };
}
