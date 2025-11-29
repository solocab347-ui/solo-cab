import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { applyRateLimit } from '../_shared/rateLimitMiddleware.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // SÉCURITÉ: Rate limiting - 15 inscriptions par minute par IP
  const rateLimitResult = applyRateLimit(req, { maxRequests: 15, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization")!;
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { driver_id } = await req.json();

    if (!driver_id) {
      return new Response(
        JSON.stringify({ error: "driver_id est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify driver exists and is validated
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, public_profile_enabled, status")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      return new Response(
        JSON.stringify({ error: "Chauffeur non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!driver.public_profile_enabled || driver.status !== "validated") {
      return new Response(
        JSON.stringify({ error: "Ce chauffeur n'accepte pas de nouveaux clients" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a client
    const { data: existingClient, error: checkError } = await supabase
      .from("clients")
      .select("id, is_exclusive, driver_id, driver_ids")
      .eq("user_id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    // If user already exists as client
    if (existingClient) {
      // If exclusive client, don't allow registration with another driver
      if (existingClient.is_exclusive) {
        return new Response(
          JSON.stringify({ 
            error: "Vous êtes déjà un client exclusif d'un chauffeur. Les clients exclusifs ne peuvent pas s'inscrire avec d'autres chauffeurs.",
            client: existingClient 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If free client, check if already registered with this driver
      const alreadyRegistered = 
        existingClient.driver_id === driver_id || 
        existingClient.driver_ids?.includes(driver_id);

      if (alreadyRegistered) {
        return new Response(
          JSON.stringify({ 
            error: "Vous êtes déjà inscrit avec ce chauffeur",
            client: existingClient 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add driver to existing free client's driver list
      const updatedDriverIds = [...(existingClient.driver_ids || []), driver_id];
      
      const { error: updateError } = await supabase
        .from("clients")
        .update({ 
          driver_ids: updatedDriverIds,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingClient.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Inscription réussie avec ce chauffeur",
          client: { ...existingClient, driver_ids: updatedDriverIds }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new free client (is_exclusive: false)
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        is_exclusive: false,
        driver_ids: [driver_id],
        driver_id: null, // Free clients don't have a single driver_id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Envoyer l'email de bienvenue au client
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profileData) {
        console.log('📧 Envoi email bienvenue client vitrine à:', profileData.email);
        const emailResponse = await supabase.functions.invoke("send-email", {
          body: {
            to: profileData.email,
            type: "client_welcome",
            data: {
              clientName: profileData.full_name
            }
          }
        });
        
        if (emailResponse.error) {
          console.error('❌ ERREUR envoi email client vitrine:', emailResponse.error);
        } else {
          console.log('✅ Email bienvenue client vitrine envoyé avec succès');
        }
      }
    } catch (emailError) {
      console.error('❌ EXCEPTION lors envoi email client vitrine:', emailError);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Inscription réussie",
        client: newClient 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
