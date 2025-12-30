import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Query keys centralisées pour les profils entreprise
export const PUBLIC_COMPANIES_QUERY_KEY = ['public-companies'];
export const PUBLIC_COMPANY_PROFILE_KEY = ['public-company-profile'];

/**
 * Hook pour écouter les changements en temps réel sur les entreprises
 * et invalider le cache automatiquement
 */
export const useCompanyProfileRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('company-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        () => {
          // Invalider toutes les requêtes liées aux entreprises publiques
          queryClient.invalidateQueries({ queryKey: PUBLIC_COMPANIES_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: PUBLIC_COMPANY_PROFILE_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

/**
 * Hook pour récupérer les entreprises visibles par les chauffeurs
 */
export const useVisibleCompanies = (filters?: {
  searchTerm?: string;
  acceptingProposals?: boolean;
}) => {
  useCompanyProfileRealtime();

  return useQuery({
    queryKey: [...PUBLIC_COMPANIES_QUERY_KEY, 'drivers', filters],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select(`
          id,
          company_name,
          address,
          contact_phone,
          contact_email,
          notes,
          preferred_vehicle_types,
          visible_to_drivers,
          accepting_proposals,
          logo_url,
          employee_count,
          show_phone
        `)
        .eq('visible_to_drivers', true)
        .eq('status', 'active');

      if (filters?.searchTerm) {
        query = query.or(`company_name.ilike.%${filters.searchTerm}%,address.ilike.%${filters.searchTerm}%`);
      }

      if (filters?.acceptingProposals !== undefined) {
        query = query.eq('accepting_proposals', filters.acceptingProposals);
      }

      const { data, error } = await query.order('company_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 0, // Toujours frais
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

/**
 * Hook pour récupérer le profil public d'une entreprise spécifique
 */
export const usePublicCompanyProfile = (companyId: string | undefined) => {
  useCompanyProfileRealtime();

  return useQuery({
    queryKey: [...PUBLIC_COMPANY_PROFILE_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          company_name,
          address,
          contact_phone,
          contact_email,
          notes,
          preferred_vehicle_types,
          visible_to_drivers,
          accepting_proposals,
          logo_url,
          employee_count,
          show_phone
        `)
        .eq('id', companyId)
        .eq('visible_to_drivers', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

/**
 * Fonction utilitaire pour invalider manuellement le cache des entreprises
 */
export const useInvalidatePublicCompanies = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: PUBLIC_COMPANIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PUBLIC_COMPANY_PROFILE_KEY });
  };
};
