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
  // Timeouts généreux pour connexions mobiles
  QUICK_TIMEOUT: 8000,      // 8s pour opérations rapides
  AUTH_TIMEOUT: 20000,      // 20s max pour auth (DB peut être lente sur Pico)
  DATA_TIMEOUT: 10000,      // 10s pour données additionnelles
  
  // Cache
  CACHE_KEY: 'solocab_auth_cache',
  CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 jours
  
  // Retries - réduits pour éviter de surcharger la DB
  MAX_RETRIES: 1,           // 1 seul retry pour ne pas surcharger
  RETRY_DELAY: 1000,        // 1s entre retries
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

// === ROLE EXTRACTION — MUST MATCH useAuth.tsx priority ===
function extractPrimaryRole(roles: string[]): string | null {
  // Priority: admin > driver > client (same as useAuth.tsx)
  if (roles.includes("admin")) return "admin";
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
    
    // Save cache ONLY if we got a valid role from DB
    if (primaryRole) {
      saveAuthCache({
        user,
        role: primaryRole,
        roles,
        isEmployee,
        timestamp: Date.now(),
        sessionExpiry: session.expires_at,
      });
    }
    
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

  // Validation utilisateur en arrière-plan SEULEMENT.
  // On ne purge JAMAIS la session locale ici : seul un signOut explicite
  // (clic utilisateur sur "Déconnexion") peut fermer la session.
  // Cela évite les déconnexions intempestives sur réseau lent / mobile en veille.
  const userValidation = await withTimeout(
    supabase.auth.getUser(),
    5000,
    { data: { user: null }, error: { message: 'validation_timeout' } as any }
  );

  // Cas STRICT : token explicitement révoqué côté serveur (compte supprimé/banni).
  // On ne purge QUE si Supabase répond clairement "user introuvable / token invalide".
  // Un timeout réseau n'est PAS un motif de déconnexion.
  const errMsg = userValidation.error?.message?.toLowerCase() || '';
  const isExplicitInvalid =
    !userValidation.error?.message?.includes('validation_timeout') &&
    (errMsg.includes('user not found') ||
      errMsg.includes('invalid jwt') ||
      errMsg.includes('jwt expired') ||
      errMsg.includes('not authenticated'));

  if (isExplicitInvalid) {
    logger.warn('Auth token explicitly revoked by server, clearing local session', {
      error: userValidation.error?.message,
    });
    clearAuthCache();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore local cleanup errors
    }
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
  
  // Only save cache if we got a valid role
  if (primaryRole) {
    saveAuthCache({
      user,
      role: primaryRole,
      roles,
      isEmployee,
      timestamp: Date.now(),
      sessionExpiry: session.expires_at,
    });
  }
  
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
    
    // Only update cache if we got valid roles from DB
    if (roles.length > 0 && primaryRole) {
      const cached = getAuthCache();
      if (cached && cached.user.id === userId) {
        saveAuthCache({
          ...cached,
          role: primaryRole,
          roles,
          isEmployee,
          timestamp: Date.now(),
        });
      }
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
/**
 * Détermine le chemin de navigation pour un utilisateur après connexion.
 * 
 * RÈGLES D'ACCÈS CHAUFFEUR (par ordre de priorité) :
 * 1. Accès gratuit administratif (free_access_granted + type unlimited/administrative) = TOUJOURS accès
 * 2. Accès gratuit temporaire avec date future = accès
 * 3. Abonnement payé (subscription_paid = true) = accès
 * 4. Essai pionnier actif (30 jours depuis création) = accès
 * 5. Sinon = redirection paiement
 */
export function getNavigationPath(
  role: string | null,
  isEmployee: boolean,
  driverData?: { 
    is_fleet_driver?: boolean; 
    fleet_manager_id?: string; 
    is_pioneer?: boolean; 
    stripe_customer_id?: string;
    free_access_granted?: boolean;
    free_access_type?: string;
    free_access_end_date?: string;
    subscription_paid?: boolean;
    subscription_status?: string;
    created_at?: string;
  }
): string {
  if (!role) return "/login";
  
  switch (role) {
    case "admin":
      return "/admin-dashboard";
    case "fleet_manager":
      return "/fleet-dashboard";
    case "company":
      return "/company-dashboard";
    case "driver":
      // MODÈLE FREEMIUM: Tous les chauffeurs validés accèdent au dashboard
      // Le gating premium se fait à l'intérieur du dashboard, pas à la navigation
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
