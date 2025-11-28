/**
 * SYSTÈME DE SANITIZATION DES INPUTS - SOLOCAB
 * Protection contre injections XSS, SQL, et autres attaques
 * Utilisé partout où il y a des inputs utilisateur
 */

import { logger } from './productionLogger';

/**
 * Sanitize une chaîne de caractères
 * Retire balises HTML, scripts, et caractères dangereux
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    // Retirer balises HTML/scripts
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    // Échapper caractères spéciaux HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Retirer caractères de contrôle
    .replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Sanitize un email
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const sanitized = sanitizeString(email).toLowerCase();
  
  // Validation basique format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    logger.warn('Format email invalide détecté', { email: sanitized });
    return '';
  }
  
  return sanitized;
}

/**
 * Sanitize un numéro de téléphone
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Garder seulement chiffres, +, espaces, tirets, parenthèses
  const sanitized = phone.replace(/[^0-9+\s\-()]/g, '').trim();
  
  // Validation longueur raisonnable (7-15 caractères)
  if (sanitized.length < 7 || sanitized.length > 20) {
    logger.warn('Format téléphone invalide', { phone: sanitized });
    return '';
  }
  
  return sanitized;
}

/**
 * Sanitize une adresse
 */
export function sanitizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  
  const sanitized = sanitizeString(address);
  
  // Limiter longueur
  if (sanitized.length > 500) {
    logger.warn('Adresse trop longue', { length: sanitized.length });
    return sanitized.substring(0, 500);
  }
  
  return sanitized;
}

/**
 * Sanitize un montant monétaire
 */
export function sanitizeAmount(amount: string | number | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  
  const parsed = typeof amount === 'number' ? amount : parseFloat(amount);
  
  if (isNaN(parsed)) {
    logger.warn('Montant invalide détecté', { amount });
    return 0;
  }
  
  // Arrondir à 2 décimales
  const rounded = Math.round(parsed * 100) / 100;
  
  // Validation: montant positif et raisonnable
  if (rounded < 0) {
    logger.warn('Montant négatif détecté', { amount: rounded });
    return 0;
  }
  
  if (rounded > 1000000) {
    logger.warn('Montant anormalement élevé', { amount: rounded });
  }
  
  return rounded;
}

/**
 * Sanitize un nombre entier
 */
export function sanitizeInteger(value: string | number | null | undefined, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (value === null || value === undefined) return min;
  
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);
  
  if (isNaN(parsed)) {
    logger.warn('Entier invalide détecté', { value });
    return min;
  }
  
  // Clamp entre min et max
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

/**
 * Sanitize une URL
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  const sanitized = sanitizeString(url);
  
  try {
    const parsed = new URL(sanitized);
    
    // Autoriser seulement http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      logger.warn('Protocole URL non autorisé', { protocol: parsed.protocol });
      return '';
    }
    
    return parsed.toString();
  } catch {
    logger.warn('URL invalide', { url: sanitized });
    return '';
  }
}

/**
 * Sanitize un nom de fichier
 */
export function sanitizeFileName(fileName: string | null | undefined): string {
  if (!fileName) return '';
  
  return fileName
    .trim()
    // Retirer caractères dangereux
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Limiter longueur
    .substring(0, 255);
}

/**
 * Sanitize un objet complet (récursif)
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value)
        ? value.map(item => typeof item === 'string' ? sanitizeString(item) : item)
        : sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validation et sanitization pour formulaire de course
 */
export interface SanitizedCourseData {
  pickupAddress: string;
  destinationAddress: string;
  scheduledDate: string;
  passengersCount: number;
  notes: string;
  promoCode: string;
}

export function sanitizeCourseData(data: Partial<SanitizedCourseData>): SanitizedCourseData {
  return {
    pickupAddress: sanitizeAddress(data.pickupAddress),
    destinationAddress: sanitizeAddress(data.destinationAddress),
    scheduledDate: data.scheduledDate || new Date().toISOString(),
    passengersCount: sanitizeInteger(data.passengersCount, 1, 20),
    notes: sanitizeString(data.notes).substring(0, 1000),
    promoCode: sanitizeString(data.promoCode).toUpperCase().substring(0, 50),
  };
}

/**
 * Validation et sanitization pour profil chauffeur
 */
export interface SanitizedDriverProfile {
  companyName: string;
  companyAddress: string;
  siret: string;
  siren: string;
  bio: string;
  serviceDescription: string;
  homeAddress: string;
}

export function sanitizeDriverProfile(data: Partial<SanitizedDriverProfile>): SanitizedDriverProfile {
  return {
    companyName: sanitizeString(data.companyName).substring(0, 200),
    companyAddress: sanitizeAddress(data.companyAddress),
    siret: sanitizeString(data.siret).replace(/[^0-9]/g, '').substring(0, 14),
    siren: sanitizeString(data.siren).replace(/[^0-9]/g, '').substring(0, 9),
    bio: sanitizeString(data.bio).substring(0, 500),
    serviceDescription: sanitizeString(data.serviceDescription).substring(0, 1000),
    homeAddress: sanitizeAddress(data.homeAddress),
  };
}