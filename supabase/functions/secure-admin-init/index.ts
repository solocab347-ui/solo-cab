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
    const ADMIN_DEFAULT_PASSWORD = Deno.env.get('ADMIN_DEFAULT_PASSWORD');
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'contact@solocab.fr';
    
    if (!ADMIN_INIT_SECRET) {
      console.error('ADMIN_INIT_SECRET not configured');
      throw new Error('Server configuration error');
    }

    if (!ADMIN_DEFAULT_PASSWORD) {
      console.error('ADMIN_DEFAULT_PASSWORD not configured');
      throw new Error('Server configuration error');
    }

    const { secret_token } = await req.json();

    // Debug: log more details to diagnose mismatch without exposing full secrets
    console.log('Token comparison:', {
      receivedLength: secret_token?.length,
      expectedLength: ADMIN_INIT_SECRET?.length,
      receivedFirst6: secret_token?.substring(0, 6),
      expectedFirst6: ADMIN_INIT_SECRET?.substring(0, 6),
      receivedLast4: secret_token?.substring(secret_token.length - 4),
      expectedLast4: ADMIN_INIT_SECRET?.substring(ADMIN_INIT_SECRET.length - 4),
      match: secret_token === ADMIN_INIT_SECRET
    });

    if (secret_token !== ADMIN_INIT_SECRET) {
      console.warn('Unauthorized admin init attempt - tokens do not match');
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

    // List all users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    console.log('Found users:', existingUsers?.users?.length);
    
    // Check if admin already exists
    const existingAdmin = existingUsers?.users.find(u => u.email === ADMIN_EMAIL);
    
    let userId: string;
    let actionTaken: string;

    if (existingAdmin) {
      console.log('Admin already exists, updating password...');
      userId = existingAdmin.id;
      actionTaken = 'updated';
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: ADMIN_DEFAULT_PASSWORD
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }
      
      console.log('Admin password updated successfully');
    } else {
      // Find old admin and update email+password
      const oldAdmin = existingUsers?.users.find(u => u.email === 'admin@solocab.fr');
      
      if (oldAdmin) {
        console.log('Migrating old admin to new email...');
        userId = oldAdmin.id;
        actionTaken = 'migrated';
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: ADMIN_EMAIL,
          password: ADMIN_DEFAULT_PASSWORD,
          email_confirm: true
        });
        
        if (updateError) {
          console.error('Error updating old admin:', updateError);
          throw updateError;
        }
        
        // Update profile email
        await supabaseAdmin.from('profiles').update({ email: ADMIN_EMAIL }).eq('id', userId);
        console.log('Old admin migrated successfully');
        
      } else {
        // Create new admin
        console.log('Creating new admin user...');
        actionTaken = 'created';
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_DEFAULT_PASSWORD,
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
            email: ADMIN_EMAIL,
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
        
        console.log('New admin created successfully');
      }
    }

    console.log(`Admin account ${actionTaken} successfully. User ID: ${userId}`);

    // SECURITY: Never return credentials in the response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Admin account ${actionTaken} successfully`,
        action: actionTaken,
        // Only return non-sensitive info
        email: ADMIN_EMAIL
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
        error: 'An error occurred during admin initialization'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
