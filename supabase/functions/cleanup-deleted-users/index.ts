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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🧹 Cleaning up user:', email);

    // Créer un client admin avec SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Chercher l'utilisateur dans auth.users
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw listError;
    }

    const userToDelete = users.users.find((u) => u.email === email);

    if (userToDelete) {
      console.log('👤 Found user in auth.users:', userToDelete.id);

      // 2. Supprimer complètement de profiles (cascade supprimera clients/drivers)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) {
        console.error('⚠️ Error deleting profile:', profileError);
      } else {
        console.log('✅ Profile deleted');
      }

      // 3. Supprimer définitivement de auth.users
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        userToDelete.id
      );

      if (deleteError) {
        console.error('❌ Error deleting user from auth:', deleteError);
        throw deleteError;
      }

      console.log('✅ User completely deleted from auth.users');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `User ${email} completely deleted and can now re-register`,
          userId: userToDelete.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('ℹ️ User not found in auth.users - already clean');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No user found with email ${email} - already clean`,
          alreadyClean: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
