import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cette fonction est appelée lors de la validation d'un chauffeur par l'admin.
 * Elle reset la période d'essai Stripe pour que les 14 jours (ou 30 pour pionniers)
 * commencent à partir de la date de validation, pas de l'inscription.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Vérifier l'authentification admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Accès administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { driver_id } = await req.json();

    if (!driver_id) {
      return new Response(
        JSON.stringify({ error: 'driver_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le driver
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('drivers')
      .select('id, user_id, subscription_stripe_id, subscription_status, is_pioneer, created_at')
      .eq('id', driver_id)
      .single();

    if (driverError || !driver) {
      console.error('Driver not found:', driverError);
      return new Response(
        JSON.stringify({ error: 'Chauffeur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Processing driver:', driver.id, 'Pioneer:', driver.is_pioneer);

    // Calculer la durée d'essai: 30 jours pour pionniers, 14 jours pour les autres
    const trialDays = driver.is_pioneer ? 30 : 14;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    // Si pas d'abonnement Stripe, définir free_access_end_date pour la période d'essai
    if (!driver.subscription_stripe_id) {
      console.log('ℹ️ No Stripe subscription, setting free_access_end_date for trial');
      
      const { error: updateError } = await supabaseAdmin
        .from('drivers')
        .update({
          subscription_status: 'active',
          free_access_granted: true,
          free_access_start_date: new Date().toISOString(),
          free_access_end_date: trialEndDate.toISOString(),
          free_access_type: 'trial',
        })
        .eq('id', driver_id);

      if (updateError) {
        console.error('⚠️ Error updating driver free access:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur mise à jour période d\'essai' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Période d'essai de ${trialDays} jours activée`,
          trial_days: trialDays,
          trial_end: trialEndDate.toISOString(),
          had_subscription: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('❌ STRIPE_SECRET_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Configuration Stripe manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Récupérer l'abonnement actuel
    const subscription = await stripe.subscriptions.retrieve(driver.subscription_stripe_id);
    
    if (!subscription) {
      console.log('⚠️ Subscription not found in Stripe');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Abonnement Stripe non trouvé',
          had_subscription: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Current subscription status:', subscription.status);

    // Utiliser la durée d'essai déjà calculée
    const newTrialEnd = Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60);

    // Mettre à jour l'abonnement Stripe avec une nouvelle date de fin d'essai
    try {
      const updatedSubscription = await stripe.subscriptions.update(driver.subscription_stripe_id, {
        trial_end: newTrialEnd,
        proration_behavior: 'none',
      });

      console.log('✅ Trial reset successful:', {
        new_trial_end: new Date(newTrialEnd * 1000).toISOString(),
        subscription_status: updatedSubscription.status
      });

      // Mettre à jour la base de données avec le nouveau statut
      const { error: updateError } = await supabaseAdmin
        .from('drivers')
        .update({
          subscription_status: updatedSubscription.status, // Should be 'trialing'
          subscription_end_date: new Date(newTrialEnd * 1000).toISOString(),
        })
        .eq('id', driver_id);

      if (updateError) {
        console.error('⚠️ Error updating driver:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Période d'essai réinitialisée: ${trialDays} jours`,
          trial_days: trialDays,
          trial_end: new Date(newTrialEnd * 1000).toISOString(),
          subscription_status: updatedSubscription.status
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (stripeError: any) {
      console.error('❌ Stripe update error:', stripeError);
      
      // Si l'abonnement n'est pas en période d'essai, on ne peut pas le reset
      if (stripeError.message?.includes('trial')) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Impossible de réinitialiser: l\'abonnement n\'est plus en période d\'essai',
            error: stripeError.message
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw stripeError;
    }

  } catch (error) {
    console.error('❌ Reset trial error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
