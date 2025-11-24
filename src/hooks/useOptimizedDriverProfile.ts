/**
 * Hook ULTRA-OPTIMISÉ pour le profil driver
 * Cache agressif + moins de re-renders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallback } from 'react';

export function useOptimizedDriverProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Query avec cache agressif
  const { data: driverProfile, isLoading, error } = useQuery({
    queryKey: ['driver-profile-optimized', userId],
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
    staleTime: 15 * 60 * 1000, // 15 minutes - très agressif
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Mutation optimisée avec callback stable
  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      if (!driverProfile?.driver?.id) throw new Error('Driver ID missing');

      const { error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', driverProfile.driver.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile-optimized', userId] });
      toast.success('Profil mis à jour !');
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Callback stable avec useCallback
  const handleUpdateProfile = useCallback((updates: any) => {
    updateProfile.mutate(updates);
  }, [updateProfile]);

  return {
    driverProfile,
    isLoading,
    error,
    updateProfile: handleUpdateProfile,
    isUpdating: updateProfile.isPending,
  };
}
