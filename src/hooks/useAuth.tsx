import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logger } from "@/lib/productionLogger";

type UserRole = "admin" | "driver" | "client" | "company" | "fleet_manager" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  userRoles: string[];
  isCompanyEmployee: boolean;
  isCompanyEmployeeChecked: boolean; // CRITIQUE: indique si la vérification est terminée
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: "driver" | "client", additionalData?: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isCompanyEmployee, setIsCompanyEmployee] = useState(false);
  const [isCompanyEmployeeChecked, setIsCompanyEmployeeChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  // Fonction pour vérifier si c'est un employé d'entreprise
  const checkIsCompanyEmployee = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("company_employees")
        .select("id, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      
      const isEmployee = !!data;
      setIsCompanyEmployee(isEmployee);
      setIsCompanyEmployeeChecked(true); // CRITIQUE: marquer comme vérifié
      return isEmployee;
    } catch (error) {
      logger.error("Error checking company employee", { error });
      setIsCompanyEmployee(false);
      setIsCompanyEmployeeChecked(true); // CRITIQUE: marquer comme vérifié même en cas d'erreur
      return false;
    }
  };

  // Fonction simple pour récupérer le rôle - SANS CACHE
  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      
      const roles = data?.map((r) => r.role) || [];
      
      // Set primary role (priority: admin > fleet_manager > company > driver > client)
      const primaryRole: UserRole = roles.includes("admin") 
        ? "admin" 
        : roles.includes("fleet_manager")
        ? "fleet_manager"
        : roles.includes("company")
        ? "company"
        : roles.includes("driver")
        ? "driver"
        : roles.includes("client")
        ? "client"
        : null;
      
      setUserRoles(roles);
      setUserRole(primaryRole);
      
      // Si le rôle principal est client, vérifier s'il est employé d'entreprise
      if (primaryRole === "client") {
        await checkIsCompanyEmployee(userId);
      } else {
        setIsCompanyEmployee(false);
        setIsCompanyEmployeeChecked(true); // Non-client = pas besoin de vérification
      }
      
      return primaryRole;
    } catch (error) {
      logger.error("Error fetching user role", { error });
      setUserRoles([]);
      setUserRole(null);
      setIsCompanyEmployee(false);
      setIsCompanyEmployeeChecked(true); // Marquer comme vérifié même en erreur
      return null;
    }
  };

  // Fonction publique pour forcer le rafraîchissement du rôle
  const refreshRole = async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutCleared = false;
    let refreshRetryCount = 0;
    let isInitializing = true; // Flag pour ignorer les événements pendant l'init
    const MAX_REFRESH_RETRIES = 2; // Réduit de 3 à 2 pour accélérer

    // TIMEOUT DE SÉCURITÉ ULTRA-RAPIDE: 2 secondes MAX pour éviter les blocages
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !timeoutCleared) {
        logger.warn("SAFETY TIMEOUT - forcing loading to false after 2s");
        isInitializing = false;
        setLoading(false);
      }
    }, 2000); // Réduit de 3s à 2s

    // Fonction pour gérer l'échec du refresh token avec retry RAPIDE
    const handleRefreshFailure = async () => {
      refreshRetryCount++;
      
      if (refreshRetryCount <= MAX_REFRESH_RETRIES) {
        // Backoff plus rapide: 500ms, puis 1s max
        const backoffDelay = Math.min(500 * refreshRetryCount, 1000);
        logger.warn(`Refresh token failed, retry ${refreshRetryCount}/${MAX_REFRESH_RETRIES}`, { backoffDelay });
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (!error && data.session) {
            logger.info("Session refreshed successfully on retry");
            refreshRetryCount = 0;
            return true;
          }
        } catch (retryError) {
          logger.error("Retry failed", { retryError });
        }
        
        return await handleRefreshFailure();
      } else {
        logger.error("Max refresh retries reached, clearing session");
        setUser(null);
        setSession(null);
        setUserRole(null);
        setUserRoles([]);
        localStorage.removeItem('sb-iyothopplhbwcfrpxryc-auth-token');
        toast.error("Session expirée, veuillez vous reconnecter");
        navigate("/login");
        return false;
      }
    };

    // Auth state listener - IGNORE les événements pendant l'initialisation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // IGNORER les événements pendant l'init pour éviter les doubles mises à jour
        if (isInitializing && (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
          logger.info("Auth event ignored during init", { event });
          return;
        }
        
        logger.info("Auth event processing", { event });
        
        // Gestion spécifique de l'erreur de refresh token
        if (event === "TOKEN_REFRESHED" && !session) {
          logger.warn("Token refresh failed, attempting recovery");
          setTimeout(() => handleRefreshFailure(), 0);
          return;
        }
        
        // Gestion de l'expiration de session
        if (event === "SIGNED_OUT") {
          logger.info("User signed out");
          setUser(null);
          setSession(null);
          setUserRole(null);
          setUserRoles([]);
          return;
        }
        
        // Reset retry counter on successful auth events
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          refreshRetryCount = 0;
        }
        
        // Mise à jour synchrone uniquement pour SIGNED_IN post-init
        if (event === "SIGNED_IN" && !isInitializing) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setTimeout(() => {
              fetchUserRole(session.user.id).catch(err => {
                logger.error("Role fetch failed", { err });
              });
            }, 0);
          }
        }
      }
    );

    // Init ULTRA-RAPIDE avec timeout par requête
    const initAuth = async () => {
      try {
        // Timeout rapide pour getSession
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 1500) // 1.5s max
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!isMounted) return;
        
        logger.info("Session init", { found: !!session });
        
        // Batch state updates pour éviter les re-renders multiples
        if (session?.user) {
          // Récupérer TOUTES les données en PARALLÈLE avec timeout
          const dataTimeout = 1500; // 1.5s max par requête
          
          const [rolesResult, employeeResult] = await Promise.all([
            Promise.race([
              supabase.from("user_roles").select("role").eq("user_id", session.user.id),
              new Promise<{ data: null; error: null }>((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), dataTimeout)
              )
            ]),
            Promise.race([
              supabase.from("company_employees").select("id, is_active").eq("user_id", session.user.id).eq("is_active", true).maybeSingle(),
              new Promise<{ data: null; error: null }>((resolve) => 
                setTimeout(() => resolve({ data: null, error: null }), dataTimeout)
              )
            ])
          ]);
          
          const roles = (rolesResult?.data as any[])?.map((r: any) => r.role) || [];
          const primaryRole: UserRole = roles.includes("admin") 
            ? "admin" 
            : roles.includes("fleet_manager")
            ? "fleet_manager"
            : roles.includes("company")
            ? "company"
            : roles.includes("driver")
            ? "driver"
            : roles.includes("client")
            ? "client"
            : null;
          
          const employeeStatus = primaryRole === "client" && !!employeeResult?.data;
          
          // Une seule mise à jour groupée
          setSession(session);
          setUser(session.user);
          setUserRoles(roles);
          setUserRole(primaryRole);
          setIsCompanyEmployee(employeeStatus);
          setIsCompanyEmployeeChecked(true); // CRITIQUE: Marquer comme vérifié après le batch
        } else {
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setUserRole(null);
          setIsCompanyEmployee(false);
          setIsCompanyEmployeeChecked(true); // Pas d'utilisateur = pas de vérification nécessaire
        }
      } catch (error) {
        logger.error("Init error", { error });
      } finally {
        if (isMounted) {
          timeoutCleared = true;
          clearTimeout(safetyTimeout);
          // Marquer l'init terminée AVANT de changer loading
          isInitializing = false;
          setIsInitialized(true);
          setLoading(false);
          logger.info("Auth init complete");
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      isInitializing = false;
      timeoutCleared = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "driver" | "client",
    additionalData?: any
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erreur lors de la création du compte");

      // Create driver or client profile FIRST (trigger will assign role automatically)
      if (role === "driver" && additionalData) {
        const { error: driverError } = await supabase
          .from("drivers")
          .insert({
            user_id: data.user.id,
            license_number: additionalData.licenseNumber,
            vehicle_model: additionalData.vehicleModel,
            vehicle_plate: additionalData.vehiclePlate || null,
          });

        if (driverError) throw driverError;
      } else if (role === "client") {
        // Clients are FREE by default (is_exclusive: false)
        // Only QR code registration will set is_exclusive: true
        const { error: clientError } = await supabase
          .from("clients")
          .insert({
            user_id: data.user.id,
            is_exclusive: additionalData?.isExclusive ?? false,
            driver_id: additionalData?.driverId ?? null,
            qr_code_id: additionalData?.qrCodeId ?? null,
          });

        if (clientError) throw clientError;
      }

      toast.success("Compte créé avec succès !");
    } catch (error: any) {
      logger.error("Signup error", { error });
      if (error.message.includes("already registered")) {
        toast.error("Cet email est déjà utilisé");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erreur de connexion");

      const userId = data.user.id;

      // OPTIMISATION: Récupérer toutes les données en PARALLÈLE
      const [rolesResult, driverResult, employeeResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("drivers").select("is_fleet_driver, fleet_manager_id, is_pioneer, stripe_customer_id").eq("user_id", userId).maybeSingle(),
        supabase.from("company_employees").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle()
      ]);

      // Traiter les rôles
      const roles = rolesResult.data?.map((r) => r.role) || [];
      const role: UserRole = roles.includes("admin") 
        ? "admin" 
        : roles.includes("fleet_manager")
        ? "fleet_manager"
        : roles.includes("company")
        ? "company"
        : roles.includes("driver")
        ? "driver"
        : roles.includes("client")
        ? "client"
        : null;

      // Mettre à jour les états immédiatement
      setUserRoles(roles);
      setUserRole(role);
      
      const isEmployee = !!employeeResult.data;
      setIsCompanyEmployee(isEmployee);
      setIsCompanyEmployeeChecked(true);

      // Toast de succès
      const roleLabel = role === "admin" ? "Administrateur" : role === "fleet_manager" ? "Gestionnaire de flotte" : role === "driver" ? "Chauffeur" : role === "client" ? "Client" : "Utilisateur";
      toast.success("Connexion réussie !", {
        description: `Bienvenue ${roleLabel} !`,
        duration: 2000,
      });

      // Navigation rapide basée sur le rôle
      if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "fleet_manager") {
        navigate("/fleet-dashboard", { replace: true });
      } else if (role === "driver") {
        const driverData = driverResult.data;
        if (driverData?.is_pioneer && !driverData?.stripe_customer_id) {
          navigate("/pioneer-payment", { replace: true });
        } else if (driverData?.is_fleet_driver && driverData?.fleet_manager_id) {
          navigate("/fleet-driver-dashboard", { replace: true });
        } else {
          navigate("/driver-dashboard", { replace: true });
        }
      } else if (role === "company") {
        navigate("/company-dashboard", { replace: true });
      } else if (role === "client") {
        navigate(isEmployee ? "/company-employee-dashboard" : "/client-dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      logger.error("Signin error", { error });
      toast.error("Connexion échouée", {
        description: error.message || "Vérifiez votre email et mot de passe",
        duration: 4000,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Ignorer les erreurs "session_not_found" car la session peut déjà être expirée
      // Ce n'est pas une vraie erreur - l'utilisateur est déjà déconnecté
      if (error && !error.message?.includes("session_not_found")) {
        throw error;
      }
      
      // Nettoyage local toujours effectué (même si session déjà expirée côté serveur)
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserRoles([]);
      setIsCompanyEmployee(false);
      setIsCompanyEmployeeChecked(false);
      navigate("/login");
      toast.success("Déconnexion réussie", {
        description: "À bientôt sur SoloCab !",
        duration: 3000,
      });
    } catch (error: any) {
      logger.error("Signout error", { error });
      
      // Même en cas d'erreur, on nettoie l'état local pour éviter l'UI bloqué
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserRoles([]);
      setIsCompanyEmployee(false);
      setIsCompanyEmployeeChecked(false);
      navigate("/login");
      
      toast.info("Déconnexion effectuée", {
        description: "Votre session a été fermée",
        duration: 3000,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        userRoles,
        isCompanyEmployee,
        isCompanyEmployeeChecked,
        loading,
        signUp,
        signIn,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
