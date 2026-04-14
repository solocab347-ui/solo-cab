/**
 * Hook ULTRA-OPTIMISÉ pour le profil driver
 * Cache agressif + moins de re-renders
 * Calcul synchrone du statut d'accès pour éviter le flickering
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

/**
 * Helper pour calculer le statut d'accès de manière synchrone
 * 
 * RÈGLE D'ACCÈS STRICT:
 * 1. Inscription + Paiement → Accès UNIQUEMENT aux documents
 * 2. Documents soumis → En attente de validation admin (toujours accès documents seulement)
 * 3. Documents VALIDÉS par admin → Accès complet au dashboard
 * 
 * L'accès complet est CONDITIONNÉ à la validation admin des documents
 */
const calculateAccessStatus = (driver: any) => {
  if (!driver) {
    return {
      hasFullAccess: false,
      isInGracePeriod: false,
      isPioneerTrialActive: false,
      hasFreeAccess: false,
      gracePeriodDaysLeft: 0,
      pioneerTrialDaysLeft: 0,
      isDocumentsBlocked: false,
      documentsAccessOnly: false,
      documentsStatus: 'pending',
      awaitingDocumentValidation: false,
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

  // Accès gratuit: soit illimité (free_access_granted=true OU free_access_type="unlimited")
  // Soit avec période définie (free_access_end_date dans le futur)
  const freeAccessWithPeriod = driver.free_access_end_date && 
    new Date(driver.free_access_end_date) > now &&
    driver.free_access_type !== "trial"; // Exclure les trials pioneers
  
  const hasFreeAccess = driver.free_access_granted === true || 
    driver.free_access_type === "unlimited" ||
    freeAccessWithPeriod;

  // Statut des documents
  const documentsStatus = driver.documents_status || 'pending';
  
  // RÈGLE STRICTE: Documents doivent être VALIDÉS par admin pour avoir accès complet
  // "submitted" = en attente de validation = PAS d'accès complet
  const documentsValidated = documentsStatus === 'validated';
  
  // Vérifier si documents bloqués explicitement OU si documents non validés
  const isDocumentsBlocked = driver.documents_access_blocked === true;
  
  // L'utilisateur n'a accès qu'aux documents et abonnement SI:
  // - Blocage explicite (deadline dépassée) ET documents non soumis/validés
  // - OU documents non encore validés par l'admin (même s'ils sont soumis)
  const documentsAccessOnly = 
    (isDocumentsBlocked && documentsStatus !== "submitted" && documentsStatus !== "validated") ||
    (!documentsValidated && !driver.is_fleet_driver); // Les chauffeurs de flotte sont exemptés
  
  // En attente de validation = documents soumis mais pas encore validés
  const awaitingDocumentValidation = documentsStatus === 'submitted';

  // Vérifier si essai 14 jours actif
  const trialEndDate = driver.trial_end_date ? new Date(driver.trial_end_date) : null;
  const isTrialActive = driver.trial_status === 'active' && trialEndDate && trialEndDate > now;
  const trialDaysLeft = isTrialActive && trialEndDate 
    ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  // En modèle freemium, l'accès au dashboard dépend de la validation des documents,
  // pas d'un abonnement premium. Le premium ne sert qu'à débloquer les modules avancés.
  const hasFullAccess = documentsValidated || driver.is_fleet_driver;

  return {
    hasFullAccess,
    isInGracePeriod,
    isPioneerTrialActive,
    hasFreeAccess,
    isTrialActive,
    trialDaysLeft,
    gracePeriodDaysLeft,
    pioneerTrialDaysLeft,
    isDocumentsBlocked,
    documentsAccessOnly: !hasFullAccess && !driver.is_fleet_driver,
    documentsStatus,
    awaitingDocumentValidation,
  };
};

export function useOptimizedDriverProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Query avec cache modéré pour permettre les mises à jour rapides
  const { data: driverProfile, isLoading, error } = useQuery({
    queryKey: ['driver-profile-optimized', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      // Requêtes séquentielles pour éviter les timeouts
      const profileRes = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, avatar_url, created_at')
        .eq('id', userId)
        .single();

      if (profileRes.error) {
        console.error('Erreur profil:', profileRes.error);
        throw profileRes.error;
      }

      const driverRes = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (driverRes.error) {
        console.error('Erreur driver:', driverRes.error);
        throw driverRes.error;
      }

      const fullName = profileRes.data?.full_name || '';
      
      return {
        ...profileRes.data,
        driver: driverRes.data,
        full_name: fullName
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - rafraîchissement plus fréquent
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
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
