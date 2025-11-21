import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[REPAIR-DRIVER-PROFILES] Starting repair process...');

    // No auth required for this repair function
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get all users with driver role but no driver profile
    const { data: driverRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'driver');

    if (rolesError) {
      console.error('[REPAIR] Error fetching driver roles:', rolesError);
      throw rolesError;
    }

    console.log(`[REPAIR] Found ${driverRoles?.length || 0} users with driver role`);

    const repaired = [];
    const errors = [];

    for (const roleData of driverRoles || []) {
      const userId = roleData.user_id;

      // Get profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error(`[REPAIR] Error fetching profile for ${userId}:`, profileError);
        errors.push({ userId, error: 'Profile not found' });
        continue;
      }

      console.log(`[REPAIR] Checking user ${userId} (${profile.email})...`);

      // Check if driver profile exists
      const { data: existingDriver, error: checkError } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error(`[REPAIR] Error checking driver for ${userId}:`, checkError);
        errors.push({ userId, email: profile.email, error: checkError.message });
        continue;
      }

      if (existingDriver) {
        console.log(`[REPAIR] Driver profile already exists for ${userId}`);
        continue;
      }

      // Create missing driver profile
      console.log(`[REPAIR] Creating driver profile for ${userId}...`);
      const { data: newDriver, error: createError } = await supabaseAdmin
        .from('drivers')
        .insert({
          user_id: userId,
          license_number: 'À COMPLÉTER',
          vehicle_model: 'À COMPLÉTER',
          max_passengers: 4,
          base_fare: 0,
          per_km_rate: 0,
          hourly_rate: 0,
          tva_rate: 20,
          tva_included: false,
          status: 'pending',
          public_profile_enabled: false,
          course_counter: 0,
          invoice_counter: 0,
          quote_counter: 0,
          display_driver_name: true,
          display_company_name: false
        })
        .select()
        .single();

      if (createError) {
        console.error(`[REPAIR] Error creating driver for ${userId}:`, createError);
        errors.push({ userId, email: profile.email, error: createError.message });
        continue;
      }

      console.log(`[REPAIR] Driver profile created successfully for ${userId}`);
      repaired.push({
        userId,
        email: profile.email,
        driverId: newDriver.id
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Réparation terminée',
        repaired: repaired.length,
        errors: errors.length,
        details: {
          repaired,
          errors
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[REPAIR] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
