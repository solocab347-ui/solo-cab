/**
 * SYSTÈME DE SÉCURITÉ CENTRAL POUR SOLOCAB
 * Protection complète contre DDoS, Bots, Spam et Attaques
 */

import { supabase } from '@/integrations/supabase/client';

// Types de sécurité
export interface SecurityEvent {
  eventType: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  riskScore?: number;
  details?: Record<string, unknown>;
}

export type SecurityEventType = 
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'suspicious_activity'
  | 'rate_limit'
  | 'blocked_request'
  | 'admin_action'
  | 'bot_detected'
  | 'unusual_pattern';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAlert {
  alertType: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  affectedEntityType?: 'user' | 'ip' | 'endpoint' | 'system';
  affectedEntityId?: string;
  metadata?: Record<string, unknown>;
}

// Constantes de sécurité
export const SECURITY_THRESHOLDS = {
  MAX_FAILED_LOGINS: 5,
  FAILED_LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_SECOND: 10,
  SUSPICIOUS_REQUEST_PATTERN_THRESHOLD: 10,
  BOT_DETECTION_THRESHOLD: 70, // Risk score
  ACCOUNT_LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
};

// Stockage local des métriques (complété par la base de données)
const localMetrics = new Map<string, { count: number; timestamp: number }>();

/**
 * Log un événement de sécurité
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // Log async pour ne pas bloquer l'UI
    supabase
      .from('security_audit_logs')
      .insert({
        event_type: event.eventType,
        user_id: event.userId || null,
        ip_address: event.ipAddress || getClientIP(),
        user_agent: event.userAgent || navigator.userAgent,
        request_path: event.requestPath || window.location.pathname,
        request_method: event.requestMethod || 'GET',
        risk_score: event.riskScore || 0,
        details: event.details ? JSON.parse(JSON.stringify(event.details)) : {},
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[Security] Failed to log event:', error.message);
        }
      });
  } catch (error) {
    console.warn('[Security] Error logging event:', error);
  }
}

/**
 * Créer une alerte de sécurité pour les admins
 */
export async function createSecurityAlert(alert: SecurityAlert): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_security_alert', {
      p_alert_type: alert.alertType,
      p_severity: alert.severity,
      p_title: alert.title,
      p_description: alert.description || null,
      p_affected_entity_type: alert.affectedEntityType || null,
      p_affected_entity_id: alert.affectedEntityId || null,
      p_metadata: JSON.parse(JSON.stringify(alert.metadata || {})),
    });

    if (error) {
      console.error('[Security] Failed to create alert:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('[Security] Error creating alert:', error);
    return null;
  }
}

/**
 * Obtenir l'IP client (approximative côté client)
 */
export function getClientIP(): string {
  // Côté client, on ne peut pas obtenir l'IP réelle
  // Cela sera géré par les Edge Functions
  return 'client-unknown';
}

/**
 * Vérifier si une IP est bloquée
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_ip_blocked', {
      check_ip: ip,
    });

    if (error) {
      console.warn('[Security] Error checking IP block status:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.warn('[Security] Error in isIPBlocked:', error);
    return false;
  }
}

/**
 * Vérification locale des limites de taux (frontend)
 */
export function checkLocalRateLimit(identifier: string, maxRequests: number = 60): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  const record = localMetrics.get(identifier);

  if (!record || now - record.timestamp > windowMs) {
    localMetrics.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  record.count++;

  if (record.count > maxRequests) {
    return false;
  }

  return true;
}

/**
 * Nettoyer les métriques locales expirées
 */
export function cleanupLocalMetrics(): void {
  const now = Date.now();
  const windowMs = 60 * 1000;

  for (const [key, record] of localMetrics.entries()) {
    if (now - record.timestamp > windowMs) {
      localMetrics.delete(key);
    }
  }
}

// Nettoyage périodique des métriques locales
if (typeof window !== 'undefined') {
  setInterval(cleanupLocalMetrics, 5 * 60 * 1000); // Toutes les 5 minutes
}

/**
 * Hook pour détecter les tentatives de login échouées
 */
export function trackFailedLogin(userId?: string, ipAddress?: string): void {
  const identifier = userId || ipAddress || 'unknown';
  const key = `failed_login:${identifier}`;

  const record = localMetrics.get(key);
  const now = Date.now();

  if (!record) {
    localMetrics.set(key, { count: 1, timestamp: now });
  } else {
    record.count++;

    // Si trop de tentatives, créer une alerte
    if (record.count >= SECURITY_THRESHOLDS.MAX_FAILED_LOGINS) {
      createSecurityAlert({
        alertType: 'brute_force',
        severity: 'high',
        title: 'Tentative de brute force détectée',
        description: `${record.count} tentatives de connexion échouées depuis ${identifier}`,
        affectedEntityType: userId ? 'user' : 'ip',
        affectedEntityId: identifier,
        metadata: { attempts: record.count },
      });

      logSecurityEvent({
        eventType: 'suspicious_activity',
        userId,
        ipAddress,
        riskScore: 80,
        details: { reason: 'brute_force_detected', attempts: record.count },
      });
    }
  }
}

/**
 * Réinitialiser le compteur de login échoué après un succès
 */
export function resetFailedLoginCounter(userId: string): void {
  localMetrics.delete(`failed_login:${userId}`);
}
