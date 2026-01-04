import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role for admin operations (create user, etc.)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      email, 
      password, 
      full_name, 
      phone, 
      driver_id, 
      registration_token 
    } = await req.json();

    // Validation
    if (!email || !password || !driver_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, mot de passe et driver_id sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate registration token if provided
    if (registration_token) {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("guest_registration_tokens")
        .select("*")
        .eq("token", registration_token)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ success: false, error: "Lien d'inscription invalide ou expiré" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify driver_id matches token
      if (tokenData.driver_id !== driver_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Incohérence dans les données d'inscription" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify driver exists
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id, company_name, user_id")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      return new Response(
        JSON.stringify({ success: false, error: "Chauffeur non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is already registered
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Cette adresse email est déjà utilisée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create auth user
    console.log('📧 Creating user account for:', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        phone,
      },
    });

    if (authError || !authData.user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || "Erreur lors de la création du compte" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log('✅ User created:', userId);

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name,
        phone,
        email: email.toLowerCase(),
        role: "client",
      });

    if (profileError) {
      console.error('❌ Profile error:', profileError);
    }

    // 3. Create client record as EXCLUSIVE client
    const { data: newClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({
        user_id: userId,
        driver_id: driver_id,      // Primary driver
        driver_ids: [driver_id],   // Array for compatibility
        is_exclusive: true,        // EXCLUSIVE client
        total_rides: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Client creation error:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création du profil client" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ Exclusive client created:', newClient.id);

    // 4. Create client role in user_roles
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "client"
      });

    if (roleError && roleError.code !== '23505') { // Ignore duplicate key
      console.error('❌ Role error:', roleError);
    }

    // 5. Send welcome email
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: "SoloCab <noreply@solocab.fr>",
          to: [email],
          subject: "🎉 Bienvenue sur SoloCab !",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>🎉 Bienvenue sur SoloCab !</h1>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Bonjour <strong>${full_name}</strong>,</p>
                
                <p>Nous sommes ravis de vous accueillir sur SoloCab !</p>
                
                <p>Votre compte client exclusif a été créé avec succès. Vous êtes désormais lié à <strong>${driver.company_name || 'votre chauffeur'}</strong>.</p>
                
                <p>Vous pouvez maintenant profiter de tous nos services :</p>
                
                <ul>
                  <li>🚗 Réserver des courses avec votre chauffeur attitré</li>
                  <li>📋 Consulter vos devis et factures</li>
                  <li>💬 Communiquer directement avec votre chauffeur</li>
                  <li>📊 Suivre l'historique de vos courses</li>
                </ul>
                
                <p>Bonne route avec SoloCab !</p>
                
                <p>L'équipe SoloCab</p>
              </div>
            </div>
          `
        });
        console.log('✅ Welcome email sent');
      }
    } catch (emailError: any) {
      console.error('❌ Email error:', emailError.message);
      // Don't block registration on email failure
    }

    // 6. Notify driver about new exclusive client
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-driver-client-registered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': supabaseServiceKey
        },
        body: JSON.stringify({
          driver_id: driver_id,
          client_name: full_name,
          is_exclusive: true
        })
      });
      console.log('✅ Driver notification sent');
    } catch (notifyError: any) {
      console.error('❌ Driver notification error:', notifyError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Inscription réussie ! Bienvenue sur SoloCab",
        user_id: userId,
        client_id: newClient.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
