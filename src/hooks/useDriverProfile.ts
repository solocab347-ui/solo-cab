/**
 * Hook optimisé avec React Query pour le profil driver
 * Cache automatique + invalidation intelligente
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDriverProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Query pour récupérer le profil
  const { data: driverProfile, isLoading, error } = useQuery({
    queryKey: ['driver-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      const [profileRes, driverRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('drivers').select('*').eq('user_id', userId).single()
      ]);

      if (profileRes.error) throw profileRes.error;
      if (driverRes.error) throw driverRes.error;

      return {
        ...profileRes.data,
        driver: driverRes.data,
        full_name: profileRes.data.full_name || 'Chauffeur'
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mutation pour mettre à jour le profil
  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      if (!driverProfile?.driver?.id) throw new Error('Driver ID missing');

      const { error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', driverProfile.driver.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile', userId] });
      toast.success('Profil mis à jour avec succès !');
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  return {
    driverProfile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
  };
}
