/**
 * 🧭 SYSTÈME DE NAVIGATION GPS
 * Permet d'ouvrir des applications de navigation externes
 */

export type NavigationApp = 'google_maps' | 'waze' | 'apple_maps';

export interface NavigationDestination {
  address: string;
  latitude?: number;
  longitude?: number;
}

interface NavigationAppInfo {
  name: string;
  icon: string;
  available: boolean;
}

/**
 * Détecte les applications de navigation disponibles sur l'appareil
 */
export function getAvailableNavigationApps(): NavigationAppInfo[] {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  const apps: NavigationAppInfo[] = [
    {
      name: 'Google Maps',
      icon: '🗺️',
      available: true, // Toujours disponible via web
    },
    {
      name: 'Waze',
      icon: '🚗',
      available: true, // Toujours disponible via web
    },
  ];
  
  // Apple Plans uniquement sur iOS
  if (isIOS) {
    apps.push({
      name: 'Apple Plans',
      icon: '🍎',
      available: true,
    });
  }
  
  return apps;
}

/**
 * Génère l'URL de navigation pour une application donnée
 */
export function getNavigationUrl(
  app: NavigationApp,
  destination: NavigationDestination,
  origin?: NavigationDestination
): string {
  const destQuery = destination.latitude && destination.longitude
    ? `${destination.latitude},${destination.longitude}`
    : encodeURIComponent(destination.address);
    
  const originQuery = origin?.latitude && origin?.longitude
    ? `${origin.latitude},${origin.longitude}`
    : origin?.address
      ? encodeURIComponent(origin.address)
      : null;

  switch (app) {
    case 'google_maps':
      if (originQuery) {
        return `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=driving`;
      }
      return `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=driving`;
      
    case 'waze':
      if (destination.latitude && destination.longitude) {
        return `https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`;
      }
      return `https://waze.com/ul?q=${destQuery}&navigate=yes`;
      
    case 'apple_maps':
      if (destination.latitude && destination.longitude) {
        return `maps://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&dirflg=d`;
      }
      return `maps://maps.apple.com/?daddr=${destQuery}&dirflg=d`;
      
    default:
      return getNavigationUrl('google_maps', destination, origin);
  }
}

/**
 * Ouvre la navigation vers une destination
 */
export function openNavigation(
  app: NavigationApp,
  destination: NavigationDestination,
  origin?: NavigationDestination
): void {
  const url = getNavigationUrl(app, destination, origin);
  window.open(url, '_blank');
}

/**
 * Ouvre un sélecteur d'application de navigation
 */
export function getNavigationOptions(
  destination: NavigationDestination,
  origin?: NavigationDestination
): { name: string; icon: string; url: string; app: NavigationApp }[] {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  const options: { name: string; icon: string; url: string; app: NavigationApp }[] = [
    {
      name: 'Google Maps',
      icon: '🗺️',
      url: getNavigationUrl('google_maps', destination, origin),
      app: 'google_maps',
    },
    {
      name: 'Waze',
      icon: '🚗',
      url: getNavigationUrl('waze', destination, origin),
      app: 'waze',
    },
  ];
  
  if (isIOS) {
    options.push({
      name: 'Apple Plans',
      icon: '🍎',
      url: getNavigationUrl('apple_maps', destination, origin),
      app: 'apple_maps',
    });
  }
  
  return options;
}
