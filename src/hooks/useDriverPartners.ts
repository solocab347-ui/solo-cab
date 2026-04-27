import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverPartner {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  sharing_number: number | null;
}

/**
 * Nouveau modèle : "partners" = favoris du chauffeur.
 * Plus de contrats — l'adhésion Premium remplace la signature.
 */
export function useDriverPartners(driverId: string | null) {
  const [partners, setPartners] = useState<DriverPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setPartners([]);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_favorites')
        .select(`
          favorite_driver_id,
          driver:drivers!driver_favorites_favorite_driver_id_fkey(
            id, full_name, photo_url, sharing_number
          )
        `)
        .eq('driver_id', driverId);

      if (!active) return;
      if (error || !data) {
        setPartners([]);
      } else {
        setPartners(
          data
            .map((row: any) => row.driver)
            .filter(Boolean)
            .map((d: any) => ({
              id: d.id,
              full_name: d.full_name,
              photo_url: d.photo_url,
              sharing_number: d.sharing_number,
            }))
        );
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [driverId]);

  return { partners, loading };
}
