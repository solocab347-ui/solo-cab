import { z } from "zod";

/**
 * SYSTÈME DE VALIDATION SÉCURISÉ POUR LES COURSES
 * Protection contre les données invalides et les erreurs de création
 */

// Schéma de validation pour les coordonnées géographiques
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Schéma de validation pour une adresse complète
export const addressSchema = z.object({
  address: z.string().trim().min(5, "L'adresse doit contenir au moins 5 caractères").max(500),
  coordinates: coordinatesSchema,
});

// Schéma de validation pour la date de course
export const scheduledDateSchema = z.string().refine(
  (date) => {
    const scheduledDate = new Date(date);
    const now = new Date();
    // La date doit être dans le futur (avec marge de 5 minutes)
    return scheduledDate.getTime() > now.getTime() - 5 * 60 * 1000;
  },
  {
    message: "La date de la course doit être dans le futur",
  }
);

// Schéma de validation pour les données de course
export const courseDataSchema = z.object({
  pickupAddress: z.string().trim().min(5, "L'adresse de départ est requise").max(500),
  pickupCoordinates: coordinatesSchema,
  destinationAddress: z.string().trim().min(5, "L'adresse d'arrivée est requise").max(500),
  destinationCoordinates: coordinatesSchema,
  scheduledDate: scheduledDateSchema,
  passengersCount: z.number().int().min(1, "Au moins 1 passager requis").max(20, "Maximum 20 passagers"),
  distanceKm: z.number().positive("La distance doit être positive").max(2000, "Distance maximale: 2000 km"),
  durationMinutes: z.number().positive("La durée doit être positive").max(1440, "Durée maximale: 24h"),
  notes: z.string().max(1000, "Notes trop longues (max 1000 caractères)").optional(),
  promoCode: z.string().max(50, "Code promo invalide").optional(),
});

// Type TypeScript dérivé du schéma
export type CourseData = z.infer<typeof courseDataSchema>;

/**
 * Valide les données de course de manière stricte
 * @throws {z.ZodError} Si les données sont invalides
 */
export function validateCourseData(data: Partial<CourseData>): CourseData {
  return courseDataSchema.parse(data);
}

/**
 * Valide les données de course et retourne un objet avec succès/erreur
 */
export function safeCourseValidation(data: Partial<CourseData>): {
  success: boolean;
  data?: CourseData;
  error?: string;
} {
  try {
    const validData = courseDataSchema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message,
      };
    }
    return {
      success: false,
      error: "Données de course invalides",
    };
  }
}

/**
 * Validation spécifique pour les courses de type "mise à disposition"
 */
export const hourlyBookingSchema = z.object({
  pickupAddress: z.string().trim().min(5).max(500),
  pickupCoordinates: coordinatesSchema,
  destinationAddress: z.string().trim().min(5).max(500),
  destinationCoordinates: coordinatesSchema,
  scheduledDate: scheduledDateSchema,
  passengersCount: z.number().int().min(1).max(20),
  durationHours: z.number().positive("La durée doit être positive").min(0.5, "Durée minimale: 30 minutes").max(48, "Durée maximale: 48 heures"),
  notes: z.string().max(1000).optional(),
  promoCode: z.string().max(50).optional(),
});

export type HourlyBookingData = z.infer<typeof hourlyBookingSchema>;

/**
 * Vérifie que les coordonnées sont valides et non nulles
 */
export function validateCoordinates(
  coords: { latitude: number; longitude: number } | null
): coords is { latitude: number; longitude: number } {
  if (!coords) return false;
  
  try {
    coordinatesSchema.parse(coords);
    return true;
  } catch {
    return false;
  }
}

/**
 * Nettoie et sécurise les notes utilisateur
 */
export function sanitizeNotes(notes: string | undefined): string | null {
  if (!notes || notes.trim() === "") return null;
  
  // Supprime les caractères dangereux et limite la longueur
  return notes
    .trim()
    .slice(0, 1000)
    .replace(/[<>]/g, ""); // Supprime < et > pour éviter injection HTML
}

/**
 * Valide et nettoie le code promo
 */
export function sanitizePromoCode(code: string | undefined): string | null {
  if (!code || code.trim() === "" || code === "none") return null;
  
  // Nettoie et valide le format du code promo
  const cleaned = code.trim().toUpperCase().slice(0, 50);
  
  // Vérifie que c'est alphanumérique avec tirets/underscores
  if (!/^[A-Z0-9_-]+$/.test(cleaned)) return null;
  
  return cleaned;
}
