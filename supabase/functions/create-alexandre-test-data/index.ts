import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Noms français pour les clients
const firstNames = [
  'Sophie', 'Thomas', 'Marie', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Antoine',
  'Chloé', 'Maxime', 'Julie', 'Nicolas', 'Camille', 'Pierre', 'Sarah',
  'Alexandre', 'Laura', 'Julien', 'Anaïs', 'Mathieu', 'Manon', 'Romain',
  'Élise', 'Benjamin', 'Clara', 'Adrien', 'Inès', 'Florian', 'Océane', 'Paul'
];

const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
  'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel',
  'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel',
  'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet',
  'François', 'Martinez'
];

// Adresses parisiennes
const parisAddresses = [
  { address: '45 Rue de Rivoli, 75001 Paris', lat: 48.8584, lon: 2.3529 },
  { address: '12 Avenue des Champs-Élysées, 75008 Paris', lat: 48.8698, lon: 2.3078 },
  { address: '89 Boulevard Saint-Germain, 75005 Paris', lat: 48.8520, lon: 2.3450 },
  { address: '34 Rue du Faubourg Saint-Antoine, 75012 Paris', lat: 48.8527, lon: 2.3737 },
  { address: '56 Avenue Montaigne, 75008 Paris', lat: 48.8662, lon: 2.3045 },
  { address: '78 Rue de la Roquette, 75011 Paris', lat: 48.8559, lon: 2.3767 },
  { address: '23 Place de la République, 75011 Paris', lat: 48.8676, lon: 2.3635 },
  { address: '67 Rue Oberkampf, 75011 Paris', lat: 48.8651, lon: 2.3799 },
  { address: '91 Boulevard Haussmann, 75008 Paris', lat: 48.8750, lon: 2.3186 },
  { address: '15 Rue de Belleville, 75019 Paris', lat: 48.8723, lon: 2.3872 },
  { address: '42 Avenue de la Grande Armée, 75017 Paris', lat: 48.8779, lon: 2.2902 },
  { address: '88 Rue du Bac, 75007 Paris', lat: 48.8560, lon: 2.3252 },
  { address: '29 Rue de Charonne, 75011 Paris', lat: 48.8533, lon: 2.3823 },
  { address: '54 Boulevard de Clichy, 75018 Paris', lat: 48.8839, lon: 2.3344 },
  { address: '76 Rue de Passy, 75016 Paris', lat: 48.8580, lon: 2.2804 },
];

const destinationAddresses = [
  { address: 'Aéroport Charles de Gaulle, 95700 Roissy', lat: 49.0097, lon: 2.5479 },
  { address: 'Gare du Nord, 75010 Paris', lat: 48.8809, lon: 2.3553 },
  { address: 'Tour Eiffel, 75007 Paris', lat: 48.8584, lon: 2.2945 },
  { address: 'Gare de Lyon, 75012 Paris', lat: 48.8444, lon: 2.3739 },
  { address: 'La Défense, 92400 Courbevoie', lat: 48.8919, lon: 2.2417 },
  { address: 'Aéroport Orly, 94390 Orly', lat: 48.7262, lon: 2.3652 },
  { address: 'Stade de France, 93200 Saint-Denis', lat: 48.9244, lon: 2.3601 },
  { address: 'Château de Versailles, 78000 Versailles', lat: 48.8049, lon: 2.1204 },
  { address: 'Disneyland Paris, 77777 Marne-la-Vallée', lat: 48.8674, lon: 2.7833 },
  { address: 'Palais des Congrès, 75017 Paris', lat: 48.8783, lon: 2.2836 },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDateInDecember(): string {
  const day = getRandomInt(1, 31);
  const hour = getRandomInt(6, 23);
  const minute = getRandomInt(0, 59);
  return `2024-12-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+01:00`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🚀 Création des données de test pour Alexandre Diarra...');

    // 1. Récupérer Alexandre Diarra
    const { data: alexandre, error: alexError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', '%Alexandre%Diarra%')
      .single();

    if (alexError || !alexandre) {
      throw new Error('Alexandre Diarra introuvable');
    }

    // 2. Récupérer l'ID driver d'Alexandre
    const { data: alexDriver, error: driverError } = await supabase
      .from('drivers')
      .select('id, per_km_rate, base_fare, hourly_rate, tva_rate, tva_included, is_demo_account')
      .eq('user_id', alexandre.id)
      .single();

    if (driverError || !alexDriver) {
      throw new Error('Profil chauffeur Alexandre introuvable');
    }

    console.log(`✅ Alexandre trouvé: ${alexandre.full_name}, driver_id: ${alexDriver.id}`);
    console.log(`📊 Tarifs: ${alexDriver.per_km_rate}€/km, base: ${alexDriver.base_fare}€, horaire: ${alexDriver.hourly_rate}€/h`);

    if (!alexDriver.is_demo_account) {
      console.warn('⚠️ ATTENTION: is_demo_account n\'est pas true pour Alexandre!');
    } else {
      console.log('✅ Confirmé: Alexandre est bien un compte démo (is_demo_account=true)');
    }

    const clientsData: any[] = [];
    const allCourses: any[] = [];
    const allDevis: any[] = [];
    const allFactures: any[] = [];

    // 3. Créer 30 clients
    console.log('👥 Création de 30 clients...');
    for (let i = 0; i < 30; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const fullName = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@test-solocab.fr`;
      const phone = `06${getRandomInt(10, 99)}${getRandomInt(10, 99)}${getRandomInt(10, 99)}${getRandomInt(10, 99)}`;
      const address = getRandomElement(parisAddresses);

      // Créer l'utilisateur auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'TestClient2024!',
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError || !authUser.user) {
        console.error(`❌ Erreur création auth pour ${fullName}:`, authError);
        continue;
      }

      // Créer le profil
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          address: address.address
        })
        .eq('id', authUser.user.id);

      // Créer le client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: authUser.user.id,
          driver_id: alexDriver.id,
          driver_ids: [alexDriver.id],
          is_exclusive: true,
          total_rides: 0,
          total_spent: 0
        })
        .select()
        .single();

      if (clientError || !client) {
        console.error(`❌ Erreur création client pour ${fullName}:`, clientError);
        continue;
      }

      // Ajouter le rôle client
      await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: 'client'
        });

      clientsData.push({
        ...client,
        full_name: fullName,
        user_id: authUser.user.id,
        address
      });

      console.log(`✅ Client ${i + 1}/30 créé: ${fullName}`);
    }

    console.log(`✅ ${clientsData.length} clients créés avec succès`);

    // 4. Créer les courses pour chaque client
    console.log('🚗 Création des courses...');
    
    let courseCounter = 0;
    let devisCounter = 0;

    for (const client of clientsData) {
      // 10 courses classiques
      for (let j = 0; j < 10; j++) {
        const pickup = client.address;
        const destination = getRandomElement(destinationAddresses);
        const scheduledDate = generateDateInDecember();
        
        // Calcul distance approximative (formule Haversine simplifiée)
        const R = 6371;
        const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
        const dLon = (destination.lon - pickup.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        const duration = Math.ceil(distance / 0.5); // 30 km/h moyenne

        // Statuts aléatoires
        const rand = Math.random();
        let status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
        if (rand < 0.5) status = 'completed'; // 50% terminées
        else if (rand < 0.7) status = 'accepted'; // 20% réservées
        else if (rand < 0.85) status = 'pending'; // 15% en attente
        else if (rand < 0.95) status = 'in_progress'; // 10% en cours
        else status = 'cancelled'; // 5% annulées

        courseCounter++;
        const currentCourseNumber = `RES-${String(courseCounter).padStart(3, '0')}`;

        const { data: createdCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            client_id: client.id,
            driver_id: alexDriver.id,
            pickup_address: pickup.address,
            pickup_latitude: pickup.lat,
            pickup_longitude: pickup.lon,
            destination_address: destination.address,
            destination_latitude: destination.lat,
            destination_longitude: destination.lon,
            scheduled_date: scheduledDate,
            distance_km: distance,
            duration_minutes: duration,
            status,
            passengers_count: getRandomInt(1, 4),
            course_number: currentCourseNumber,
            created_by_user_id: Math.random() < 0.5 ? client.user_id : alexandre.id
          })
          .select()
          .single();

        if (courseError || !createdCourse) {
          console.error('❌ Erreur création course:', courseError);
          continue;
        }

        allCourses.push(createdCourse);

        // Créer le devis
        const basePrice = alexDriver.base_fare || 10;
        const distancePrice = distance * (alexDriver.per_km_rate || 2);
        const subtotal = basePrice + distancePrice;
        const tvaRate = 10;
        const tvaAmount = alexDriver.tva_included 
          ? subtotal - (subtotal / (1 + tvaRate / 100))
          : subtotal * (tvaRate / 100);
        const totalPrice = alexDriver.tva_included ? subtotal : subtotal + tvaAmount;

        devisCounter++;
        const currentQuoteNumber = `RES-${String(devisCounter).padStart(3, '0')}`;
        const validUntil = new Date(scheduledDate);
        validUntil.setDate(validUntil.getDate() + 7);

        let devisStatus: 'pending' | 'accepted' | 'rejected' | 'expired';
        if (status === 'completed' || status === 'accepted' || status === 'in_progress') {
          devisStatus = 'accepted';
        } else if (rand < 0.9) {
          devisStatus = 'pending';
        } else {
          devisStatus = Math.random() < 0.7 ? 'rejected' : 'expired';
        }

        const { data: createdDevis, error: devisError } = await supabase
          .from('devis')
          .insert({
            course_id: createdCourse.id,
            driver_id: alexDriver.id,
            client_id: client.id,
            quote_number: currentQuoteNumber,
            base_price: basePrice,
            distance_price: distancePrice,
            time_price: 0,
            amount: totalPrice,
            discount_amount: 0,
            status: devisStatus,
            valid_until: validUntil.toISOString(),
            accepted_at: devisStatus === 'accepted' ? scheduledDate : null
          })
          .select()
          .single();

        if (devisError || !createdDevis) {
          console.error('❌ Erreur création devis:', devisError);
          continue;
        }

        allDevis.push(createdDevis);

        // Créer la facture si terminée
        if (status === 'completed') {
          const invoiceNumber = currentQuoteNumber;
          const paymentStatus: 'paid' | 'pending' = Math.random() < 0.9 ? 'paid' : 'pending';

          const { data: facture, error: factureError } = await supabase
            .from('factures')
            .insert({
              course_id: createdCourse.id,
              driver_id: alexDriver.id,
              client_id: client.id,
              devis_id: createdDevis.id,
              invoice_number: invoiceNumber,
              invoice_number_generated: invoiceNumber,
              amount: totalPrice,
              discount_amount: 0,
              payment_status: paymentStatus,
              payment_method: paymentStatus === 'paid' ? getRandomElement(['cash', 'card', 'bank_transfer']) : null,
              paid_at: paymentStatus === 'paid' ? scheduledDate : null
            })
            .select()
            .single();

          if (!factureError && facture) {
            allFactures.push(facture);
          }
        }
      }

      // 3 courses en mise à disposition
      for (let k = 0; k < 3; k++) {
        const pickup = client.address;
        const destination = getRandomElement(destinationAddresses);
        const scheduledDate = generateDateInDecember();
        const duration = getRandomInt(120, 480); // 2h à 8h

        const rand = Math.random();
        let status: 'pending' | 'accepted' | 'completed';
        if (rand < 0.6) status = 'completed';
        else if (rand < 0.8) status = 'accepted';
        else status = 'pending';

        courseCounter++;
        const currentCourseNumber = `RES-${String(courseCounter).padStart(3, '0')}`;

        const { data: createdCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            client_id: client.id,
            driver_id: alexDriver.id,
            pickup_address: pickup.address,
            pickup_latitude: pickup.lat,
            pickup_longitude: pickup.lon,
            destination_address: destination.address,
            destination_latitude: destination.lat,
            destination_longitude: destination.lon,
            scheduled_date: scheduledDate,
            distance_km: 0,
            duration_minutes: duration,
            status,
            passengers_count: getRandomInt(1, 4),
            course_number: currentCourseNumber,
            created_by_user_id: Math.random() < 0.5 ? client.user_id : alexandre.id
          })
          .select()
          .single();

        if (courseError || !createdCourse) continue;

        allCourses.push(createdCourse);

        // Devis mise à disposition
        const timePrice = (duration / 60) * (alexDriver.hourly_rate || 50);
        const tvaRate = 20;
        const tvaAmount = alexDriver.tva_included
          ? timePrice - (timePrice / (1 + tvaRate / 100))
          : timePrice * (tvaRate / 100);
        const totalPrice = alexDriver.tva_included ? timePrice : timePrice + tvaAmount;

        devisCounter++;
        const currentQuoteNumber = `RES-${String(devisCounter).padStart(3, '0')}`;
        const validUntil = new Date(scheduledDate);
        validUntil.setDate(validUntil.getDate() + 7);

        const devisStatus: 'pending' | 'accepted' = (status === 'completed' || status === 'accepted') ? 'accepted' : 'pending';

        const { data: createdDevis } = await supabase
          .from('devis')
          .insert({
            course_id: createdCourse.id,
            driver_id: alexDriver.id,
            client_id: client.id,
            quote_number: currentQuoteNumber,
            base_price: 0,
            distance_price: 0,
            time_price: timePrice,
            amount: totalPrice,
            discount_amount: 0,
            status: devisStatus,
            valid_until: validUntil.toISOString(),
            accepted_at: devisStatus === 'accepted' ? scheduledDate : null
          })
          .select()
          .single();

        if (createdDevis) allDevis.push(createdDevis);

        if (status === 'completed') {
          const invoiceNumber = currentQuoteNumber;
          const paymentStatus: 'paid' | 'pending' = Math.random() < 0.9 ? 'paid' : 'pending';

          const { data: facture } = await supabase
            .from('factures')
            .insert({
              course_id: createdCourse.id,
              driver_id: alexDriver.id,
              client_id: client.id,
              devis_id: createdDevis.id,
              invoice_number: invoiceNumber,
              invoice_number_generated: invoiceNumber,
              amount: totalPrice,
              discount_amount: 0,
              payment_status: paymentStatus,
              payment_method: paymentStatus === 'paid' ? getRandomElement(['cash', 'card', 'bank_transfer']) : null,
              paid_at: paymentStatus === 'paid' ? scheduledDate : null
            })
            .select()
            .single();

          if (facture) allFactures.push(facture);
        }
      }

      console.log(`✅ Courses créées pour ${client.full_name}: 10 classiques + 3 mise à disposition`);
    }

    console.log('\n📊 RÉCAPITULATIF:');
    console.log(`✅ ${clientsData.length} clients créés`);
    console.log(`✅ ${allCourses.length} courses créées`);
    console.log(`✅ ${allDevis.length} devis générés`);
    console.log(`✅ ${allFactures.length} factures créées`);
    console.log(`\n⚠️ CONFIRMATION: is_demo_account=${alexDriver.is_demo_account} pour Alexandre`);
    console.log(`✅ Toutes les données sont EXCLUES des statistiques admin`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Données de test créées avec succès pour Alexandre Diarra',
        stats: {
          clients: clientsData.length,
          courses: allCourses.length,
          devis: allDevis.length,
          factures: allFactures.length,
          demo_account_confirmed: alexDriver.is_demo_account === true
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erreur inconnue' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
