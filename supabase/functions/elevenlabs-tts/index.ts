import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { text, voiceId = "cjVigY5qzO86Huf0OWal" } = await req.json();
    // Default voice: Eric - dynamic, engaging narrator with natural rhythm variations

    if (!text || text.length === 0) {
      throw new Error("Text is required");
    }

    // ElevenLabs has a 5000 char limit per request
    // For longer texts, we'll split and stitch
    const maxChars = 4500;
    const chunks: string[] = [];
    
    if (text.length <= maxChars) {
      chunks.push(text);
    } else {
      // Split at sentence boundaries
      const sentences = text.split(/(?<=[.!?])\s+/);
      let current = "";
      for (const sentence of sentences) {
        if ((current + " " + sentence).length > maxChars && current.length > 0) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current = current ? current + " " + sentence : sentence;
        }
      }
      if (current.trim()) {
        chunks.push(current.trim());
      }
    }

    console.log(`Processing ${chunks.length} chunk(s) for TTS`);

    const audioBuffers: ArrayBuffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const previousText = i > 0 ? chunks[i - 1].slice(-200) : undefined;
      const nextText = i < chunks.length - 1 ? chunks[i + 1].slice(0, 200) : undefined;

      const body: Record<string, unknown> = {
        text: chunk,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.85,
          style: 0.7,
          use_speaker_boost: true,
          speed: 1.05,
        },
      };

      if (previousText) body.previous_text = previousText;
      if (nextText) body.next_text = nextText;

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error for chunk ${i}:`, errorText);
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      audioBuffers.push(audioBuffer);
      console.log(`Chunk ${i + 1}/${chunks.length} generated (${audioBuffer.byteLength} bytes)`);
    }

    // Combine all audio buffers
    let totalLength = 0;
    for (const buf of audioBuffers) {
      totalLength += buf.byteLength;
    }

    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    return new Response(combined.buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": totalLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
