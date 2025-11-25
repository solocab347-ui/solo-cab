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

        // 1. Récupérer l'user_id depuis la table profiles (plus fiable que auth.admin.listUsers)
        const { data: profile, error: findProfileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (findProfileError) {
          console.error(`❌ Erreur recherche profile pour ${email}:`, findProfileError);
          errors.push({ email, error: findProfileError.message });
          continue;
        }

        if (!profile) {
          console.log(`ℹ️ Profile ${email} n'existe pas`);
          continue;
        }

        const userId = profile.id;
        console.log(`📍 User ID trouvé: ${userId}`);

        // 2. Supprimer toutes les données associées dans les tables publiques
        // (l'ordre est important à cause des contraintes de clés étrangères)
        
        // Récupérer le driver_id
        const { data: driver } = await supabaseAdmin
          .from('drivers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        const driverId = driver?.id;

        if (driverId) {
          // Supprimer les courses
          await supabaseAdmin
            .from('courses')
            .delete()
            .eq('driver_id', driverId);

          // Supprimer les devis
          await supabaseAdmin
            .from('devis')
            .delete()
            .eq('driver_id', driverId);

          // Supprimer les factures
          await supabaseAdmin
            .from('factures')
            .delete()
            .eq('driver_id', driverId);

          // Supprimer les QR codes
          await supabaseAdmin
            .from('qr_codes')
            .delete()
            .eq('driver_id', driverId);
        }

        // Supprimer les user_roles
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Supprimer le driver
        if (driverId) {
          await supabaseAdmin
            .from('drivers')
            .delete()
            .eq('user_id', userId);
        }

        // Supprimer le profil
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

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
