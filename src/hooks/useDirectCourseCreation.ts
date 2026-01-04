import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCoordinates } from "@/lib/courseValidation";
import { calculateRoute } from "@/lib/geocoding";
import { logger } from "@/lib/productionLogger";

export interface DirectCourseParams {
  driverId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  pickupAddress: string;
  pickupCoordinates: { latitude: number; longitude: number } | null;
  destinationAddress: string;
  destinationCoordinates: { latitude: number; longitude: number } | null;
  scheduledDate: string;
  passengersCount: number;
  notes?: string;
  estimatedPrice?: number;
  courseType?: "classic" | "hourly";
  durationHours?: number;
}

/**
 * Hook pour créer des courses confirmées directement pour des clients non inscrits
 * Ces courses n'ont pas de devis, elles sont confirmées immédiatement
 */
export function useDirectCourseCreation() {
  const [loading, setLoading] = useState(false);

  const createDirectCourse = async (params: DirectCourseParams) => {
    const {
      driverId,
      guestName,
      guestPhone,
      guestEmail,
      pickupAddress,
      pickupCoordinates,
      destinationAddress,
      destinationCoordinates,
      scheduledDate,
      passengersCount,
      notes,
      estimatedPrice,
      courseType = "classic",
      durationHours,
    } = params;

    setLoading(true);

    try {
      // VALIDATION: Vérifier les données obligatoires
      if (!guestName.trim()) {
        toast.error("Le nom du client est requis");
        return null;
      }

      if (!guestPhone.trim()) {
        toast.error("Le numéro de téléphone du client est requis");
        return null;
      }

      // VALIDATION: Vérifier les coordonnées
      if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
        toast.error("Les coordonnées GPS sont requises. Veuillez sélectionner des adresses valides.");
        return null;
      }

      // VALIDATION: Vérifier que le driver existe et est validé
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, max_passengers, user_id")
        .eq("id", driverId)
        .maybeSingle();

      if (driverError || !driverData) {
        logger.error("Driver verification failed", { error: driverError, driverId });
        toast.error("Erreur lors de la vérification du chauffeur");
        return null;
      }

      if (driverData.status !== "validated") {
        toast.error("Ce chauffeur n'est pas encore validé");
        return null;
      }

      // VALIDATION: Vérifier la capacité passagers
      if (passengersCount > driverData.max_passengers) {
        toast.error(`Vous acceptez maximum ${driverData.max_passengers} passagers`);
        return null;
      }

      // CALCUL: Distance et durée
      let distanceKm: number | null = null;
      let durationMinutes: number | null = null;

      if (courseType === "classic") {
        const routeResult = await calculateRoute(pickupCoordinates!, destinationCoordinates!);

        if (!routeResult.success || !routeResult.distance_km || !routeResult.duration_minutes) {
          toast.error("Impossible de calculer l'itinéraire. Veuillez vérifier les adresses.");
          return null;
        }

        distanceKm = routeResult.distance_km;
        durationMinutes = routeResult.duration_minutes;
      } else if (courseType === "hourly" && durationHours) {
        durationMinutes = durationHours * 60;
      }

      // CRÉATION: Course confirmée directement pour client non inscrit
      logger.info("Création course directe pour client non inscrit", { 
        driverId, 
        guestName,
        guestPhone,
        pickupAddress, 
        destinationAddress,
        distanceKm,
        durationMinutes,
        estimatedPrice
      });

      const trackingToken = crypto.randomUUID();

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert([{
          driver_id: driverId,
          driver_ids: [driverId],
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates!.latitude,
          pickup_longitude: pickupCoordinates!.longitude,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates!.latitude,
          destination_longitude: destinationCoordinates!.longitude,
          scheduled_date: new Date(scheduledDate).toISOString(),
          passengers_count: passengersCount,
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          notes: notes ? `[Client non inscrit] ${notes}` : "[Client non inscrit]",
          status: "accepted" as const, // Course confirmée directement
          is_guest_booking: true,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          guest_email: guestEmail?.trim() || null,
          guest_estimated_price: estimatedPrice || null,
          guest_tracking_token: trackingToken,
          created_by_user_id: driverData.user_id,
        }])
        .select()
        .single();

      if (courseError) {
        logger.error("Direct course creation failed", { 
          error: courseError, 
          driverId,
          errorCode: courseError.code,
          errorMessage: courseError.message
        });
        toast.error("Erreur lors de la création de la course");
        return null;
      }

      logger.info("Direct course created successfully", { 
        courseId: course.id,
        status: course.status,
        guestName
      });

      return course;
    } catch (error: any) {
      logger.exception(error, { context: "useDirectCourseCreation.createDirectCourse" });
      toast.error("Une erreur inattendue est survenue");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createDirectCourse, loading };
}
