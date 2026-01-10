/**
 * Hook ULTRA-OPTIMISÉ pour le profil driver
 * Cache agressif + moins de re-renders
 * Calcul synchrone du statut d'accès pour éviter le flickering
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

// Helper pour calculer le statut d'accès de manière synchrone
const calculateAccessStatus = (driver: any) => {
  if (!driver) {
    return {
      hasFullAccess: false,
      isInGracePeriod: false,
      isPioneerTrialActive: false,
      hasFreeAccess: false,
      gracePeriodDaysLeft: 0,
      pioneerTrialDaysLeft: 0,
    };
  }

  const now = new Date();
  const createdAt = driver.created_at ? new Date(driver.created_at) : null;
  const gracePeriodEnd = createdAt ? new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const isInGracePeriod = gracePeriodEnd ? now < gracePeriodEnd : false;
  const gracePeriodDaysLeft = gracePeriodEnd ? Math.max(0, Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const freeAccessEndDate = driver.free_access_end_date ? new Date(driver.free_access_end_date) : null;
  const isPioneerTrialActive = driver.is_pioneer && 
    driver.free_access_type === "trial" && 
    freeAccessEndDate && 
    freeAccessEndDate > now;
  const pioneerTrialDaysLeft = isPioneerTrialActive && freeAccessEndDate 
    ? Math.ceil((freeAccessEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  const hasFreeAccess = driver.free_access_granted || 
    (driver.free_access_type === "unlimited");

  const hasFullAccess = 
    driver.subscription_status === "active" ||
    driver.subscription_paid === true ||
    isInGracePeriod ||
    isPioneerTrialActive ||
    hasFreeAccess;

  return {
    hasFullAccess,
    isInGracePeriod,
    isPioneerTrialActive,
    hasFreeAccess,
    gracePeriodDaysLeft,
    pioneerTrialDaysLeft,
  };
};

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

  // Calculer le statut d'accès de manière synchrone (pas d'appel async = pas de flickering)
  const accessStatus = useMemo(() => {
    return calculateAccessStatus(driverProfile?.driver);
  }, [driverProfile?.driver]);

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
    // Statut d'accès calculé de manière synchrone
    accessStatus,
  };
}
