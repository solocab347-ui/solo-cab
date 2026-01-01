import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errorReportId, errorMessage, errorStack, pageUrl, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze error with AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en debugging d'applications React/TypeScript. Analyse les erreurs et fournis:
1. Une analyse claire du problème en français
2. Des suggestions de correction concrètes
3. Une priorité (haute, moyenne, basse)
4. Si c'est un problème côté utilisateur ou côté code

Réponds en JSON avec cette structure:
{
  "analysis": "Description du problème",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "priority": "haute|moyenne|basse",
  "isUserError": true/false,
  "canAutoFix": true/false,
  "autoFixDescription": "Description de la correction automatique si possible"
}`
          },
          {
            role: "user",
            content: `Erreur à analyser:
Message: ${errorMessage}
Stack: ${errorStack || "Non disponible"}
Page: ${pageUrl}
Contexte: ${context || "Non spécifié"}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    let analysis = "Analyse non disponible";
    let suggestions = "Suggestions non disponibles";
    let priority = "moyenne";

    try {
      // Try to parse JSON response
      const parsed = JSON.parse(aiResponse);
      analysis = parsed.analysis || analysis;
      suggestions = Array.isArray(parsed.suggestions) 
        ? parsed.suggestions.join("\n• ") 
        : parsed.suggestions || suggestions;
      priority = parsed.priority || priority;
      
      // Update error report with AI analysis
      const { error: updateError } = await supabase
        .from("error_reports")
        .update({
          ai_analysis: analysis,
          ai_suggestion: `Priorité: ${priority}\n\n${suggestions}`,
          status: parsed.isUserError ? "user_error" : "pending",
        })
        .eq("id", errorReportId);

      if (updateError) {
        console.error("Error updating report:", updateError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        analysis,
        suggestions,
        priority,
        canAutoFix: parsed.canAutoFix,
        autoFixDescription: parsed.autoFixDescription
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      // If not valid JSON, use raw response
      analysis = aiResponse;
      
      await supabase
        .from("error_reports")
        .update({
          ai_analysis: analysis,
          status: "pending",
        })
        .eq("id", errorReportId);

      return new Response(JSON.stringify({ 
        success: true, 
        analysis,
        suggestions: "Voir l'analyse complète"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in analyze-error function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
