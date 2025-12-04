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

    console.log('Creating admin account...');

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

    const adminEmail = 'solocab347@gmail.com';
    // Generate a password under 72 characters (bcrypt limit)
    const adminPassword = crypto.randomUUID().replace(/-/g, '');

    // List all users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    console.log('Found users:', existingUsers?.users?.length);
    
    // Check if new admin already exists
    const existingAdmin = existingUsers?.users.find(u => u.email === adminEmail);
    
    let userId: string;

    if (existingAdmin) {
      console.log('Admin with new email already exists, updating password...');
      userId = existingAdmin.id;
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: adminPassword
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }
    } else {
      // Find old admin and update email+password
      const oldAdmin = existingUsers?.users.find(u => u.email === 'admin@solocab.fr');
      
      if (oldAdmin) {
        console.log('Updating old admin email and password...');
        userId = oldAdmin.id;
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: adminEmail,
          password: adminPassword,
          email_confirm: true
        });
        
        if (updateError) {
          console.error('Error updating old admin:', updateError);
          throw updateError;
        }
        
        // Update profile email
        await supabaseAdmin.from('profiles').update({ email: adminEmail }).eq('id', userId);
        
      } else {
        // Create new admin
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
        
        // Create profile
        console.log('Creating admin profile...');
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
          console.error('Error creating profile:', profileError);
          throw profileError;
        }

        // Create admin role
        console.log('Creating admin role...');
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'admin'
          }, {
            onConflict: 'user_id,role'
          });

        if (roleError) {
          console.error('Error creating role:', roleError);
          throw roleError;
        }
      }
    }

    console.log('Admin account ready!');

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
