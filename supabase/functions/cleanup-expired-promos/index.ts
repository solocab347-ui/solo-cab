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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // Désactiver les promotions expirées
    const { data: expiredPromos, error: updateError } = await supabaseClient
      .from('promotions')
      .update({ active: false })
      .lt('valid_until', now)
      .eq('active', true)
      .select('id, code, driver_id');

    if (updateError) {
      console.error('Error deactivating expired promos:', updateError);
      throw updateError;
    }

    console.log(`Deactivated ${expiredPromos?.length || 0} expired promotions`);

    // Désactiver les promotions qui ont atteint leur limite d'utilisations
    const { data: maxUsedPromos, error: maxUsedError } = await supabaseClient
      .from('promotions')
      .select('id, code, max_uses, current_uses, driver_id')
      .eq('active', true)
      .not('max_uses', 'is', null);

    if (maxUsedError) {
      console.error('Error fetching promos with max uses:', maxUsedError);
    } else {
      const promosToDeactivate = maxUsedPromos?.filter(
        p => p.current_uses >= p.max_uses
      ) || [];

      if (promosToDeactivate.length > 0) {
        const { error: deactivateError } = await supabaseClient
          .from('promotions')
          .update({ active: false })
          .in('id', promosToDeactivate.map(p => p.id));

        if (deactivateError) {
          console.error('Error deactivating max-used promos:', deactivateError);
        } else {
          console.log(`Deactivated ${promosToDeactivate.length} promotions that reached max uses`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        deactivated_expired: expiredPromos?.length || 0,
        message: 'Expired promotions cleanup completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup Expired Promos Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
