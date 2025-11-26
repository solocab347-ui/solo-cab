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
    // Require a secret admin token from environment
    const ADMIN_INIT_SECRET = Deno.env.get('ADMIN_INIT_SECRET');
    
    if (!ADMIN_INIT_SECRET) {
      throw new Error('ADMIN_INIT_SECRET not configured');
    }

    const { secret_token } = await req.json();

    if (secret_token !== ADMIN_INIT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    console.log('Creating admin account with secure token validation...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const adminEmail = 'admin@solocab.fr';
    // Generate a strong random password
    const adminPassword = crypto.randomUUID() + '-' + crypto.randomUUID();

    // Check if admin already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUser?.users.find(u => u.email === adminEmail);

    let userId: string;

    if (adminExists) {
      console.log('Admin user already exists, updating password...');
      userId = adminExists.id;
      
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: adminPassword
      });
    } else {
      // Create new admin user
      console.log('Creating new admin user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrateur SoloCab'
        }
      });

      if (createError) {
        console.error('Error creating admin user:', createError);
        throw createError;
      }

      userId = newUser.user!.id;
    }

    // Upsert profile
    console.log('Upserting admin profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: adminEmail,
        full_name: 'Administrateur SoloCab',
        phone: '+33600000000',
        roles: ['admin']
      });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      throw profileError;
    }

    // Upsert admin role
    console.log('Upserting admin role...');
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin'
      }, {
        onConflict: 'user_id,role'
      });

    if (roleError) {
      console.error('Error upserting role:', roleError);
      throw roleError;
    }

    console.log('Admin account created/updated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin account secured',
        credentials: {
          email: adminEmail,
          password: adminPassword
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in secure-admin-init function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
