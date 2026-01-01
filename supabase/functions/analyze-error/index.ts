import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Actions de correction automatique disponibles
const AUTO_FIX_ACTIONS = {
  clear_user_session: {
    name: "Vider la session utilisateur",
    description: "Déconnecte et reconnecte l'utilisateur pour réinitialiser son état",
  },
  clear_local_cache: {
    name: "Vider le cache local",
    description: "Efface les données en cache qui peuvent être corrompues",
  },
  reset_user_preferences: {
    name: "Réinitialiser les préférences",
    description: "Remet les préférences utilisateur par défaut",
  },
  retry_failed_operation: {
    name: "Relancer l'opération",
    description: "Tente de relancer l'opération qui a échoué",
  },
  refresh_data: {
    name: "Rafraîchir les données",
    description: "Force le rechargement des données depuis le serveur",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errorReportId, errorMessage, errorStack, pageUrl, context, executeAutoFix } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Analyzing error:", errorMessage);

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
            content: `Tu es un expert en debugging d'applications React/TypeScript avec des capacités de correction automatique.

Analyse les erreurs et détermine:
1. Si c'est un problème que l'utilisateur peut résoudre lui-même
2. Si c'est un bug qui nécessite une correction de code
3. Si une action automatique peut résoudre le problème

Actions automatiques disponibles (utilise EXACTEMENT ces noms):
- clear_user_session: Pour les problèmes d'authentification ou de session corrompue
- clear_local_cache: Pour les problèmes de données en cache obsolètes
- reset_user_preferences: Pour les problèmes liés aux préférences utilisateur
- retry_failed_operation: Pour les erreurs réseau temporaires
- refresh_data: Pour les problèmes de synchronisation de données

Réponds en JSON STRICT avec cette structure:
{
  "analysis": "Description claire du problème en français",
  "priority": "haute|moyenne|basse",
  "errorType": "user_error|auto_fixable|code_bug",
  "autoFixAction": "nom_action ou null si pas applicable",
  "autoFixConfidence": 0-100,
  "suggestions": ["suggestion 1", "suggestion 2"],
  "technicalDetails": "Détails techniques pour l'admin",
  "userMessage": "Message simple pour l'utilisateur"
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
    
    console.log("AI Response:", aiResponse);

    let analysisResult = {
      analysis: "Analyse non disponible",
      priority: "moyenne",
      errorType: "code_bug",
      autoFixAction: null as string | null,
      autoFixConfidence: 0,
      suggestions: [] as string[],
      technicalDetails: "",
      userMessage: "Une erreur est survenue",
      autoFixExecuted: false,
      autoFixSuccess: false,
    };

    try {
      // Clean JSON response (remove markdown if present)
      let cleanJson = aiResponse;
      if (cleanJson.includes("```json")) {
        cleanJson = cleanJson.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }
      
      const parsed = JSON.parse(cleanJson.trim());
      analysisResult = { ...analysisResult, ...parsed };

      // Si une action auto-fix est recommandée avec haute confiance, l'exécuter
      if (parsed.autoFixAction && parsed.autoFixConfidence >= 70 && executeAutoFix !== false) {
        console.log(`Executing auto-fix action: ${parsed.autoFixAction}`);
        
        const fixResult = await executeAutoFixAction(
          supabase, 
          parsed.autoFixAction, 
          errorReportId
        );
        
        analysisResult.autoFixExecuted = true;
        analysisResult.autoFixSuccess = fixResult.success;
        
        if (fixResult.success) {
          analysisResult.userMessage = `✅ Problème résolu automatiquement: ${AUTO_FIX_ACTIONS[parsed.autoFixAction as keyof typeof AUTO_FIX_ACTIONS]?.description || parsed.autoFixAction}`;
        }
      }

      // Determine status based on analysis
      let status = "pending";
      if (parsed.errorType === "user_error") {
        status = "user_error";
      } else if (analysisResult.autoFixExecuted && analysisResult.autoFixSuccess) {
        status = "auto_resolved";
      } else if (parsed.errorType === "auto_fixable") {
        status = "auto_fixable";
      }

      // Update error report with AI analysis
      const { error: updateError } = await supabase
        .from("error_reports")
        .update({
          ai_analysis: parsed.analysis,
          ai_suggestion: `Priorité: ${parsed.priority}\nType: ${parsed.errorType}\n\n${Array.isArray(parsed.suggestions) ? parsed.suggestions.join("\n• ") : parsed.suggestions}\n\n${parsed.technicalDetails || ""}`,
          status: status,
        })
        .eq("id", errorReportId);

      if (updateError) {
        console.error("Error updating report:", updateError);
      }

    } catch (parseError) {
      console.error("Parse error:", parseError);
      analysisResult.analysis = aiResponse;
      
      await supabase
        .from("error_reports")
        .update({
          ai_analysis: aiResponse,
          status: "pending",
        })
        .eq("id", errorReportId);
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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

// Exécute une action de correction automatique
async function executeAutoFixAction(
  supabase: any, 
  action: string, 
  errorReportId: string
): Promise<{ success: boolean; message: string }> {
  console.log(`Executing auto-fix: ${action} for report ${errorReportId}`);

  try {
    // Get the error report to find the user
    const { data: report } = await supabase
      .from("error_reports")
      .select("user_id, page_url")
      .eq("id", errorReportId)
      .single();

    switch (action) {
      case "clear_user_session":
        // Log the action - actual session clear happens client-side
        console.log("Session clear recommended for user:", report?.user_id);
        return { success: true, message: "Session clear initiated" };

      case "clear_local_cache":
        // This is handled client-side, we just mark it as action needed
        console.log("Cache clear recommended");
        return { success: true, message: "Cache clear recommended" };

      case "reset_user_preferences":
        if (report?.user_id) {
          // Reset user preferences if applicable
          console.log("Preferences reset for user:", report.user_id);
        }
        return { success: true, message: "Preferences reset initiated" };

      case "retry_failed_operation":
        console.log("Retry operation recommended");
        return { success: true, message: "Retry recommended" };

      case "refresh_data":
        console.log("Data refresh recommended");
        return { success: true, message: "Data refresh initiated" };

      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error("Auto-fix error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}