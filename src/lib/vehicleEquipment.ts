// Liste complète des équipements disponibles pour les véhicules
// Supporte les anciens IDs (audio, seats, etc.) et les nouveaux IDs (wifi, climatisation, etc.)
export const VEHICLE_EQUIPMENT = [
  // Anciens IDs (pour compatibilité)
  { id: "tv", label: "Écrans TV embarqués", icon: "📺" },
  { id: "audio", label: "Système audio premium", icon: "🎵" },
  { id: "seats", label: "Sièges confort cuir", icon: "💺" },
  { id: "climate", label: "Climatisation individuelle", icon: "❄️" },
  { id: "usb", label: "Chargeurs USB-C", icon: "🔌" },
  { id: "iphone", label: "Chargeur iPhone", icon: "📱" },
  { id: "water", label: "Bouteilles d'eau offertes", icon: "💧" },
  { id: "press", label: "Presse du jour", icon: "📰" },
  { id: "decor", label: "Thématiques décor", icon: "🎨" },
  { id: "candy", label: "Confiseries", icon: "🍬" },
  // Nouveaux IDs (format actuel)
  { id: "wifi", label: "WiFi gratuit", icon: "📶" },
  { id: "climatisation", label: "Climatisation individuelle", icon: "❄️" },
  { id: "chargeur_usb", label: "Chargeurs USB-C", icon: "🔌" },
  { id: "siege_bebe", label: "Siège bébé", icon: "👶" },
  { id: "eau_gratuite", label: "Bouteilles d'eau offertes", icon: "💧" },
  { id: "journaux", label: "Presse du jour", icon: "📰" },
  { id: "tablette", label: "Tablette à disposition", icon: "📱" },
  { id: "prise_220v", label: "Prise électrique 220V", icon: "🔋" },
  { id: "couverture", label: "Couverture", icon: "🛏️" },
  { id: "chargeur_iphone", label: "Chargeur iPhone", icon: "📱" },
  { id: "snacks", label: "Snacks offerts", icon: "🍪" },
  { id: "musique", label: "Musique personnalisée", icon: "🎵" },
];

// Liste complète des services proposés
// Supporte les anciens IDs (airport, long_distance, etc.) et les nouveaux IDs (transfert_aeroport, etc.)
export const DRIVER_SERVICES = [
  // Anciens IDs (pour compatibilité)
  { id: "airport", label: "Transfert aéroport", description: "Départ et arrivée ponctuel", icon: "✈️" },
  { id: "long_distance", label: "Trajets longue distance", description: "Voyages inter-villes", icon: "🗺️" },
  { id: "hourly", label: "Mise à disposition", description: "Service à la journée", icon: "⏰" },
  { id: "business", label: "Déplacements professionnels", description: "Pour vos rendez-vous", icon: "💼" },
  { id: "events", label: "Événements spéciaux", description: "Mariages, soirées", icon: "🎉" },
  { id: "shuttle", label: "Navette hôtel", description: "Service régulier", icon: "🏨" },
  { id: "themed", label: "Services thématiques", description: "Décorations personnalisées", icon: "🎭" },
  // Nouveaux IDs (format actuel)
  { id: "transfert_aeroport", label: "Transfert aéroport", description: "Départ et arrivée ponctuel", icon: "✈️" },
  { id: "trajet_longue_distance", label: "Trajets longue distance", description: "Voyages inter-villes", icon: "🗺️" },
  { id: "mise_a_disposition", label: "Mise à disposition", description: "Service à la journée", icon: "⏰" },
  { id: "deplacement_pro", label: "Déplacements professionnels", description: "Pour vos rendez-vous", icon: "💼" },
  { id: "evenement_pro", label: "Événements professionnels", description: "Séminaires, conférences", icon: "🎤" },
  { id: "evenement_special", label: "Événements spéciaux", description: "Mariages, soirées", icon: "🎉" },
  { id: "navette_hotel", label: "Navette hôtel", description: "Service régulier", icon: "🏨" },
  { id: "visite_touristique", label: "Visite touristique", description: "Découverte de la région", icon: "🏛️" },
  { id: "transport_medical", label: "Transport médical", description: "Accompagnement santé", icon: "🏥" },
  { id: "transport_enfants", label: "Transport d'enfants", description: "Avec siège adapté", icon: "👶" },
];
