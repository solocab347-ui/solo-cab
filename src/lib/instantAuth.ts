/**
 * Système d'authentification INSTANTANÉE
 * Élimine définitivement les latences de connexion
 * 
 * Stratégie:
 * 1. Cache local de la dernière session valide
 * 2. Affichage instantané avec données en cache
 * 3. Validation asynchrone en arrière-plan
 * 4. Timeout ultra-court avec fallback gracieux
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/productionLogger";
import { Session, User } from "@supabase/supabase-js";

// === CONFIGURATION OPTIMISÉE ===
const INSTANT_AUTH_CONFIG = {
  // Timeouts ultra-courts pour UX fluide
  QUICK_TIMEOUT: 3000,      // 3s pour opérations rapides
  AUTH_TIMEOUT: 8000,       // 8s max pour auth (réduit de 15s)
  DATA_TIMEOUT: 4000,       // 4s pour données additionnelles
  
  // Cache
  CACHE_KEY: 'solocab_auth_cache',
  CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 jours
  
  // Retries optimisés
  MAX_RETRIES: 2,           // Moins de retries pour éviter l'attente
  RETRY_DELAY: 300,         // 300ms entre retries
} as const;

// === TYPES ===
interface CachedAuth {
  user: User;
  role: string;
  roles: string[];
  isEmployee: boolean;
  timestamp: number;
  sessionExpiry?: number;
}

interface AuthResult {
  success: boolean;
  user: User | null;
  session: Session | null;
  role: string | null;
  roles: string[];
  isEmployee: boolean;
  error?: string;
  fromCache?: boolean;
}

// === CACHE MANAGEMENT ===
function saveAuthCache(data: CachedAuth): void {
  try {
    localStorage.setItem(INSTANT_AUTH_CONFIG.CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    logger.warn('Failed to save auth cache', { error: e });
  }
}

function getAuthCache(): CachedAuth | null {
  try {
    const cached = localStorage.getItem(INSTANT_AUTH_CONFIG.CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedAuth = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    
    // Cache valide si moins de 7 jours
    if (age < INSTANT_AUTH_CONFIG.CACHE_DURATION) {
      return data;
    }
    
    // Nettoyer le cache expiré
    localStorage.removeItem(INSTANT_AUTH_CONFIG.CACHE_KEY);
    return null;
  } catch (e) {
    return null;
  }
}

function clearAuthCache(): void {
  try {
    localStorage.removeItem(INSTANT_AUTH_CONFIG.CACHE_KEY);
  } catch (e) {
    // Ignore
  }
}

// === HELPER: Timeout Promise ===
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

// === HELPER: Retry with quick backoff ===
async function quickRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = INSTANT_AUTH_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await new Promise(r => setTimeout(r, INSTANT_AUTH_CONFIG.RETRY_DELAY * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// === ROLE EXTRACTION ===
function extractPrimaryRole(roles: string[]): string | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("fleet_manager")) return "fleet_manager";
  if (roles.includes("company")) return "company";
  if (roles.includes("driver")) return "driver";
  if (roles.includes("client")) return "client";
  return null;
}

// === MAIN: INSTANT SIGN IN ===
export async function instantSignIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const startTime = Date.now();
  
  try {
    // Étape 1: Authentification avec timeout court
    const authPromise = quickRetry(() => supabase.auth.signInWithPassword({ email, password }));
    const authResult = await withTimeout(
      authPromise,
      INSTANT_AUTH_CONFIG.AUTH_TIMEOUT,
      { data: { user: null, session: null }, error: { message: 'Timeout', code: 'timeout' } as any }
    );
    
    if (authResult.error || !authResult.data.user || !authResult.data.session) {
      const errorMsg = authResult.error?.message || 'Identifiants invalides';
      logger.warn('Auth failed', { error: errorMsg, duration: Date.now() - startTime });
      
      return {
        success: false,
        user: null,
        session: null,
        role: null,
        roles: [],
        isEmployee: false,
        error: errorMsg.includes('Invalid') ? 'Email ou mot de passe incorrect' : errorMsg,
      };
    }
    
    const user = authResult.data.user;
    const session = authResult.data.session;
    const userId = user.id;
    
    // Étape 2: Récupérer les données utilisateur EN PARALLÈLE avec timeout court
    const fetchRoles = async () => {
      const result = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return result;
    };
    const fetchEmployee = async () => {
      const result = await supabase.from("company_employees").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
      return result;
    };
    
    const [rolesResult, employeeResult] = await Promise.all([
      withTimeout(fetchRoles(), INSTANT_AUTH_CONFIG.DATA_TIMEOUT, { data: null, error: null, count: null, status: 408, statusText: 'Timeout' } as any),
      withTimeout(fetchEmployee(), INSTANT_AUTH_CONFIG.DATA_TIMEOUT, { data: null, error: null, count: null, status: 408, statusText: 'Timeout' } as any),
    ]);
    
    const roles = (rolesResult?.data as any[])?.map(r => r.role) || [];
    const primaryRole = extractPrimaryRole(roles);
    const isEmployee = !!employeeResult?.data;
    
    // Sauvegarder dans le cache pour connexions futures instantanées
    saveAuthCache({
      user,
      role: primaryRole || 'client',
      roles,
      isEmployee,
      timestamp: Date.now(),
      sessionExpiry: session.expires_at,
    });
    
    logger.info('Instant sign in success', { 
      duration: Date.now() - startTime,
      role: primaryRole,
      isEmployee,
    });
    
    return {
      success: true,
      user,
      session,
      role: primaryRole,
      roles,
      isEmployee,
    };
    
  } catch (error: any) {
    logger.error('Instant sign in error', { error: error?.message });
    
    return {
      success: false,
      user: null,
      session: null,
      role: null,
      roles: [],
      isEmployee: false,
      error: error?.message?.includes('timeout') || error?.message?.includes('Timeout')
        ? 'Connexion lente - réessayez'
        : 'Erreur de connexion',
    };
  }
}

// === MAIN: INSTANT SESSION CHECK ===
export async function instantGetSession(): Promise<AuthResult> {
  const startTime = Date.now();
  
  // Étape 1: Vérifier le cache pour affichage instantané
  const cached = getAuthCache();
  
  // Étape 2: Récupérer la session Supabase avec timeout court
  const sessionResult = await withTimeout(
    supabase.auth.getSession(),
    INSTANT_AUTH_CONFIG.QUICK_TIMEOUT,
    { data: { session: null }, error: null }
  );
  
  const session = sessionResult.data.session;
  
  // Pas de session = déconnecté
  if (!session?.user) {
    clearAuthCache();
    return {
      success: true,
      user: null,
      session: null,
      role: null,
      roles: [],
      isEmployee: false,
    };
  }
  
  const user = session.user;
  const userId = user.id;
  
  // Si cache valide et même utilisateur, utiliser le cache
  if (cached && cached.user.id === userId) {
    logger.info('Using cached auth data', { 
      duration: Date.now() - startTime,
      cacheAge: Date.now() - cached.timestamp,
    });
    
    // Rafraîchir le cache en arrière-plan (fire-and-forget)
    refreshCacheInBackground(userId);
    
    return {
      success: true,
      user,
      session,
      role: cached.role,
      roles: cached.roles,
      isEmployee: cached.isEmployee,
      fromCache: true,
    };
  }
  
  // Pas de cache valide, récupérer les données fraîches
  const fetchRoles = async () => {
    const result = await supabase.from("user_roles").select("role").eq("user_id", userId);
    return result;
  };
  const fetchEmployee = async () => {
    const result = await supabase.from("company_employees").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
    return result;
  };
  
  const [rolesResult, employeeResult] = await Promise.all([
    withTimeout(fetchRoles(), INSTANT_AUTH_CONFIG.DATA_TIMEOUT, { data: null, error: null, count: null, status: 408, statusText: 'Timeout' } as any),
    withTimeout(fetchEmployee(), INSTANT_AUTH_CONFIG.DATA_TIMEOUT, { data: null, error: null, count: null, status: 408, statusText: 'Timeout' } as any),
  ]);
  
  const roles = (rolesResult?.data as any[])?.map(r => r.role) || [];
  const primaryRole = extractPrimaryRole(roles);
  const isEmployee = !!employeeResult?.data;
  
  // Mettre à jour le cache
  saveAuthCache({
    user,
    role: primaryRole || 'client',
    roles,
    isEmployee,
    timestamp: Date.now(),
    sessionExpiry: session.expires_at,
  });
  
  logger.info('Fresh auth data fetched', { 
    duration: Date.now() - startTime,
    role: primaryRole,
  });
  
  return {
    success: true,
    user,
    session,
    role: primaryRole,
    roles,
    isEmployee,
  };
}

// === BACKGROUND CACHE REFRESH ===
async function refreshCacheInBackground(userId: string): Promise<void> {
  try {
    const rolesPromise = supabase.from("user_roles").select("role").eq("user_id", userId);
    const employeePromise = supabase.from("company_employees").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
    
    const [rolesResult, employeeResult] = await Promise.all([
      rolesPromise,
      employeePromise,
    ]);
    
    const roles = (rolesResult?.data as any[])?.map(r => r.role) || [];
    const primaryRole = extractPrimaryRole(roles);
    const isEmployee = !!employeeResult?.data;
    
    const cached = getAuthCache();
    if (cached && cached.user.id === userId) {
      saveAuthCache({
        ...cached,
        role: primaryRole || cached.role,
        roles: roles.length > 0 ? roles : cached.roles,
        isEmployee,
        timestamp: Date.now(),
      });
    }
  } catch (e) {
    // Échec silencieux - le cache reste valide
  }
}

// === INSTANT SIGN OUT ===
export async function instantSignOut(): Promise<void> {
  clearAuthCache();
  
  try {
    await withTimeout(
      supabase.auth.signOut(),
      INSTANT_AUTH_CONFIG.QUICK_TIMEOUT,
      undefined
    );
  } catch (e) {
    // Ignore - cache déjà nettoyé
  }
}

// === NAVIGATION HELPER ===
export function getNavigationPath(
  role: string | null,
  isEmployee: boolean,
  driverData?: { 
    is_fleet_driver?: boolean; 
    fleet_manager_id?: string; 
    is_pioneer?: boolean; 
    stripe_customer_id?: string;
    free_access_granted?: boolean;
    free_access_end_date?: string;
    subscription_paid?: boolean;
    created_at?: string;
  }
): string {
  if (!role) return "/client-dashboard";
  
  switch (role) {
    case "admin":
      return "/admin-dashboard";
    case "fleet_manager":
      return "/fleet-dashboard";
    case "company":
      return "/company-dashboard";
    case "driver":
      // Pionniers: vérifier l'accès
      if (driverData?.is_pioneer) {
        // Accès gratuit permanent (admin) - toujours accès
        // Accès gratuit permanent : soit pas de date de fin (illimité), soit date future
        const hasPermanentFreeAccess = driverData.free_access_granted === true && 
          (!driverData.free_access_end_date || new Date(driverData.free_access_end_date) > new Date());
        
        if (hasPermanentFreeAccess) {
          return driverData.is_fleet_driver && driverData.fleet_manager_id 
            ? "/fleet-driver-dashboard" 
            : "/driver-dashboard";
        }
        
        // Abonnement payé
        if (driverData.subscription_paid === true) {
          return driverData.is_fleet_driver && driverData.fleet_manager_id 
            ? "/fleet-driver-dashboard" 
            : "/driver-dashboard";
        }
        
        // Essai pionnier encore actif (30 jours depuis création)
        if (driverData.created_at) {
          const createdAt = new Date(driverData.created_at);
          const pioneerTrialEnd = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (new Date() < pioneerTrialEnd) {
            return driverData.is_fleet_driver && driverData.fleet_manager_id 
              ? "/fleet-driver-dashboard" 
              : "/driver-dashboard";
          }
        }
        
        // Sinon, paiement requis
        return "/pioneer-payment";
      }
      if (driverData?.is_fleet_driver && driverData?.fleet_manager_id) {
        return "/fleet-driver-dashboard";
      }
      return "/driver-dashboard";
    case "client":
      return isEmployee ? "/company-employee-dashboard" : "/client-dashboard";
    default:
      return "/client-dashboard";
  }
}

export { INSTANT_AUTH_CONFIG, clearAuthCache };
