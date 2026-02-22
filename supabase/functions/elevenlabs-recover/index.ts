import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Normalize text: lowercase, remove punctuation, collapse whitespace
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[«»""'']/g, '"')
    .replace(/[—–‐]/g, '-')
    .replace(/[.,;:!?…\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid auth token");

    const body = await req.json();
    const { action } = body;

    // Get driver_id with fallback for admins
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .single();
    const driverId = driver?.id || user.id;

    if (action === "recover_all") {
      const { episodes } = body as { episodes: Array<{ id: string; snippets: string[] }> };
      if (!episodes || episodes.length === 0) throw new Error("No episodes provided");

      // Fetch ALL history pages from ElevenLabs
      let allHistoryItems: any[] = [];
      let lastHistoryItemId: string | undefined;
      let page = 0;
      
      while (page < 10) { // Max 10 pages = 1000 items
        const url = new URL("https://api.elevenlabs.io/v1/history");
        url.searchParams.set("page_size", "100");
        if (lastHistoryItemId) {
          url.searchParams.set("start_after_history_item_id", lastHistoryItemId);
        }

        const response = await fetch(url.toString(), {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        });

        if (!response.ok) throw new Error(`ElevenLabs API error: ${response.status}`);
        const data = await response.json();
        
        const items = data.history || [];
        if (items.length === 0) break;
        
        // Filter for voice Eric
        const ericItems = items.filter((item: any) => item.voice_id === "cjVigY5qzO86Huf0OWal");
        allHistoryItems.push(...ericItems);
        
        lastHistoryItemId = items[items.length - 1].history_item_id;
        if (!data.has_more) break;
        page++;
      }

      console.log(`Found ${allHistoryItems.length} ElevenLabs history items with voice Eric`);

      // Pre-normalize all history item texts
      const normalizedHistory = allHistoryItems.map(item => ({
        ...item,
        normalizedText: normalize(item.text || ""),
      }));

      // Check which episodes are already saved
      const { data: existingSegments } = await supabase
        .from("podcast_segments")
        .select("episode_id")
        .eq("driver_id", driverId);
      const existingIds = new Set(existingSegments?.map((s: any) => s.episode_id) || []);

      // Match episodes to history items using multiple short snippets
      const matches: Array<{ episode_id: string; history_item_id: string; score: number }> = [];
      const usedHistoryIds = new Set<string>();

      for (const ep of episodes) {
        if (existingIds.has(ep.id)) continue;
        if (!ep.snippets || ep.snippets.length === 0) continue;

        const normalizedSnippets = ep.snippets.map(s => normalize(s)).filter(s => s.length >= 15);

        // Score each history item by how many snippets it contains
        let bestMatch: { historyItemId: string; score: number } | null = null;

        for (const item of normalizedHistory) {
          if (usedHistoryIds.has(item.history_item_id)) continue;
          
          let score = 0;
          for (const snippet of normalizedSnippets) {
            if (item.normalizedText.includes(snippet)) {
              score++;
            }
          }

          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { historyItemId: item.history_item_id, score };
          }
        }

        if (bestMatch && bestMatch.score >= 1) {
          matches.push({ episode_id: ep.id, history_item_id: bestMatch.historyItemId, score: bestMatch.score });
          usedHistoryIds.add(bestMatch.historyItemId);
        }
      }

      console.log(`Matched ${matches.length} episodes to history items (details: ${JSON.stringify(matches.map(m => `${m.episode_id}:${m.score}`))})`);

      // Recover all matched items
      const recovered: string[] = [];
      const errors: string[] = [];

      for (const match of matches) {
        try {
          const audioResponse = await fetch(
            `https://api.elevenlabs.io/v1/history/${match.history_item_id}/audio`,
            { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
          );

          if (!audioResponse.ok) {
            errors.push(`${match.episode_id}: download failed (${audioResponse.status})`);
            continue;
          }

          const audioBuffer = await audioResponse.arrayBuffer();
          const path = `${driverId}/${match.episode_id}.mp3`;

          const { error: uploadError } = await supabase.storage
            .from("podcast-audio")
            .upload(path, audioBuffer, { contentType: "audio/mpeg", upsert: true });

          if (uploadError) {
            errors.push(`${match.episode_id}: upload error - ${uploadError.message}`);
            continue;
          }

          const { error: dbError } = await supabase.from("podcast_segments").upsert(
            {
              driver_id: driverId,
              episode_id: match.episode_id,
              storage_path: path,
              file_size: audioBuffer.byteLength,
            },
            { onConflict: "driver_id,episode_id" }
          );

          if (dbError) {
            errors.push(`${match.episode_id}: db error - ${dbError.message}`);
            continue;
          }

          recovered.push(match.episode_id);
          console.log(`Recovered: ${match.episode_id} (${audioBuffer.byteLength} bytes, score: ${match.score})`);
        } catch (e) {
          errors.push(`${match.episode_id}: ${e.message}`);
        }
      }

      return new Response(JSON.stringify({
        total_history_items: allHistoryItems.length,
        matched: matches.length,
        recovered,
        already_saved: Array.from(existingIds),
        errors,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Recovery error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});