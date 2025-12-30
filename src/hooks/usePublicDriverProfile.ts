import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Keys pour invalidation centralisée
export const PUBLIC_DRIVERS_QUERY_KEY = 'public-drivers';
export const PUBLIC_DRIVER_PROFILE_KEY = 'public-driver-profile';

/**
 * Hook pour écouter les changements sur les profils chauffeurs en realtime
 * et invalider automatiquement les caches concernés
 */
export function useDriverProfileRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Écouter les changements sur la table drivers
    const driversChannel = supabase
      .channel('public-drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('Driver profile changed:', payload);
          // Invalider tous les caches des profils publics
          queryClient.invalidateQueries({ queryKey: [PUBLIC_DRIVERS_QUERY_KEY] });
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: [PUBLIC_DRIVER_PROFILE_KEY, payload.new.id] 
            });
          }
        }
      )
      .subscribe();

    // Écouter les changements sur la table profiles également
    const profilesChannel = supabase
      .channel('public-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile changed:', payload);
          // Invalider tous les caches des profils publics
          queryClient.invalidateQueries({ queryKey: [PUBLIC_DRIVERS_QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [queryClient]);
}

/**
 * Hook pour récupérer les chauffeurs visibles avec cache minimal
 * Utilisé par CompanyDriverSearch, FleetDriverSearch, etc.
 */
export function useVisibleDrivers(
  visibilityType: 'companies' | 'fleet_managers' | 'drivers',
  filters?: {
    department?: string;
    region?: string;
    city?: string;
    minRating?: number;
    vehicleType?: string;
    searchTerm?: string;
  }
) {
  const queryClient = useQueryClient();

  // Active le realtime
  useDriverProfileRealtime();

  const visibilityField = {
    companies: 'visible_to_companies',
    fleet_managers: 'visible_to_fleet_managers',
    drivers: 'visible_to_drivers'
  }[visibilityType];

  return useQuery({
    queryKey: [PUBLIC_DRIVERS_QUERY_KEY, visibilityType, filters],
    queryFn: async () => {
      // Build query with visibility filter
      // Fetch drivers - cast to any to avoid deep type inference issues
      const driversQuery = supabase.from('drivers').select('*');
      const driversResult = await (driversQuery as any)
        .eq('status', 'validated')
        .eq(visibilityField, true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(100);

      if (driversResult.error) throw driversResult.error;
      const driversData: any[] = driversResult.data || [];

      // Récupérer les profils
      const userIds = driversData.map((d: any) => d.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url, phone, email')
          .in('id', userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      // Attacher les profils
      let result = driversData.map((driver: any) => ({
        ...driver,
        profile: profilesMap[driver.user_id] || null
      }));

      // Appliquer les filtres côté client
      if (filters?.minRating && filters.minRating > 0) {
        result = result.filter((d: any) => (d.rating || 0) >= filters.minRating);
      }
      if (filters?.department) {
        result = result.filter((d: any) => 
          d.working_sectors?.includes(filters.department)
        );
      }
      if (filters?.region) {
        result = result.filter((d: any) => 
          d.working_sectors?.includes(filters.region)
        );
      }
      if (filters?.city) {
        const search = filters.city.toLowerCase();
        result = result.filter((d: any) => 
          d.working_sectors?.some((s: string) => s.toLowerCase().includes(search))
        );
      }
      if (filters?.vehicleType) {
        result = result.filter((d: any) => 
          d.vehicle_category?.includes(filters.vehicleType)
        );
      }
      if (filters?.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        result = result.filter((d: any) => 
          d.profile?.full_name?.toLowerCase().includes(search) ||
          d.company_name?.toLowerCase().includes(search)
        );
      }

      return result;
    },
    // Cache minimal pour avoir des données fraîches
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Force l'invalidation de tous les caches de profils publics
 * À appeler après une modification de profil
 */
export function useInvalidatePublicProfiles() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: [PUBLIC_DRIVERS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [PUBLIC_DRIVER_PROFILE_KEY] });
  };
}
