import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { applyRateLimit } from '../_shared/rateLimitMiddleware.ts';
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // CRITIQUE: Créer le rôle 'client' dans user_roles pour éviter les problèmes de redirection
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { error: roleError } = await supabaseService
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "client"
      });

    if (roleError) {
      console.error('❌ Erreur création rôle client:', roleError);
      // Ne pas bloquer l'inscription si le rôle existe déjà
      if (roleError.code !== '23505') { // Duplicate key error
        throw new Error('Erreur lors de la création du rôle: ' + roleError.message);
      }
    }

    // Envoyer l'email de bienvenue au client AVEC RETRY
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profileData) {
        console.log('📧 [CLIENT-VITRINE] Envoi email bienvenue avec retry à:', profileData.email);
        
        const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
        
        const emailResult = await sendEmailWithRetry(
          resend,
          {
            from: "SoloCab <noreply@solocab.fr>",
            to: [profileData.email],
            subject: "🎉 Bienvenue sur SoloCab !",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1>🎉 Bienvenue sur SoloCab !</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p>Bonjour <strong>${profileData.full_name}</strong>,</p>
                  
                  <p>Nous sommes ravis de vous accueillir sur SoloCab !</p>
                  
                  <p>Votre compte a été créé avec succès. Vous pouvez maintenant profiter de tous nos services :</p>
                  
                  <ul>
                    <li>🚗 Réserver des courses avec votre chauffeur</li>
                    <li>📋 Consulter vos devis et factures</li>
                    <li>💬 Communiquer directement avec votre chauffeur</li>
                    <li>📊 Suivre l'historique de vos courses</li>
                  </ul>
                  
                  <p>Pour toute question, n'hésitez pas à contacter votre chauffeur via la messagerie intégrée.</p>
                  
                  <p>Bonne route avec SoloCab !</p>
                  
                  <p>L'équipe SoloCab</p>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
                  <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                  <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
              </div>
            `
          },
          { maxAttempts: 3 }
        );
        
        if (emailResult.success) {
          console.log('✅✅✅ [CLIENT-VITRINE] Email bienvenue envoyé avec succès');
        } else {
          console.error('❌❌❌ [CLIENT-VITRINE] ÉCHEC DÉFINITIF envoi email après retry');
          
          // Envoyer alerte admin
          await sendAdminAlert(resend, {
            emailType: "client_welcome (Vitrine)",
            recipient: profileData.email,
            error: emailResult.error || "Erreur inconnue",
            context: `Client ID: ${newClient.id}, Driver ID: ${driver_id}`
          });
        }
      }
    } catch (emailError: any) {
      console.error('❌❌❌ [CLIENT-VITRINE] EXCEPTION CRITIQUE lors envoi email:', {
        error: emailError.message,
        stack: emailError.stack
      });
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
