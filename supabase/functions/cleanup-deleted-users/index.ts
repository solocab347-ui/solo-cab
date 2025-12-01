import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; response?: Response } {
  const now = Date.now();
  const limit = rateLimiter.get(ip);
  
  if (limit && now < limit.resetTime) {
    if (limit.count >= 10) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        ),
      };
    }
    limit.count++;
  } else {
    rateLimiter.set(ip, { count: 1, resetTime: now + 60000 });
  }
  
  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    console.log('🚫 Rate limit exceeded for user cleanup');
    return rateLimitResult.response!;
  }

  try {
    // Initialize auth client to verify JWT
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      console.log('❌ Invalid token:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize admin client
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

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.log('❌ User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Accès administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Admin verified:', user.email);

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🧹 Cleaning up user:', email);

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
