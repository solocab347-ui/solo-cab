// v2.0.1 - Fixed auth validation with Authorization header passthrough
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  driver_id: string;
  deletion_type: 'immediate' | '3_days' | '1_week' | '1_month';
  reason_type: 'inactivity' | 'violation' | 'fraud' | 'request' | 'duplicate' | 'other';
  reason_custom?: string;
}

// Motifs prédéfinis en français
const REASON_LABELS: Record<string, string> = {
  inactivity: 'Inactivité prolongée',
  violation: 'Violation des conditions d\'utilisation',
  fraud: 'Fraude ou activité suspecte',
  request: 'Demande de l\'utilisateur',
  duplicate: 'Compte en double',
  other: 'Autre raison',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Admin client avec service role key - PEUT valider n'importe quel token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Valider le token utilisateur avec getUser(token) - requiert service role key
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Auth validation failed:', userError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const user = userData.user;
    console.log('✅ Authenticated user:', user.id, user.email);

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

    const { driver_id, deletion_type, reason_type, reason_custom }: DeleteRequest = await req.json();

    if (!driver_id || !deletion_type || !reason_type) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les infos du driver
    const { data: driver, error: driverError } = await supabaseAdmin
      .from('drivers')
      .select(`
        id,
        user_id,
        subscription_stripe_id,
        subscription_status,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('id', driver_id)
      .single();

    if (driverError || !driver) {
      console.error('Driver not found:', driverError);
      return new Response(
        JSON.stringify({ error: 'Chauffeur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle profiles - can be array or single object
    const profilesData = driver.profiles;
    const profile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
    
    // Calculer la date de suppression
    let deletionDate = new Date();
    switch (deletion_type) {
      case '3_days':
        deletionDate.setDate(deletionDate.getDate() + 3);
        break;
      case '1_week':
        deletionDate.setDate(deletionDate.getDate() + 7);
        break;
      case '1_month':
        deletionDate.setMonth(deletionDate.getMonth() + 1);
        break;
      // 'immediate' reste à maintenant
    }

    let stripeSubscriptionCancelled = false;

    // Annuler l'abonnement Stripe si existant
    if (driver.subscription_stripe_id && driver.subscription_status && driver.subscription_status !== 'canceled') {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
          
          // Annuler à la fin de la période pour les suppressions différées
          if (deletion_type === 'immediate') {
            await stripe.subscriptions.cancel(driver.subscription_stripe_id);
          } else {
            await stripe.subscriptions.update(driver.subscription_stripe_id, {
              cancel_at_period_end: true,
            });
          }
          stripeSubscriptionCancelled = true;
          console.log('✅ Stripe subscription cancelled:', driver.subscription_stripe_id);
        } catch (stripeError) {
          console.error('❌ Stripe cancellation error:', stripeError);
        }
      }
    }

    // Créer l'entrée de suppression planifiée
    const { data: deletion, error: deletionError } = await supabaseAdmin
      .from('scheduled_user_deletions')
      .insert({
        driver_id: driver.id,
        user_id: driver.user_id,
        scheduled_by: user.id,
        deletion_date: deletionDate.toISOString(),
        deletion_type,
        reason_type,
        reason_custom: reason_custom || null,
        stripe_subscription_cancelled: stripeSubscriptionCancelled,
        status: deletion_type === 'immediate' ? 'completed' : 'pending',
      })
      .select()
      .single();

    if (deletionError) {
      console.error('Error creating deletion record:', deletionError);
      throw deletionError;
    }

    // Envoyer l'email de notification
    let emailSent = false;
    if (profile?.email) {
      try {
        const reasonLabel = reason_type === 'other' && reason_custom 
          ? reason_custom 
          : REASON_LABELS[reason_type];

        const deletionDateFormatted = deletionDate.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });

        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            to: profile.email,
            type: 'account_deletion_notice',
            data: {
              driverName: profile.full_name,
              deletionDate: deletionDateFormatted,
              deletionType: deletion_type === 'immediate' ? 'immédiate' : 
                deletion_type === '3_days' ? 'dans 3 jours' :
                deletion_type === '1_week' ? 'dans 1 semaine' : 'dans 1 mois',
              reason: reasonLabel,
              isImmediate: deletion_type === 'immediate',
            },
          },
        });
        emailSent = true;
        console.log('✅ Deletion notice email sent to:', profile.email);

        // Mettre à jour le statut email
        await supabaseAdmin
          .from('scheduled_user_deletions')
          .update({
            email_notification_sent: true,
            email_sent_at: new Date().toISOString(),
            status: deletion_type === 'immediate' ? 'completed' : 'notified',
          })
          .eq('id', deletion.id);
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError);
      }
    }

    // Créer notification in-app pour le chauffeur
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: driver.user_id,
        title: '⚠️ Suppression de compte programmée',
        message: deletion_type === 'immediate' 
          ? 'Votre compte a été supprimé par l\'administrateur.'
          : `Votre compte sera supprimé le ${deletionDate.toLocaleDateString('fr-FR')}. Contactez le support si vous pensez qu'il s'agit d'une erreur.`,
        type: 'warning',
        link: '/support',
      });

    // Si suppression immédiate, procéder maintenant via la RPC atomique
    if (deletion_type === 'immediate') {
      console.log('🗑️ Immediate deletion via RPC for:', driver.user_id);

      try {
        // Appel de la RPC SECURITY DEFINER (validation admin déjà faite, mais la RPC re-vérifie)
        // On passe le token utilisateur pour que auth.uid() fonctionne dans la RPC.
        const userScopedClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: rpcResult, error: rpcError } = await userScopedClient.rpc(
          'admin_hard_delete_driver',
          { p_driver_id: driver.id }
        );

        if (rpcError) {
          console.error('❌ RPC admin_hard_delete_driver failed:', rpcError);
          throw new Error(`Suppression DB échouée: ${rpcError.message}`);
        }

        if (!rpcResult || (rpcResult as any).ok !== true) {
          console.error('❌ RPC returned non-ok result:', rpcResult);
          throw new Error(`Suppression DB refusée: ${JSON.stringify(rpcResult)}`);
        }

        console.log('✅ DB rows deleted via RPC for driver:', driver.id);

        // Supprimer l'utilisateur auth (en dernier, hors RPC car nécessite admin API)
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(driver.user_id);

        if (authDeleteError) {
          console.error('⚠️ Auth user deletion failed (DB already clean):', authDeleteError);
          // Ne pas throw : la DB est déjà propre, l'admin peut nettoyer auth manuellement
        } else {
          console.log('✅ Auth user deleted:', driver.user_id);
        }

        // Marquer comme complété
        await supabaseAdmin
          .from('scheduled_user_deletions')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', deletion.id);

      } catch (deleteError) {
        console.error('❌ Deletion failed:', deleteError);

        await supabaseAdmin
          .from('scheduled_user_deletions')
          .update({ status: 'failed' })
          .eq('id', deletion.id);

        throw deleteError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletion_id: deletion.id,
        deletion_date: deletionDate.toISOString(),
        stripe_cancelled: stripeSubscriptionCancelled,
        email_sent: emailSent,
        is_immediate: deletion_type === 'immediate',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Delete user error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
