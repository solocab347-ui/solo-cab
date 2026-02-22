import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid auth token");

    // Get driver_id
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!driver) throw new Error("Driver not found");

    const { action } = await req.json();

    if (action === "list") {
      // List ElevenLabs history items
      const response = await fetch(
        "https://api.elevenlabs.io/v1/history?page_size=100",
        {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs history API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for items generated with voice Eric (cjVigY5qzO86Huf0OWal)
      const relevantItems = data.history
        ?.filter((item: any) => item.voice_id === "cjVigY5qzO86Huf0OWal")
        ?.map((item: any) => ({
          history_item_id: item.history_item_id,
          text_preview: item.text?.slice(0, 150),
          date_unix: item.date_unix,
          character_count: item.character_count_change_from,
          content_type: item.content_type,
        })) || [];

      // Also check which episodes are already saved
      const { data: existingSegments } = await supabase
        .from("podcast_segments")
        .select("episode_id")
        .eq("driver_id", driver.id);

      return new Response(JSON.stringify({
        history_items: relevantItems,
        existing_episodes: existingSegments?.map((s: any) => s.episode_id) || [],
        driver_id: driver.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "recover") {
      const { history_item_id, episode_id } = await req.json();
      
      if (!history_item_id || !episode_id) {
        throw new Error("history_item_id and episode_id are required");
      }

      // Check if already saved
      const { data: existing } = await supabase
        .from("podcast_segments")
        .select("id")
        .eq("driver_id", driver.id)
        .eq("episode_id", episode_id)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ status: "already_exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Download audio from ElevenLabs history
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/history/${history_item_id}/audio`,
        {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );

      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const path = `${driver.id}/${episode_id}.mp3`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("podcast-audio")
        .upload(path, audioBuffer, { contentType: "audio/mpeg", upsert: true });

      if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

      // Save metadata
      const { error: dbError } = await supabase.from("podcast_segments").upsert(
        {
          driver_id: driver.id,
          episode_id: episode_id,
          storage_path: path,
          file_size: audioBuffer.byteLength,
        },
        { onConflict: "driver_id,episode_id" }
      );

      if (dbError) throw new Error(`DB error: ${dbError.message}`);

      return new Response(JSON.stringify({ 
        status: "recovered",
        episode_id,
        file_size: audioBuffer.byteLength,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("Recovery error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
