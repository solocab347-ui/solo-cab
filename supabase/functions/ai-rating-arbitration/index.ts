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

    // Fetch rating with course, client, and driver data
    const { data: rating, error: ratingErr } = await supabase
      .from("course_ratings")
      .select(`
        *,
        course:courses!course_ratings_course_id_fkey (
          id, pickup_address, destination_address, scheduled_date,
          estimated_duration, actual_duration, estimated_distance,
          actual_distance, price, status
        ),
        client:clients!course_ratings_client_id_fkey (
          id, user_id, reliability_score, total_ratings_given, abusive_ratings_count,
          total_rides
        ),
        driver:drivers!course_ratings_driver_id_fkey (
          id, user_id, reliability_score, total_ratings_received, disputed_ratings_won
        )
      `)
      .eq("id", ratingId)
      .single();

    if (ratingErr || !rating) {
      return new Response(JSON.stringify({ error: "Rating not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client rating history
    const { data: clientRatings } = await supabase
      .from("course_ratings")
      .select("rating, status, ai_decision")
      .eq("client_id", rating.client_id)
      .order("created_at", { ascending: false })
      .limit(20);

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
      .single();

    // Build analysis context
    const clientAvgRating =
      clientRatings && clientRatings.length > 0
        ? clientRatings.reduce((sum, r) => sum + r.rating, 0) / clientRatings.length
        : 3;

    const clientLowRatingPct =
      clientRatings && clientRatings.length > 0
        ? clientRatings.filter((r) => r.rating <= 3).length / clientRatings.length
        : 0;

    const driverAvgRating =
      driverRatings && driverRatings.length > 0
        ? driverRatings.reduce((sum, r) => sum + r.rating, 0) / driverRatings.length
        : 4;

    const cancelledRatings = clientRatings?.filter((r) => r.ai_decision === "cancelled")?.length || 0;

    // AI Analysis via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiPrompt = `Tu es un arbitre IA pour une plateforme de VTC (SoloCab). Analyse cette situation de notation et rends un verdict juste.

DONNÉES DE LA COURSE:
- Adresse départ: ${rating.course?.pickup_address || "N/A"}
- Adresse arrivée: ${rating.course?.destination_address || "N/A"}
- Date: ${rating.course?.scheduled_date || "N/A"}
- Durée estimée: ${rating.course?.estimated_duration || "N/A"} min
- Durée réelle: ${rating.course?.actual_duration || "N/A"} min
- Distance estimée: ${rating.course?.estimated_distance || "N/A"} km
- Distance réelle: ${rating.course?.actual_distance || "N/A"} km

NOTE DU CLIENT:
- Note: ${rating.rating}/5
- Motif: ${rating.reason || "Non précisé"}
- Détail: ${rating.reason_detail || "Non précisé"}

PROFIL CLIENT:
- Score fiabilité: ${rating.client?.reliability_score || 80}/100
- Nombre de notes données: ${rating.client?.total_ratings_given || 0}
- Notes abusives: ${rating.client?.abusive_ratings_count || 0}
- Notes annulées par IA: ${cancelledRatings}
- Moyenne des notes données: ${clientAvgRating.toFixed(1)}/5
- % notes basses (≤3): ${(clientLowRatingPct * 100).toFixed(0)}%
- Nombre total courses: ${rating.client?.total_rides || 0}

PROFIL CHAUFFEUR:
- Score fiabilité: ${rating.driver?.reliability_score || 80}/100
- Total notes reçues: ${rating.driver?.total_ratings_received || 0}
- Contestations gagnées: ${rating.driver?.disputed_ratings_won || 0}
- Moyenne des notes reçues: ${driverAvgRating.toFixed(1)}/5

CONTESTATION CHAUFFEUR:
${dispute?.dispute_reason || "Pas de détail de contestation"}

RÉPONSE CLIENT À LA CONTESTATION:
${dispute?.client_response || "Pas de réponse du client"}

Analyse et rends ton verdict au format suivant. Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après:
{
  "decision": "maintained|adjusted|cancelled|shared",
  "adjusted_rating": <number 1-5 or null>,
  "justification": "<explication en français de ta décision>",
  "client_reliability_impact": <number -5 to 5>,
  "driver_reliability_impact": <number -5 to 5>,
  "confidence_score": <number 0-100>,
  "flags": ["<optional: abusive_client|abusive_driver|needs_review>"]
}

Règles:
- Si le client a un historique de notes abusives (>30% basses, score fiabilité <50), ses notes comptent moins
- Si le chauffeur a un mauvais historique, les notes basses sont plus crédibles
- Si la durée réelle est très supérieure à l'estimée sans raison, considère un retard chauffeur
- Si le motif est incohérent avec les données course, annule la note
- "shared" = responsabilité partagée, ajuste la note en conséquence`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Tu es un arbitre IA juste et impartial. Réponds uniquement en JSON valide." },
            { role: "user", content: aiPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error("AI gateway error:", status, body);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, retry later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (handle markdown code blocks)
    aiContent = aiContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    let verdict;
    try {
      verdict = JSON.parse(aiContent);
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      verdict = {
        decision: "maintained",
        adjusted_rating: null,
        justification: "Analyse IA non concluante, note maintenue par défaut.",
        client_reliability_impact: 0,
        driver_reliability_impact: 0,
        confidence_score: 30,
        flags: ["needs_review"],
      };
    }

    // Apply verdict to rating
    const updateData: Record<string, unknown> = {
      status: "ai_resolved",
      ai_decision: verdict.decision,
      ai_justification: verdict.justification,
      ai_analysis: verdict,
    };

    if (verdict.decision === "adjusted" && verdict.adjusted_rating) {
      updateData.adjusted_rating = verdict.adjusted_rating;
      // Apply adjusted rating to course
      await supabase
        .from("courses")
        .update({ client_rating: verdict.adjusted_rating })
        .eq("id", rating.course_id);
    } else if (verdict.decision === "maintained") {
      // Apply original rating
      await supabase
        .from("courses")
        .update({ client_rating: rating.rating })
        .eq("id", rating.course_id);
    }
    // cancelled = don't apply any rating

    await supabase.from("course_ratings").update(updateData).eq("id", ratingId);

    // Update dispute
    if (dispute) {
      await supabase
        .from("rating_disputes")
        .update({
          ai_verdict: verdict.decision,
          ai_verdict_detail: verdict.justification,
          resolution: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", dispute.id);
    }

    // Update reliability scores
    if (verdict.client_reliability_impact && rating.client) {
      const newClientScore = Math.max(0, Math.min(100,
        (rating.client.reliability_score || 80) + verdict.client_reliability_impact
      ));
      const abusiveInc = verdict.decision === "cancelled" ? 1 : 0;
      await supabase
        .from("clients")
        .update({
          reliability_score: newClientScore,
          abusive_ratings_count: (rating.client.abusive_ratings_count || 0) + abusiveInc,
        })
        .eq("id", rating.client_id);
    }

    if (verdict.driver_reliability_impact && rating.driver) {
      const newDriverScore = Math.max(0, Math.min(100,
        (rating.driver.reliability_score || 80) + verdict.driver_reliability_impact
      ));
      const wonInc = verdict.decision === "cancelled" || verdict.decision === "adjusted" ? 1 : 0;
      await supabase
        .from("drivers")
        .update({
          reliability_score: newDriverScore,
          disputed_ratings_won: (rating.driver.disputed_ratings_won || 0) + wonInc,
        })
        .eq("id", rating.driver_id);
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
