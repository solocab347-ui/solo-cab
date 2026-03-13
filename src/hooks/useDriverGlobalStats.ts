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
 * 
 * OPTIMISÉ: Requêtes parallèles pour réduire la latence
 */
export async function getDriverGlobalStats(driverId: string): Promise<DriverGlobalStats> {
  try {
    // Lancer TOUTES les requêtes en parallèle au lieu de séquentiellement
    const [directByDriverIdResult, directByDriverIdsResult, sharedCoursesResult] = await Promise.all([
      // 1. Courses directes où driver_id = driverId
      supabase
        .from("courses")
        .select("id, client_rating")
        .eq("driver_id", driverId)
        .eq("status", "completed"),
      
      // 2. Courses où le chauffeur est dans driver_ids (array)
      supabase
        .from("courses")
        .select("id, client_rating")
        .filter("driver_ids", "cs", `{${driverId}}`)
        .eq("status", "completed"),
      
      // 3. Courses partagées reçues et complétées
      supabase
        .from("shared_courses")
        .select("id, course_id")
        .eq("receiver_driver_id", driverId)
        .eq("status", "completed"),
    ]);

    const directByDriverId = directByDriverIdResult.data || [];
    const directByDriverIds = directByDriverIdsResult.data || [];
    const sharedCourses = sharedCoursesResult.data || [];

    // Fusionner et dédupliquer les courses directes
    const directCoursesMap = new Map<string, { id: string; client_rating: number | null }>();
    for (const c of directByDriverId) {
      directCoursesMap.set(c.id, c);
    }
    for (const c of directByDriverIds) {
      if (!directCoursesMap.has(c.id)) {
        directCoursesMap.set(c.id, c);
      }
    }
    const directCourses = Array.from(directCoursesMap.values());
    const directCourseIds = new Set(directCourses.map(c => c.id));

    // Dédupliquer les courses partagées
    const sharedCourseIds = sharedCourses
      .map(sc => sc.course_id)
      .filter(cid => cid && !directCourseIds.has(cid));

    // 4. Récupérer les ratings des courses partagées
    let sharedRatings: { client_rating: number | null }[] = [];
    if (sharedCourseIds.length > 0) {
      const { data: sharedCoursesData } = await supabase
        .from("courses")
        .select("client_rating")
        .in("id", sharedCourseIds)
        .eq("status", "completed");
      sharedRatings = sharedCoursesData || [];
    }

    const totalRides = directCourses.length + sharedCourseIds.length;

    const allRatings = [
      ...directCourses.map(c => c.client_rating),
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
