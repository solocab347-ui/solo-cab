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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Début du nettoyage de la plateforme...');

    // 1. Récupérer tous les user_ids des drivers et clients (sauf admin)
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('user_id');

    if (driversError) throw driversError;

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('user_id');

    if (clientsError) throw clientsError;

    const driverUserIds = drivers?.map(d => d.user_id) || [];
    const clientUserIds = clients?.map(c => c.user_id) || [];
    const allUserIdsToDelete = [...new Set([...driverUserIds, ...clientUserIds])];

    console.log(`📊 Utilisateurs à supprimer: ${allUserIdsToDelete.length}`);

    // 2. Supprimer toutes les données associées dans l'ordre (pour respecter les foreign keys)
    
    // Messages
    await supabase.from('messages').delete().in('sender_id', allUserIdsToDelete);
    console.log('✅ Messages supprimés');

    // Conversations
    await supabase.from('conversations').delete().or(`participant_1_id.in.(${allUserIdsToDelete.join(',')}),participant_2_id.in.(${allUserIdsToDelete.join(',')})`);
    console.log('✅ Conversations supprimées');

    // Notifications
    await supabase.from('notifications').delete().in('user_id', allUserIdsToDelete);
    console.log('✅ Notifications supprimées');

    // Disputes
    await supabase.from('disputes').delete().or(`reported_by_user_id.in.(${allUserIdsToDelete.join(',')}),reported_against_user_id.in.(${allUserIdsToDelete.join(',')})`);
    console.log('✅ Disputes supprimés');

    // Driver feedback
    const { data: driverIds } = await supabase.from('drivers').select('id');
    const driverIdsList = driverIds?.map(d => d.id) || [];
    if (driverIdsList.length > 0) {
      await supabase.from('driver_feedback').delete().in('driver_id', driverIdsList);
      console.log('✅ Driver feedback supprimés');
    }

    // Assistant requests
    if (driverIdsList.length > 0) {
      await supabase.from('assistant_requests').delete().in('driver_id', driverIdsList);
      console.log('✅ Assistant requests supprimés');
    }

    // Campaigns
    if (driverIdsList.length > 0) {
      await supabase.from('campaigns').delete().in('driver_id', driverIdsList);
      console.log('✅ Campaigns supprimées');
    }

    // Promotion assignments
    const { data: clientIds } = await supabase.from('clients').select('id');
    const clientIdsList = clientIds?.map(c => c.id) || [];
    if (clientIdsList.length > 0) {
      await supabase.from('promotion_assignments').delete().in('client_id', clientIdsList);
      console.log('✅ Promotion assignments supprimés');
    }

    // Promotions
    if (driverIdsList.length > 0) {
      await supabase.from('promotions').delete().in('driver_id', driverIdsList);
      console.log('✅ Promotions supprimées');
    }

    // Factures
    await supabase.from('factures').delete().in('driver_id', driverIdsList);
    console.log('✅ Factures supprimées');

    // Devis
    await supabase.from('devis').delete().in('driver_id', driverIdsList);
    console.log('✅ Devis supprimés');

    // Courses
    await supabase.from('courses').delete().or(`driver_id.in.(${driverIdsList.join(',')}),client_id.in.(${clientIdsList.join(',')})`);
    console.log('✅ Courses supprimées');

    // QR Codes
    await supabase.from('qr_codes').delete().in('driver_id', driverIdsList);
    console.log('✅ QR Codes supprimés');

    // Clients
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Clients supprimés');

    // Drivers
    await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Drivers supprimés');

    // User roles (sauf admin)
    await supabase.from('user_roles').delete().neq('role', 'admin');
    console.log('✅ User roles supprimés (sauf admin)');

    // Profiles (sauf admin)
    const { data: adminProfile } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .single();

    const adminUserId = adminProfile?.user_id;
    
    if (adminUserId) {
      await supabase.from('profiles').delete().neq('id', adminUserId);
      console.log('✅ Profiles supprimés (sauf admin)');
    }

    // Supprimer les utilisateurs de Auth (sauf admin)
    for (const userId of allUserIdsToDelete) {
      if (userId !== adminUserId) {
        try {
          await supabase.auth.admin.deleteUser(userId);
        } catch (error) {
          console.log(`⚠️ Erreur suppression Auth user ${userId}:`, error);
        }
      }
    }
    console.log('✅ Utilisateurs Auth supprimés (sauf admin)');

    // Nettoyer l'historique des emails
    await supabase.from('email_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Email history nettoyé');

    // Nettoyer les tokens d'invitation utilisés
    await supabase.from('invitation_tokens').delete().eq('used', true);
    console.log('✅ Invitation tokens utilisés supprimés');

    console.log('🎉 Nettoyage de la plateforme terminé avec succès !');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Plateforme réinitialisée avec succès. Seul l\'admin a été conservé.',
        stats: {
          drivers_deleted: driverIdsList.length,
          clients_deleted: clientIdsList.length,
          users_deleted: allUserIdsToDelete.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
