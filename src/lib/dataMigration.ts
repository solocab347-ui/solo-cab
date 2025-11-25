/**
 * DATA MIGRATION UTILITIES - Scripts de migration et nettoyage
 * Répare les incohérences de données
 */

import { supabase } from "@/integrations/supabase/client";
import { buildDriverFilter } from "./driverQueryUtils";

interface MigrationResult {
  success: boolean;
  recordsProcessed: number;
  recordsFixed: number;
  errors: string[];
}

/**
 * Synchroniser driver_id et driver_ids pour tous les clients
 */
export async function synchronizeClientDriverAssociations(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    recordsProcessed: 0,
    recordsFixed: 0,
    errors: [],
  };

  try {
    // Récupérer tous les clients
    const { data: clients, error } = await supabase
      .from("clients")
      .select("*");

    if (error) throw error;
    if (!clients) {
      result.errors.push("Aucun client trouvé");
      return result;
    }

    result.recordsProcessed = clients.length;

    for (const client of clients) {
      let needsUpdate = false;
      const updates: any = {};

      // Cas 1: Client exclusif
      if (client.is_exclusive && client.driver_id) {
        // Vérifier driver_ids
        if (!client.driver_ids || client.driver_ids.length !== 1 || client.driver_ids[0] !== client.driver_id) {
          updates.driver_ids = [client.driver_id];
          needsUpdate = true;
        }
      }
      // Cas 2: Client libre
      else if (!client.is_exclusive) {
        // S'assurer que driver_id est null
        if (client.driver_id) {
          updates.driver_id = null;
          needsUpdate = true;
        }

        // S'assurer que driver_ids existe et n'est pas vide
        if (!client.driver_ids || client.driver_ids.length === 0) {
          // Si ancien driver_id existe, le migrer vers driver_ids
          if (client.driver_id) {
            updates.driver_ids = [client.driver_id];
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(updates)
          .eq("id", client.id);

        if (updateError) {
          result.errors.push(`Client ${client.id}: ${updateError.message}`);
          result.success = false;
        } else {
          result.recordsFixed++;
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Migration error: ${error}`);
  }

  return result;
}

/**
 * Nettoyer les courses orphelines (sans driver valide)
 */
export async function cleanupOrphanCourses(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    recordsProcessed: 0,
    recordsFixed: 0,
    errors: [],
  };

  try {
    // Récupérer toutes les courses
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*");

    if (error) throw error;
    if (!courses) return result;

    result.recordsProcessed = courses.length;

    for (const course of courses) {
      let needsUpdate = false;

      // Vérifier si le driver existe
      if (course.driver_id) {
        const { data: driver } = await supabase
          .from("drivers")
          .select("id")
          .eq("id", course.driver_id)
          .maybeSingle();

        if (!driver) {
          // Driver n'existe plus, marquer la course comme annulée
          const { error: updateError } = await supabase
            .from("courses")
            .update({ status: "cancelled" })
            .eq("id", course.id);

          if (updateError) {
            result.errors.push(`Course ${course.id}: ${updateError.message}`);
          } else {
            result.recordsFixed++;
          }
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Cleanup error: ${error}`);
  }

  return result;
}

/**
 * Générer les QR codes manquants
 */
export async function generateMissingQRCodes(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    recordsProcessed: 0,
    recordsFixed: 0,
    errors: [],
  };

  try {
    // Récupérer tous les drivers
    const { data: drivers, error } = await supabase
      .from("drivers")
      .select("id, user_id");

    if (error) throw error;
    if (!drivers) return result;

    result.recordsProcessed = drivers.length;

    for (const driver of drivers) {
      // Vérifier si QR code existe
      const { data: qrCode } = await supabase
        .from("qr_codes")
        .select("id")
        .eq("driver_id", driver.id)
        .maybeSingle();

      if (!qrCode) {
        // Générer QR code via Edge Function
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          
          const response = await fetch(
            `${supabaseUrl}/functions/v1/qr-code-manager?action=regenerate&driver_id=${driver.id}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
              },
            }
          );

          if (response.ok) {
            result.recordsFixed++;
          } else {
            result.errors.push(`QR code generation failed for driver ${driver.id}`);
          }
        } catch (error) {
          result.errors.push(`Driver ${driver.id}: ${error}`);
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`QR generation error: ${error}`);
  }

  return result;
}

/**
 * Migration complète du système
 */
export async function runFullMigration(): Promise<{
  success: boolean;
  results: {
    clientSync: MigrationResult;
    orphanCleanup: MigrationResult;
    qrGeneration: MigrationResult;
  };
}> {
  console.log("🔄 Démarrage migration complète...");

  const clientSync = await synchronizeClientDriverAssociations();
  console.log("✅ Synchronisation clients terminée:", clientSync);

  const orphanCleanup = await cleanupOrphanCourses();
  console.log("✅ Nettoyage courses orphelines terminé:", orphanCleanup);

  const qrGeneration = await generateMissingQRCodes();
  console.log("✅ Génération QR codes terminée:", qrGeneration);

  const success = clientSync.success && orphanCleanup.success && qrGeneration.success;

  return {
    success,
    results: {
      clientSync,
      orphanCleanup,
      qrGeneration,
    },
  };
}

/**
 * Vérification de santé de la base de données
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
  stats: {
    totalDrivers: number;
    totalClients: number;
    totalCourses: number;
    driversWithoutQR: number;
    inconsistentClients: number;
  };
}> {
  const issues: string[] = [];
  const stats = {
    totalDrivers: 0,
    totalClients: 0,
    totalCourses: 0,
    driversWithoutQR: 0,
    inconsistentClients: 0,
  };

  try {
    // Count drivers
    const { count: driverCount } = await supabase
      .from("drivers")
      .select("*", { count: "exact", head: true });
    stats.totalDrivers = driverCount || 0;

    // Count clients
    const { count: clientCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });
    stats.totalClients = clientCount || 0;

    // Count courses
    const { count: courseCount } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true });
    stats.totalCourses = courseCount || 0;

    // Check drivers without QR
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id");

    if (drivers) {
      for (const driver of drivers) {
        const { data: qr } = await supabase
          .from("qr_codes")
          .select("id")
          .eq("driver_id", driver.id)
          .maybeSingle();

        if (!qr) {
          stats.driversWithoutQR++;
        }
      }
    }

    // Check inconsistent clients
    const { data: clients } = await supabase
      .from("clients")
      .select("*");

    if (clients) {
      for (const client of clients) {
        if (client.is_exclusive) {
          if (!client.driver_id || !client.driver_ids || client.driver_ids.length !== 1) {
            stats.inconsistentClients++;
          }
        }
      }
    }

    if (stats.driversWithoutQR > 0) {
      issues.push(`${stats.driversWithoutQR} drivers sans QR code`);
    }

    if (stats.inconsistentClients > 0) {
      issues.push(`${stats.inconsistentClients} clients avec associations incohérentes`);
    }
  } catch (error) {
    issues.push(`Health check error: ${error}`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    stats,
  };
}
