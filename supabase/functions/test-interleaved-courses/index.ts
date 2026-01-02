import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Deux chauffeurs existants
const DRIVERS = [
  { id: "c33021a4-333d-4231-a32a-98b8593e1526", name: "Alexandre Diarra" },
  { id: "d0f4960d-1f21-4844-8e91-4251c6ca106f", name: "Abdallah KANOUTE" }
];

const parisAddresses = [
  "1 Avenue des Champs-Élysées, 75008 Paris",
  "Tour Eiffel, 75007 Paris",
  "Gare du Nord, 75010 Paris",
  "Aéroport CDG, 95700 Roissy-en-France",
  "La Défense, 92800 Puteaux",
  "Gare de Lyon, 75012 Paris",
  "Montmartre, 75018 Paris",
  "Opéra Garnier, 75009 Paris",
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { totalCourses = 100 } = await req.json().catch(() => ({}));
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log(`🚀 Démarrage de la simulation avec ${totalCourses} courses entremêlées entre 2 chauffeurs`);

    // Récupérer les clients existants pour chaque chauffeur
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, driver_id")
      .in("driver_id", DRIVERS.map(d => d.id));

    if (clientsError || !clients?.length) {
      throw new Error("Aucun client trouvé pour les chauffeurs");
    }

    const clientsByDriver: Record<string, string[]> = {};
    for (const driver of DRIVERS) {
      clientsByDriver[driver.id] = clients
        .filter(c => c.driver_id === driver.id)
        .map(c => c.id);
    }

    // Vérifier qu'on a des clients pour chaque chauffeur
    for (const driver of DRIVERS) {
      if (!clientsByDriver[driver.id]?.length) {
        throw new Error(`Aucun client pour le chauffeur ${driver.name}`);
      }
    }

    const results = {
      coursesCreated: 0,
      devisCreated: 0,
      facturesCreated: 0,
      errors: [] as string[],
      numbersByDriver: {} as Record<string, { courses: string[], devis: string[], factures: string[] }>
    };

    // Initialiser les résultats par chauffeur
    for (const driver of DRIVERS) {
      results.numbersByDriver[driver.name] = { courses: [], devis: [], factures: [] };
    }

    // Créer les courses en alternant entre les chauffeurs
    for (let i = 0; i < totalCourses; i++) {
      // Alterner entre les chauffeurs à chaque itération
      const driverIndex = i % 2;
      const driver = DRIVERS[driverIndex];
      const clientIds = clientsByDriver[driver.id];
      const clientId = getRandomElement(clientIds);

      const pickup = getRandomElement(parisAddresses);
      let destination = getRandomElement(parisAddresses);
      while (destination === pickup) {
        destination = getRandomElement(parisAddresses);
      }

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + getRandomInt(1, 30));
      scheduledDate.setHours(getRandomInt(6, 22), getRandomInt(0, 59), 0, 0);

      const distance = getRandomInt(5, 50);
      const duration = getRandomInt(15, 90);

      try {
        // 1. Créer la course (le trigger génère course_number)
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .insert({
            driver_id: driver.id,
            client_id: clientId,
            pickup_address: pickup,
            destination_address: destination,
            pickup_latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
            pickup_longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
            destination_latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
            destination_longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
            scheduled_date: scheduledDate.toISOString(),
            distance_km: distance,
            duration_minutes: duration,
            passengers_count: getRandomInt(1, 4),
            status: "completed",
            notes: `Test simulation #${i + 1} - ${driver.name}`
          })
          .select()
          .single();

        if (courseError) {
          results.errors.push(`Course #${i + 1} (${driver.name}): ${courseError.message}`);
          continue;
        }

        results.coursesCreated++;
        if (course.course_number) {
          results.numbersByDriver[driver.name].courses.push(course.course_number);
        }

        // 2. Créer le devis avec le même numéro
        const amount = distance * 2.5 + 10;
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        const { data: devis, error: devisError } = await supabase
          .from("devis")
          .insert({
            course_id: course.id,
            driver_id: driver.id,
            client_id: clientId,
            quote_number: course.course_number, // Même numéro
            amount: amount,
            base_price: 10,
            distance_price: distance * 2.5,
            discount_amount: 0,
            status: "accepted",
            valid_until: validUntil.toISOString(),
            accepted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (devisError) {
          results.errors.push(`Devis #${i + 1} (${driver.name}): ${devisError.message}`);
        } else {
          results.devisCreated++;
          if (devis.quote_number) {
            results.numbersByDriver[driver.name].devis.push(devis.quote_number);
          }
        }

        // 3. Créer la facture avec le même numéro
        const { data: facture, error: factureError } = await supabase
          .from("factures")
          .insert({
            course_id: course.id,
            driver_id: driver.id,
            client_id: clientId,
            devis_id: devis?.id,
            invoice_number: course.course_number, // Même numéro
            amount: amount,
            payment_status: "paid",
            payment_method: getRandomElement(["card", "cash", "transfer"]),
            paid_at: new Date().toISOString()
          })
          .select()
          .single();

        if (factureError) {
          results.errors.push(`Facture #${i + 1} (${driver.name}): ${factureError.message}`);
        } else {
          results.facturesCreated++;
          if (facture.invoice_number) {
            results.numbersByDriver[driver.name].factures.push(facture.invoice_number);
          }
        }

        // Log de progression tous les 10%
        if ((i + 1) % Math.ceil(totalCourses / 10) === 0) {
          console.log(`📊 Progression: ${i + 1}/${totalCourses} (${Math.round((i + 1) / totalCourses * 100)}%)`);
        }

      } catch (err: unknown) {
        results.errors.push(`Erreur #${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Vérification de l'intégrité des numéros
    const integrityCheck = {
      passed: true,
      issues: [] as string[]
    };

    for (const driver of DRIVERS) {
      const driverNumbers = results.numbersByDriver[driver.name];
      
      // Vérifier que les numéros de courses sont uniques pour ce chauffeur
      const uniqueCourses = new Set(driverNumbers.courses);
      if (uniqueCourses.size !== driverNumbers.courses.length) {
        integrityCheck.passed = false;
        integrityCheck.issues.push(`${driver.name}: Doublons détectés dans les numéros de courses`);
      }

      // Vérifier que courses = devis = factures
      const coursesSet = new Set(driverNumbers.courses);
      const devisSet = new Set(driverNumbers.devis);
      const facturesSet = new Set(driverNumbers.factures);

      for (const num of driverNumbers.courses) {
        if (!devisSet.has(num)) {
          integrityCheck.passed = false;
          integrityCheck.issues.push(`${driver.name}: Course ${num} n'a pas de devis correspondant`);
        }
        if (!facturesSet.has(num)) {
          integrityCheck.passed = false;
          integrityCheck.issues.push(`${driver.name}: Course ${num} n'a pas de facture correspondante`);
        }
      }

      // Vérifier qu'il n'y a pas de chevauchement entre les chauffeurs
      const otherDriver = DRIVERS.find(d => d.id !== driver.id)!;
      const otherNumbers = results.numbersByDriver[otherDriver.name].courses;
      
      for (const num of driverNumbers.courses) {
        if (otherNumbers.includes(num)) {
          integrityCheck.passed = false;
          integrityCheck.issues.push(`COLLISION: Le numéro ${num} existe pour les deux chauffeurs!`);
        }
      }
    }

    // Statistiques finales
    const summary = {
      totalCoursesRequested: totalCourses,
      coursesCreated: results.coursesCreated,
      devisCreated: results.devisCreated,
      facturesCreated: results.facturesCreated,
      errorsCount: results.errors.length,
      integrityCheck,
      numberRanges: {} as Record<string, { first: string, last: string, count: number }>
    };

    for (const driver of DRIVERS) {
      const numbers = results.numbersByDriver[driver.name].courses.sort();
      if (numbers.length > 0) {
        summary.numberRanges[driver.name] = {
          first: numbers[0],
          last: numbers[numbers.length - 1],
          count: numbers.length
        };
      }
    }

    console.log("✅ Simulation terminée:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify({
      success: true,
      summary,
      errors: results.errors.slice(0, 20), // Limiter les erreurs affichées
      sampleNumbers: {
        [DRIVERS[0].name]: results.numbersByDriver[DRIVERS[0].name].courses.slice(0, 10),
        [DRIVERS[1].name]: results.numbersByDriver[DRIVERS[1].name].courses.slice(0, 10)
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("❌ Erreur:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
