import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionTier = 'free' | 'premium';

export interface DriverPremiumStatus {
  tier: SubscriptionTier;
  isPremium: boolean;
  isFree: boolean;
  loading: boolean;
  /** Features gated behind premium */
  canAccessPartnerships: boolean;
  canAccessCourseSharing: boolean;
  canAccessPromotions: boolean;
  canAccessProspection: boolean;
  canAccessPlanning: boolean;
  canAccessObjectives: boolean;
  canAccessEncaissement: boolean;
  canAccessProfitability: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook centralisé pour vérifier le statut premium d'un chauffeur.
 * Modèle freemium : gratuit par défaut, premium à 19,99€/mois.
 * 
 * Features GRATUITES : gestion clients, courses, réservations, QR code, facturation, calculatrice
 * Features PREMIUM : planning, objectifs, encaissement spontané, rentabilité, partenariats, échange courses, campagnes, prospection
 */
export function useDriverPremium(): DriverPremiumStatus {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  const checkPremiumStatus = useCallback(async () => {
    if (!user?.id) {
      setTier('free');
      setLoading(false);
      return;
    }

    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('subscription_tier, subscription_paid, subscription_status, free_access_granted, free_access_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driver) {
        setTier('free');
        setLoading(false);
        return;
      }

      // Admin unlimited/administrative access = premium
      if (driver.free_access_granted && 
          (driver.free_access_type === 'unlimited' || driver.free_access_type === 'administrative')) {
        setTier('premium');
        setLoading(false);
        return;
      }

      // Check subscription_tier from DB (set by webhook/check-driver-subscription)
      if (driver.subscription_tier === 'premium' && driver.subscription_paid) {
        setTier('premium');
      } else {
        setTier('free');
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setTier('free');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  const isPremium = tier === 'premium';

  return {
    tier,
    isPremium,
    isFree: !isPremium,
    loading,
    canAccessPartnerships: isPremium,
    canAccessCourseSharing: isPremium,
    canAccessPromotions: isPremium,
    canAccessProspection: isPremium,
    canAccessPlanning: isPremium,
    canAccessObjectives: isPremium,
    canAccessEncaissement: isPremium,
    canAccessProfitability: isPremium,
    refresh: checkPremiumStatus,
  };
}
