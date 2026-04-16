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

    // Fetch rating with direction
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

    const direction = rating.rating_direction || "client_to_driver";
    const isClientToDriver = direction === "client_to_driver";

    // Fetch course details
    const { data: course } = await supabase
      .from("courses")
      .select("pickup_address, destination_address, scheduled_date, distance_km, estimated_price, final_price, final_payment_amount, payment_method, guest_payment_method, status, duration_minutes, driver_id, client_id")
      .eq("id", rating.course_id)
      .single();

    // Fetch dispute details
    const { data: dispute } = await supabase
      .from("rating_disputes")
      .select("*")
      .eq("rating_id", ratingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // === DEEP HISTORICAL ANALYSIS ===

    // Client history
    let clientHistoryText = "Pas de données client";
    if (rating.client_id) {
      // All ratings given by this client (client_to_driver)
      const { data: clientGivenRatings } = await supabase
        .from("course_ratings")
        .select("rating, status, ai_decision, rating_direction, created_at")
        .eq("client_id", rating.client_id)
        .eq("rating_direction", "client_to_driver")
        .order("created_at", { ascending: false })
        .limit(30);

      // All ratings received by this client (driver_to_client)
      const { data: clientReceivedRatings } = await supabase
        .from("course_ratings")
        .select("rating, status, ai_decision, rating_direction, created_at")
        .eq("client_id", rating.client_id)
        .eq("rating_direction", "driver_to_client")
        .order("created_at", { ascending: false })
        .limit(30);

      // Incidents reported about this client
      const { data: clientIncidents } = await supabase
        .from("driver_course_incidents")
        .select("incident_type, severity, created_at")
        .eq("client_id", rating.client_id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Completed courses count
      const { count: clientCourseCount } = await supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("client_id", rating.client_id)
        .eq("status", "completed");

      // Risk score
      const { data: riskScore } = await supabase
        .from("client_risk_scores")
        .select("score, failed_payments, no_shows, abusive_cancellations, is_blocked")
        .eq("client_id", rating.client_id)
        .single();

      const givenRatings = clientGivenRatings || [];
      const receivedRatings = clientReceivedRatings || [];
      const avgGiven = givenRatings.length ? givenRatings.reduce((s, r) => s + r.rating, 0) / givenRatings.length : 0;
      const avgReceived = receivedRatings.length ? receivedRatings.reduce((s, r) => s + r.rating, 0) / receivedRatings.length : 0;
      const lowPct = givenRatings.length ? (givenRatings.filter(r => r.rating <= 3).length / givenRatings.length * 100).toFixed(0) : "0";
      const cancelledByAI = givenRatings.filter(r => r.ai_decision === "cancelled").length;
      const incidents = clientIncidents || [];

      clientHistoryText = `PROFIL CLIENT :
- Courses réalisées : ${clientCourseCount || 0}
- Notes données (client→chauffeur) : ${givenRatings.length} notes, moyenne ${avgGiven.toFixed(1)}/5, ${lowPct}% notes ≤3★, ${cancelledByAI} annulées par IA
- Notes reçues (chauffeur→client) : ${receivedRatings.length} notes, moyenne ${avgReceived > 0 ? avgReceived.toFixed(1) : "N/A"}/5
- Incidents signalés : ${incidents.length > 0 ? incidents.map(i => `${i.incident_type} (${i.severity})`).join(", ") : "Aucun"}
- Score de risque : ${riskScore ? `${riskScore.score}/100, ${riskScore.failed_payments} paiements échoués, ${riskScore.no_shows} no-shows, ${riskScore.abusive_cancellations} annulations abusives${riskScore.is_blocked ? " ⚠️ BLOQUÉ" : ""}` : "Non calculé"}`;
    }

    // Driver history
    const { data: driverRatingsReceived } = await supabase
      .from("course_ratings")
      .select("rating, status, ai_decision, rating_direction, created_at")
      .eq("driver_id", rating.driver_id)
      .eq("rating_direction", "client_to_driver")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: driverRatingsGiven } = await supabase
      .from("course_ratings")
      .select("rating, status, ai_decision, rating_direction, created_at")
      .eq("driver_id", rating.driver_id)
      .eq("rating_direction", "driver_to_client")
      .order("created_at", { ascending: false })
      .limit(30);

    const { count: driverCourseCount } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", rating.driver_id)
      .eq("status", "completed");

    const { data: driverData } = await supabase
      .from("drivers")
      .select("rating, reliability_score, total_rides")
      .eq("id", rating.driver_id)
      .single();

    const driverReceived = driverRatingsReceived || [];
    const driverGiven = driverRatingsGiven || [];
    const driverAvgReceived = driverReceived.length ? driverReceived.reduce((s, r) => s + r.rating, 0) / driverReceived.length : 0;
    const driverLowReceivedPct = driverReceived.length ? (driverReceived.filter(r => r.rating <= 3).length / driverReceived.length * 100).toFixed(0) : "0";
    const driverCancelledByAI = driverReceived.filter(r => r.ai_decision === "cancelled").length;
    const driverContested = driverReceived.filter(r => r.status === "contested" || r.ai_decision).length;

    const driverHistoryText = `PROFIL CHAUFFEUR :
- Courses réalisées : ${driverCourseCount || driverData?.total_rides || 0}
- Note globale : ${driverData?.rating?.toFixed(1) || "N/A"}/5
- Score de fiabilité : ${driverData?.reliability_score || "N/A"}/100
- Notes reçues : ${driverReceived.length} notes, moyenne ${driverAvgReceived.toFixed(1)}/5, ${driverLowReceivedPct}% ≤3★
- Notes contestées/arbitrées : ${driverContested}, dont ${driverCancelledByAI} annulées par IA
- Notes données aux clients : ${driverGiven.length} (ratio notes données vs courses : ${driverCourseCount ? (driverGiven.length / (driverCourseCount as number) * 100).toFixed(1) : "0"}%)`;

    // === AI CALL ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un arbitre expert et bienveillant du secteur VTC en France. Tu as une connaissance approfondie de :

EXPERTISE MÉTIER :
- Les obligations légales des chauffeurs VTC (ponctualité raisonnable, propreté du véhicule, courtoisie, respect de l'itinéraire optimal, tarification transparente)
- Les droits et obligations des clients (être présent au point de rendez-vous, respecter le véhicule, communiquer clairement, payer le tarif convenu)
- Les aléas courants : embouteillages, travaux, déviation GPS, météo défavorable, adresse incorrecte, retards de vol, zones d'accès complexes (aéroports, gares)
- La pression du métier : horaires décalés, fatigue, stress de la circulation, gestion de clients parfois difficiles

PHILOSOPHIE D'ARBITRAGE :
Tu es JUSTE mais HUMAIN. Tu analyses les FAITS, pas les émotions.
- Un chauffeur peut avoir un mauvais jour sans que ça définisse son professionnalisme
- Un client peut être frustré sans que sa frustration soit justifiée
- Les circonstances externes (trafic, météo, travaux) ne sont JAMAIS la faute du chauffeur
- Un historique irréprochable pèse LOURD en faveur de la personne concernée
- Des patterns récurrents d'abus (notes systématiquement basses, contestations fréquentes) doivent être détectés et sanctionnés
- En cas de doute, tu favorises la personne avec le meilleur historique

RÈGLES DE DÉCISION :
1. Reproche manifestement hors du contrôle (trafic, travaux, GPS) → ANNULER
2. Reproche légitime avec preuves factuelles → MAINTENIR  
3. Reproche partiellement justifié → AJUSTER (remonter de 1-2 étoiles)
4. Explication crédible vs reproches vagues → favoriser celui qui donne des détails précis
5. Notes émotionnelles sans faits → ANNULER
6. Historique d'abus détecté → poids réduit pour l'abuseur
7. Premier incident sur un long historique positif → INDULGENCE (ajuster plutôt que maintenir)
8. Pattern de notes basses systématiques → considérer un biais du notateur

DIRECTION : "${direction}" signifie que ${isClientToDriver ? "le CLIENT a noté le CHAUFFEUR" : "le CHAUFFEUR a noté le CLIENT"}.`;

    const userPrompt = `=== DONNÉES DE LA COURSE ===
- Trajet : ${course?.pickup_address || "?"} → ${course?.destination_address || "?"}
- Date : ${course?.scheduled_date || "N/A"}
- Distance : ${course?.distance_km || "N/A"} km
- Durée : ${course?.duration_minutes || "N/A"} min
- Prix estimé : ${course?.estimated_price || "N/A"} €
- Prix final : ${course?.final_payment_amount || course?.final_price || "N/A"} €
- Paiement : ${course?.payment_method || course?.guest_payment_method || "N/A"}

=== NOTE SOUMISE ===
Direction : ${isClientToDriver ? "Client → Chauffeur" : "Chauffeur → Client"}
Note : ${rating.rating}★/5
Motif : ${rating.reason || "Non précisé"}
Détail : ${rating.reason_detail || "Aucun détail fourni"}

=== ${clientHistoryText} ===

=== ${driverHistoryText} ===

=== CONTESTATION ===
${dispute ? `Contestée par : ${dispute.initiated_by === "driver" ? "Le chauffeur" : "Le client"}
Raison de contestation : "${dispute.dispute_reason || "Pas de détail"}"
Réponse de l'autre partie : "${dispute.client_response || "Pas encore de réponse"}"` : "Pas de contestation formelle"}

=== MISSION ===
Analyse TOUTES ces données en profondeur. Considère :
1. L'historique complet des deux parties (ratio bonnes/mauvaises notes, patterns)
2. Les circonstances de la course (trajet, prix, durée)
3. La crédibilité des explications de chaque partie
4. Si un pattern d'abus est détectable
5. Les circonstances atténuantes possibles

Rends ton verdict avec humanité et fermeté.`;

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
                decision: { type: "string", enum: ["maintained", "adjusted", "cancelled"], description: "maintained=note conservée, adjusted=note modifiée, cancelled=note annulée" },
                adjusted_rating: { type: "number", description: "Nouvelle note 1-5, obligatoire si decision=adjusted" },
                justification: { type: "string", description: "Explication détaillée en français, 3-5 phrases, empathique et factuelle" },
                confidence: { type: "string", enum: ["high", "medium", "low"], description: "Niveau de confiance dans la décision" },
                pattern_detected: { type: "string", description: "Pattern d'abus détecté le cas échéant, sinon 'none'" },
              },
              required: ["decision", "justification", "confidence"],
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
    let verdict: { decision: string; adjusted_rating?: number | null; justification: string; confidence?: string; pattern_detected?: string };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      verdict = JSON.parse(toolCall.function.arguments);
    } else {
      const content = (aiData.choices?.[0]?.message?.content || "").replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verdict = JSON.parse(jsonMatch[0]);
      } else {
        verdict = { decision: "maintained", justification: "Analyse non concluante, note maintenue par défaut." };
      }
    }

    console.log(`AI Verdict for ${ratingId}: ${verdict.decision} (confidence: ${verdict.confidence || "N/A"}, pattern: ${verdict.pattern_detected || "none"})`);

    // Apply verdict
    const updateData: Record<string, unknown> = {
      status: "ai_resolved",
      ai_decision: verdict.decision,
      ai_justification: verdict.justification,
      ai_analysis: {
        confidence: verdict.confidence || "medium",
        pattern_detected: verdict.pattern_detected || "none",
        direction,
      },
    };

    if (verdict.decision === "adjusted" && verdict.adjusted_rating) {
      updateData.adjusted_rating = verdict.adjusted_rating;
      if (isClientToDriver) {
        await supabase.from("courses").update({ client_rating: verdict.adjusted_rating }).eq("id", rating.course_id);
      }
    } else if (verdict.decision === "maintained") {
      if (isClientToDriver) {
        await supabase.from("courses").update({ client_rating: rating.rating }).eq("id", rating.course_id);
      }
    }

    await supabase.from("course_ratings").update(updateData).eq("id", ratingId);

    // Update dispute resolution
    if (dispute) {
      await supabase.from("rating_disputes").update({
        resolution: verdict.decision === "cancelled" ? "cancelled" : verdict.decision === "adjusted" ? "adjusted" : "maintained",
        resolved_at: new Date().toISOString(),
        ai_verdict: verdict.decision,
        ai_verdict_detail: verdict.justification,
      }).eq("id", dispute.id);
    }

    // Notify BOTH parties
    const decisionLabel = verdict.decision === "cancelled" ? "annulée ✅"
      : verdict.decision === "adjusted" ? `ajustée à ${verdict.adjusted_rating}★`
      : "maintenue";

    // Notify driver
    const { data: driver } = await supabase.from("drivers").select("user_id").eq("id", rating.driver_id).single();
    if (driver) {
      await supabase.from("notifications").insert({
        user_id: driver.user_id,
        title: "Résultat d'arbitrage IA",
        message: `La note de ${rating.rating}★ ${isClientToDriver ? "reçue" : "donnée"} a été ${decisionLabel}. ${verdict.justification}`,
        type: "rating",
        metadata: { rating_id: ratingId, decision: verdict.decision, direction },
      });
    }

    // Notify client (if registered)
    if (rating.client_id) {
      const { data: client } = await supabase.from("clients").select("user_id").eq("id", rating.client_id).single();
      if (client) {
        await supabase.from("notifications").insert({
          user_id: client.user_id,
          title: "Résultat d'arbitrage IA",
          message: `La note de ${rating.rating}★ ${isClientToDriver ? "que vous avez donnée" : "que vous avez reçue"} a été ${decisionLabel}. ${verdict.justification}`,
          type: "rating",
          metadata: { rating_id: ratingId, decision: verdict.decision, direction },
        });
      }
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
