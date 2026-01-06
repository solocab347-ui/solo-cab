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
    // 1. Courses directes (personnelles + entreprises) - status completed
    // Utilise OR pour combiner driver_id et driver_ids (array contains)
    const { data: directCourses, error: directError } = await supabase
      .from("courses")
      .select("id, client_rating")
      .or(`driver_id.eq.${driverId},driver_ids.cs.{"${driverId}"}`)
      .eq("status", "completed");
    
    if (directError) {
      console.error("Erreur requête courses directes:", directError);
    }

    // 2. Courses partagées reçues et complétées
    const { data: sharedCourses } = await supabase
      .from("shared_courses")
      .select("id, course_id")
      .eq("receiver_driver_id", driverId)
      .eq("status", "completed");

    // Dédupliquer les courses (éviter de compter 2x une course partagée)
    const directCourseIds = new Set((directCourses || []).map(c => c.id));
    const sharedCourseIds = (sharedCourses || [])
      .map(sc => sc.course_id)
      .filter(cid => !directCourseIds.has(cid));

    // 3. Récupérer les ratings des courses partagées pour le calcul de la moyenne
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
