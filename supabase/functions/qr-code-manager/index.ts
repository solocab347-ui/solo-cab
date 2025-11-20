import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import QRCode from 'https://esm.sh/qrcode@1.5.4';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get or generate QR code for a driver
    if (action === 'get' && req.method === 'GET') {
      const driverId = url.searchParams.get('driver_id');
      
      if (!driverId) {
        return new Response(JSON.stringify({ error: 'driver_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if QR code already exists
      let { data: existingQR } = await supabaseClient
        .from('qr_codes')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingQR && existingQR.qr_code_image) {
        return new Response(JSON.stringify(existingQR), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate new QR code
      const qrCodeId = existingQR?.id || crypto.randomUUID();
      const registrationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/register-client?qr=${qrCodeId}`;
      
      const qrCodeImage = await QRCode.toDataURL(registrationUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      if (existingQR) {
        // Update existing QR with image
        const { data, error } = await supabaseClient
          .from('qr_codes')
          .update({ qr_code_image: qrCodeImage })
          .eq('id', existingQR.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Create new QR code
        const { data, error } = await supabaseClient
          .from('qr_codes')
          .insert({
            id: qrCodeId,
            driver_id: driverId,
            code: qrCodeId,
            qr_code_image: qrCodeImage,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify QR code (public route)
    if (action === 'verify' && req.method === 'GET') {
      const qrId = url.searchParams.get('qr_id');
      
      if (!qrId) {
        return new Response(JSON.stringify({ error: 'qr_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: qrCode, error } = await supabaseClient
        .from('qr_codes')
        .select(`
          *,
          drivers:driver_id (
            id,
            vehicle_model,
            vehicle_color,
            company_name,
            profiles:user_id (
              full_name,
              profile_photo_url
            )
          )
        `)
        .eq('id', qrId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !qrCode) {
        return new Response(JSON.stringify({ error: 'QR code invalide ou expiré' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Increment scan counter
      await supabaseClient
        .from('qr_codes')
        .update({ scans_count: (qrCode.scans_count || 0) + 1 })
        .eq('id', qrId);

      return new Response(JSON.stringify(qrCode), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('QR Code Manager Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
