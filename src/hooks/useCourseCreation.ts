import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateCourseData, sanitizeNotes, sanitizePromoCode } from "@/lib/courseValidation";
import { calculateRoute } from "@/lib/geocoding";
import { logger } from "@/lib/productionLogger";

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
 * Génère une clé unique pour identifier une requête de course (anti-doublon)
 */
const generateCourseKey = (params: CourseCreationParams): string => {
  return `${params.clientId || 'guest'}-${params.driverId}-${params.pickupAddress}-${params.destinationAddress}-${params.scheduledDate}`;
};

/**
 * Hook sécurisé pour la création de courses
 * Gère validation, erreurs et création avec devis automatique
 * PROTECTION ANTI-DOUBLE-SUBMIT: Empêche les créations multiples
 */
export function useCourseCreation() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // PROTECTION ANTI-DOUBLE-SUBMIT
  const isSubmittingRef = useRef(false);
  const lastSubmitKeyRef = useRef<string | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 5000; // 5 secondes minimum entre deux soumissions identiques

  const createCourse = useCallback(async (params: CourseCreationParams) => {
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

    // PROTECTION ANTI-DOUBLE-SUBMIT: Vérifier si une soumission est déjà en cours
    if (isSubmittingRef.current) {
      logger.warn("⚠️ Double-submit bloqué: soumission déjà en cours");
      toast.warning("Veuillez patienter, votre demande est en cours de traitement...");
      return null;
    }

    // PROTECTION ANTI-DOUBLE-SUBMIT: Vérifier si c'est la même requête dans un court délai
    const courseKey = generateCourseKey(params);
    const now = Date.now();
    
    if (lastSubmitKeyRef.current === courseKey && (now - lastSubmitTimeRef.current) < DEBOUNCE_MS) {
      logger.warn("⚠️ Double-submit bloqué: même requête dans les 5 dernières secondes", { courseKey });
      toast.warning("Cette demande a déjà été envoyée. Veuillez patienter...");
      return null;
    }

    // Marquer comme en cours de soumission
    isSubmittingRef.current = true;
    lastSubmitKeyRef.current = courseKey;
    lastSubmitTimeRef.current = now;

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

      // VALIDATION 5: Vérifier que le driver existe et a accès complet
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, max_passengers, is_pioneer, free_access_end_date, created_at")
        .eq("id", driverId)
        .maybeSingle();

      if (driverError) {
        logger.error("Driver verification failed", { error: driverError, driverId });
        toast.error("Erreur lors de la vérification du chauffeur");
        return null;
      }

      if (!driverData) {
        toast.error("Chauffeur introuvable");
        return null;
      }

      // Vérifier accès complet: validé OU pionnier actif OU période de grâce 30 jours
      const isValidated = driverData.status === "validated";
      const isPioneerActive = driverData.is_pioneer && 
        driverData.free_access_end_date && 
        new Date(driverData.free_access_end_date) > new Date();
      const isInGracePeriod = driverData.created_at && 
        new Date(driverData.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const hasFullAccess = isValidated || isPioneerActive || isInGracePeriod;

      if (!hasFullAccess) {
        toast.error("Ce chauffeur n'a pas encore accès à la création de courses");
        return null;
      }

      // VALIDATION 6: Vérifier la capacité passagers
      const passengers = parseInt(passengersCount);
      if (passengers > driverData.max_passengers) {
        toast.error(`Ce chauffeur accepte maximum ${driverData.max_passengers} passagers`);
        return null;
      }

      // VALIDATION 7: clientId est obligatoire pour créer une course standard
      if (!clientId) {
        toast.error("ID client requis pour créer une course");
        return null;
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, driver_id, driver_ids")
        .eq("id", clientId)
        .maybeSingle();

      if (clientError || !clientData) {
        logger.error("Client verification failed", { error: clientError, clientId });
        toast.error("Client introuvable");
        return null;
      }

      // VALIDATION 8: Vérifier si le client a bloqué ce chauffeur
      const { data: blockData } = await supabase
        .from("client_driver_blocks")
        .select("id, blocked_by")
        .eq("client_id", clientId)
        .eq("driver_id", driverId)
        .maybeSingle();

      if (blockData) {
        logger.warn("Client has blocked this driver", { clientId, driverId, blockedBy: blockData.blocked_by });
        if (blockData.blocked_by === "client") {
          toast.error("Ce client ne souhaite plus recevoir vos demandes de course.", {
            description: "Le client a bloqué votre compte. Vous pouvez le supprimer de votre liste de clients.",
            duration: 6000,
          });
        } else {
          toast.error("Une restriction bloque la création de course avec ce client.");
        }
        return { blocked: true, clientId };
      }

      // Vérifier l'association client-driver (dual association)
      const isAssociated =
        clientData.driver_id === driverId ||
        (clientData.driver_ids && clientData.driver_ids.includes(driverId));

      if (!isAssociated) {
        toast.error("Ce client n'est pas associé à ce chauffeur");
        return null;
      }

      // CRÉATION: Insérer la course avec toutes les validations passées
      logger.info("Tentative de création de course", { 
        clientId, 
        driverId, 
        pickupAddress, 
        destinationAddress,
        distanceKm,
        durationMinutes
      });

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: clientId,
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
          payment_method_requested: paymentMethodPreference || null,
        })
        .select()
        .single();

      if (courseError) {
        logger.error("Course creation failed", { 
          error: courseError, 
          clientId, 
          driverId,
          errorCode: courseError.code,
          errorMessage: courseError.message,
          errorDetails: courseError.details,
          errorHint: courseError.hint
        });
        
        // Messages d'erreur plus spécifiques selon le code d'erreur
        if (courseError.code === '42501') {
          toast.error("Erreur d'autorisation: Vous n'êtes pas autorisé à créer cette course");
        } else if (courseError.code === '23503') {
          toast.error("Erreur: Client ou chauffeur non trouvé");
        } else {
          toast.error("Erreur lors de la création de la course");
        }
        return null;
      }

      logger.info("Course created successfully", { courseId: course.id });

      // GÉNÉRATION DEVIS: Appeler l'edge function pour créer le devis automatiquement
      // PROTECTION RENFORCÉE: 5 tentatives avec délai progressif pour fiabilité maximale
      let devisCreated = false;
      const maxAttempts = 5;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          logger.info(`Génération devis - tentative ${attempt}/${maxAttempts}`, { 
            courseId: course.id, 
            driverId,
            courseType 
          });

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
            logger.error(`Devis generation failed (attempt ${attempt}/${maxAttempts})`, { 
              error: devisError, 
              courseId: course.id,
              errorDetails: JSON.stringify(devisError)
            });
            
            // Dernière tentative échouée - alerter l'utilisateur
            if (attempt === maxAttempts) {
              toast.error("❌ Erreur critique: Le devis n'a pas pu être généré automatiquement. Veuillez contacter le support.");
              logger.error("CRITIQUE: Échec définitif génération devis après 5 tentatives", { 
                courseId: course.id 
              });
            }
          } else {
            // Succès!
            logger.info("✅ Devis généré avec succès", { 
              courseId: course.id, 
              devisId: devisData?.devis?.id,
              attempt 
            });
            toast.success("Course et devis créés avec succès !");
            devisCreated = true;
            break;
          }
        } catch (devisError) {
          logger.exception(devisError as Error, { 
            attempt, 
            maxAttempts,
            courseId: course.id,
            context: "Génération devis automatique"
          });
          
          // Dernière tentative - notifier l'échec
          if (attempt === maxAttempts) {
            toast.error("❌ Impossible de générer le devis. Veuillez réessayer ou contacter le support.");
            logger.error("CRITIQUE: Exception définitive génération devis", { 
              courseId: course.id,
              error: devisError
            });
          } else {
            // Attendre progressivement plus longtemps entre les tentatives (1s, 2s, 3s, 4s)
            const delayMs = attempt * 1000;
            logger.info(`Attente ${delayMs}ms avant nouvelle tentative...`, { attempt });
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // Si le devis n'a pas été créé après toutes les tentatives, logguer pour investigation
      if (!devisCreated) {
        logger.error("ALERTE: Course créée sans devis après 5 tentatives", {
          courseId: course.id,
          clientId,
          driverId,
          pickupAddress,
          destinationAddress
        });
      }

      return course;
    } catch (error: any) {
      logger.exception(error, { context: "useCourseCreation.createCourse" });
      toast.error("Une erreur inattendue est survenue");
      return null;
    } finally {
      setLoading(false);
      // PROTECTION ANTI-DOUBLE-SUBMIT: Libérer le verrou
      isSubmittingRef.current = false;
    }
  }, [navigate]);

  return { createCourse, loading };
}