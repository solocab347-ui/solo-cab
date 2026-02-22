import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PodcastSegment {
  episode_id: string;
  storage_path: string;
}

export function usePodcastPersistence() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [savedSegments, setSavedSegments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const loadExisting = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!driver) { setLoading(false); return; }
      setDriverId(driver.id);

      const { data: segments } = await supabase
        .from("podcast_segments")
        .select("episode_id, storage_path")
        .eq("driver_id", driver.id);

      if (segments && segments.length > 0) {
        const urls: Record<string, string> = {};
        for (const seg of segments) {
          const { data: urlData } = supabase.storage
            .from("podcast-audio")
            .getPublicUrl(seg.storage_path);
          urls[seg.episode_id] = urlData.publicUrl;
        }
        setSavedSegments(urls);
      } else {
        setSavedSegments({});
      }
    } catch (err) {
      console.error("Error loading podcast segments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExisting();
  }, [loadExisting, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey(k => k + 1);
  }, []);

  const saveSegment = useCallback(async (episodeId: string, audioBlob: Blob): Promise<string | null> => {
    if (!driverId) return null;

    const path = `${driverId}/${episodeId}.mp3`;

    // Upload to storage (upsert)
    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(path, audioBlob, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    // Save metadata (upsert on driver_id + episode_id)
    await supabase.from("podcast_segments").upsert(
      {
        driver_id: driverId,
        episode_id: episodeId,
        storage_path: path,
        file_size: audioBlob.size,
      },
      { onConflict: "driver_id,episode_id" }
    );

    const { data: urlData } = supabase.storage
      .from("podcast-audio")
      .getPublicUrl(path);

    setSavedSegments(prev => ({ ...prev, [episodeId]: urlData.publicUrl }));
    return urlData.publicUrl;
  }, [driverId]);

  const isSegmentSaved = useCallback((episodeId: string) => {
    return !!savedSegments[episodeId];
  }, [savedSegments]);

  return { driverId, savedSegments, loading, saveSegment, isSegmentSaved, reload };
}
