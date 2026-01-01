/**
 * Utility to extract only city and department from a full address
 * for privacy protection - never show full street address to partners
 */

// French department codes
const FRENCH_DEPARTMENTS: Record<string, string> = {
  '01': 'Ain',
  '02': 'Aisne',
  '03': 'Allier',
  '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes',
  '07': 'Ardèche',
  '08': 'Ardennes',
  '09': 'Ariège',
  '10': 'Aube',
  '11': 'Aude',
  '12': 'Aveyron',
  '13': 'Bouches-du-Rhône',
  '14': 'Calvados',
  '15': 'Cantal',
  '16': 'Charente',
  '17': 'Charente-Maritime',
  '18': 'Cher',
  '19': 'Corrèze',
  '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse',
  '21': 'Côte-d\'Or',
  '22': 'Côtes-d\'Armor',
  '23': 'Creuse',
  '24': 'Dordogne',
  '25': 'Doubs',
  '26': 'Drôme',
  '27': 'Eure',
  '28': 'Eure-et-Loir',
  '29': 'Finistère',
  '30': 'Gard',
  '31': 'Haute-Garonne',
  '32': 'Gers',
  '33': 'Gironde',
  '34': 'Hérault',
  '35': 'Ille-et-Vilaine',
  '36': 'Indre',
  '37': 'Indre-et-Loire',
  '38': 'Isère',
  '39': 'Jura',
  '40': 'Landes',
  '41': 'Loir-et-Cher',
  '42': 'Loire',
  '43': 'Haute-Loire',
  '44': 'Loire-Atlantique',
  '45': 'Loiret',
  '46': 'Lot',
  '47': 'Lot-et-Garonne',
  '48': 'Lozère',
  '49': 'Maine-et-Loire',
  '50': 'Manche',
  '51': 'Marne',
  '52': 'Haute-Marne',
  '53': 'Mayenne',
  '54': 'Meurthe-et-Moselle',
  '55': 'Meuse',
  '56': 'Morbihan',
  '57': 'Moselle',
  '58': 'Nièvre',
  '59': 'Nord',
  '60': 'Oise',
  '61': 'Orne',
  '62': 'Pas-de-Calais',
  '63': 'Puy-de-Dôme',
  '64': 'Pyrénées-Atlantiques',
  '65': 'Hautes-Pyrénées',
  '66': 'Pyrénées-Orientales',
  '67': 'Bas-Rhin',
  '68': 'Haut-Rhin',
  '69': 'Rhône',
  '70': 'Haute-Saône',
  '71': 'Saône-et-Loire',
  '72': 'Sarthe',
  '73': 'Savoie',
  '74': 'Haute-Savoie',
  '75': 'Paris',
  '76': 'Seine-Maritime',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '79': 'Deux-Sèvres',
  '80': 'Somme',
  '81': 'Tarn',
  '82': 'Tarn-et-Garonne',
  '83': 'Var',
  '84': 'Vaucluse',
  '85': 'Vendée',
  '86': 'Vienne',
  '87': 'Haute-Vienne',
  '88': 'Vosges',
  '89': 'Yonne',
  '90': 'Territoire de Belfort',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': 'Val-d\'Oise',
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'Guyane',
  '974': 'La Réunion',
  '976': 'Mayotte',
};

/**
 * Extract city and department from a full French address
 * Returns only city + department code for privacy
 */
export function extractCityDepartment(fullAddress: string | null | undefined): string | null {
  if (!fullAddress) return null;
  
  // Try to extract postal code (5 digits) and city
  const postalMatch = fullAddress.match(/(\d{5})\s+([^,]+)/);
  
  if (postalMatch) {
    const postalCode = postalMatch[1];
    const city = postalMatch[2].trim();
    
    // Get department code (first 2 or 3 digits for DOM-TOM)
    let deptCode = postalCode.substring(0, 2);
    if (deptCode === '97') {
      deptCode = postalCode.substring(0, 3);
    }
    
    const deptName = FRENCH_DEPARTMENTS[deptCode];
    
    if (deptName) {
      return `${city} (${deptCode})`;
    }
    return city;
  }
  
  // Try to match just city name from end of address
  const parts = fullAddress.split(',').map(p => p.trim());
  if (parts.length > 0) {
    // Get the last meaningful part that's not just "France"
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part && !part.toLowerCase().includes('france')) {
        // Try to extract city from postal code format
        const cityMatch = part.match(/(\d{5})?\s*(.+)/);
        if (cityMatch && cityMatch[2]) {
          return cityMatch[2].trim();
        }
        return part;
      }
    }
  }
  
  return null;
}

/**
 * Get department name from postal code or department code
 */
export function getDepartmentName(code: string): string | null {
  const deptCode = code.length >= 2 ? code.substring(0, 2) : code;
  return FRENCH_DEPARTMENTS[deptCode] || null;
}
