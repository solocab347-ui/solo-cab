import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ratingId } = await req.json();
    if (!ratingId) {
      return new Response(JSON.stringify({ error: "ratingId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch rating
    const { data: rating, error: ratingErr } = await supabase
      .from("course_ratings")
      .select("*")
      .eq("id", ratingId)
      .single();

    if (ratingErr || !rating) {
      return new Response(JSON.stringify({ error: "Rating not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch course details
    const { data: course } = await supabase
      .from("courses")
      .select("pickup_address, destination_address, scheduled_date, distance_km, estimated_price, final_price, payment_method, guest_payment_method")
      .eq("id", rating.course_id)
      .single();

    // Fetch client rating history
    const { data: clientRatings } = rating.client_id ? await supabase
      .from("course_ratings")
      .select("rating, status, ai_decision")
      .eq("client_id", rating.client_id)
      .order("created_at", { ascending: false })
      .limit(20) : { data: [] };

    // Fetch driver rating history
    const { data: driverRatings } = await supabase
      .from("course_ratings")
      .select("rating, status, ai_decision")
      .eq("driver_id", rating.driver_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch dispute details
    const { data: dispute } = await supabase
      .from("rating_disputes")
      .select("*")
      .eq("rating_id", ratingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Stats
    const clientAvgRating = clientRatings?.length
      ? clientRatings.reduce((s, r) => s + r.rating, 0) / clientRatings.length : 3;
    const clientLowPct = clientRatings?.length
      ? clientRatings.filter(r => r.rating <= 3).length / clientRatings.length : 0;
    const driverAvgRating = driverRatings?.length
      ? driverRatings.reduce((s, r) => s + r.rating, 0) / driverRatings.length : 4;
    const cancelledByAI = clientRatings?.filter(r => r.ai_decision === "cancelled")?.length || 0;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un arbitre expert du secteur VTC en France. Tu connais parfaitement :
- Les obligations des chauffeurs VTC (ponctualité, propreté, courtoisie, respect de l'itinéraire)
- Les droits des clients (respect, ponctualité, paiement)
- Les situations courantes (embouteillages, travaux, météo, GPS erroné)
- Le comportement humain et les notes émotionnelles vs factuelles

Règles d'arbitrage :
1. Reproche hors du contrôle du chauffeur (trafic, travaux, déviation forcée) → ANNULER
2. Reproche légitime et factuel (véhicule sale, comportement inapproprié) → MAINTENIR
3. Reproche partiellement justifié → AJUSTER (remonter la note)
4. Explication crédible du chauffeur vs reproches vagues du client → favoriser le chauffeur
5. Notes émotionnelles sans faits concrets → ANNULER
6. Client avec historique de notes abusives → ses notes comptent moins`;

    const userPrompt = `COURSE :
- Trajet : ${course?.pickup_address || "?"} → ${course?.destination_address || "?"}
- Date : ${course?.scheduled_date || "N/A"}
- Distance : ${course?.distance_km || "N/A"} km
- Prix : ${course?.final_price || course?.estimated_price || "N/A"} €

NOTE CLIENT : ${rating.rating}★/5
Motif : ${rating.reason || "Non précisé"}
Détail : ${rating.reason_detail || "Aucun"}

PROFIL CLIENT : Moyenne notes données ${clientAvgRating.toFixed(1)}/5, ${(clientLowPct * 100).toFixed(0)}% notes basses, ${cancelledByAI} notes annulées par IA

PROFIL CHAUFFEUR : Moyenne notes reçues ${driverAvgRating.toFixed(1)}/5

CONTESTATION CHAUFFEUR : "${dispute?.dispute_reason || "Pas de détail"}"
RÉPONSE CLIENT : "${dispute?.client_response || "Pas de réponse"}"

Analyse et rends ta décision.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_arbitration",
            description: "Submit the arbitration decision",
            parameters: {
              type: "object",
              properties: {
                decision: { type: "string", enum: ["maintained", "adjusted", "cancelled"] },
                adjusted_rating: { type: "number", description: "Adjusted rating 1-5, required if decision is adjusted" },
                justification: { type: "string", description: "Explanation in French, 2-3 sentences" },
              },
              required: ["decision", "justification"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_arbitration" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error("AI gateway error:", status, body);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, réessayez plus tard" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let verdict: { decision: string; adjusted_rating?: number | null; justification: string };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      verdict = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: parse content
      const content = (aiData.choices?.[0]?.message?.content || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verdict = JSON.parse(jsonMatch[0]);
      } else {
        verdict = { decision: "maintained", justification: "Analyse non concluante, note maintenue par défaut." };
      }
    }

    // Apply verdict
    const updateData: Record<string, unknown> = {
      status: "ai_resolved",
      ai_decision: verdict.decision,
      ai_justification: verdict.justification,
    };

    if (verdict.decision === "adjusted" && verdict.adjusted_rating) {
      updateData.adjusted_rating = verdict.adjusted_rating;
      await supabase.from("courses").update({ client_rating: verdict.adjusted_rating }).eq("id", rating.course_id);
    } else if (verdict.decision === "maintained") {
      await supabase.from("courses").update({ client_rating: rating.rating }).eq("id", rating.course_id);
    }
    // cancelled = no rating applied

    await supabase.from("course_ratings").update(updateData).eq("id", ratingId);

    // Update dispute
    if (dispute) {
      await supabase.from("rating_disputes").update({
        resolution: verdict.decision === "cancelled" ? "cancelled" : verdict.decision === "adjusted" ? "adjusted" : "maintained",
        resolved_at: new Date().toISOString(),
      }).eq("id", dispute.id);
    }

    // Notify driver
    const { data: driver } = await supabase.from("drivers").select("user_id").eq("id", rating.driver_id).single();
    if (driver) {
      const decisionLabel = verdict.decision === "cancelled" ? "annulée ✅"
        : verdict.decision === "adjusted" ? `ajustée à ${verdict.adjusted_rating}★`
        : "maintenue";

      await supabase.from("notifications").insert({
        user_id: driver.user_id,
        title: "Résultat d'arbitrage IA",
        message: `La note de ${rating.rating}★ a été ${decisionLabel}. ${verdict.justification}`,
        type: "rating",
        metadata: { rating_id: ratingId, decision: verdict.decision },
      });
    }

    return new Response(JSON.stringify({ success: true, verdict }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Arbitration error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
