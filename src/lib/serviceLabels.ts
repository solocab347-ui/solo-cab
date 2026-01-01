// Service label translations for VTC services
export const serviceLabels: Record<string, string> = {
  'airport_transfer': 'Transferts aéroport',
  'business': 'Business',
  'long_distance': 'Longue distance',
  'wedding': 'Mariage',
  'sightseeing': 'Tourisme',
  'hourly': 'Mise à disposition',
  'shuttle': 'Navette',
  'medical': 'Transport médical',
  'event': 'Événementiel',
  'luxury': 'Luxe',
  'corporate': 'Entreprise',
  'night': 'Service de nuit',
  'vip': 'VIP',
};

export const getServiceLabel = (service: string): string => {
  return serviceLabels[service] || service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getServiceIcon = (service: string): string => {
  const serviceIcons: Record<string, string> = {
    'airport_transfer': '✈️',
    'business': '💼',
    'long_distance': '🛣️',
    'wedding': '💒',
    'sightseeing': '🏛️',
    'hourly': '⏱️',
    'shuttle': '🚐',
    'medical': '🏥',
    'event': '🎉',
    'luxury': '✨',
    'corporate': '🏢',
    'night': '🌙',
    'vip': '⭐',
  };
  return serviceIcons[service] || '🚗';
};
