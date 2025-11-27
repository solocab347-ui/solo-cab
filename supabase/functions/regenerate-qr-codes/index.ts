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
    // ⚠️ SÉCURITÉ: Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier que l'utilisateur authentifié est admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le rôle admin
    const { data: hasAdminRole } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting QR code regeneration for all drivers...');

    // Get all drivers who have QR codes
    const { data: qrCodes, error: qrError } = await supabaseClient
      .from('qr_codes')
      .select('id, driver_id, code');

    if (qrError) {
      console.error('Error fetching QR codes:', qrError);
      throw qrError;
    }

    console.log(`Found ${qrCodes?.length || 0} QR codes to regenerate`);

    const appUrl = 'https://solocab.fr';
    let successCount = 0;
    let errorCount = 0;

    for (const qrCode of qrCodes || []) {
      try {
        const registrationUrl = `${appUrl}/register-client-qr?qr=${qrCode.id}`;
        
        console.log(`Regenerating QR code for driver ${qrCode.driver_id}`);
        console.log(`URL: ${registrationUrl}`);

        // Generate QR code using QRServer API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(registrationUrl)}`;
        
        const qrResponse = await fetch(qrApiUrl);
        if (!qrResponse.ok) {
          throw new Error(`Failed to generate QR code from API: ${qrResponse.status}`);
        }
        
        const qrImageBuffer = await qrResponse.arrayBuffer();
        const base64QR = btoa(String.fromCharCode(...new Uint8Array(qrImageBuffer)));
        const qrCodeImage = `data:image/png;base64,${base64QR}`;

        // Update QR code in database
        const { error: updateError } = await supabaseClient
          .from('qr_codes')
          .update({ 
            qr_code_image: qrCodeImage,
            code: qrCode.id // Ensure code field is correct
          })
          .eq('id', qrCode.id);

        if (updateError) {
          console.error(`Error updating QR code ${qrCode.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✓ Successfully regenerated QR code for driver ${qrCode.driver_id}`);
          successCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing QR code ${qrCode.id}:`, error);
        errorCount++;
      }
    }

    console.log(`QR code regeneration complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Regenerated ${successCount} QR codes (${errorCount} errors)`,
        total: qrCodes?.length || 0,
        successCount,
        errorCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('QR Code Regeneration Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
