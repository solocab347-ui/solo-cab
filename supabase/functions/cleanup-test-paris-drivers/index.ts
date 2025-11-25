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
    console.log('🧹 Démarrage du nettoyage des chauffeurs de test parisiens...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Liste des emails de test
    const testEmails = [
      'alexandre.martin@solocab.fr',
      'sophie.dubois@solocab.fr',
      'pierre.lefebvre@solocab.fr',
      'lucas.bernard@solocab.fr',
      'emma.petit@solocab.fr',
      'thomas.robert@solocab.fr',
      'julien.moreau@solocab.fr',
      'camille.laurent@solocab.fr',
      'nicolas.simon@solocab.fr',
      'antoine.rousseau@solocab.fr',
      'marie.garnier@solocab.fr',
      'maxime.faure@solocab.fr',
      'hugo.vincent@solocab.fr',
      'lea.mercier@solocab.fr',
      'mathieu.dupont@solocab.fr',
      'adrien.blanc@solocab.fr',
      'clara.roux@solocab.fr',
      'benjamin.girard@solocab.fr',
      'nathan.lambert@solocab.fr',
      'chloe.bonnet@solocab.fr'
    ];

    let deletedCount = 0;
    const errors = [];

    for (const email of testEmails) {
      try {
        console.log(`🗑️ Suppression de ${email}...`);

        // 1. Récupérer l'user_id depuis auth.users via admin
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
          console.error(`❌ Erreur listUsers pour ${email}:`, authError);
          errors.push({ email, error: authError.message });
          continue;
        }

        const user = authUsers.users.find(u => u.email === email);
        
        if (!user) {
          console.log(`ℹ️ Utilisateur ${email} n'existe pas`);
          continue;
        }

        const userId = user.id;
        console.log(`📍 User ID trouvé: ${userId}`);

        // 2. Supprimer toutes les données associées dans les tables publiques
        // (l'ordre est important à cause des contraintes de clés étrangères)
        
        // Supprimer les courses
        const { error: coursesError } = await supabaseAdmin
          .from('courses')
          .delete()
          .or(`created_by_user_id.eq.${userId},driver_id.in.(select id from drivers where user_id='${userId}')`);
        
        if (coursesError) console.log(`⚠️ Erreur suppression courses: ${coursesError.message}`);

        // Supprimer les devis
        const { error: devisError } = await supabaseAdmin
          .from('devis')
          .delete()
          .in('driver_id', [userId]);
        
        if (devisError) console.log(`⚠️ Erreur suppression devis: ${devisError.message}`);

        // Supprimer les factures
        const { error: facturesError } = await supabaseAdmin
          .from('factures')
          .delete()
          .in('driver_id', [userId]);
        
        if (facturesError) console.log(`⚠️ Erreur suppression factures: ${facturesError.message}`);

        // Supprimer les QR codes
        const { error: qrError } = await supabaseAdmin
          .from('qr_codes')
          .delete()
          .in('driver_id', [userId]);
        
        if (qrError) console.log(`⚠️ Erreur suppression qr_codes: ${qrError.message}`);

        // Supprimer les user_roles
        const { error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        
        if (rolesError) console.log(`⚠️ Erreur suppression user_roles: ${rolesError.message}`);

        // Supprimer le driver
        const { error: driverError } = await supabaseAdmin
          .from('drivers')
          .delete()
          .eq('user_id', userId);
        
        if (driverError) console.log(`⚠️ Erreur suppression driver: ${driverError.message}`);

        // Supprimer le profil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileError) console.log(`⚠️ Erreur suppression profile: ${profileError.message}`);

        // 3. Supprimer l'utilisateur de auth.users via admin API
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error(`❌ Erreur suppression auth user ${email}:`, deleteAuthError);
          errors.push({ email, error: deleteAuthError.message });
          continue;
        }

        console.log(`✅ ${email} supprimé avec succès`);
        deletedCount++;

      } catch (error) {
        console.error(`❌ Erreur pour ${email}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ email, error: errorMessage });
      }
    }

    console.log(`✅ Nettoyage terminé: ${deletedCount} utilisateurs supprimés`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${deletedCount} chauffeurs de test supprimés`,
        deleted: deletedCount,
        errors: errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
