import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Register Client QR - Start ===');
    
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
    console.log('QR Code ID received:', qr_code_id);

    if (!qr_code_id) {
      console.error('Missing qr_code_id');
      return new Response(JSON.stringify({ error: 'qr_code_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    console.log('User authenticated:', user?.id);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
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

    console.log('QR Code found:', qrCode?.id);
    console.log('Driver status:', qrCode?.drivers?.status);

    if (qrError) {
      console.error('QR query error:', qrError);
      return new Response(JSON.stringify({ error: 'Erreur de base de données' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!qrCode) {
      console.error('QR code not found or inactive');
      return new Response(JSON.stringify({ error: 'QR code invalide ou expiré' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify driver is validated
    if (qrCode.drivers?.status !== 'validated') {
      console.error('Driver not validated:', qrCode.drivers?.status);
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
      console.log('Client already exists:', existingClient.id);
      return new Response(JSON.stringify({ 
        error: 'Vous êtes déjà enregistré comme client',
        client: existingClient 
      }), {
        status: 400,
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
      console.error('Client creation error:', clientError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du client: ' + clientError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Client created successfully:', newClient.id);

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
        await serviceClient.functions.invoke('send-email', {
          body: {
            to: profileData.email,
            type: 'client_welcome',
            data: {
              clientName: profileData.full_name
            }
          }
        });
        console.log('Welcome email sent to client:', profileData.email);
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't block registration if email fails
    }

    console.log('=== Register Client QR - Success ===');
    return new Response(JSON.stringify({ 
      success: true, 
      client: newClient,
      message: 'Inscription réussie en tant que client exclusif' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Register Client QR Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Erreur serveur: ' + errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
