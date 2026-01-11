/**
 * MODULE DE SÉCURITÉ CENTRALISÉ
 * Export de toutes les fonctionnalités de sécurité
 */

// Core security
export {
  logSecurityEvent,
  createSecurityAlert,
  getClientIP,
  isIPBlocked,
  checkLocalRateLimit,
  trackFailedLogin,
  resetFailedLoginCounter,
  SECURITY_THRESHOLDS,
  type SecurityEvent,
  type SecurityEventType,
  type AlertSeverity,
  type SecurityAlert,
} from './securityCore';

// Bot detection
export {
  generateBrowserFingerprint,
  detectBotIndicators,
  calculateRiskScore,
  analyzeAndReportBot,
  trackRequestPattern,
} from './botDetection';

// Security headers
export {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  buildCSPString,
  applySecurityMetaTags,
  isSecureContext,
  isInIframe,
  preventClickjacking,
  initClientSecurity,
} from './securityHeaders';
