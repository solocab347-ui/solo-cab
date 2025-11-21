import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestClient {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  is_exclusive: boolean;
  driver_id?: string;
}

const testClients: TestClient[] = [
  {
    email: 'marie.test@solocab.fr',
    password: 'SoloCab2024!',
    full_name: 'Marie Test',
    phone: '+33612345678',
    is_exclusive: true,
    driver_id: '7b20417f-7529-4997-9ec4-84808dd32337', // Pierre's driver_id
  },
  {
    email: 'sophie.test@solocab.fr',
    password: 'SoloCab2024!',
    full_name: 'Sophie Test',
    phone: '+33612345679',
    is_exclusive: true,
    driver_id: '7b20417f-7529-4997-9ec4-84808dd32337', // Pierre's driver_id
  },
  {
    email: 'thomas.test@solocab.fr',
    password: 'SoloCab2024!',
    full_name: 'Thomas Test',
    phone: '+33612345680',
    is_exclusive: false,
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting test clients recreation...');

    const results = [];

    for (const testClient of testClients) {
      try {
        console.log(`Processing ${testClient.email}...`);

        // Create new user with complete auth data (skip deletion to avoid schema errors)
        console.log(`Creating new user ${testClient.email}...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: testClient.email,
          password: testClient.password,
          email_confirm: true,
          user_metadata: {
            full_name: testClient.full_name,
          },
        });

        if (createError || !newUser.user) {
          throw new Error(`Failed to create user: ${createError?.message}`);
        }

        console.log(`User created: ${newUser.user.id}`);

        // 3. Update profile with roles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: testClient.full_name,
            phone: testClient.phone,
            roles: ['client'],
          })
          .eq('id', newUser.user.id);

        if (profileError) {
          throw new Error(`Profile update failed: ${profileError.message}`);
        }

        // 4. Insert into user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: 'client',
          });

        if (roleError && !roleError.message.includes('duplicate')) {
          throw new Error(`Role insertion failed: ${roleError.message}`);
        }

        // 5. Create client entry
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: newUser.user.id,
            is_exclusive: testClient.is_exclusive,
            driver_id: testClient.driver_id || null,
            driver_ids: testClient.driver_id ? [testClient.driver_id] : [],
          });

        if (clientError) {
          throw new Error(`Client insertion failed: ${clientError.message}`);
        }

        results.push({
          email: testClient.email,
          success: true,
          user_id: newUser.user.id,
        });

        console.log(`✅ Successfully recreated ${testClient.email}`);

      } catch (error) {
        console.error(`❌ Error recreating ${testClient.email}:`, error);
        results.push({
          email: testClient.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test clients recreation completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
