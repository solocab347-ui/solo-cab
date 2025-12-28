import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  token: string;
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, user_id } = await req.json() as RequestBody;

    if (!token || !user_id) {
      return new Response(
        JSON.stringify({ error: "Token et user_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📝 Traitement invitation course:", { token, user_id });

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Récupérer l'invitation
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("course_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invError || !invitation) {
      console.error("❌ Invitation non trouvée:", invError);
      return new Response(
        JSON.stringify({ error: "Invitation invalide ou expirée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Invitation trouvée:", invitation.id);

    // 2. Vérifier que l'utilisateur n'a pas déjà un profil client
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("user_id", user_id)
      .single();

    let clientId: string;

    if (existingClient) {
      console.log("👤 Client existant trouvé:", existingClient.id);
      clientId = existingClient.id;
      
      // Ajouter le driver à la liste si pas déjà présent
      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("driver_ids, driver_id")
        .eq("id", clientId)
        .single();

      const currentDriverIds = clientData?.driver_ids || [];
      if (!currentDriverIds.includes(invitation.driver_id)) {
        await supabaseAdmin
          .from("clients")
          .update({
            driver_ids: [...currentDriverIds, invitation.driver_id],
            driver_id: clientData?.driver_id || invitation.driver_id
          })
          .eq("id", clientId);
        console.log("✅ Chauffeur ajouté à la liste du client");
      }
    } else {
      // 3. Créer le profil client
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from("clients")
        .insert({
          user_id: user_id,
          driver_id: invitation.driver_id,
          driver_ids: [invitation.driver_id],
          is_exclusive: false,
          total_rides: 0,
          total_spent: 0
        })
        .select()
        .single();

      if (clientError) {
        console.error("❌ Erreur création client:", clientError);
        return new Response(
          JSON.stringify({ error: "Erreur lors de la création du profil client" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      clientId = newClient.id;
      console.log("✅ Client créé:", clientId);

      // 4. Ajouter le rôle client (ignorer si déjà existant)
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user_id, role: "client" });
      
      if (roleError && !roleError.message.includes("duplicate")) {
        console.warn("Avertissement rôle:", roleError.message);
      }
    }

    // 5. Mettre à jour la course avec le client_id
    const { error: courseError } = await supabaseAdmin
      .from("courses")
      .update({ 
        client_id: clientId,
        status: "pending"
      })
      .eq("id", invitation.course_id);

    if (courseError) {
      console.error("❌ Erreur mise à jour course:", courseError);
    } else {
      console.log("✅ Course mise à jour avec client_id");
    }

    // 6. Créer le devis automatiquement
    console.log("📝 Création du devis automatique...");
    
    // Récupérer les infos de la course
    const { data: courseData } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", invitation.course_id)
      .single();

    if (courseData) {
      // Générer un numéro de devis unique
      const { data: quoteNumber } = await supabaseAdmin
        .rpc("generate_reservation_number", { _driver_id: invitation.driver_id });

      const priceDetails = invitation.price_details || {};
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const { error: devisError } = await supabaseAdmin
        .from("devis")
        .insert({
          course_id: invitation.course_id,
          driver_id: invitation.driver_id,
          client_id: clientId,
          amount: invitation.estimated_price,
          base_price: priceDetails.base_price || 0,
          distance_price: priceDetails.distance_price || 0,
          time_price: priceDetails.time_price || 0,
          discount_amount: 0,
          evening_surcharge_amount: priceDetails.surcharge_evening || 0,
          weekend_surcharge_amount: priceDetails.surcharge_weekend || 0,
          quote_number: quoteNumber || `DEV-${Date.now()}`,
          status: "pending",
          valid_until: validUntil.toISOString()
        });

      if (devisError) {
        console.error("❌ Erreur création devis:", devisError);
      } else {
        console.log("✅ Devis créé avec succès");
      }
    }

    // 7. Marquer l'invitation comme complétée
    await supabaseAdmin
      .from("course_invitations")
      .update({
        status: "completed",
        client_id: clientId,
        completed_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    console.log("✅ Invitation marquée comme complétée");

    // 8. Créer une notification pour le chauffeur
    const { data: driverData } = await supabaseAdmin
      .from("drivers")
      .select("user_id")
      .eq("id", invitation.driver_id)
      .single();

    if (driverData) {
      const { data: clientProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .single();

      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: driverData.user_id,
          title: "🎉 Nouveau client inscrit !",
          message: `${clientProfile?.full_name || "Un nouveau client"} s'est inscrit via votre lien d'invitation. Le devis est en attente d'acceptation.`,
          type: "success",
          link: "/driver-dashboard"
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        client_id: clientId,
        message: "Inscription complétée avec succès"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("❌ Erreur:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
