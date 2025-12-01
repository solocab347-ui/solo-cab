import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { applyRateLimit } from '../_shared/rateLimitMiddleware.ts';

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

    const { qr_code_id } = await req.json();

    if (!qr_code_id) {
      return new Response(JSON.stringify({ error: 'qr_code_id requis' }), {
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

    // Send welcome email to client
    try {
      const { data: profileData } = await authClient
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (profileData) {
        console.log('📧 [CLIENT-QR] Tentative envoi email à:', profileData.email);
        const emailResponse = await serviceClient.functions.invoke('send-email', {
          body: {
            to: profileData.email,
            type: 'client_welcome',
            data: {
              clientName: profileData.full_name
            }
          }
        });
        
        if (emailResponse.error) {
          console.error('❌❌❌ [CLIENT-QR] ERREUR CRITIQUE envoi email:', {
            error: emailResponse.error,
            email: profileData.email,
            data: emailResponse.data
          });
        } else {
          console.log('✅✅✅ [CLIENT-QR] Email bienvenue envoyé avec succès');
        }
      }
    } catch (emailError: any) {
      console.error('❌❌❌ [CLIENT-QR] EXCEPTION CRITIQUE lors envoi email:', {
        error: emailError.message,
        stack: emailError.stack
      });
      // Don't block registration if email fails
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
