/**
 * DATA INTEGRITY VALIDATOR - Validation de l'intégrité des données
 * Détecte les incohérences dans la base de données
 */

import { supabase } from "@/integrations/supabase/client";
import { buildDriverFilter } from "./driverQueryUtils";

interface IntegrityIssue {
  type: "error" | "warning";
  table: string;
  recordId: string;
  description: string;
  suggestion?: string;
}

/**
 * Valider l'intégrité d'un profil driver
 */
export async function validateDriverProfile(
  driverId: string
): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  try {
    // Vérifier l'existence du driver
    const { data: driver, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .maybeSingle();

    if (error || !driver) {
      issues.push({
        type: "error",
        table: "drivers",
        recordId: driverId,
        description: "Driver non trouvé",
      });
      return issues;
    }

    // Vérifier les champs obligatoires
    const requiredFields = [
      "vehicle_model",
      "license_number",
      "per_km_rate",
      "base_fare",
      "hourly_rate",
    ];

    for (const field of requiredFields) {
      if (!driver[field]) {
        issues.push({
          type: "warning",
          table: "drivers",
          recordId: driverId,
          description: `Champ obligatoire manquant: ${field}`,
          suggestion: "Compléter les paramètres du driver",
        });
      }
    }

    // Vérifier le QR code
    const { data: qrCode } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (!qrCode) {
      issues.push({
        type: "warning",
        table: "qr_codes",
        recordId: driverId,
        description: "QR code manquant",
        suggestion: "Générer un QR code",
      });
    }

    // Vérifier les tarifs
    if (driver.per_km_rate && driver.per_km_rate <= 0) {
      issues.push({
        type: "error",
        table: "drivers",
        recordId: driverId,
        description: "Tarif au kilomètre invalide (≤ 0)",
      });
    }

    if (driver.hourly_rate && driver.hourly_rate <= 0) {
      issues.push({
        type: "error",
        table: "drivers",
        recordId: driverId,
        description: "Tarif horaire invalide (≤ 0)",
      });
    }

    if (driver.tva_rate && (driver.tva_rate < 0 || driver.tva_rate > 100)) {
      issues.push({
        type: "error",
        table: "drivers",
        recordId: driverId,
        description: "Taux TVA invalide (doit être entre 0 et 100)",
      });
    }
  } catch (error) {
    console.error("Error validating driver profile:", error);
    issues.push({
      type: "error",
      table: "drivers",
      recordId: driverId,
      description: `Erreur de validation: ${error}`,
    });
  }

  return issues;
}

/**
 * Valider l'intégrité des clients d'un driver
 */
export async function validateDriverClients(
  driverId: string
): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  try {
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .or(buildDriverFilter(driverId));

    if (!clients) return issues;

    for (const client of clients) {
      // Vérifier la cohérence is_exclusive
      if (client.is_exclusive && client.driver_id !== driverId) {
        issues.push({
          type: "error",
          table: "clients",
          recordId: client.id,
          description: `Client exclusif mais driver_id ne correspond pas (${client.driver_id} vs ${driverId})`,
          suggestion: "Corriger l'association driver_id",
        });
      }

      // Vérifier driver_ids array
      if (client.is_exclusive && (!client.driver_ids || client.driver_ids.length !== 1)) {
        issues.push({
          type: "warning",
          table: "clients",
          recordId: client.id,
          description: "Client exclusif mais driver_ids incorrect",
          suggestion: "Synchroniser driver_ids avec driver_id",
        });
      }

      // Vérifier que le driver est dans driver_ids
      if (!client.driver_ids?.includes(driverId)) {
        issues.push({
          type: "error",
          table: "clients",
          recordId: client.id,
          description: `Driver ${driverId} absent de driver_ids`,
          suggestion: "Ajouter le driver à driver_ids",
        });
      }

      // Vérifier le profil utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", client.user_id)
        .maybeSingle();

      if (!profile) {
        issues.push({
          type: "error",
          table: "clients",
          recordId: client.id,
          description: "Profil utilisateur manquant",
          suggestion: "Vérifier l'intégrité des données utilisateur",
        });
      }
    }
  } catch (error) {
    console.error("Error validating clients:", error);
  }

  return issues;
}

/**
 * Valider l'intégrité des courses d'un driver
 */
export async function validateDriverCourses(
  driverId: string
): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  try {
    const { data: courses } = await supabase
      .from("courses")
      .select("*, devis(*)")
      .or(buildDriverFilter(driverId));

    if (!courses) return issues;

    for (const course of courses) {
      // Vérifier que le driver est bien associé
      const hasDriverId = course.driver_id === driverId;
      const hasInDriverIds = course.driver_ids?.includes(driverId);

      if (!hasDriverId && !hasInDriverIds) {
        issues.push({
          type: "error",
          table: "courses",
          recordId: course.id,
          description: `Course non associée au driver ${driverId}`,
        });
      }

      // Vérifier les coordonnées GPS
      if (!course.pickup_latitude || !course.pickup_longitude) {
        issues.push({
          type: "warning",
          table: "courses",
          recordId: course.id,
          description: "Coordonnées pickup manquantes",
        });
      }

      if (!course.destination_latitude || !course.destination_longitude) {
        issues.push({
          type: "warning",
          table: "courses",
          recordId: course.id,
          description: "Coordonnées destination manquantes",
        });
      }

      // Vérifier les devis
      if (course.status !== "pending" && course.devis?.length === 0) {
        issues.push({
          type: "error",
          table: "courses",
          recordId: course.id,
          description: "Course sans devis",
          suggestion: "Générer un devis",
        });
      }
    }
  } catch (error) {
    console.error("Error validating courses:", error);
  }

  return issues;
}

/**
 * Validation complète d'un driver
 */
export async function runFullDriverValidation(
  driverId: string
): Promise<{
  isValid: boolean;
  issues: IntegrityIssue[];
  summary: {
    errors: number;
    warnings: number;
  };
}> {
  const allIssues: IntegrityIssue[] = [];

  const [profileIssues, clientIssues, courseIssues] = await Promise.all([
    validateDriverProfile(driverId),
    validateDriverClients(driverId),
    validateDriverCourses(driverId),
  ]);

  allIssues.push(...profileIssues, ...clientIssues, ...courseIssues);

  const errors = allIssues.filter((i) => i.type === "error").length;
  const warnings = allIssues.filter((i) => i.type === "warning").length;

  return {
    isValid: errors === 0,
    issues: allIssues,
    summary: {
      errors,
      warnings,
    },
  };
}
