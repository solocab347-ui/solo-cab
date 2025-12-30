import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Query keys centralisées pour les profils gestionnaires de flotte
export const PUBLIC_FLEETS_QUERY_KEY = ['public-fleets'];
export const PUBLIC_FLEET_PROFILE_KEY = ['public-fleet-profile'];

/**
 * Hook pour écouter les changements en temps réel sur les gestionnaires de flotte
 * et invalider le cache automatiquement
 */
export const useFleetProfileRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('fleet-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fleet_managers'
        },
        () => {
          // Invalider toutes les requêtes liées aux flottes publiques
          queryClient.invalidateQueries({ queryKey: PUBLIC_FLEETS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: PUBLIC_FLEET_PROFILE_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * Hook pour récupérer les gestionnaires de flotte visibles par les chauffeurs
 */
export const useVisibleFleets = (filters?: {
  searchTerm?: string;
}) => {
  useFleetProfileRealtime();

  return useQuery({
    queryKey: [...PUBLIC_FLEETS_QUERY_KEY, 'drivers', filters],
    queryFn: async () => {
      let query = supabase
        .from('fleet_managers')
        .select(`
          id,
          user_id,
          company_name,
          contact_name,
          description,
          address,
          contact_phone,
          contact_email,
          visible_to_drivers,
          visible_to_companies,
          logo_url,
          show_contact_name,
          show_address,
          show_phone,
          show_email,
          show_drivers_in_public_storefront,
          default_partnership_commission,
          partnership_terms,
          services_offered
        `)
        .eq('visible_to_drivers', true);

      if (filters?.searchTerm) {
        query = query.or(`company_name.ilike.%${filters.searchTerm}%,address.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query.order('company_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

/**
 * Hook pour récupérer le profil public d'un gestionnaire de flotte spécifique
 */
export const usePublicFleetProfile = (fleetManagerId: string | undefined) => {
  useFleetProfileRealtime();

  return useQuery({
    queryKey: [...PUBLIC_FLEET_PROFILE_KEY, fleetManagerId],
    queryFn: async () => {
      if (!fleetManagerId) return null;

      const { data, error } = await supabase
        .from('fleet_managers')
        .select(`
          id,
          user_id,
          company_name,
          contact_name,
          description,
          address,
          contact_phone,
          contact_email,
          visible_to_drivers,
          logo_url,
          show_contact_name,
          show_address,
          show_phone,
          show_email,
          show_drivers_in_public_storefront,
          auto_dispatch_enabled,
          default_partnership_commission,
          services_offered
        `)
        .eq('id', fleetManagerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!fleetManagerId,
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

/**
 * Fonction utilitaire pour invalider manuellement le cache des flottes
 */
export const useInvalidatePublicFleets = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: PUBLIC_FLEETS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PUBLIC_FLEET_PROFILE_KEY });
  };
};
