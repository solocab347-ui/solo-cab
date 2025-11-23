import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedbackId, type, title, description } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Définir le prompt système selon le type
    const systemPrompt = type === "bug"
      ? `Tu es un assistant IA expert en analyse de bugs pour une application VTC. 
Analyse le bug signalé et fournis:
1. Une évaluation de la gravité (low, medium, high, critical)
2. Une analyse technique du problème potentiel
3. Une suggestion de solution ou de correction
Sois concis mais précis.`
      : `Tu es un assistant IA expert en analyse de suggestions d'amélioration pour une application VTC.
Analyse la suggestion et fournis:
1. Une évaluation de la priorité (low, medium, high, critical)
2. Une analyse de la faisabilité et de l'impact
3. Une recommandation sur l'implémentation
Sois concis mais précis.`;

    // Appeler l'API Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Type: ${type}\nTitre: ${title}\nDescription: ${description}` 
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    // Extraire la priorité suggérée (chercher les mots-clés)
    let suggestedPriority = "medium";
    if (analysis.toLowerCase().includes("critical")) {
      suggestedPriority = "critical";
    } else if (analysis.toLowerCase().includes("high")) {
      suggestedPriority = "high";
    } else if (analysis.toLowerCase().includes("low")) {
      suggestedPriority = "low";
    }

    // Extraire une suggestion courte
    const suggestionMatch = analysis.match(/Suggestion:|Recommandation:|Solution:(.*?)(\n|$)/i);
    const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;

    // Mettre à jour le feedback dans la base de données
    const { error: updateError } = await supabase
      .from("driver_feedback")
      .update({
        ai_analysis: analysis,
        ai_suggestion: suggestion,
        priority: suggestedPriority,
        status: "in_review",
      })
      .eq("id", feedbackId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        priority: suggestedPriority,
        suggestion 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in analyze-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
