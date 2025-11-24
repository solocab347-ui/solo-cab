import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCourseData, sanitizeNotes, sanitizePromoCode } from "@/lib/courseValidation";
import { calculateRoute } from "@/lib/geocoding";

export interface CourseCreationParams {
  userId: string;
  clientId?: string;
  driverId: string;
  pickupAddress: string;
  pickupCoordinates: { latitude: number; longitude: number } | null;
  destinationAddress: string;
  destinationCoordinates: { latitude: number; longitude: number } | null;
  scheduledDate: string;
  passengersCount: string;
  notes?: string;
  promoCode?: string;
  courseType?: "classic" | "hourly";
  durationHours?: string;
  paymentMethodPreference?: string;
}

/**
 * Hook sécurisé pour la création de courses
 * Gère validation, erreurs et création avec devis automatique
 */
export function useCourseCreation() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createCourse = async (params: CourseCreationParams) => {
    const {
      userId,
      clientId,
      driverId,
      pickupAddress,
      pickupCoordinates,
      destinationAddress,
      destinationCoordinates,
      scheduledDate,
      passengersCount,
      notes,
      promoCode,
      courseType = "classic",
      durationHours,
      paymentMethodPreference,
    } = params;

    setLoading(true);

    try {
      // VALIDATION 1: Vérifier que l'utilisateur est connecté
      if (!userId) {
        toast.error("Vous devez être connecté");
        navigate("/login");
        return null;
      }

      // VALIDATION 2: Vérifier les coordonnées
      if (!pickupCoordinates || !destinationCoordinates) {
        toast.error("Les coordonnées GPS sont requises. Veuillez sélectionner des adresses valides.");
        return null;
      }

      // VALIDATION 3: Calculer et valider l'itinéraire
      let distanceKm: number | null = null;
      let durationMinutes: number | null = null;

      if (courseType === "classic") {
        const routeResult = await calculateRoute(pickupCoordinates, destinationCoordinates);

        if (!routeResult.success || !routeResult.distance_km || !routeResult.duration_minutes) {
          toast.error("Impossible de calculer l'itinéraire. Veuillez vérifier les adresses.");
          return null;
        }

        distanceKm = routeResult.distance_km;
        durationMinutes = routeResult.duration_minutes;

        // VALIDATION 4: Valider les données de la course
        try {
          validateCourseData({
            pickupAddress,
            pickupCoordinates,
            destinationAddress,
            destinationCoordinates,
            scheduledDate,
            passengersCount: parseInt(passengersCount),
            distanceKm,
            durationMinutes,
            notes: notes || undefined,
            promoCode: promoCode || undefined,
          });
        } catch (validationError: any) {
          toast.error(validationError.message || "Données de course invalides");
          return null;
        }
      } else if (courseType === "hourly") {
        if (!durationHours) {
          toast.error("Veuillez indiquer la durée en heures");
          return null;
        }
        durationMinutes = parseFloat(durationHours) * 60;
      }

      // NETTOYAGE: Assainir les données utilisateur
      const sanitizedNotes = sanitizeNotes(notes);
      const sanitizedPromoCode = sanitizePromoCode(promoCode);

      // VALIDATION 5: Vérifier que le driver existe et est validé
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, max_passengers")
        .eq("id", driverId)
        .maybeSingle();

      if (driverError) {
        console.error("❌ Driver verification error:", driverError);
        toast.error("Erreur lors de la vérification du chauffeur");
        return null;
      }

      if (!driverData) {
        toast.error("Chauffeur introuvable");
        return null;
      }

      if (driverData.status !== "validated") {
        toast.error("Ce chauffeur n'est pas encore validé");
        return null;
      }

      // VALIDATION 6: Vérifier la capacité passagers
      const passengers = parseInt(passengersCount);
      if (passengers > driverData.max_passengers) {
        toast.error(`Ce chauffeur accepte maximum ${driverData.max_passengers} passagers`);
        return null;
      }

      // VALIDATION 7: Si clientId fourni, vérifier qu'il existe et appartient à ce driver
      if (clientId) {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("id, driver_id, driver_ids")
          .eq("id", clientId)
          .maybeSingle();

        if (clientError || !clientData) {
          console.error("❌ Client verification error:", clientError);
          toast.error("Client introuvable");
          return null;
        }

        // Vérifier l'association client-driver (dual association)
        const isAssociated =
          clientData.driver_id === driverId ||
          (clientData.driver_ids && clientData.driver_ids.includes(driverId));

        if (!isAssociated) {
          toast.error("Ce client n'est pas associé à ce chauffeur");
          return null;
        }
      }

      // CRÉATION: Insérer la course avec toutes les validations passées
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: clientId!,
          driver_id: driverId,
          driver_ids: [driverId],
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates.latitude,
          pickup_longitude: pickupCoordinates.longitude,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates.latitude,
          destination_longitude: destinationCoordinates.longitude,
          scheduled_date: new Date(scheduledDate).toISOString(),
          passengers_count: passengers,
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          notes: sanitizedNotes,
          promo_code: sanitizedPromoCode,
          status: "pending",
          created_by_user_id: userId,
          payment_method_preference: paymentMethodPreference || "carte",
        })
        .select()
        .single();

      if (courseError) {
        console.error("❌ Course creation error:", courseError);
        toast.error("Erreur lors de la création de la course");
        return null;
      }

      console.log("✅ Course created successfully:", course.id);

      // GÉNÉRATION DEVIS: Appeler l'edge function pour créer le devis automatiquement
      // PROTECTION: Tentative avec retry en cas d'échec
      let devisCreated = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { data: devisData, error: devisError } = await supabase.functions.invoke(
            "create-devis-auto",
            {
              body: {
                course_id: course.id,
                driver_id: driverId,
                use_hourly_rate: courseType === "hourly",
              },
            }
          );

          if (devisError) {
            console.error(`❌ Devis generation error (attempt ${attempt}):`, devisError);
            if (attempt === 2) {
              toast.warning("Course créée mais erreur lors de la génération du devis");
            }
          } else {
            console.log("✅ Devis generated successfully:", devisData);
            toast.success("Course et devis créés avec succès !");
            devisCreated = true;
            break;
          }
        } catch (devisError) {
          console.error(`❌ Devis generation exception (attempt ${attempt}):`, devisError);
          if (attempt === 2) {
            toast.warning("Course créée, le devis sera généré ultérieurement");
          } else {
            // Attendre 1 seconde avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      return course;
    } catch (error: any) {
      console.error("❌ Unexpected error in course creation:", error);
      toast.error("Une erreur inattendue est survenue");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createCourse, loading };
}