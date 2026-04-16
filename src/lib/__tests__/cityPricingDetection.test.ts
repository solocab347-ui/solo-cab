/**
 * TESTS UNITAIRES: DÉTECTION DE TARIFICATION PAR VILLE
 * 50+ tests couvrant la détection de code postal, les limites de ville,
 * et les scénarios inter-villes / intra-villes.
 * Miroir exact des fonctions SQL detect_paris_address / detect_city_from_address.
 */

import { describe, it, expect } from 'vitest';

// ============ Simulation des fonctions SQL ============

function detectParisAddress(address: string | null): string | null {
  if (!address || address.trim() === '') return null;
  const addrLower = address.toLowerCase().trim();
  const postalMatch = address.match(/(\d{5})/);
  const postal = postalMatch ? postalMatch[1] : null;
  const hasPostal = postal !== null;

  const excludes = [
    'cdg', 'charles de gaulle', 'roissy', 'orly', 'le bourget', 'beauvais',
    'disneyland', 'marne-la-vallée', 'marne la vallee', 'la défense', 'la defense',
    'vincennes', 'boulogne-billancourt', 'neuilly-sur-seine', 'levallois', 'clichy',
    'saint-denis', 'saint denis', 'montreuil', 'aéroport', 'aeroport',
  ];
  for (const ex of excludes) {
    if (addrLower.includes(ex)) return null;
  }

  // Postal code: 75001-75020 + 75116
  if (hasPostal) {
    if (/^750(0[1-9]|1[0-9]|20)$/.test(postal!) || postal === '75116') return 'Paris';
    return null;
  }

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
      if (lm === 'gare de lyon' && (addrLower.includes('perrache') || addrLower.includes('saint-exup'))) continue;
      return 'Paris';
    }
  }

  return null;
}

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
  if (!hasPostal && addrLower.includes('place de la bourse') && addrLower.includes('bordeaux')) return 'Bordeaux';

  // Toulouse
  if (hasPostal && ['31000', '31100', '31200', '31300', '31400', '31500'].includes(postal!)) return 'Toulouse';
  if (!hasPostal && (addrLower.includes('place du capitole') || addrLower.includes('capitole de toulouse'))) return 'Toulouse';

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

  // Orléans
  if (hasPostal && ['45000', '45100'].includes(postal!)) return 'Orléans';

  // Grenoble
  if (hasPostal && ['38000', '38100'].includes(postal!)) return 'Grenoble';

  // Toulon
  if (hasPostal && ['83000', '83100', '83200'].includes(postal!)) return 'Toulon';

  // Dijon
  if (hasPostal && ['21000', '21100'].includes(postal!)) return 'Dijon';

  // Angers
  if (hasPostal && ['49000', '49100'].includes(postal!)) return 'Angers';

  // Le Mans
  if (hasPostal && ['72000', '72100'].includes(postal!)) return 'Le Mans';

  // Reims
  if (hasPostal && ['51100', '51000'].includes(postal!)) return 'Reims';

  // Saint-Étienne
  if (hasPostal && ['42000', '42100'].includes(postal!)) return 'Saint-Étienne';

  // Le Havre
  if (hasPostal && ['76600', '76610', '76620'].includes(postal!)) return 'Le Havre';

  // Clermont-Ferrand
  if (hasPostal && ['63000', '63100'].includes(postal!)) return 'Clermont-Ferrand';

  // Tours
  if (hasPostal && ['37000', '37100', '37200'].includes(postal!)) return 'Tours';

  // Amiens
  if (hasPostal && ['80000', '80080', '80090'].includes(postal!)) return 'Amiens';

  // Limoges
  if (hasPostal && ['87000', '87100'].includes(postal!)) return 'Limoges';

  // Metz
  if (hasPostal && ['57000', '57050', '57070'].includes(postal!)) return 'Metz';

  // Besançon
  if (hasPostal && ['25000', '25030'].includes(postal!)) return 'Besançon';

  // Perpignan
  if (hasPostal && ['66000', '66100'].includes(postal!)) return 'Perpignan';

  // Rouen
  if (hasPostal && ['76000', '76100'].includes(postal!)) return 'Rouen';

  // Caen
  if (hasPostal && postal === '14000') return 'Caen';

  // Nancy
  if (hasPostal && ['54000', '54100'].includes(postal!)) return 'Nancy';

  // Brest
  if (hasPostal && postal === '29200') return 'Brest';

  // Poitiers
  if (hasPostal && postal === '86000') return 'Poitiers';

  // Pau
  if (hasPostal && postal === '64000') return 'Pau';

  // Aix-en-Provence
  if (hasPostal && ['13080', '13090', '13100', '13290', '13540'].includes(postal!)) return 'Aix-en-Provence';

  // Villeurbanne
  if (hasPostal && postal === '69100') return 'Villeurbanne';

  // Mulhouse
  if (hasPostal && ['68100', '68200'].includes(postal!)) return 'Mulhouse';

  // Avignon
  if (hasPostal && postal === '84000') return 'Avignon';

  // Cannes
  if (hasPostal && postal === '06400') return 'Cannes';

  return null;
}

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
  it('T04: 75116 → Paris (16ème arrondissement, corrigé)', () => {
    expect(detectCityFromAddress('Avenue Foch, 75116 Paris')).toBe('Paris');
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
  it('T13: "Rue de Paris, Montreuil" → NON Paris', () => {
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
  it('T18: 69100 Villeurbanne → Villeurbanne (pas Lyon)', () => {
    expect(detectCityFromAddress('10 Rue de la Gare, 69100 Villeurbanne')).toBe('Villeurbanne');
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
    expect(detectCityFromAddress("L'Estaque, 13016 Marseille")).toBe('Marseille');
  });
  it('T23: 13100 Aix-en-Provence → Aix-en-Provence (pas Marseille)', () => {
    expect(detectCityFromAddress('Cours Mirabeau, 13100 Aix-en-Provence')).toBe('Aix-en-Provence');
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

describe('F. Nouvelles villes corrigées', () => {
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
  it('T36: 45000 → Orléans (corrigé, était manquant)', () => {
    expect(detectCityFromAddress('Place du Martroi, 45000 Orléans')).toBe('Orléans');
  });
  it('T37: 38000 → Grenoble', () => {
    expect(detectCityFromAddress('Place Victor Hugo, 38000 Grenoble')).toBe('Grenoble');
  });
  it('T38: 83000 → Toulon', () => {
    expect(detectCityFromAddress('Port de Toulon, 83000 Toulon')).toBe('Toulon');
  });
  it('T39: 21000 → Dijon', () => {
    expect(detectCityFromAddress('Place de la Libération, 21000 Dijon')).toBe('Dijon');
  });
  it('T40: 51100 → Reims', () => {
    expect(detectCityFromAddress('Cathédrale Notre-Dame, 51100 Reims')).toBe('Reims');
  });
  it('T41: 76000 → Rouen', () => {
    expect(detectCityFromAddress('Place du Vieux-Marché, 76000 Rouen')).toBe('Rouen');
  });
  it('T42: 06400 → Cannes (pas Nice)', () => {
    expect(detectCityFromAddress('La Croisette, 06400 Cannes')).toBe('Cannes');
  });
  it('T43: 84000 → Avignon', () => {
    expect(detectCityFromAddress('Palais des Papes, 84000 Avignon')).toBe('Avignon');
  });
  it('T44: 14000 → Caen', () => {
    expect(detectCityFromAddress('Château de Caen, 14000 Caen')).toBe('Caen');
  });
});

describe('G. Scénarios inter-villes / intra-ville – get_applicable_pricing', () => {
  const driverPricings = [
    { city_name: 'Paris', id: 'pricing-paris-001' },
    { city_name: 'Lyon', id: 'pricing-lyon-001' },
    { city_name: 'Marseille', id: 'pricing-marseille-001' },
    { city_name: 'Lille', id: 'pricing-lille-001' },
    { city_name: 'Orléans', id: 'pricing-orleans-001' },
  ];

  it('T45: Paris→Paris (75001→75008) → tarif ville Paris', () => {
    const r = getApplicablePricing('15 Rue de Rivoli, 75001 Paris', '12 Rue du Faubourg, 75008 Paris', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Paris');
  });

  it('T46: Paris 75116→75007 → tarif ville Paris (75116 corrigé)', () => {
    const r = getApplicablePricing('Avenue Foch, 75116 Paris', 'Tour Eiffel, 75007 Paris', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Paris');
  });

  it('T47: Paris→CDG → tarif classique', () => {
    const r = getApplicablePricing('15 Rue de Rivoli, 75001 Paris', 'Aéroport CDG Terminal 2, 95700 Roissy', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T48: Lyon→Lyon (69001→69003) → tarif ville Lyon', () => {
    const r = getApplicablePricing('Place des Terreaux, 69001 Lyon', 'Quai Perrache, 69003 Lyon', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Lyon');
  });

  it('T49: Lyon→Villeurbanne → tarif classique (villes différentes)', () => {
    const r = getApplicablePricing('Place Bellecour, 69001 Lyon', '10 Rue de la Gare, 69100 Villeurbanne', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T50: Orléans→Orléans (45000→45100) → tarif ville', () => {
    const r = getApplicablePricing('Place du Martroi, 45000 Orléans', 'Gare des Aubrais, 45100 Orléans', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Orléans');
  });

  it('T51: Marseille→Aix → tarif classique (villes différentes)', () => {
    const r = getApplicablePricing('Vieux-Port, 13001 Marseille', 'Cours Mirabeau, 13100 Aix-en-Provence', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T52: Bordeaux→Bordeaux → classique si PAS de tarif configuré', () => {
    const r = getApplicablePricing('Place de la Bourse, 33000 Bordeaux', 'Gare St-Jean, 33800 Bordeaux', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T53: Adresses sans code postal ni landmark → classique', () => {
    const r = getApplicablePricing('12 Rue des Lilas, Meaux', '5 Avenue Jean Jaurès, Chelles', driverPricings);
    expect(r.pricing_type).toBe('classic');
  });

  it('T54: Landmarks Paris → tarif ville', () => {
    const r = getApplicablePricing('Tour Eiffel, Paris', 'Arc de Triomphe, Paris', driverPricings);
    expect(r.pricing_type).toBe('city');
    expect(r.city_name).toBe('Paris');
  });
});
