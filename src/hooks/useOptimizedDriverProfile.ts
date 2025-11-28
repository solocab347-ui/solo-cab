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

  // Query avec cache modéré pour permettre les mises à jour rapides
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
    staleTime: 2 * 60 * 1000, // 2 minutes - permet rafraîchissement rapide
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Mutation optimisée avec confirmation instantanée
  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      if (!driverProfile?.driver?.id) throw new Error('Driver ID missing');

      console.log('🔄 Mise à jour du profil...', updates);
      
      const { error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', driverProfile.driver.id);

      if (error) throw error;
      return updates;
    },
    onMutate: async (updates) => {
      // Annuler les refetch en cours
      await queryClient.cancelQueries({ queryKey: ['driver-profile-optimized', userId] });

      // Sauvegarder l'état précédent
      const previousProfile = queryClient.getQueryData(['driver-profile-optimized', userId]);

      // Mise à jour optimiste immédiate
      queryClient.setQueryData(['driver-profile-optimized', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          driver: {
            ...old.driver,
            ...updates
          }
        };
      });

      return { previousProfile };
    },
    onSuccess: async (updates) => {
      console.log('✅ Profil mis à jour avec succès');
      
      // Invalider et refetch immédiat pour synchroniser
      await queryClient.invalidateQueries({ 
        queryKey: ['driver-profile-optimized', userId]
      });
      
      toast.success('Profil mis à jour avec succès !', {
        description: 'Vos modifications ont été enregistrées'
      });
    },
    onError: (error: any, _variables, context) => {
      console.error('❌ Erreur mise à jour:', error);
      
      // Restaurer l'état précédent en cas d'erreur
      if (context?.previousProfile) {
        queryClient.setQueryData(['driver-profile-optimized', userId], context.previousProfile);
      }
      
      toast.error('Erreur lors de la mise à jour', {
        description: error.message || 'Impossible d\'enregistrer vos modifications'
      });
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
