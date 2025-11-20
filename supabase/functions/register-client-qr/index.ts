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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { qr_code_id } = await req.json();

    if (!qr_code_id) {
      return new Response(JSON.stringify({ error: 'qr_code_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify QR code exists and is active
    const { data: qrCode, error: qrError } = await supabaseClient
      .from('qr_codes')
      .select('*, drivers:driver_id(id, user_id)')
      .eq('id', qr_code_id)
      .eq('is_active', true)
      .maybeSingle();

    if (qrError || !qrCode) {
      return new Response(JSON.stringify({ error: 'QR code invalide ou expiré' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if client already exists
    const { data: existingClient } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingClient) {
      return new Response(JSON.stringify({ 
        error: 'Vous êtes déjà enregistré comme client',
        client: existingClient 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create exclusive client with DUAL ASSOCIATION (driver_id + driver_ids)
    const { data: newClient, error: clientError } = await supabaseClient
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
      return new Response(JSON.stringify({ error: 'Erreur lors de la création du client' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
