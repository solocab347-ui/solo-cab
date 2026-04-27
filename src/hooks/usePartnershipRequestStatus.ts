/**
 * Nouveau modèle : plus de demandes/contrats entre chauffeurs.
 * Tout chauffeur Premium peut partager au réseau ; tout chauffeur peut accepter.
 * Ce hook devient un no-op de compatibilité pour les imports existants.
 */
export type PartnershipStatus = 'none' | 'favorite';

export function useDriverPartnershipStatus(_otherDriverId?: string | null) {
  return {
    status: 'none' as PartnershipStatus,
    loading: false,
    refresh: async () => {},
  };
}
