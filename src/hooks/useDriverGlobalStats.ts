import { supabase } from "@/integrations/supabase/client";

export interface DriverGlobalStats {
  totalRides: number;
  averageRating: number;
  completedRatings: number;
}

/**
 * Calcule les statistiques globales d'un chauffeur incluant:
 * - Courses personnelles (clients directs)
 * - Courses entreprises
 * - Courses partagées reçues d'autres chauffeurs
 * - Courses en tant que driver_id ou dans driver_ids
 */
export async function getDriverGlobalStats(driverId: string): Promise<DriverGlobalStats> {
  try {
    // 1. Courses directes où driver_id = driverId
    const { data: directByDriverId, error: error1 } = await supabase
      .from("courses")
      .select("id, client_rating")
      .eq("driver_id", driverId)
      .eq("status", "completed");
    
    if (error1) {
      console.error("Erreur requête courses driver_id:", error1);
    }

    // 2. Courses où le chauffeur est dans driver_ids (array) - utiliser filter cs
    const { data: directByDriverIds, error: error2 } = await supabase
      .from("courses")
      .select("id, client_rating")
      .filter("driver_ids", "cs", `{${driverId}}`)
      .eq("status", "completed");
    
    if (error2) {
      console.error("Erreur requête courses driver_ids:", error2);
    }

    // 3. Courses partagées reçues et complétées
    const { data: sharedCourses } = await supabase
      .from("shared_courses")
      .select("id, course_id")
      .eq("receiver_driver_id", driverId)
      .eq("status", "completed");

    // Fusionner et dédupliquer les courses directes
    const directCoursesMap = new Map<string, { id: string; client_rating: number | null }>();
    for (const c of (directByDriverId || [])) {
      directCoursesMap.set(c.id, c);
    }
    for (const c of (directByDriverIds || [])) {
      if (!directCoursesMap.has(c.id)) {
        directCoursesMap.set(c.id, c);
      }
    }
    const directCourses = Array.from(directCoursesMap.values());
    const directCourseIds = new Set(directCourses.map(c => c.id));

    // Dédupliquer les courses partagées (éviter de compter 2x une course partagée)
    const sharedCourseIds = (sharedCourses || [])
      .map(sc => sc.course_id)
      .filter(cid => cid && !directCourseIds.has(cid));

    // 4. Récupérer les ratings des courses partagées pour le calcul de la moyenne
    let sharedRatings: { client_rating: number | null }[] = [];
    if (sharedCourseIds.length > 0) {
      const { data: sharedCoursesData } = await supabase
        .from("courses")
        .select("client_rating")
        .in("id", sharedCourseIds)
        .eq("status", "completed");
      sharedRatings = sharedCoursesData || [];
    }

    // Calculer le total
    const totalRides = (directCourses?.length || 0) + sharedCourseIds.length;

    // Calculer la moyenne des notes
    const allRatings = [
      ...(directCourses || []).map(c => c.client_rating),
      ...sharedRatings.map(c => c.client_rating)
    ].filter((r): r is number => r !== null && r > 0);

    const averageRating = allRatings.length > 0
      ? allRatings.reduce((acc, r) => acc + r, 0) / allRatings.length
      : 0;

    return {
      totalRides,
      averageRating,
      completedRatings: allRatings.length,
    };
  } catch (error) {
    console.error("Erreur calcul stats globales:", error);
    return {
      totalRides: 0,
      averageRating: 0,
      completedRatings: 0,
    };
  }
}
