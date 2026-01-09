import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook optimisé pour le Fleet Manager Dashboard
 * Résout les problèmes de:
 * - Latence (requêtes parallèles)
 * - Scintillements (debounce + état stable)
 * - Temps de chargement (mise en cache + chargement progressif)
 */

interface FleetManager {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  status: string;
  show_drivers_in_public_storefront: boolean;
  total_drivers: number;
  total_clients: number;
  documents_status: string | null;
  documents_deadline: string | null;
  subscription_status: string | null;
  subscription_paid: boolean | null;
  max_free_drivers: number | null;
  auto_validate_courses: boolean | null;
  services_offered: string[] | null;
}

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
}

interface FleetDriver {
  id: string;
  driver_id: string;
  status: string;
  joined_at: string;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand?: string | null;
    status: string;
    user_id: string;
    rating?: number | null;
    vehicle_photos?: string[] | null;
    bio?: string | null;
    services_offered?: string[] | null;
    profile?: {
      full_name: string;
      email: string;
      phone: string;
      profile_photo_url?: string | null;
    };
  };
}

interface FleetClient {
  id: string;
  client_id: string;
  registered_at: string;
  client?: {
    id: string;
    user_id: string;
    total_rides: number;
    profile?: {
      full_name: string;
      email: string;
    };
  };
}

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  used: boolean;
  created_at: string;
  expires_at: string | null;
}

interface UseFleetDashboardResult {
  loading: boolean;
  fleetManager: FleetManager | null;
  userProfile: UserProfile | null;
  drivers: FleetDriver[];
  clients: FleetClient[];
  invitations: Invitation[];
  pendingPartnershipsCount: number;
  pendingCoursesCount: number;
  pendingCompanyPartnershipsCount: number;
  qrCodeData: string;
  refetch: () => void;
}

// Debounce utility
function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;
}

export function useFleetDashboardOptimized(userId: string | undefined): UseFleetDashboardResult {
  const [loading, setLoading] = useState(true);
  const [fleetManager, setFleetManager] = useState<FleetManager | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [clients, setClients] = useState<FleetClient[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pendingPartnershipsCount, setPendingPartnershipsCount] = useState(0);
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0);
  const [pendingCompanyPartnershipsCount, setPendingCompanyPartnershipsCount] = useState(0);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  
  // Prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!userId || fetchingRef.current) return;
    
    fetchingRef.current = true;
    
    try {
      // ÉTAPE 1: Récupérer fleet manager ET profile en parallèle (données critiques)
      const [fmResult, profileResult] = await Promise.all([
        supabase
          .from("fleet_managers")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, avatar_url, profile_photo_url")
          .eq("id", userId)
          .maybeSingle()
      ]);

      if (!mountedRef.current) return;

      if (fmResult.error) throw fmResult.error;
      if (!fmResult.data) {
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      const fmData = fmResult.data;
      setFleetManager(fmData);
      
      if (profileResult.data) {
        setUserProfile(profileResult.data);
      }

      // QR code URL
      setQrCodeData(`${window.location.origin}/flotte/${fmData.id}`);

      // ÉTAPE 2: Toutes les requêtes secondaires EN PARALLÈLE
      const [
        directDriversResult,
        partnerDriversResult,
        clientsResult,
        invitationsResult,
        driverPartnershipsResult,
        companyPartnershipsResult
      ] = await Promise.all([
        // Direct drivers
        supabase
          .from("fleet_manager_drivers")
          .select(`
            *,
            driver:drivers(
              id,
              vehicle_model,
              vehicle_brand,
              status,
              user_id,
              rating,
              vehicle_photos,
              bio,
              services_offered,
              show_rating_for_sharing
            )
          `)
          .eq("fleet_manager_id", fmData.id),
        
        // Partner drivers
        supabase
          .from("fleet_driver_partnerships")
          .select(`
            id,
            driver_id,
            status,
            accepted_at,
            driver:drivers(
              id,
              vehicle_model,
              vehicle_brand,
              status,
              user_id,
              rating,
              vehicle_photos,
              bio,
              services_offered,
              show_rating_for_sharing
            )
          `)
          .eq("fleet_manager_id", fmData.id)
          .eq("status", "accepted"),
        
        // Clients
        supabase
          .from("fleet_manager_clients")
          .select(`
            *,
            client:clients(
              id,
              user_id,
              total_rides
            )
          `)
          .eq("fleet_manager_id", fmData.id),
        
        // Invitations
        supabase
          .from("fleet_driver_invitations")
          .select("*")
          .eq("fleet_manager_id", fmData.id)
          .order("created_at", { ascending: false }),
        
        // Pending driver partnerships count
        supabase
          .from("fleet_driver_partnerships")
          .select("*", { count: 'exact', head: true })
          .eq("fleet_manager_id", fmData.id)
          .eq("status", "pending")
          .eq("initiated_by", "driver"),
        
        // Pending company partnerships count
        supabase
          .from("company_fleet_agreements")
          .select("*", { count: 'exact', head: true })
          .eq("fleet_manager_id", fmData.id)
          .eq("status", "pending")
          .eq("proposed_by", "company")
      ]);

      if (!mountedRef.current) return;

      // Combine drivers without duplicates
      const allDriversMap = new Map<string, FleetDriver>();
      
      if (directDriversResult.data) {
        directDriversResult.data.forEach((d: any) => {
          if (d.driver_id) {
            allDriversMap.set(d.driver_id, {
              id: d.id,
              driver_id: d.driver_id,
              status: d.status || 'active',
              joined_at: d.joined_at || d.created_at,
              driver: d.driver
            });
          }
        });
      }

      if (partnerDriversResult.data) {
        partnerDriversResult.data.forEach((d: any) => {
          if (d.driver_id && !allDriversMap.has(d.driver_id)) {
            allDriversMap.set(d.driver_id, {
              id: d.id,
              driver_id: d.driver_id,
              status: 'partner',
              joined_at: d.accepted_at || new Date().toISOString(),
              driver: d.driver
            });
          }
        });
      }

      const combinedDrivers = Array.from(allDriversMap.values());

      // ÉTAPE 3: Fetch profiles only if we have drivers/clients (une seule requête groupée)
      const driverUserIds = combinedDrivers
        .filter(d => d.driver)
        .map(d => d.driver!.user_id);
      
      const clientUserIds = clientsResult.data
        ?.filter(c => c.client)
        .map(c => c.client.user_id) || [];
      
      const allUserIds = [...new Set([...driverUserIds, ...clientUserIds])];

      let profiles: any[] = [];
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, profile_photo_url")
          .in("id", allUserIds);
        
        profiles = profilesData || [];
      }

      if (!mountedRef.current) return;

      // Enrichir les drivers avec les profiles
      const driversWithProfiles = combinedDrivers.map(d => ({
        ...d,
        driver: d.driver ? {
          ...d.driver,
          profile: profiles.find(p => p.id === d.driver!.user_id)
        } : undefined
      }));

      setDrivers(driversWithProfiles);

      // Enrichir les clients avec les profiles
      const clientsWithProfiles = (clientsResult.data || []).map((c: any) => ({
        ...c,
        client: c.client ? {
          ...c.client,
          profile: profiles.find(p => p.id === c.client.user_id)
        } : undefined
      }));

      setClients(clientsWithProfiles);

      // Filter valid invitations
      const now = new Date();
      const validInvitations = (invitationsResult.data || []).filter((inv: Invitation) => {
        if (inv.used) return true;
        if (!inv.expires_at) return true;
        return new Date(inv.expires_at) > now;
      });
      setInvitations(validInvitations);

      setPendingPartnershipsCount(driverPartnershipsResult.count || 0);
      setPendingCompanyPartnershipsCount(companyPartnershipsResult.count || 0);

      // ÉTAPE 4: Count pending courses (only if we have drivers)
      const allDriverIds = Array.from(allDriversMap.keys());
      if (allDriverIds.length > 0) {
        const { count: coursesCount } = await supabase
          .from("courses")
          .select("*", { count: 'exact', head: true })
          .in("driver_id", allDriverIds)
          .eq("status", "pending");
        
        if (mountedRef.current) {
          setPendingCoursesCount(coursesCount || 0);
        }
      } else {
        setPendingCoursesCount(0);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (mountedRef.current) {
        toast.error("Erreur lors du chargement des données");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [userId]);

  // Debounced refetch for realtime updates (500ms debounce to prevent flickering)
  const debouncedRefetch = useDebounceCallback(fetchData, 500);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (userId) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [userId, fetchData]);

  // Realtime subscriptions with debounce
  useEffect(() => {
    if (!fleetManager?.id) return;

    const channel = supabase
      .channel(`fleet-dashboard-${fleetManager.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_driver_invitations', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        debouncedRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_manager_drivers', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        debouncedRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_manager_clients', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        debouncedRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_driver_partnerships', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        debouncedRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_fleet_agreements', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fleetManager?.id, debouncedRefetch]);

  return {
    loading,
    fleetManager,
    userProfile,
    drivers,
    clients,
    invitations,
    pendingPartnershipsCount,
    pendingCoursesCount,
    pendingCompanyPartnershipsCount,
    qrCodeData,
    refetch: fetchData
  };
}
