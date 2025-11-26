import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    // Supprimer tous les utilisateurs sauf les vrais (abdallahkan, abdouabdou, et admin@solocab.fr)
    const usersToDelete = users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const isTestUser = email.includes('@solocab.fr') || email.includes('@test.');
      const isRealUser = email === 'abdallahkan@gmail.com' || 
                        email === 'abdouabdou0000099@gmail.com' ||
                        email === 'admin@solocab.fr';
      return isTestUser && !isRealUser;
    });

    console.log(`Suppression de ${usersToDelete.length} utilisateurs de test`);

    const deletionResults = [];
    for (const user of usersToDelete) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
          console.error(`Erreur suppression ${user.email}:`, error);
          deletionResults.push({ email: user.email, success: false, error: error.message });
        } else {
          console.log(`Supprimé: ${user.email}`);
          deletionResults.push({ email: user.email, success: true });
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`Exception pour ${user.email}:`, e);
        deletionResults.push({ email: user.email, success: false, error: errorMsg });
      }
    }

    // Réinitialiser le mot de passe admin
    const adminUsers = users.filter(u => u.email === 'admin@solocab.fr');
    let adminPasswordReset = null;
    
    if (adminUsers.length > 0) {
      const adminId = adminUsers[0].id;
      const newPassword = 'Admin2025!SecureSoloCab';
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        adminId,
        { password: newPassword }
      );
      
      if (updateError) {
        console.error('Erreur reset mot de passe admin:', updateError);
        adminPasswordReset = { success: false, error: updateError.message };
      } else {
        console.log('Mot de passe admin réinitialisé');
        adminPasswordReset = { 
          success: true, 
          email: 'admin@solocab.fr',
          password: newPassword 
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: deletionResults.filter(r => r.success).length,
        failedCount: deletionResults.filter(r => !r.success).length,
        deletionResults,
        adminPasswordReset
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Erreur globale:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMsg,
        details: String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
