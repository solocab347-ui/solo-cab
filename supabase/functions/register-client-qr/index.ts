import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { applyRateLimit } from '../_shared/rateLimitMiddleware.ts';
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SÉCURITÉ: Rate limiting - 10 inscriptions par minute par IP
  const rateLimitResult = applyRateLimit(req, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    
    // Create authenticated client for user operations
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Create service role client for QR code validation (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { qr_code_id, qr_code } = body;

    if (!qr_code_id && !qr_code) {
      return new Response(JSON.stringify({ error: 'qr_code_id ou qr_code requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify QR code exists and is active using SERVICE_ROLE (bypasses RLS)
    const { data: qrCode, error: qrError } = await serviceClient
      .from('qr_codes')
      .select('*, drivers:driver_id(id, user_id, status)')
      .eq('id', qr_code_id)
      .eq('is_active', true)
      .maybeSingle();

    if (qrError) {
      return new Response(JSON.stringify({ error: 'Erreur de base de données' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!qrCode) {
      return new Response(JSON.stringify({ error: 'QR code invalide ou expiré' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify driver is validated
    if (qrCode.drivers?.status !== 'validated') {
      return new Response(JSON.stringify({ error: 'Le chauffeur n\'est pas encore validé' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if client already exists
    const { data: existingClient } = await authClient
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingClient) {
      // Return success for existing clients to prevent duplicate notifications
      return new Response(JSON.stringify({ 
        success: true,
        alreadyRegistered: true,
        client: existingClient,
        message: 'Vous êtes déjà inscrit' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITIQUE: Récupérer et mettre à jour le téléphone depuis les métadonnées auth
    // Les métadonnées sont passées lors du signUp mais le trigger handle_new_user peut échouer
    const userMetadata = user.user_metadata || {};
    if (userMetadata.phone || userMetadata.address) {
      console.log('📞 [CLIENT-QR] Mise à jour téléphone/adresse depuis métadonnées:', userMetadata.phone);
      const { error: profileUpdateError } = await serviceClient
        .from('profiles')
        .update({
          phone: userMetadata.phone || null,
          address: userMetadata.address || null
        })
        .eq('id', user.id);
      
      if (profileUpdateError) {
        console.error('❌ Erreur mise à jour profil:', profileUpdateError);
      } else {
        console.log('✅ Profil mis à jour avec téléphone');
      }
    }

    // Create exclusive client with DUAL ASSOCIATION (driver_id + driver_ids)
    const { data: newClient, error: clientError } = await authClient
      .from('clients')
      .insert({
        user_id: user.id,
        driver_id: qrCode.driver_id,
        driver_ids: [qrCode.driver_id], // Dual association
        qr_code_id: qr_code_id,
        is_exclusive: true,
      })
      .select()
      .single();

    if (clientError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du client: ' + clientError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITIQUE: Créer le rôle 'client' dans user_roles pour éviter les problèmes de redirection
    const { error: roleError } = await serviceClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'client'
      });

    if (roleError) {
      console.error('❌ Erreur création rôle client:', roleError);
      // Ne pas bloquer l'inscription si le rôle existe déjà
      if (roleError.code !== '23505') { // Duplicate key error
        return new Response(JSON.stringify({ error: 'Erreur lors de la création du rôle: ' + roleError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Increment QR scan counter using service role
    await serviceClient
      .from('qr_codes')
      .update({ scans_count: (qrCode.scans_count || 0) + 1 })
      .eq('id', qr_code_id);

    // Envoyer l'email de bienvenue au client AVEC RETRY
    try {
      const { data: profileData } = await authClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profileData) {
        console.log('📧 [CLIENT-QR] Envoi email bienvenue avec retry à:', profileData.email);
        
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
          console.log('✅✅✅ [CLIENT-QR] Email bienvenue envoyé avec succès');
        } else {
          console.error('❌❌❌ [CLIENT-QR] ÉCHEC DÉFINITIF envoi email après retry');
          
          // Envoyer alerte admin
          await sendAdminAlert(resend, {
            emailType: "client_welcome (QR)",
            recipient: profileData.email,
            error: emailResult.error || "Erreur inconnue",
            context: `Client ID: ${newClient.id}, QR Code ID: ${qr_code_id}`
          });
        }

        // NOUVEAU: Envoyer notification email au chauffeur avec le bon header
        console.log('📧 [CLIENT-QR] Notification chauffeur inscription client');
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-driver-client-registered`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ''
            },
            body: JSON.stringify({
              driver_id: qrCode.driver_id,
              client_name: profileData.full_name
            })
          });
          console.log('✅ [CLIENT-QR] Notification chauffeur envoyée');
        } catch (driverEmailError: any) {
          console.error('❌ Erreur envoi email chauffeur:', driverEmailError);
          // Ne pas bloquer si échec
        }
      }
    } catch (emailError: any) {
      console.error('❌❌❌ [CLIENT-QR] EXCEPTION CRITIQUE lors envoi email:', {
        error: emailError.message,
        stack: emailError.stack
      });
      // Ne pas bloquer l'inscription si l'email échoue
    }
    return new Response(JSON.stringify({ 
      success: true, 
      client: newClient,
      message: 'Inscription réussie en tant que client exclusif' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Erreur serveur: ' + errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
