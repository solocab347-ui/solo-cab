/**
 * TESTS UNITAIRES: DÉTECTION DE TARIFICATION PAR VILLE
 * 50 tests couvrant la détection de code postal, les limites de ville,
 * et les scénarios inter-villes / intra-villes.
 */

import { describe, it, expect } from 'vitest';

// ============ Simulation des fonctions SQL ============

/**
 * Reproduit detect_paris_address (SQL)
 */
function detectParisAddress(address: string | null): string | null {
  if (!address || address.trim() === '') return null;
  const addrLower = address.toLowerCase().trim();
  const postalMatch = address.match(/(\d{5})/);
  const postal = postalMatch ? postalMatch[1] : null;
  const hasPostal = postal !== null;

  // Hard exclusions
  const excludes = [
    'cdg', 'charles de gaulle', 'roissy', 'orly', 'le bourget', 'beauvais',
    'disneyland', 'marne-la-vallée', 'marne la vallee', 'la défense', 'la defense',
    'vincennes', 'boulogne-billancourt', 'neuilly-sur-seine', 'levallois', 'clichy',
    'saint-denis', 'saint denis', 'montreuil', 'aéroport', 'aeroport',
  ];
  for (const ex of excludes) {
    if (addrLower.includes(ex)) return null;
  }

  // Postal code check: 75001-75020
  if (hasPostal) {
    if (/^750(0[1-9]|1[0-9]|20)$/.test(postal!)) return 'Paris';
    return null;
  }

  // Unambiguous landmarks
  const landmarks = [
    'gare du nord', 'gare de l\'est', 'gare de l est',
    'gare de lyon', 'gare montparnasse', 'gare saint-lazare', 'gare st-lazare',
    'gare d\'austerlitz', 'gare de bercy',
    'tour eiffel', 'eiffel tower', 'arc de triomphe',
    'sacré-coeur', 'sacré coeur', 'sacre coeur',
    'notre-dame de paris', 'trocadéro', 'trocadero',
    'champs-élysées', 'champs élysées', 'champs elysees',
    'place de la concorde', 'place vendôme', 'place vendome',
    'place de la bastille', 'montmartre', 'moulin rouge',
    'opéra garnier', 'opera garnier', 'louvre',
    'musée d\'orsay', 'musee d\'orsay', 'centre pompidou', 'invalides',
  ];
  for (const lm of landmarks) {
    if (addrLower.includes(lm)) {
      // Gare de Lyon disambiguation
      if (lm === 'gare de lyon' && (addrLower.includes('perrache') || addrLower.includes('saint-exup'))) continue;
      return 'Paris';
    }
  }

  return null;
}

/**
 * Reproduit detect_city_from_address (SQL)
 */
function detectCityFromAddress(address: string | null): string | null {
  if (!address || address.trim() === '') return null;
  const addrLower = address.toLowerCase().trim();
  const postalMatch = address.match(/(\d{5})/);
  const postal = postalMatch ? postalMatch[1] : null;
  const hasPostal = postal !== null;

  // Paris
  const parisResult = detectParisAddress(address);
  if (parisResult) return parisResult;

  // Lyon (69001-69009)
  if (hasPostal && /^6900[1-9]$/.test(postal!)) return 'Lyon';
  if (!hasPostal && (addrLower.includes('place bellecour') || addrLower.includes('vieux lyon')
    || addrLower.includes('part-dieu') || addrLower.includes('fourvière'))) return 'Lyon';

  // Marseille (13001-13016)
  if (hasPostal && /^130(0[1-9]|1[0-6])$/.test(postal!)) return 'Marseille';
  if (!hasPostal && (addrLower.includes('vieux-port') || addrLower.includes('canebière')
    || addrLower.includes('gare saint-charles'))) return 'Marseille';

  // Bordeaux
  if (hasPostal && ['33000', '33100', '33200', '33300', '33800'].includes(postal!)) return 'Bordeaux';

  // Toulouse
  if (hasPostal && ['31000', '31100', '31300', '31400', '31500'].includes(postal!)) return 'Toulouse';

  // Nice
  if (hasPostal && /^06[0-3]00$/.test(postal!)) return 'Nice';
  if (!hasPostal && (addrLower.includes('promenade des anglais') || addrLower.includes('vieux nice'))) return 'Nice';

  // Nantes
  if (hasPostal && /^44[0-3]00$/.test(postal!)) return 'Nantes';

  // Strasbourg
  if (hasPostal && /^67[0-2]00$/.test(postal!)) return 'Strasbourg';

  // Montpellier
  if (hasPostal && ['34000', '34070', '34080', '34090'].includes(postal!)) return 'Montpellier';

  // Lille
  if (hasPostal && ['59000', '59800'].includes(postal!)) return 'Lille';

  // Rennes
  if (hasPostal && ['35000', '35200', '35700'].includes(postal!)) return 'Rennes';

  return null;
}

/**
 * Reproduit get_applicable_pricing (SQL) - simplifié
 */
function getApplicablePricing(
  pickupAddress: string,
  destinationAddress: string,
  activeCityPricings: { city_name: string; id: string }[]
): { pricing_type: string; city_pricing_id: string | null; city_name: string | null } {
  const pickupCity = detectCityFromAddress(pickupAddress);
  const destinationCity = detectCityFromAddress(destinationAddress);

  if (pickupCity && destinationCity && pickupCity.toLowerCase() === destinationCity.toLowerCase()) {
    const match = activeCityPricings.find(
      p => p.city_name.toLowerCase() === pickupCity.toLowerCase()
    );
    if (match) {
      return { pricing_type: 'city', city_pricing_id: match.id, city_name: match.city_name };
    }
  }

  return { pricing_type: 'classic', city_pricing_id: null, city_name: null };
}

// ============ 50 TESTS TARIFICATION PAR VILLE ============

describe('A. Détection Paris – Code postal', () => {
  it('T01: 75001 → Paris', () => {
    expect(detectCityFromAddress('15 Rue de Rivoli, 75001 Paris')).toBe('Paris');
  });
  it('T02: 75010 → Paris', () => {
    expect(detectCityFromAddress('Gare du Nord, 75010 Paris')).toBe('Paris');
  });
  it('T03: 75020 → Paris', () => {
    expect(detectCityFromAddress('45 Rue des Pyrénées, 75020 Paris')).toBe('Paris');
  });
  it('T04: 75116 → NON Paris (hors 75001-75020)', () => {
    expect(detectCityFromAddress('Avenue Foch, 75116 Paris')).toBe(null);
  });
  it('T05: 93100 Montreuil → NON Paris', () => {
    expect(detectCityFromAddress('12 Rue de Paris, 93100 Montreuil')).toBe(null);
  });
  it('T06: 95700 Roissy CDG → NON Paris', () => {
    expect(detectCityFromAddress('Aéroport CDG Terminal 2, 95700 Roissy')).toBe(null);
  });
  it('T07: 94310 Orly → NON Paris', () => {
    expect(detectCityFromAddress('Aéroport Orly Terminal Sud, 94310 Orly')).toBe(null);
  });
  it('T08: 92100 Boulogne-Billancourt → NON Paris', () => {
    expect(detectCityFromAddress('10 Av du Général Leclerc, 92100 Boulogne-Billancourt')).toBe(null);
  });
});

describe('B. Détection Paris – Landmarks sans code postal', () => {
  it('T09: Tour Eiffel → Paris', () => {
    expect(detectCityFromAddress('Tour Eiffel, Champ de Mars, Paris')).toBe('Paris');
  });
  it('T10: Gare du Nord → Paris', () => {
    expect(detectCityFromAddress('Gare du Nord')).toBe('Paris');
  });
  it('T11: Champs-Élysées → Paris', () => {
    expect(detectCityFromAddress('Avenue des Champs-Élysées')).toBe('Paris');
  });
  it('T12: Louvre → Paris', () => {
    expect(detectCityFromAddress('Musée du Louvre')).toBe('Paris');
  });
  it('T13: "Rue de Paris, Montreuil" → NON Paris (exclusion Montreuil)', () => {
    expect(detectCityFromAddress('Rue de Paris, Montreuil')).toBe(null);
  });
  it('T14: "La Défense" → NON Paris', () => {
    expect(detectCityFromAddress('La Défense, Grande Arche')).toBe(null);
  });
  it('T15: "Disneyland Paris" → NON Paris', () => {
    expect(detectCityFromAddress('Disneyland Paris, Marne-la-Vallée')).toBe(null);
  });
});

describe('C. Détection Lyon', () => {
  it('T16: 69001 → Lyon', () => {
    expect(detectCityFromAddress('Place des Terreaux, 69001 Lyon')).toBe('Lyon');
  });
  it('T17: 69009 → Lyon', () => {
    expect(detectCityFromAddress('Quai de Saône, 69009 Lyon')).toBe('Lyon');
  });
  it('T18: 69100 Villeurbanne → NON Lyon', () => {
    expect(detectCityFromAddress('10 Rue de la Gare, 69100 Villeurbanne')).toBe(null);
  });
  it('T19: Place Bellecour (sans postal) → Lyon', () => {
    expect(detectCityFromAddress('Place Bellecour, Lyon')).toBe('Lyon');
  });
  it('T20: Part-Dieu (sans postal) → Lyon', () => {
    expect(detectCityFromAddress('Centre commercial Part-Dieu')).toBe('Lyon');
  });
});

describe('D. Détection Marseille', () => {
  it('T21: 13001 → Marseille', () => {
    expect(detectCityFromAddress('Cours Julien, 13001 Marseille')).toBe('Marseille');
  });
  it('T22: 13016 → Marseille', () => {
    expect(detectCityFromAddress('L\'Estaque, 13016 Marseille')).toBe('Marseille');
  });
  it('T23: 13100 Aix-en-Provence → NON Marseille', () => {
    expect(detectCityFromAddress('Cours Mirabeau, 13100 Aix-en-Provence')).toBe(null);
  });
  it('T24: Vieux-Port (sans postal) → Marseille', () => {
    expect(detectCityFromAddress('Vieux-Port, Marseille')).toBe('Marseille');
  });
  it('T25: Gare Saint-Charles (sans postal) → Marseille', () => {
    expect(detectCityFromAddress('Gare Saint-Charles')).toBe('Marseille');
  });
});

describe('E. Détection Lille', () => {
  it('T26: 59000 → Lille', () => {
    expect(detectCityFromAddress('Grand Place, 59000 Lille')).toBe('Lille');
  });
  it('T27: 59800 → Lille', () => {
    expect(detectCityFromAddress('Avenue de la République, 59800 Lille')).toBe('Lille');
  });
  it('T28: 59100 Roubaix → NON Lille', () => {
    expect(detectCityFromAddress('Grande Rue, 59100 Roubaix')).toBe(null);
  });
});

describe('F. Détection autres villes', () => {
  it('T29: 33000 → Bordeaux', () => {
    expect(detectCityFromAddress('Place de la Bourse, 33000 Bordeaux')).toBe('Bordeaux');
  });
  it('T30: 31000 → Toulouse', () => {
    expect(detectCityFromAddress('Place du Capitole, 31000 Toulouse')).toBe('Toulouse');
  });
  it('T31: 06000 → Nice', () => {
    expect(detectCityFromAddress('Promenade des Anglais, 06000 Nice')).toBe('Nice');
  });
  it('T32: 44000 → Nantes', () => {
    expect(detectCityFromAddress('Place Royale, 44000 Nantes')).toBe('Nantes');
  });
  it('T33: 67000 → Strasbourg', () => {
    expect(detectCityFromAddress('Cathédrale, 67000 Strasbourg')).toBe('Strasbourg');
  });
  it('T34: 34000 → Montpellier', () => {
    expect(detectCityFromAddress('Place de la Comédie, 34000 Montpellier')).toBe('Montpellier');
  });
  it('T35: 35000 → Rennes', () => {
    expect(detectCityFromAddress('Place de la Mairie, 35000 Rennes')).toBe('Rennes');
  });
  it('T36: 45000 Orléans → NON reconnu (pas dans la liste)', () => {
    expect(detectCityFromAddress('Place du Martroi, 45000 Orléans')).toBe(null);
  });
});

describe('G. Scénarios inter-villes / intra-ville – get_applicable_pricing', () => {
  const driverPricings = [
    { city_name: 'Paris', id: 'pricing-paris-001' },
    { city_name: 'Lyon', id: 'pricing-lyon-001' },
    { city_name: 'Marseille', id: 'pricing-marseille-001' },
    { city_name: 'Lille', id: 'pricing-lille-001' },
  ];

  it('T37: Paris→Paris (75001→75008) → tarif ville Paris', () => {
    const r = getApplicablePricing('15 Rue de Rivoli, 75001 Paris', '12 Rue du Faubourg, 75008 Paris', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Paris');
  });

  it('T38: Paris 75001 → CDG → tarif classique (destination hors Paris)', () => {
    const r = getApplicablePricing('15 Rue de Rivoli, 75001 Paris', 'Aéroport CDG Terminal 2, 95700 Roissy', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T39: CDG → Paris 75009 → tarif classique (départ hors Paris)', () => {
    const r = getApplicablePricing('Aéroport CDG Terminal 2, 95700 Roissy', '10 Bd de Clichy, 75009 Paris', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T40: Lyon→Lyon (69001→69003) → tarif ville Lyon', () => {
    const r = getApplicablePricing('Place des Terreaux, 69001 Lyon', 'Quai Perrache, 69003 Lyon', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Lyon');
  });

  it('T41: Lyon 69001 → Villeurbanne 69100 → tarif classique', () => {
    const r = getApplicablePricing('Place Bellecour, 69001 Lyon', '10 Rue de la Gare, 69100 Villeurbanne', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T42: Marseille→Marseille (13001→13008) → tarif ville', () => {
    const r = getApplicablePricing('Canebière, 13001 Marseille', 'Plage du Prado, 13008 Marseille', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Marseille');
  });

  it('T43: Marseille→Aix-en-Provence → tarif classique', () => {
    const r = getApplicablePricing('Vieux-Port, 13001 Marseille', 'Cours Mirabeau, 13100 Aix-en-Provence', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T44: Paris→Lyon → tarif classique (villes différentes)', () => {
    const r = getApplicablePricing('Tour Eiffel, 75007 Paris', 'Place Bellecour, 69001 Lyon', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T45: Lille→Lille (59000→59800) → tarif ville', () => {
    const r = getApplicablePricing('Grand Place, 59000 Lille', 'Euralille, 59800 Lille', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Lille');
  });

  it('T46: Bordeaux→Bordeaux → tarif classique si PAS de tarif configuré', () => {
    const r = getApplicablePricing('Place de la Bourse, 33000 Bordeaux', 'Gare St-Jean, 33800 Bordeaux', driverPricings);
    expect(r.pricing_type).toBe('classic'); // pas de pricing Bordeaux dans la config
  });

  it('T47: Adresse sans code postal ni landmark → classique', () => {
    const r = getApplicablePricing('12 Rue des Lilas, Meaux', '5 Avenue Jean Jaurès, Chelles', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T48: Adresses vides → classique', () => {
    const r = getApplicablePricing('', '', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T49: 92000 Nanterre vers 75005 Paris → classique (origine hors Paris)', () => {
    const r = getApplicablePricing('10 Rue du RER, 92000 Nanterre', '5 Bd Saint-Michel, 75005 Paris', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T50: Deux landmarks Paris sans postal → tarif ville Paris', () => {
    const r = getApplicablePricing('Tour Eiffel, Paris', 'Arc de Triomphe, Paris', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Paris');
  });
});
