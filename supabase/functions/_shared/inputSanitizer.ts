/**
 * Utilitaires de sanitization des inputs côté edge functions
 * Protection contre XSS, SQL injection, et inputs malveillants
 */

/**
 * Nettoie une chaîne de caractères en supprimant les balises HTML et caractères dangereux
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts
    .replace(/<[^>]*>/g, '') // Balises HTML
    .replace(/javascript:/gi, '') // Protocole javascript:
    .replace(/on\w+\s*=/gi, '') // Event handlers (onclick, onerror, etc.)
    .replace(/[<>'"]/g, '') // Caractères spéciaux
    .slice(0, 1000); // Limite de longueur
}

/**
 * Valide et nettoie un email
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const cleaned = email.trim().toLowerCase().slice(0, 255);
  
  // Validation basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    throw new Error('Format email invalide');
  }
  
  return cleaned;
}

/**
 * Valide et nettoie un numéro de téléphone
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Garde uniquement les chiffres, +, espaces et tirets
  return phone
    .trim()
    .replace(/[^0-9+\s-]/g, '')
    .slice(0, 20);
}

/**
 * Nettoie une adresse (garde plus de caractères qu'un string basique)
 */
export function sanitizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  
  return address
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, 500);
}
