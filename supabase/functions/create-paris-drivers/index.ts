import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParisDriver {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  vehicleModel: string;
  vehicleBrand: string;
  vehicleColor: string;
  vehicleYear: number;
  bio: string;
  serviceDescription: string;
  homeAddress: string;
  companyAddress: string;
  siret: string;
  photoNumber: number;
}

const parisDrivers: ParisDriver[] = [
  {
    fullName: "Alexandre Martin",
    email: "alexandre.martin@solocab.fr",
    phone: "+33601234501",
    companyName: "VTC Alexandre Martin",
    vehicleModel: "Classe E",
    vehicleBrand: "Mercedes-Benz",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeur VTC professionnel depuis 12 ans à Paris. Service premium et ponctualité garantie.",
    serviceDescription: "Transport haut de gamme dans Paris et région parisienne. Spécialiste trajets aéroports.",
    homeAddress: "15 Rue de Rivoli, 75001 Paris",
    companyAddress: "15 Rue de Rivoli, 75001 Paris",
    siret: "12345678900001",
    photoNumber: 1
  },
  {
    fullName: "Sophie Dubois",
    email: "sophie.dubois@solocab.fr",
    phone: "+33601234502",
    companyName: "VTC Sophie Dubois",
    vehicleModel: "Série 5",
    vehicleBrand: "BMW",
    vehicleColor: "Gris",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC expérimentée, service personnalisé et discrétion assurée.",
    serviceDescription: "Transport professionnel avec attention particulière au confort des passagers.",
    homeAddress: "28 Avenue des Champs-Élysées, 75008 Paris",
    companyAddress: "28 Avenue des Champs-Élysées, 75008 Paris",
    siret: "12345678900002",
    photoNumber: 2
  },
  {
    fullName: "Pierre Lefebvre",
    email: "pierre.lefebvre@solocab.fr",
    phone: "+33601234503",
    companyName: "VTC Pierre Lefebvre",
    vehicleModel: "Model S",
    vehicleBrand: "Tesla",
    vehicleColor: "Noir",
    vehicleYear: 2024,
    bio: "Chauffeur VTC écologique, véhicule électrique premium pour vos déplacements parisiens.",
    serviceDescription: "Transport 100% électrique, silencieux et respectueux de l'environnement.",
    homeAddress: "42 Boulevard Saint-Germain, 75005 Paris",
    companyAddress: "42 Boulevard Saint-Germain, 75005 Paris",
    siret: "12345678900003",
    photoNumber: 3
  },
  {
    fullName: "Lucas Bernard",
    email: "lucas.bernard@solocab.fr",
    phone: "+33601234504",
    companyName: "VTC Lucas Bernard",
    vehicleModel: "A6",
    vehicleBrand: "Audi",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeur VTC professionnel, ponctuel et discret pour tous vos déplacements.",
    serviceDescription: "Service de transport premium avec véhicule haut de gamme équipé.",
    homeAddress: "18 Rue du Faubourg Saint-Honoré, 75008 Paris",
    companyAddress: "18 Rue du Faubourg Saint-Honoré, 75008 Paris",
    siret: "12345678900004",
    photoNumber: 4
  },
  {
    fullName: "Emma Petit",
    email: "emma.petit@solocab.fr",
    phone: "+33601234505",
    companyName: "VTC Emma Petit",
    vehicleModel: "Classe E",
    vehicleBrand: "Mercedes-Benz",
    vehicleColor: "Blanc",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC attentionnée, spécialiste des trajets professionnels et événementiels.",
    serviceDescription: "Transport de qualité avec service personnalisé et véhicule premium.",
    homeAddress: "56 Rue de la Paix, 75002 Paris",
    companyAddress: "56 Rue de la Paix, 75002 Paris",
    siret: "12345678900005",
    photoNumber: 5
  },
  {
    fullName: "Thomas Robert",
    email: "thomas.robert@solocab.fr",
    phone: "+33601234506",
    companyName: "VTC Thomas Robert",
    vehicleModel: "Série 7",
    vehicleBrand: "BMW",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeur VTC expérimenté, 15 ans de service dans le transport de personnes.",
    serviceDescription: "Transport haut de gamme pour clientèle exigeante, discrétion garantie.",
    homeAddress: "33 Avenue Montaigne, 75008 Paris",
    companyAddress: "33 Avenue Montaigne, 75008 Paris",
    siret: "12345678900006",
    photoNumber: 6
  },
  {
    fullName: "Julien Moreau",
    email: "julien.moreau@solocab.fr",
    phone: "+33601234507",
    companyName: "VTC Julien Moreau",
    vehicleModel: "Model 3",
    vehicleBrand: "Tesla",
    vehicleColor: "Gris",
    vehicleYear: 2024,
    bio: "Chauffeur VTC moderne, véhicule électrique connecté pour vos trajets parisiens.",
    serviceDescription: "Transport écologique et technologique avec véhicule Tesla équipé.",
    homeAddress: "22 Rue de Vaugirard, 75006 Paris",
    companyAddress: "22 Rue de Vaugirard, 75006 Paris",
    siret: "12345678900007",
    photoNumber: 7
  },
  {
    fullName: "Camille Laurent",
    email: "camille.laurent@solocab.fr",
    phone: "+33601234508",
    companyName: "VTC Camille Laurent",
    vehicleModel: "A8",
    vehicleBrand: "Audi",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC professionnelle, spécialiste des transferts aéroports et événements.",
    serviceDescription: "Service premium avec véhicule luxueux et confort maximum.",
    homeAddress: "45 Rue du Bac, 75007 Paris",
    companyAddress: "45 Rue du Bac, 75007 Paris",
    siret: "12345678900008",
    photoNumber: 8
  },
  {
    fullName: "Nicolas Simon",
    email: "nicolas.simon@solocab.fr",
    phone: "+33601234509",
    companyName: "VTC Nicolas Simon",
    vehicleModel: "Classe S",
    vehicleBrand: "Mercedes-Benz",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeur VTC haut de gamme, service d'exception pour clientèle prestigieuse.",
    serviceDescription: "Transport premium avec véhicule Mercedes Classe S, le summum du luxe.",
    homeAddress: "12 Place Vendôme, 75001 Paris",
    companyAddress: "12 Place Vendôme, 75001 Paris",
    siret: "12345678900009",
    photoNumber: 9
  },
  {
    fullName: "Antoine Rousseau",
    email: "antoine.rousseau@solocab.fr",
    phone: "+33601234510",
    companyName: "VTC Antoine Rousseau",
    vehicleModel: "E-Pace",
    vehicleBrand: "Jaguar",
    vehicleColor: "Gris",
    vehicleYear: 2023,
    bio: "Chauffeur VTC élégant, véhicule britannique pour un service raffiné.",
    serviceDescription: "Transport avec style anglais, confort et élégance assurés.",
    homeAddress: "67 Rue de Grenelle, 75007 Paris",
    companyAddress: "67 Rue de Grenelle, 75007 Paris",
    siret: "12345678900010",
    photoNumber: 10
  },
  {
    fullName: "Marie Garnier",
    email: "marie.garnier@solocab.fr",
    phone: "+33601234511",
    companyName: "VTC Marie Garnier",
    vehicleModel: "Série 5",
    vehicleBrand: "BMW",
    vehicleColor: "Blanc",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC attentive, service personnalisé pour tous vos trajets parisiens.",
    serviceDescription: "Transport professionnel avec écoute et attention aux détails.",
    homeAddress: "89 Boulevard Haussmann, 75008 Paris",
    companyAddress: "89 Boulevard Haussmann, 75008 Paris",
    siret: "12345678900011",
    photoNumber: 11
  },
  {
    fullName: "Maxime Faure",
    email: "maxime.faure@solocab.fr",
    phone: "+33601234512",
    companyName: "VTC Maxime Faure",
    vehicleModel: "Model X",
    vehicleBrand: "Tesla",
    vehicleColor: "Noir",
    vehicleYear: 2024,
    bio: "Chauffeur VTC innovant, SUV électrique spacieux pour vos déplacements familiaux.",
    serviceDescription: "Transport électrique familial avec espace et confort optimaux.",
    homeAddress: "34 Avenue de l'Opéra, 75002 Paris",
    companyAddress: "34 Avenue de l'Opéra, 75002 Paris",
    siret: "12345678900012",
    photoNumber: 12
  },
  {
    fullName: "Hugo Vincent",
    email: "hugo.vincent@solocab.fr",
    phone: "+33601234513",
    companyName: "VTC Hugo Vincent",
    vehicleModel: "Classe E",
    vehicleBrand: "Mercedes-Benz",
    vehicleColor: "Gris",
    vehicleYear: 2023,
    bio: "Chauffeur VTC dynamique, toujours à l'heure pour vos rendez-vous importants.",
    serviceDescription: "Service rapide et efficace sans compromis sur le confort.",
    homeAddress: "23 Rue Royale, 75008 Paris",
    companyAddress: "23 Rue Royale, 75008 Paris",
    siret: "12345678900013",
    photoNumber: 13
  },
  {
    fullName: "Léa Mercier",
    email: "lea.mercier@solocab.fr",
    phone: "+33601234514",
    companyName: "VTC Léa Mercier",
    vehicleModel: "Q7",
    vehicleBrand: "Audi",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC spacieuse, SUV premium pour groupes et familles.",
    serviceDescription: "Transport confortable avec grand espace, idéal pour voyages avec bagages.",
    homeAddress: "78 Rue de Lille, 75007 Paris",
    companyAddress: "78 Rue de Lille, 75007 Paris",
    siret: "12345678900014",
    photoNumber: 14
  },
  {
    fullName: "Mathieu Dupont",
    email: "mathieu.dupont@solocab.fr",
    phone: "+33601234515",
    companyName: "VTC Mathieu Dupont",
    vehicleModel: "Série 7",
    vehicleBrand: "BMW",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeur VTC expérimenté, excellence et ponctualité depuis 10 ans.",
    serviceDescription: "Service premium irréprochable pour clientèle exigeante.",
    homeAddress: "91 Rue du Faubourg Saint-Antoine, 75011 Paris",
    companyAddress: "91 Rue du Faubourg Saint-Antoine, 75011 Paris",
    siret: "12345678900015",
    photoNumber: 15
  },
  {
    fullName: "Adrien Blanc",
    email: "adrien.blanc@solocab.fr",
    phone: "+33601234516",
    companyName: "VTC Adrien Blanc",
    vehicleModel: "A6",
    vehicleBrand: "Audi",
    vehicleColor: "Gris",
    vehicleYear: 2023,
    bio: "Chauffeur VTC professionnel, confort et sécurité pour tous vos trajets.",
    serviceDescription: "Transport fiable avec véhicule récent et bien entretenu.",
    homeAddress: "52 Avenue Kléber, 75016 Paris",
    companyAddress: "52 Avenue Kléber, 75016 Paris",
    siret: "12345678900016",
    photoNumber: 16
  },
  {
    fullName: "Clara Roux",
    email: "clara.roux@solocab.fr",
    phone: "+33601234517",
    companyName: "VTC Clara Roux",
    vehicleModel: "Classe E",
    vehicleBrand: "Mercedes-Benz",
    vehicleColor: "Blanc",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC élégante, service raffiné pour une expérience mémorable.",
    serviceDescription: "Transport avec classe et distinction, attention aux moindres détails.",
    homeAddress: "19 Rue de la Boétie, 75008 Paris",
    companyAddress: "19 Rue de la Boétie, 75008 Paris",
    siret: "12345678900017",
    photoNumber: 17
  },
  {
    fullName: "Benjamin Girard",
    email: "benjamin.girard@solocab.fr",
    phone: "+33601234518",
    companyName: "VTC Benjamin Girard",
    vehicleModel: "Model S",
    vehicleBrand: "Tesla",
    vehicleColor: "Noir",
    vehicleYear: 2024,
    bio: "Chauffeur VTC écologique et connecté, la modernité au service du confort.",
    serviceDescription: "Transport silencieux et écologique avec technologie de pointe.",
    homeAddress: "88 Boulevard Raspail, 75006 Paris",
    companyAddress: "88 Boulevard Raspail, 75006 Paris",
    siret: "12345678900018",
    photoNumber: 18
  },
  {
    fullName: "Nathan Lambert",
    email: "nathan.lambert@solocab.fr",
    phone: "+33601234519",
    companyName: "VTC Nathan Lambert",
    vehicleModel: "V60",
    vehicleBrand: "Volvo",
    vehicleColor: "Gris",
    vehicleYear: 2023,
    bio: "Chauffeur VTC nordique, sécurité et confort scandinave pour vos trajets.",
    serviceDescription: "Transport avec véhicule réputé pour sa sécurité et son confort.",
    homeAddress: "31 Rue de Turenne, 75003 Paris",
    companyAddress: "31 Rue de Turenne, 75003 Paris",
    siret: "12345678900019",
    photoNumber: 19
  },
  {
    fullName: "Chloé Bonnet",
    email: "chloe.bonnet@solocab.fr",
    phone: "+33601234520",
    companyName: "VTC Chloé Bonnet",
    vehicleModel: "Série 5",
    vehicleBrand: "BMW",
    vehicleColor: "Noir",
    vehicleYear: 2023,
    bio: "Chauffeuse VTC professionnelle, fiabilité et ponctualité pour vos rendez-vous.",
    serviceDescription: "Service de transport régulier et ponctuel avec véhicule premium.",
    homeAddress: "65 Boulevard de Courcelles, 75017 Paris",
    companyAddress: "65 Boulevard de Courcelles, 75017 Paris",
    siret: "12345678900020",
    photoNumber: 20
  }
];

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

    console.log('🚀 Création des 20 chauffeurs parisiens...');

    const results: {
      success: string[];
      errors: Array<{ email: string; error: string }>;
    } = {
      success: [],
      errors: []
    };

    for (const driver of parisDrivers) {
      try {
        console.log(`📝 Création du chauffeur: ${driver.fullName}`);

        // 1. Créer l'utilisateur auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: driver.email,
          password: 'SoloCab2025!',
          email_confirm: true,
          user_metadata: {
            full_name: driver.fullName
          }
        });

        if (authError) {
          console.error(`❌ Erreur auth pour ${driver.email}:`, authError);
          results.errors.push({ email: driver.email, error: authError.message });
          continue;
        }

        const userId = authData.user.id;

        // 2. Créer le profil avec référence à la photo dans le storage
        const photoFileName = `paris-driver-${driver.photoNumber}.jpg`;
        const photoUrl = `${supabaseUrl}/storage/v1/object/public/profile-photos/${photoFileName}`;
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: driver.email,
            full_name: driver.fullName,
            phone: driver.phone,
            profile_photo_url: photoUrl
          });

        if (profileError) {
          console.error(`❌ Erreur profil:`, profileError);
          results.errors.push({ email: driver.email, error: profileError.message });
          continue;
        }

        // 3. Créer le driver complet
        const parisWorkingSectors = [
          'Paris 1er', 'Paris 2e', 'Paris 3e', 'Paris 4e', 'Paris 5e',
          'Paris 6e', 'Paris 7e', 'Paris 8e', 'Paris 9e', 'Paris 10e',
          'Paris 11e', 'Paris 12e', 'Paris 13e', 'Paris 14e', 'Paris 15e',
          'Paris 16e', 'Paris 17e', 'Paris 18e', 'Paris 19e', 'Paris 20e',
          'Hauts-de-Seine', 'Seine-Saint-Denis', 'Val-de-Marne'
        ];

        const { data: driverData, error: driverError } = await supabaseAdmin
          .from('drivers')
          .insert({
            user_id: userId,
            license_number: `VTC-${driver.siret.slice(-6)}`,
            vehicle_model: driver.vehicleModel,
            vehicle_brand: driver.vehicleBrand,
            vehicle_color: driver.vehicleColor,
            vehicle_year: driver.vehicleYear,
            vehicle_plate: `${Math.random().toString(36).substring(2, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
            max_passengers: 4,
            status: 'validated',
            public_profile_enabled: true,
            base_fare: 10.0,
            per_km_rate: 1.8,
            hourly_rate: 50.0,
            tva_rate: 20.0,
            tva_included: false,
            company_name: driver.companyName,
            company_address: driver.companyAddress,
            siret: driver.siret,
            bio: driver.bio,
            service_description: driver.serviceDescription,
            working_sectors: parisWorkingSectors,
            services_offered: ['Transport aéroport', 'Mise à disposition', 'Événements', 'Transport professionnel', 'Trajets réguliers'],
            vehicle_equipment: ['Climatisation', 'GPS', 'Wi-Fi', 'Chargeur téléphone', 'Bouteilles d\'eau'],
            home_address: driver.homeAddress,
            home_latitude: 48.8566 + (Math.random() - 0.5) * 0.05, // Paris coordinates with small random offset
            home_longitude: 2.3522 + (Math.random() - 0.5) * 0.05,
            display_driver_name: true,
            display_company_name: true,
            quote_counter: 0,
            invoice_counter: 0,
            course_counter: 0,
            reservation_counter: 0,
            validation_date: new Date().toISOString(),
            rating: 4.5 + Math.random() * 0.5, // Rating entre 4.5 et 5.0
            total_rides: Math.floor(50 + Math.random() * 150), // Entre 50 et 200 courses
            show_phone: true,
            show_email: true,
            evening_surcharge: 15,
            weekend_surcharge: 20
          })
          .select()
          .single();

        if (driverError) {
          console.error(`❌ Erreur driver:`, driverError);
          results.errors.push({ email: driver.email, error: driverError.message });
          continue;
        }

        // 4. Créer le user_role
        await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'driver'
          });

        // 5. Générer le QR code
        const qrCode = `SOLOCAB-${driverData.id.slice(0, 8).toUpperCase()}`;
        await supabaseAdmin
          .from('qr_codes')
          .insert({
            driver_id: driverData.id,
            code: qrCode,
            is_active: true,
            qr_code_image: `https://solocab.fr/register-qr/${qrCode}`
          });

        results.success.push(driver.email);
        console.log(`✅ Chauffeur créé: ${driver.fullName}`);

      } catch (error: any) {
        console.error(`❌ Erreur pour ${driver.fullName}:`, error);
        results.errors.push({ email: driver.email, error: error.message });
      }
    }

    console.log(`\n✅ Création terminée!`);
    console.log(`✅ Succès: ${results.success.length}`);
    console.log(`❌ Erreurs: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.success.length}/20 chauffeurs créés avec succès`,
        created: results.success.length,
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
