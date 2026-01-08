import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverPartner {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto?: string;
  commissionPercentage: number;
  sharingNumber?: number;
  status: string;
}

export function useDriverPartners(driverId: string | null) {
  const [partners, setPartners] = useState<DriverPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setPartners([]);
      setLoading(false);
      return;
    }

    const fetchPartners = async () => {
      try {
        // Get partnerships where this driver is involved
        const { data: partnerships, error } = await supabase
          .from('driver_partnerships')
          .select('*')
          .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
          .eq('status', 'accepted');

        if (error) throw error;

        if (!partnerships || partnerships.length === 0) {
          setPartners([]);
          setLoading(false);
          return;
        }

        // Get partner driver IDs
        const partnerIds = partnerships.map(p => 
          p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id
        );

        // Get driver info
        const { data: drivers } = await supabase
          .from('drivers')
          .select('id, user_id, sharing_number')
          .in('id', partnerIds);

        const driverMap = new Map(drivers?.map(d => [d.id, d]) || []);

        // Get profiles
        const userIds = drivers?.map(d => d.user_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Build partners list
        const partnersList: DriverPartner[] = partnerships.map(p => {
          const partnerId = p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id;
          const driver = driverMap.get(partnerId);
          const profile = driver ? profileMap.get(driver.user_id) : null;

          return {
            id: p.id,
            partnerId,
            partnerName: profile?.full_name || 'Partenaire',
            partnerPhoto: profile?.profile_photo_url || undefined,
            commissionPercentage: p.commission_percentage || 10,
            sharingNumber: driver?.sharing_number,
            status: p.status
          };
        });

        setPartners(partnersList);
      } catch (error) {
        console.error('Error fetching partners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [driverId]);

  return { partners, loading };
}
