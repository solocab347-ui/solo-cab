import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ATTENTION: Cette fonction est pour les tests uniquement et ne devrait pas être accessible en production
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

    // Créer un utilisateur de test
    const testEmail = 'chauffeur.test@solocab.fr';
    const testPassword = 'TestDriver2024!';

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === testEmail);

    let userId: string;

    if (userExists) {
      userId = userExists.id;
      console.log('Utilisateur existant trouvé:', userId);
    } else {
      // Créer le nouvel utilisateur
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Pierre Dupont'
        }
      });

      if (authError || !newUser.user) {
        throw new Error(`Erreur création utilisateur: ${authError?.message}`);
      }

      userId = newUser.user.id;
      console.log('Nouvel utilisateur créé:', userId);
    }

    // Créer ou mettre à jour le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: testEmail,
        full_name: 'Pierre Dupont',
        phone: '+33612345678',
        roles: ['driver']
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Erreur profil:', profileError);
    }

    // Ajouter le rôle driver
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'driver'
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Erreur rôle:', roleError);
    }

    // Créer ou mettre à jour le profil chauffeur
    const { error: driverError } = await supabase
      .from('drivers')
      .upsert({
        user_id: userId,
        license_number: 'VTC123456',
        vehicle_model: 'Mercedes Classe E',
        vehicle_plate: 'AB-123-CD',
        vehicle_color: 'Noir',
        status: 'validated',
        base_fare: 15.00,
        per_km_rate: 1.50,
        hourly_rate: 45.00,
        tva_rate: 20.00,
        company_name: 'VTC Pierre Dupont',
        siret: '12345678900010',
        bio: 'Chauffeur professionnel avec 10 ans d\'expérience dans le transport de personnes.',
        service_description: 'Service VTC haut de gamme, véhicule récent et climatisé, WiFi à bord',
        home_address: '10 Rue de Rivoli, 75001 Paris, France',
        home_latitude: 48.8566,
        home_longitude: 2.3522,
        working_sectors: ['Paris', 'Île-de-France', '75001', '75002', '75003', '75004'],
        public_profile_enabled: true,
        rating: 4.8,
        total_rides: 150,
        quote_counter: 0,
        invoice_counter: 0,
        course_counter: 0
      }, { onConflict: 'user_id' });

    if (driverError) {
      throw new Error(`Erreur création driver: ${driverError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Chauffeur de test créé avec succès',
        credentials: {
          email: testEmail,
          password: testPassword,
          userId: userId
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
