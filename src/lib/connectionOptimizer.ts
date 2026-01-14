/**
 * Optimiseur de connexion - Réduit la latence et améliore la stabilité
 * Solutions systématiques pour éviter les problèmes de connexion récurrents
 */

import { supabase } from "@/integrations/supabase/client";

// Configuration des timeouts optimisés pour réseaux mobiles lents
const CONNECTION_CONFIG = {
  AUTH_TIMEOUT: 6000, // Timeout auth augmenté pour mobile 3G/4G lent
  QUERY_TIMEOUT: 3000, // Timeout queries réduit pour fail-fast
  REALTIME_RECONNECT_DELAY: 1000,
  MAX_RETRIES: 1, // Un seul retry pour éviter les blocages
  RETRY_DELAY: 300, // Délai court entre retries
  PING_INTERVAL: 20000, // Vérification connexion toutes les 20s
} as const;

export { CONNECTION_CONFIG };

// État de connexion global
let connectionState: 'online' | 'offline' | 'unstable' = 'online';
let lastSuccessfulRequest = Date.now();

/**
 * Vérifie l'état de la connexion
 */
export function getConnectionState() {
  return {
    state: connectionState,
    lastSuccess: lastSuccessfulRequest,
    isHealthy: Date.now() - lastSuccessfulRequest < 30000, // 30s
  };
}

/**
 * Met à jour l'état de connexion après une requête
 */
export function updateConnectionState(success: boolean) {
  if (success) {
    connectionState = 'online';
    lastSuccessfulRequest = Date.now();
  } else {
    const timeSinceLastSuccess = Date.now() - lastSuccessfulRequest;
    connectionState = timeSinceLastSuccess > 10000 ? 'offline' : 'unstable';
  }
}

/**
 * Requête optimisée avec timeout et retry
 */
export async function optimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    timeout?: number;
    retries?: number;
    context?: string;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { 
    timeout = CONNECTION_CONFIG.QUERY_TIMEOUT, 
    retries = CONNECTION_CONFIG.MAX_RETRIES,
    context = 'query'
  } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Race entre la requête et le timeout
      const result = await Promise.race([
        queryFn(),
        new Promise<{ data: null; error: { message: string } }>((_, reject) => 
          setTimeout(() => reject({ message: `Timeout: ${context} (${timeout}ms)` }), timeout)
        )
      ]);

      updateConnectionState(true);
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Ne pas retry pour certaines erreurs
      if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        updateConnectionState(false);
        return { data: null, error };
      }

      if (attempt < retries) {
        await new Promise(resolve => 
          setTimeout(resolve, CONNECTION_CONFIG.RETRY_DELAY * (attempt + 1))
        );
      }
    }
  }

  updateConnectionState(false);
  return { data: null, error: lastError };
}

/**
 * Précharge les données critiques pour réduire la latence perçue
 */
export async function prefetchCriticalData(userId: string) {
  if (!userId) return;

  // Précharger en parallèle les données essentielles
  const prefetchPromises = [
    // Rôles utilisateur
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
    
    // Profil driver (si applicable)
    supabase
      .from("drivers")
      .select("id, status, is_pioneer, is_fleet_driver")
      .eq("user_id", userId)
      .maybeSingle(),
    
    // Profil client (si applicable)
    supabase
      .from("clients")
      .select("id, is_exclusive")
      .eq("user_id", userId)
      .maybeSingle(),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
    updateConnectionState(true);
  } catch {
    // Échec silencieux - les données seront chargées plus tard
  }
}

/**
 * Ping léger pour vérifier la connexion
 */
export async function pingConnection(): Promise<boolean> {
  try {
    const start = Date.now();
    const { error } = await supabase.from("user_roles").select("role").limit(1);
    const latency = Date.now() - start;
    
    if (!error) {
      updateConnectionState(true);
      return latency < 2000; // Connexion stable si < 2s
    }
    return false;
  } catch {
    updateConnectionState(false);
    return false;
  }
}

/**
 * Gestionnaire de reconnexion automatique
 */
class ConnectionRecovery {
  private isRecovering = false;
  private listeners: Set<(state: string) => void> = new Set();

  async attemptRecovery(): Promise<boolean> {
    if (this.isRecovering) return false;
    this.isRecovering = true;

    try {
      // Vérifier la session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        this.notifyListeners('no_session');
        return false;
      }

      // Tenter de rafraîchir la session si proche de l'expiration
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt - now < 300) { // Moins de 5 minutes
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          this.notifyListeners('refresh_failed');
          return false;
        }
      }

      // Ping pour vérifier la connexion
      const isConnected = await pingConnection();
      
      if (isConnected) {
        this.notifyListeners('recovered');
        return true;
      }

      this.notifyListeners('still_offline');
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  onStateChange(callback: (state: string) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(state: string) {
    this.listeners.forEach(cb => cb(state));
  }
}

export const connectionRecovery = new ConnectionRecovery();

// Auto-recovery en cas de reconnexion réseau
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => connectionRecovery.attemptRecovery(), 1000);
  });

  // Vérification périodique si connexion instable
  setInterval(() => {
    if (connectionState === 'unstable' || connectionState === 'offline') {
      connectionRecovery.attemptRecovery();
    }
  }, 30000);
}
