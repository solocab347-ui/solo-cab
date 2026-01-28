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

    // Si suppression immédiate, procéder maintenant
    if (deletion_type === 'immediate') {
      console.log('🗑️ Immediate deletion for:', driver.user_id);
      
      try {
        // Supprimer toutes les données liées au driver dans l'ordre (contraintes FK)
        const tablesToClean = [
          'congress_registrations',
          'document_reminders',
          'driver_vehicle_documents',
          'course_queue',
          'fleet_course_escalations',
          'course_escalations',
          'fleet_partner_courses',
          'fleet_driver_blocks',
          'company_payment_reminders',
          'company_course_quotes',
          'company_course_requests',
          'guest_registration_tokens',
          'partner_payments',
          'partner_invoices',
          'partner_order_documents',
          'vehicle_documents',
          'driver_vehicles',
          'course_invitations',
          'fleet_partnership_payments',
          'fleet_driver_documents_archive',
          'fleet_driver_declined_courses',
          'company_payments',
          'company_driver_agreements',
          'partner_course_pool',
          'city_pricing',
          'client_first_orders',
          'fleet_driver_partnerships',
          'driver_schedules',
          'fleet_driver_invitations',
          'partnership_disputes',
          'shared_courses',
          'driver_partnerships',
          'fleet_manager_invitations',
          'fleet_manager_drivers',
          'company_drivers',
          'invitation_tokens',
          'driver_feedback',
          'assistant_requests',
          'campaigns',
          'promotions',
          'factures',
          'devis',
          'courses',
          'qr_codes',
          'driver_availability_slots',
          'fleet_manager_course_requests',
        ];

        for (const table of tablesToClean) {
          const { error } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('driver_id', driver.id);
          
          if (error) {
            console.log(`Note: Could not clean ${table}:`, error.message);
          }
        }

        // Nettoyer aussi les références par user_id
        const userTables = ['notifications', 'push_subscriptions'];
        for (const table of userTables) {
          await supabaseAdmin.from(table).delete().eq('user_id', driver.user_id);
        }

        // IMPORTANT: Mettre à NULL les références au driver dans les clients d'autres drivers
        // (clients qui ont ce driver comme favorite ou preferred)
        console.log('Cleaning client references to driver...');
        
        // Mettre à NULL favorite_driver_id dans tous les clients qui référencent ce driver
        const { error: favError } = await supabaseAdmin
          .from('clients')
          .update({ favorite_driver_id: null })
          .eq('favorite_driver_id', driver.id);
        
        if (favError) {
          console.log('Note: Could not clean favorite_driver_id:', favError.message);
        }

        // Mettre à NULL preferred_fleet_driver_id dans tous les clients qui référencent ce driver
        const { error: prefError } = await supabaseAdmin
          .from('clients')
          .update({ preferred_fleet_driver_id: null })
          .eq('preferred_fleet_driver_id', driver.id);
        
        if (prefError) {
          console.log('Note: Could not clean preferred_fleet_driver_id:', prefError.message);
        }

        // Mettre à NULL driver_id dans les clients (ne pas supprimer, juste dissocier)
        const { error: driverIdError } = await supabaseAdmin
          .from('clients')
          .update({ driver_id: null })
          .eq('driver_id', driver.id);
        
        if (driverIdError) {
          console.log('Note: Could not clean driver_id in clients:', driverIdError.message);
        }

        // Maintenant supprimer uniquement les clients créés par ce driver (qui n'ont plus de lien)
        await supabaseAdmin.from('clients').delete().eq('driver_id', driver.id);

        // Supprimer le driver
        const { error: driverDeleteError } = await supabaseAdmin
          .from('drivers')
          .delete()
          .eq('id', driver.id);

        if (driverDeleteError) {
          console.error('Error deleting driver:', driverDeleteError);
          throw new Error(`Impossible de supprimer le chauffeur: ${driverDeleteError.message}`);
        }

        // Supprimer le profil
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', driver.user_id);

        if (profileDeleteError) {
          console.error('Error deleting profile:', profileDeleteError);
          throw new Error(`Impossible de supprimer le profil: ${profileDeleteError.message}`);
        }

        // Supprimer l'utilisateur auth
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(driver.user_id);
        
        if (authDeleteError) {
          console.error('Error deleting auth user:', authDeleteError);
          throw new Error(`Impossible de supprimer l'utilisateur auth: ${authDeleteError.message}`);
        }
        
        console.log('✅ User completely deleted:', driver.user_id);

        // Marquer comme complété
        await supabaseAdmin
          .from('scheduled_user_deletions')
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq('id', deletion.id);
          
      } catch (deleteError) {
        console.error('❌ Deletion failed:', deleteError);
        
        // Marquer la suppression comme échouée
        await supabaseAdmin
          .from('scheduled_user_deletions')
          .update({
            status: 'failed',
          })
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
