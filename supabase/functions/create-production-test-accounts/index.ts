import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestAccount {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'admin' | 'driver' | 'client';
  clientType?: 'exclusive' | 'free';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🚀 Création des comptes de test pour production...');

    // Définir les comptes à créer
    const accounts: TestAccount[] = [
      // 1 Admin
      {
        email: 'admin@solocab.fr',
        password: 'Admin2025!',
        fullName: 'Admin SoloCab',
        phone: '+33600000000',
        role: 'admin'
      },
      // 1 Driver
      {
        email: 'chauffeur.test@solocab.fr',
        password: 'Chauffeur2025!',
        fullName: 'Jean Dupont',
        phone: '+33601020304',
        role: 'driver'
      },
      // 3 Clients Exclusifs
      {
        email: 'client.exclusif1@solocab.fr',
        password: 'Client2025!',
        fullName: 'Marie Martin',
        phone: '+33611111111',
        role: 'client',
        clientType: 'exclusive'
      },
      {
        email: 'client.exclusif2@solocab.fr',
        password: 'Client2025!',
        fullName: 'Pierre Durand',
        phone: '+33622222222',
        role: 'client',
        clientType: 'exclusive'
      },
      {
        email: 'client.exclusif3@solocab.fr',
        password: 'Client2025!',
        fullName: 'Sophie Bernard',
        phone: '+33633333333',
        role: 'client',
        clientType: 'exclusive'
      },
      // 3 Clients Libres
      {
        email: 'client.libre1@solocab.fr',
        password: 'Client2025!',
        fullName: 'Luc Robert',
        phone: '+33644444444',
        role: 'client',
        clientType: 'free'
      },
      {
        email: 'client.libre2@solocab.fr',
        password: 'Client2025!',
        fullName: 'Emma Petit',
        phone: '+33655555555',
        role: 'client',
        clientType: 'free'
      },
      {
        email: 'client.libre3@solocab.fr',
        password: 'Client2025!',
        fullName: 'Thomas Richard',
        phone: '+33666666666',
        role: 'client',
        clientType: 'free'
      }
    ];

    const results: {
      success: string[];
      errors: Array<{ email: string; error: string }>;
      credentials: Array<{ email: string; password: string; role: string; name: string }>;
    } = {
      success: [],
      errors: [],
      credentials: []
    };

    let driverId: string | null = null;

    // Créer tous les comptes
    for (const account of accounts) {
      try {
        console.log(`📝 Création du compte: ${account.email}`);

        // 1. Créer l'utilisateur dans auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName
          }
        });

        if (authError) {
          console.error(`❌ Erreur auth pour ${account.email}:`, authError);
          results.errors.push({ email: account.email, error: authError.message });
          continue;
        }

        const userId = authData.user.id;
        console.log(`✅ Utilisateur auth créé: ${userId}`);

        // 2. Créer/Mettre à jour le profil
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            email: account.email,
            full_name: account.fullName,
            phone: account.phone
          });

        if (profileError) {
          console.error(`❌ Erreur profil pour ${account.email}:`, profileError);
          results.errors.push({ email: account.email, error: profileError.message });
          continue;
        }

        // 3. Créer le rôle spécifique
        if (account.role === 'admin') {
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'admin'
            });

          if (roleError) {
            console.error(`❌ Erreur rôle admin:`, roleError);
          }
        } else if (account.role === 'driver') {
          // Créer le driver avec tous les paramètres requis
          const { data: driverData, error: driverError } = await supabaseAdmin
            .from('drivers')
            .insert({
              user_id: userId,
              license_number: 'VTC-TEST-001',
              vehicle_model: 'Mercedes Classe E',
              vehicle_brand: 'Mercedes-Benz',
              vehicle_color: 'Noir',
              vehicle_year: 2023,
              vehicle_plate: 'AB-123-CD',
              max_passengers: 4,
              status: 'validated',
              public_profile_enabled: true,
              base_fare: 15.0,
              per_km_rate: 1.5,
              hourly_rate: 45.0,
              tva_rate: 20.0,
              tva_included: false,
              company_name: 'VTC Jean Dupont',
              company_address: '123 Avenue des Champs-Élysées, 75008 Paris',
              siret: '12345678901234',
              bio: 'Chauffeur VTC professionnel avec 10 ans d\'expérience',
              service_description: 'Service premium de transport avec véhicule haut de gamme',
              working_sectors: ['Paris', 'Île-de-France', 'Hauts-de-Seine'],
              services_offered: ['Transport aéroport', 'Mise à disposition', 'Événements'],
              vehicle_equipment: ['Climatisation', 'GPS', 'Wi-Fi', 'Chargeur téléphone'],
              home_address: '10 Rue de la République, 75011 Paris',
              display_driver_name: true,
              display_company_name: true,
              quote_counter: 0,
              invoice_counter: 0,
              course_counter: 0,
              validation_date: new Date().toISOString()
            })
            .select()
            .single();

          if (driverError) {
            console.error(`❌ Erreur driver:`, driverError);
            results.errors.push({ email: account.email, error: driverError.message });
            continue;
          }

          driverId = driverData.id;

          // Créer le user_role
          await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'driver'
            });

          // Générer le QR code pour le driver
          if (driverId) {
            const qrCode = `SOLOCAB-${driverId.slice(0, 8).toUpperCase()}`;
            await supabaseAdmin
              .from('qr_codes')
              .insert({
                driver_id: driverId,
                code: qrCode,
                is_active: true
              });

            console.log(`✅ Driver créé avec QR code: ${qrCode}`);
          }
        } else if (account.role === 'client') {
          if (!driverId) {
            console.error(`❌ Pas de driver disponible pour créer le client ${account.email}`);
            results.errors.push({ email: account.email, error: 'Driver not created yet' });
            continue;
          }

          // Créer le client
          const isExclusive = account.clientType === 'exclusive';
          const { error: clientError } = await supabaseAdmin
            .from('clients')
            .insert({
              user_id: userId,
              driver_id: isExclusive ? driverId : null,
              driver_ids: [driverId],
              is_exclusive: isExclusive
            });

          if (clientError) {
            console.error(`❌ Erreur client:`, clientError);
            results.errors.push({ email: account.email, error: clientError.message });
            continue;
          }

          // Créer le user_role
          await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'client'
            });

          console.log(`✅ Client ${account.clientType} créé`);
        }

        results.success.push(account.email);
        results.credentials.push({
          email: account.email,
          password: account.password,
          role: account.role,
          name: account.fullName
        });

      } catch (error: any) {
        console.error(`❌ Erreur globale pour ${account.email}:`, error);
        results.errors.push({ email: account.email, error: error.message });
      }
    }

    console.log(`\n✅ Création terminée!`);
    console.log(`✅ Succès: ${results.success.length}`);
    console.log(`❌ Erreurs: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Comptes créés: ${results.success.length}/${accounts.length}`,
        credentials: results.credentials,
        errors: results.errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur générale:', error);
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
