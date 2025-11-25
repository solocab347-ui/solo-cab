/**
 * DRIVER QUERY UTILITIES - Standardisation des requêtes avec double-association
 * Garantit la compatibilité driver_id + driver_ids
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Construire le filtre OR pour supporter driver_id et driver_ids
 */
export function buildDriverFilter(driverId: string): string {
  return `driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`;
}

/**
 * Query builder pour courses avec dual association
 */
export function queryDriverCourses(
  supabase: SupabaseClient,
  driverId: string,
  select = "*"
) {
  return supabase
    .from("courses")
    .select(select)
    .or(buildDriverFilter(driverId));
}

/**
 * Query builder pour clients avec dual association
 */
export function queryDriverClients(
  supabase: SupabaseClient,
  driverId: string,
  select = "*"
) {
  return supabase
    .from("clients")
    .select(select)
    .or(buildDriverFilter(driverId));
}

/**
 * Query builder pour devis avec dual association
 */
export function queryDriverDevis(
  supabase: SupabaseClient,
  driverId: string,
  select = "*"
) {
  return supabase
    .from("devis")
    .select(select)
    .or(buildDriverFilter(driverId));
}

/**
 * Query builder pour factures avec dual association
 */
export function queryDriverFactures(
  supabase: SupabaseClient,
  driverId: string,
  select = "*"
) {
  return supabase
    .from("factures")
    .select(select)
    .eq("driver_id", driverId); // Factures use only driver_id
}

/**
 * Vérifier si un client est associé à un driver
 */
export function isClientAssociatedWithDriver(
  client: { driver_id?: string | null; driver_ids?: string[] | null },
  driverId: string
): boolean {
  if (client.driver_id === driverId) return true;
  if (client.driver_ids?.includes(driverId)) return true;
  return false;
}

/**
 * Ajouter un driver aux associations d'un client
 */
export async function addDriverToClient(
  supabase: SupabaseClient,
  clientId: string,
  driverId: string,
  isExclusive: boolean = false
) {
  if (isExclusive) {
    // Client exclusif: utiliser driver_id
    return supabase
      .from("clients")
      .update({
        driver_id: driverId,
        driver_ids: [driverId],
        is_exclusive: true,
      })
      .eq("id", clientId);
  } else {
    // Client libre: ajouter à driver_ids
    const { data: client } = await supabase
      .from("clients")
      .select("driver_ids")
      .eq("id", clientId)
      .single();

    const currentDriverIds = client?.driver_ids || [];
    if (!currentDriverIds.includes(driverId)) {
      currentDriverIds.push(driverId);
    }

    return supabase
      .from("clients")
      .update({
        driver_ids: currentDriverIds,
        is_exclusive: false,
      })
      .eq("id", clientId);
  }
}

/**
 * Retirer un driver des associations d'un client
 */
export async function removeDriverFromClient(
  supabase: SupabaseClient,
  clientId: string,
  driverId: string
) {
  const { data: client } = await supabase
    .from("clients")
    .select("driver_id, driver_ids, is_exclusive")
    .eq("id", clientId)
    .single();

  if (!client) {
    throw new Error("Client non trouvé");
  }

  if (client.is_exclusive && client.driver_id === driverId) {
    // Client exclusif devient libre
    return supabase
      .from("clients")
      .update({
        is_exclusive: false,
        driver_id: null,
        driver_ids: [],
      })
      .eq("id", clientId);
  } else {
    // Client libre: retirer de driver_ids
    const updatedDriverIds = (client.driver_ids || []).filter(
      (id: string) => id !== driverId
    );

    return supabase
      .from("clients")
      .update({
        driver_ids: updatedDriverIds,
      })
      .eq("id", clientId);
  }
}

/**
 * Obtenir tous les drivers d'un client
 */
export function getClientDriverIds(client: {
  driver_id?: string | null;
  driver_ids?: string[] | null;
  is_exclusive?: boolean;
}): string[] {
  if (client.is_exclusive && client.driver_id) {
    return [client.driver_id];
  }
  return client.driver_ids || [];
}

/**
 * Statistiques: count clients pour un driver
 */
export async function countDriverClients(
  supabase: SupabaseClient,
  driverId: string
): Promise<number> {
  const { count } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .or(buildDriverFilter(driverId));

  return count || 0;
}

/**
 * Statistiques: count courses pour un driver
 */
export async function countDriverCourses(
  supabase: SupabaseClient,
  driverId: string,
  status?: string
): Promise<number> {
  let query = supabase
    .from("courses")
    .select("*", { count: "exact", head: true })
    .or(buildDriverFilter(driverId));

  if (status) {
    query = query.eq("status", status);
  }

  const { count } = await query;
  return count || 0;
}

/**
 * Statistiques: revenue total pour un driver
 */
export async function calculateDriverRevenue(
  supabase: SupabaseClient,
  driverId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  let query = supabase
    .from("factures")
    .select("amount")
    .eq("driver_id", driverId)
    .eq("payment_status", "paid");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data } = await query;

  if (!data) return 0;

  return data.reduce((sum, facture) => sum + (facture.amount || 0), 0);
}
