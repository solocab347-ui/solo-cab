import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PartnershipRequestStatus {
  driverId: string;
  status: 'none' | 'outgoing_pending' | 'incoming_pending' | 'active' | 'rejected';
  partnershipId?: string;
  isInitiator?: boolean; // true si c'est moi qui ai envoyé la demande
}

export function useDriverPartnershipStatus(currentDriverId: string | null, targetDriverIds: string[]) {
  const [statuses, setStatuses] = useState<Map<string, PartnershipRequestStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    if (!currentDriverId || targetDriverIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer tous les partenariats impliquant le chauffeur actuel avec ces chauffeurs cibles
      const { data, error } = await supabase
        .from('driver_partnerships')
        .select('id, driver_a_id, driver_b_id, status, proposed_by')
        .or(`driver_a_id.eq.${currentDriverId},driver_b_id.eq.${currentDriverId}`)
        .in('status', ['pending', 'accepted', 'active']);

      if (error) throw error;

      const statusMap = new Map<string, PartnershipRequestStatus>();

      // Initialiser tous les chauffeurs cibles avec "none"
      targetDriverIds.forEach(id => {
        statusMap.set(id, { driverId: id, status: 'none' });
      });

      // Mettre à jour les statuts basés sur les données
      (data || []).forEach(partnership => {
        const partnerId = partnership.driver_a_id === currentDriverId 
          ? partnership.driver_b_id 
          : partnership.driver_a_id;

        if (targetDriverIds.includes(partnerId)) {
          const isInitiator = partnership.proposed_by === currentDriverId;
          
          let status: PartnershipRequestStatus['status'] = 'none';
          
          if (partnership.status === 'pending') {
            status = isInitiator ? 'outgoing_pending' : 'incoming_pending';
          } else if (partnership.status === 'accepted' || partnership.status === 'active') {
            status = 'active';
          }

          statusMap.set(partnerId, {
            driverId: partnerId,
            status,
            partnershipId: partnership.id,
            isInitiator,
          });
        }
      });

      setStatuses(statusMap);
    } catch (error) {
      console.error('Error loading partnership statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDriverId, targetDriverIds.join(',')]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const getStatus = (driverId: string): PartnershipRequestStatus => {
    return statuses.get(driverId) || { driverId, status: 'none' };
  };

  return { statuses, getStatus, loading, refresh: loadStatuses };
}

// Hook pour les partenariats entreprise-chauffeur
export function useCompanyDriverAgreementStatus(
  entityType: 'driver' | 'company',
  currentEntityId: string | null,
  targetIds: string[]
) {
  const [statuses, setStatuses] = useState<Map<string, PartnershipRequestStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    if (!currentEntityId || targetIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('company_driver_agreements')
        .select('id, driver_id, company_id, status, proposed_by')
        .in('status', ['pending', 'accepted', 'active']);

      if (entityType === 'driver') {
        query = query.eq('driver_id', currentEntityId);
      } else {
        query = query.eq('company_id', currentEntityId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const statusMap = new Map<string, PartnershipRequestStatus>();

      targetIds.forEach(id => {
        statusMap.set(id, { driverId: id, status: 'none' });
      });

      (data || []).forEach(agreement => {
        const targetId = entityType === 'driver' ? agreement.company_id : agreement.driver_id;

        if (targetIds.includes(targetId)) {
          const isInitiator = agreement.proposed_by === entityType;

          let status: PartnershipRequestStatus['status'] = 'none';

          if (agreement.status === 'pending') {
            status = isInitiator ? 'outgoing_pending' : 'incoming_pending';
          } else if (agreement.status === 'accepted' || agreement.status === 'active') {
            status = 'active';
          }

          statusMap.set(targetId, {
            driverId: targetId,
            status,
            partnershipId: agreement.id,
            isInitiator,
          });
        }
      });

      setStatuses(statusMap);
    } catch (error) {
      console.error('Error loading company-driver agreement statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, currentEntityId, targetIds.join(',')]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const getStatus = (id: string): PartnershipRequestStatus => {
    return statuses.get(id) || { driverId: id, status: 'none' };
  };

  return { statuses, getStatus, loading, refresh: loadStatuses };
}

// Hook pour les partenariats fleet-chauffeur
export function useFleetDriverPartnershipStatus(
  entityType: 'driver' | 'fleet_manager',
  currentEntityId: string | null,
  targetIds: string[]
) {
  const [statuses, setStatuses] = useState<Map<string, PartnershipRequestStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    if (!currentEntityId || targetIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('fleet_driver_partnerships')
        .select('id, driver_id, fleet_manager_id, status, initiated_by')
        .in('status', ['pending', 'accepted', 'active']);

      if (entityType === 'driver') {
        query = query.eq('driver_id', currentEntityId);
      } else {
        query = query.eq('fleet_manager_id', currentEntityId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const statusMap = new Map<string, PartnershipRequestStatus>();

      targetIds.forEach(id => {
        statusMap.set(id, { driverId: id, status: 'none' });
      });

      (data || []).forEach(partnership => {
        const targetId = entityType === 'driver' ? partnership.fleet_manager_id : partnership.driver_id;

        if (targetIds.includes(targetId)) {
          const isInitiator = partnership.initiated_by === entityType;

          let status: PartnershipRequestStatus['status'] = 'none';

          if (partnership.status === 'pending') {
            status = isInitiator ? 'outgoing_pending' : 'incoming_pending';
          } else if (partnership.status === 'accepted' || partnership.status === 'active') {
            status = 'active';
          }

          statusMap.set(targetId, {
            driverId: targetId,
            status,
            partnershipId: partnership.id,
            isInitiator,
          });
        }
      });

      setStatuses(statusMap);
    } catch (error) {
      console.error('Error loading fleet-driver partnership statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, currentEntityId, targetIds.join(',')]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const getStatus = (id: string): PartnershipRequestStatus => {
    return statuses.get(id) || { driverId: id, status: 'none' };
  };

  return { statuses, getStatus, loading, refresh: loadStatuses };
}
