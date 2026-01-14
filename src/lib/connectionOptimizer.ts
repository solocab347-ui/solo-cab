/**
 * Optimiseur de connexion robuste et auto-réparateur
 * Solution définitive contre les problèmes de connexion et latence
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/productionLogger";

// Configuration ROBUSTE pour réseaux variés (3G/4G/Wifi)
const CONNECTION_CONFIG = {
  // Timeouts généreux pour éviter les faux échecs
  AUTH_TIMEOUT: 15000, // 15s - connexion auth
  QUERY_TIMEOUT: 10000, // 10s - requêtes standard
  CRITICAL_QUERY_TIMEOUT: 20000, // 20s - requêtes critiques
  
  // Retry avec backoff exponentiel
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY: 500, // 500ms initial
  MAX_RETRY_DELAY: 5000, // 5s max
  
  // Vérification périodique
  PING_INTERVAL: 30000, // 30s
  HEALTH_CHECK_TIMEOUT: 5000, // 5s pour ping
  
  // Recovery
  RECOVERY_INTERVAL: 10000, // 10s entre tentatives de récupération
} as const;

export { CONNECTION_CONFIG };

// États de connexion
type ConnectionState = 'online' | 'offline' | 'slow' | 'recovering';

export interface ConnectionInfo {
  state: ConnectionState;
  lastSuccess: number;
  lastCheck: number;
  consecutiveFailures: number;
  averageLatency: number;
}

let connectionInfo: ConnectionInfo = {
  state: 'online',
  lastSuccess: Date.now(),
  lastCheck: Date.now(),
  consecutiveFailures: 0,
  averageLatency: 0,
};

// Listeners pour changements d'état
const stateListeners: Set<(info: ConnectionInfo) => void> = new Set();

/**
 * Récupère l'état de connexion actuel
 */
export function getConnectionState(): ConnectionInfo {
  return { ...connectionInfo };
}

/**
 * S'abonner aux changements d'état
 */
export function onConnectionChange(callback: (info: ConnectionInfo) => void): () => void {
  stateListeners.add(callback);
  return () => stateListeners.delete(callback);
}

/**
 * Met à jour l'état de connexion
 */
function updateConnectionState(success: boolean, latency?: number) {
  const now = Date.now();
  
  if (success) {
    connectionInfo = {
      state: latency && latency > 3000 ? 'slow' : 'online',
      lastSuccess: now,
      lastCheck: now,
      consecutiveFailures: 0,
      averageLatency: latency 
        ? (connectionInfo.averageLatency * 0.7 + latency * 0.3) 
        : connectionInfo.averageLatency,
    };
  } else {
    connectionInfo.consecutiveFailures++;
    connectionInfo.lastCheck = now;
    
    // Déterminer l'état basé sur les échecs consécutifs
    if (connectionInfo.consecutiveFailures >= 3) {
      connectionInfo.state = 'offline';
    } else if (connectionInfo.consecutiveFailures >= 1) {
      connectionInfo.state = 'recovering';
    }
  }
  
  // Notifier les listeners
  stateListeners.forEach(cb => {
    try {
      cb({ ...connectionInfo });
    } catch (e) {
      logger.error('Connection listener error', { error: e });
    }
  });
}

/**
 * Calcul du délai de retry avec backoff exponentiel + jitter
 */
function calculateRetryDelay(attempt: number): number {
  const baseDelay = CONNECTION_CONFIG.BASE_RETRY_DELAY;
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponentialDelay + jitter, CONNECTION_CONFIG.MAX_RETRY_DELAY);
}

/**
 * Requête optimisée avec retry intelligent et timeout
 */
export async function optimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    timeout?: number;
    retries?: number;
    context?: string;
    critical?: boolean;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { 
    timeout = options.critical 
      ? CONNECTION_CONFIG.CRITICAL_QUERY_TIMEOUT 
      : CONNECTION_CONFIG.QUERY_TIMEOUT, 
    retries = CONNECTION_CONFIG.MAX_RETRIES,
    context = 'query',
    critical = false,
  } = options;

  let lastError: any = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Race entre la requête et le timeout
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout: ${context} après ${timeout}ms`)), timeout)
        )
      ]);

      // Succès - mettre à jour l'état
      const latency = Date.now() - startTime;
      updateConnectionState(true, latency);
      
      if (result.error) {
        // Erreur métier, pas de retry
        return result;
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Erreurs non-retryables
      const nonRetryableErrors = ['PGRST301', 'JWT', '401', '403', '404'];
      const isNonRetryable = nonRetryableErrors.some(code => 
        error?.code?.includes(code) || 
        error?.message?.includes(code) ||
        error?.status === parseInt(code)
      );
      
      if (isNonRetryable) {
        logger.warn(`Non-retryable error in ${context}`, { error: error?.message });
        return { data: null, error };
      }

      // Si plus de retries disponibles
      if (attempt >= retries) {
        break;
      }

      // Attendre avant le prochain retry
      const delay = calculateRetryDelay(attempt);
      logger.info(`Retry ${attempt + 1}/${retries} for ${context} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Échec final
  updateConnectionState(false);
  logger.error(`Query failed after ${retries} retries: ${context}`, { error: lastError?.message });
  return { data: null, error: lastError };
}

/**
 * Précharge les données critiques pour réduire la latence perçue
 */
export async function prefetchCriticalData(userId: string): Promise<void> {
  if (!userId) return;

  const prefetchPromises = [
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("drivers").select("id, status, is_pioneer, is_fleet_driver, fleet_manager_id").eq("user_id", userId).maybeSingle(),
    supabase.from("clients").select("id, is_exclusive, driver_id").eq("user_id", userId).maybeSingle(),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
    updateConnectionState(true);
  } catch {
    // Échec silencieux
  }
}

/**
 * Ping léger pour vérifier la connexion
 */
export async function pingConnection(): Promise<{ connected: boolean; latency: number }> {
  const start = Date.now();
  
  try {
    const { error } = await Promise.race([
      supabase.from("profiles").select("id").limit(1),
      new Promise<{ error: Error }>((resolve) => 
        setTimeout(() => resolve({ error: new Error('Ping timeout') }), CONNECTION_CONFIG.HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    const latency = Date.now() - start;
    const connected = !error;
    
    updateConnectionState(connected, latency);
    
    return { connected, latency };
  } catch {
    updateConnectionState(false);
    return { connected: false, latency: -1 };
  }
}

/**
 * Gestionnaire de reconnexion automatique robuste
 */
class ConnectionRecovery {
  private isRecovering = false;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 5;
  private listeners: Set<(state: string) => void> = new Set();
  private recoveryTimer: NodeJS.Timeout | null = null;

  /**
   * Tente une récupération de connexion
   */
  async attemptRecovery(): Promise<boolean> {
    if (this.isRecovering) {
      logger.info('Recovery already in progress');
      return false;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;
    
    logger.info(`Connection recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);
    this.notifyListeners('recovering');

    try {
      // Étape 1: Vérifier la connectivité réseau
      if (!navigator.onLine) {
        logger.warn('Browser reports offline');
        this.notifyListeners('offline');
        return false;
      }

      // Étape 2: Vérifier la session Supabase
      const { data: { session }, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null }, error: Error }>((resolve) => 
          setTimeout(() => resolve({ 
            data: { session: null }, 
            error: new Error('Session check timeout') 
          }), 5000)
        )
      ]);

      if (sessionError) {
        logger.warn('Session check failed', { error: sessionError.message });
      }

      // Étape 3: Rafraîchir la session si nécessaire
      if (session) {
        const expiresAt = session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresAt - now < 600) { // Moins de 10 minutes
          logger.info('Refreshing session');
          const { error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            logger.warn('Session refresh failed', { error: refreshError.message });
          }
        }
      }

      // Étape 4: Ping pour vérifier la connexion
      const { connected, latency } = await pingConnection();
      
      if (connected) {
        logger.info('Connection recovered', { latency });
        this.recoveryAttempts = 0;
        this.notifyListeners('recovered');
        return true;
      }

      // Planifier une nouvelle tentative si pas trop d'échecs
      if (this.recoveryAttempts < this.maxRecoveryAttempts) {
        this.scheduleRecovery();
      } else {
        logger.error('Max recovery attempts reached');
        this.notifyListeners('failed');
      }

      return false;
    } catch (error) {
      logger.error('Recovery error', { error });
      this.notifyListeners('error');
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Planifie une tentative de récupération
   */
  private scheduleRecovery() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    const delay = CONNECTION_CONFIG.RECOVERY_INTERVAL * Math.min(this.recoveryAttempts, 3);
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, delay);
  }

  /**
   * S'abonner aux changements d'état de recovery
   */
  onStateChange(callback: (state: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(state: string) {
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        logger.error('Recovery listener error', { error: e });
      }
    });
  }

  /**
   * Réinitialise le compteur de tentatives
   */
  reset() {
    this.recoveryAttempts = 0;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}

export const connectionRecovery = new ConnectionRecovery();

// === Auto-recovery et monitoring ===

// Gestion des événements réseau
if (typeof window !== 'undefined') {
  // Récupération automatique quand le réseau revient
  window.addEventListener('online', () => {
    logger.info('Network online event');
    connectionRecovery.reset();
    setTimeout(() => connectionRecovery.attemptRecovery(), 1000);
  });

  window.addEventListener('offline', () => {
    logger.info('Network offline event');
    updateConnectionState(false);
  });

  // Récupération quand l'app revient en premier plan
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Vérifier la connexion après 500ms (laisser le temps au réseau)
      setTimeout(() => {
        if (connectionInfo.state !== 'online') {
          connectionRecovery.attemptRecovery();
        }
      }, 500);
    }
  });

  // Vérification périodique de la santé de la connexion
  setInterval(() => {
    const timeSinceLastSuccess = Date.now() - connectionInfo.lastSuccess;
    
    // Si plus de 2 minutes sans succès, tenter une récupération
    if (timeSinceLastSuccess > 120000 && connectionInfo.state !== 'recovering') {
      logger.info('Periodic health check triggered recovery');
      connectionRecovery.attemptRecovery();
    }
  }, CONNECTION_CONFIG.PING_INTERVAL);
}
