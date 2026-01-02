/**
 * Famous places and their abbreviations for intelligent address autocomplete
 * Maps common abbreviations and names to full addresses with coordinates
 */

export interface FamousPlace {
  keywords: string[]; // Keywords and abbreviations that trigger this place
  place_name: string; // Full display name
  address: string; // Complete address
  center: [number, number]; // [longitude, latitude]
}

export const FAMOUS_PLACES: FamousPlace[] = [
  // =====================================
  // AÉROPORT PARIS-CHARLES DE GAULLE (CDG)
  // =====================================
  {
    keywords: ["cdg", "charles de gaulle", "roissy", "aéroport cdg"],
    place_name: "Aéroport Paris-Charles de Gaulle",
    address: "Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.547778, 49.009722]
  },
  // Terminal 1
  {
    keywords: ["cdg t1", "cdg terminal 1", "charles de gaulle t1", "roissy t1", "terminal 1 cdg"],
    place_name: "CDG Terminal 1",
    address: "Terminal 1, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.521944, 49.016667]
  },
  // Terminal 2A
  {
    keywords: ["cdg 2a", "cdg t2a", "terminal 2a", "charles de gaulle 2a", "roissy 2a"],
    place_name: "CDG Terminal 2A",
    address: "Terminal 2A, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.551389, 49.004167]
  },
  // Terminal 2B
  {
    keywords: ["cdg 2b", "cdg t2b", "terminal 2b", "charles de gaulle 2b", "roissy 2b"],
    place_name: "CDG Terminal 2B",
    address: "Terminal 2B, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.555833, 49.003889]
  },
  // Terminal 2C
  {
    keywords: ["cdg 2c", "cdg t2c", "terminal 2c", "charles de gaulle 2c", "roissy 2c"],
    place_name: "CDG Terminal 2C",
    address: "Terminal 2C, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.561111, 49.003611]
  },
  // Terminal 2D
  {
    keywords: ["cdg 2d", "cdg t2d", "terminal 2d", "charles de gaulle 2d", "roissy 2d"],
    place_name: "CDG Terminal 2D",
    address: "Terminal 2D, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.565278, 49.003333]
  },
  // Terminal 2E
  {
    keywords: ["cdg 2e", "cdg t2e", "terminal 2e", "charles de gaulle 2e", "roissy 2e"],
    place_name: "CDG Terminal 2E",
    address: "Terminal 2E, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.570556, 49.008889]
  },
  // Terminal 2F
  {
    keywords: ["cdg 2f", "cdg t2f", "terminal 2f", "charles de gaulle 2f", "roissy 2f"],
    place_name: "CDG Terminal 2F",
    address: "Terminal 2F, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.560278, 49.008333]
  },
  // Terminal 2G
  {
    keywords: ["cdg 2g", "cdg t2g", "terminal 2g", "charles de gaulle 2g", "roissy 2g"],
    place_name: "CDG Terminal 2G",
    address: "Terminal 2G, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.576944, 48.997222]
  },
  // Terminal 3
  {
    keywords: ["cdg t3", "cdg terminal 3", "charles de gaulle t3", "roissy t3", "terminal 3 cdg"],
    place_name: "CDG Terminal 3",
    address: "Terminal 3, Aéroport Paris-Charles de Gaulle, 95700 Roissy-en-France",
    center: [2.509722, 49.003889]
  },

  // =====================================
  // AÉROPORT PARIS-ORLY (ORY)
  // =====================================
  {
    keywords: ["orly", "aéroport orly", "ory"],
    place_name: "Aéroport Paris-Orly",
    address: "Aéroport de Paris-Orly, 94390 Orly",
    center: [2.379444, 48.723333]
  },
  // Orly 1
  {
    keywords: ["orly 1", "ory 1", "terminal 1 orly", "orly terminal 1"],
    place_name: "Orly Terminal 1",
    address: "Terminal 1, Aéroport de Paris-Orly, 94390 Orly",
    center: [2.370556, 48.726111]
  },
  // Orly 2
  {
    keywords: ["orly 2", "ory 2", "terminal 2 orly", "orly terminal 2"],
    place_name: "Orly Terminal 2",
    address: "Terminal 2, Aéroport de Paris-Orly, 94390 Orly",
    center: [2.373611, 48.726667]
  },
  // Orly 3
  {
    keywords: ["orly 3", "ory 3", "terminal 3 orly", "orly terminal 3"],
    place_name: "Orly Terminal 3",
    address: "Terminal 3, Aéroport de Paris-Orly, 94390 Orly",
    center: [2.378889, 48.726944]
  },
  // Orly 4
  {
    keywords: ["orly 4", "ory 4", "terminal 4 orly", "orly terminal 4", "orly sud"],
    place_name: "Orly Terminal 4",
    address: "Terminal 4, Aéroport de Paris-Orly, 94390 Orly",
    center: [2.385833, 48.721111]
  },

  // =====================================
  // AUTRES AÉROPORTS
  // =====================================
  {
    keywords: ["le bourget", "bourget", "aéroport le bourget"],
    place_name: "Aéroport Paris-Le Bourget",
    address: "Aéroport de Paris-Le Bourget, 93350 Le Bourget",
    center: [2.441389, 48.969444]
  },
  {
    keywords: ["beauvais", "aéroport beauvais", "tillé"],
    place_name: "Aéroport de Beauvais-Tillé",
    address: "Aéroport de Beauvais-Tillé, 60000 Beauvais",
    center: [2.112778, 49.454444]
  },

  // Parcs d'attractions
  {
    keywords: ["disney", "disneyland", "disneyland paris", "parc disney", "eurodisney"],
    place_name: "Disneyland Paris",
    address: "Disneyland Paris, 77777 Marne-la-Vallée",
    center: [2.783333, 48.867222]
  },
  {
    keywords: ["asterix", "parc asterix", "parc astérix"],
    place_name: "Parc Astérix",
    address: "Parc Astérix, 60128 Plailly",
    center: [2.572222, 49.136111]
  },

  // Gares parisiennes
  {
    keywords: ["gare du nord", "nord"],
    place_name: "Gare du Nord",
    address: "Gare du Nord, 75010 Paris",
    center: [2.355833, 48.880833]
  },
  {
    keywords: ["gare de lyon", "lyon"],
    place_name: "Gare de Lyon",
    address: "Gare de Lyon, 75012 Paris",
    center: [2.373611, 48.844722]
  },
  {
    keywords: ["gare montparnasse", "montparnasse"],
    place_name: "Gare Montparnasse",
    address: "Gare Montparnasse, 75015 Paris",
    center: [2.321944, 48.840556]
  },
  {
    keywords: ["gare saint lazare", "saint lazare", "saint-lazare"],
    place_name: "Gare Saint-Lazare",
    address: "Gare Saint-Lazare, 75008 Paris",
    center: [2.325833, 48.876111]
  },
  {
    keywords: ["gare de l'est", "gare de l est", "est"],
    place_name: "Gare de l'Est",
    address: "Gare de l'Est, 75010 Paris",
    center: [2.359444, 48.876944]
  },
  {
    keywords: ["gare d'austerlitz", "gare d austerlitz", "austerlitz"],
    place_name: "Gare d'Austerlitz",
    address: "Gare d'Austerlitz, 75013 Paris",
    center: [2.365556, 48.842222]
  },
  {
    keywords: ["gare bercy", "bercy"],
    place_name: "Gare de Paris-Bercy",
    address: "Gare de Paris-Bercy, 75012 Paris",
    center: [2.382778, 48.840278]
  },

  // Monuments et lieux touristiques
  {
    keywords: ["tour eiffel", "eiffel"],
    place_name: "Tour Eiffel",
    address: "Tour Eiffel, Champ de Mars, 75007 Paris",
    center: [2.294444, 48.858333]
  },
  {
    keywords: ["arc de triomphe", "arc triomphe", "étoile"],
    place_name: "Arc de Triomphe",
    address: "Arc de Triomphe, Place Charles de Gaulle, 75008 Paris",
    center: [2.295, 48.873889]
  },
  {
    keywords: ["notre dame", "notre-dame", "cathédrale notre dame"],
    place_name: "Cathédrale Notre-Dame de Paris",
    address: "Cathédrale Notre-Dame, 75004 Paris",
    center: [2.35, 48.852968]
  },
  {
    keywords: ["sacré coeur", "sacré-coeur", "sacre coeur", "montmartre"],
    place_name: "Basilique du Sacré-Cœur",
    address: "Basilique du Sacré-Cœur, 75018 Paris",
    center: [2.343056, 48.886667]
  },
  {
    keywords: ["louvre", "musée du louvre"],
    place_name: "Musée du Louvre",
    address: "Musée du Louvre, 75001 Paris",
    center: [2.337222, 48.860833]
  },
  {
    keywords: ["versailles", "château de versailles", "chateau versailles"],
    place_name: "Château de Versailles",
    address: "Château de Versailles, 78000 Versailles",
    center: [2.120278, 48.804722]
  },
  {
    keywords: ["invalides", "hôtel des invalides"],
    place_name: "Hôtel des Invalides",
    address: "Hôtel des Invalides, 75007 Paris",
    center: [2.312778, 48.855556]
  },
  {
    keywords: ["panthéon", "pantheon"],
    place_name: "Panthéon",
    address: "Panthéon, 75005 Paris",
    center: [2.346111, 48.846111]
  },
  {
    keywords: ["opéra garnier", "opera garnier", "palais garnier"],
    place_name: "Opéra Garnier",
    address: "Opéra Garnier, 75009 Paris",
    center: [2.331944, 48.872222]
  },

  // Quartiers d'affaires
  {
    keywords: ["la défense", "defense", "grande arche"],
    place_name: "La Défense",
    address: "La Défense, 92400 Courbevoie",
    center: [2.238056, 48.892222]
  },
  {
    keywords: ["bercy village"],
    place_name: "Bercy Village",
    address: "Bercy Village, 75012 Paris",
    center: [2.385, 48.833333]
  },

  // Stades et salles de spectacle
  {
    keywords: ["stade de france", "saint denis"],
    place_name: "Stade de France",
    address: "Stade de France, 93216 Saint-Denis",
    center: [2.360278, 48.924444]
  },
  {
    keywords: ["parc des princes", "psg", "princes"],
    place_name: "Parc des Princes",
    address: "Parc des Princes, 75016 Paris",
    center: [2.253056, 48.841389]
  },
  {
    keywords: ["roland garros", "roland-garros"],
    place_name: "Stade Roland-Garros",
    address: "Stade Roland-Garros, 75016 Paris",
    center: [2.248889, 48.845833]
  },
  {
    keywords: ["accor arena", "bercy arena", "palais omnisports"],
    place_name: "Accor Arena",
    address: "Accor Arena, 75012 Paris",
    center: [2.378889, 48.838889]
  },
  {
    keywords: ["zenith", "zénith"],
    place_name: "Zénith Paris",
    address: "Zénith Paris, 75019 Paris",
    center: [2.392778, 48.893889]
  },

  // Centres commerciaux
  {
    keywords: ["val d'europe", "val d europe", "serris"],
    place_name: "Val d'Europe",
    address: "Val d'Europe, 77700 Serris",
    center: [2.782222, 48.853333]
  },
  {
    keywords: ["forum des halles", "les halles", "chatelet les halles"],
    place_name: "Forum des Halles",
    address: "Forum des Halles, 75001 Paris",
    center: [2.345833, 48.862222]
  },
  {
    keywords: ["quatre temps", "4 temps"],
    place_name: "Centre Commercial Les Quatre Temps",
    address: "Les Quatre Temps, 92800 Puteaux",
    center: [2.238611, 48.891667]
  },

  // Hôpitaux principaux
  {
    keywords: ["hopital necker", "hôpital necker", "necker"],
    place_name: "Hôpital Necker",
    address: "Hôpital Necker, 75015 Paris",
    center: [2.313889, 48.846111]
  },
  {
    keywords: ["hopital cochin", "hôpital cochin", "cochin"],
    place_name: "Hôpital Cochin",
    address: "Hôpital Cochin, 75014 Paris",
    center: [2.340278, 48.838333]
  },
  {
    keywords: ["pitie salpetriere", "pitié salpêtrière", "salpetriere"],
    place_name: "Hôpital Pitié-Salpêtrière",
    address: "Hôpital Pitié-Salpêtrière, 75013 Paris",
    center: [2.363889, 48.840278]
  },
  {
    keywords: ["hopital georges pompidou", "hôpital georges pompidou", "hegp"],
    place_name: "Hôpital Européen Georges-Pompidou",
    address: "Hôpital Georges-Pompidou, 75015 Paris",
    center: [2.278333, 48.840278]
  }
];

/**
 * Search for a famous place by keyword
 * @param query User input query
 * @returns Array of matching famous places
 */
export function searchFamousPlaces(query: string): FamousPlace[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return FAMOUS_PLACES.filter(place =>
    place.keywords.some(keyword => 
      keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)
    )
  ).slice(0, 5); // Limit to 5 results
}

/**
 * Convert FamousPlace to AddressSuggestion format
 */
export function famousPlaceToSuggestion(place: FamousPlace) {
  return {
    id: `famous-${place.place_name}`,
    place_name: place.place_name,
    center: place.center,
    text: place.address
  };
}
