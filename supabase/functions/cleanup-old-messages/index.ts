import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculer la date il y a 2 mois (60 jours)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    console.log(`Suppression des messages avant le ${twoMonthsAgo.toISOString()}`);

    // Supprimer les messages de plus de 2 mois
    const { error, count } = await supabaseClient
      .from("messages")
      .delete({ count: "exact" })
      .lt("created_at", twoMonthsAgo.toISOString());

    if (error) {
      console.error("Erreur lors de la suppression des messages:", error);
      throw error;
    }

    const deletedCount = count || 0;
    console.log(`${deletedCount} messages supprimés avec succès`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `${deletedCount} messages de plus de 2 mois ont été supprimés`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
