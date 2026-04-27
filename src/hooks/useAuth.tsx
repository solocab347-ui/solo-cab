import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logger } from "@/lib/productionLogger";
import { checkEmailExists, buildExistingAccountMessage } from "@/lib/checkEmailExists";
import { 
  instantSignIn, 
  instantGetSession, 
  instantSignOut, 
  getNavigationPath,
  clearAuthCache 
} from "@/lib/instantAuth";

type UserRole = "admin" | "driver" | "client" | null;

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
      
      // Set primary role (priority: admin > driver > client)
      const primaryRole: UserRole = roles.includes("admin") 
        ? "admin" 
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
    let isInitializing = true;
    let refreshRetryCount = 0;
    const MAX_REFRESH_RETRIES = 2; // Moins de retries pour rapidité

    // TIMEOUT DE SÉCURITÉ: 5 secondes pour UX fluide
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isInitializing) {
        logger.warn("SAFETY TIMEOUT - forcing loading to false after 5s");
        isInitializing = false;
        setLoading(false);
      }
    }, 5000);

    // Fonction pour gérer l'échec du refresh token - RAPIDE
    const handleRefreshFailure = async () => {
      refreshRetryCount++;
      
      if (refreshRetryCount <= MAX_REFRESH_RETRIES) {
        const backoffDelay = Math.min(300 * refreshRetryCount, 600);
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
        clearAuthCache();
        setUser(null);
        setSession(null);
        setUserRole(null);
        setUserRoles([]);
        toast.error("Session expirée, veuillez vous reconnecter");
        navigate("/login");
        return false;
      }
    };

    // Auth state listener - SIMPLIFIÉ
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // IGNORER les événements pendant l'init
        if (isInitializing && (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
          return;
        }
        
        // Gestion de l'échec du refresh token
        if (event === "TOKEN_REFRESHED" && !session) {
          setTimeout(() => handleRefreshFailure(), 0);
          return;
        }
        
        // Déconnexion
        if (event === "SIGNED_OUT") {
          clearAuthCache();
          setUser(null);
          setSession(null);
          setUserRole(null);
          setUserRoles([]);
          // Reset driver session marker so next login defaults to map mode
          try { sessionStorage.removeItem("solocab_driver_session_started"); } catch {}
          return;
        }
        
        // Reset retry counter
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          refreshRetryCount = 0;
        }
        
        // Mise à jour pour SIGNED_IN post-init
        if (event === "SIGNED_IN" && !isInitializing) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setTimeout(() => {
              fetchUserRole(session.user.id).then((role) => {
                // If no role found and on oauth-onboarding, don't redirect
                if (!role && window.location.pathname === "/oauth-onboarding") {
                  return;
                }
              }).catch(err => {
                logger.error("Role fetch failed", { err });
              });
            }, 0);
          }
        }
      }
    );

    // INIT INSTANTANÉ avec le nouveau système
    const initAuth = async () => {
      const startTime = Date.now();
      
      try {
        const result = await instantGetSession();
        
        if (!isMounted) return;
        
        logger.info("Instant auth init", { 
          found: !!result.user, 
          fromCache: result.fromCache,
          duration: Date.now() - startTime 
        });
        
        // Mise à jour groupée de tous les états
        setSession(result.session);
        setUser(result.user);
        setUserRoles(result.roles);
        setUserRole(result.role as UserRole);
        setIsCompanyEmployee(result.isEmployee);
        setIsCompanyEmployeeChecked(true);
        
      } catch (error) {
        logger.error("Init error", { error });
        setIsCompanyEmployeeChecked(true);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimeout);
          isInitializing = false;
          setIsInitialized(true);
          setLoading(false);
          logger.info("Auth init complete", { duration: Date.now() - startTime });
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      isInitializing = false;
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
      const cleanEmail = email.trim().toLowerCase();

      // Vérification préalable : email déjà utilisé ?
      const existing = await checkEmailExists(cleanEmail);
      if (existing.exists) {
        const { message, loginPath } = buildExistingAccountMessage(existing.role);
        toast.error("Email déjà utilisé", {
          description: message,
          duration: 8000,
          action: {
            label: "Se connecter",
            onClick: () => navigate(loginPath),
          },
        });
        throw new Error("EMAIL_ALREADY_EXISTS");
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
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
        const { error: driverError } = await supabase.rpc("create_driver_profile", {
          p_user_id: data.user.id,
          p_license_number: additionalData.licenseNumber || "",
          p_vehicle_brand: "",
          p_vehicle_model: additionalData.vehicleModel || "",
          p_vehicle_year: new Date().getFullYear(),
          p_vehicle_color: "",
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
      // Toast déjà affiché par la pré-vérification, on évite le doublon.
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        throw error;
      }
      if (error.message?.includes("already registered")) {
        toast.error("Cet email est déjà utilisé");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Utiliser le nouveau système d'authentification instantanée
      const result = await instantSignIn(email, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur de connexion');
      }
      
      // Mettre à jour les états
      setSession(result.session);
      setUser(result.user);
      setUserRoles(result.roles);
      setUserRole(result.role as UserRole);
      setIsCompanyEmployee(result.isEmployee);
      setIsCompanyEmployeeChecked(true);

      // Toast de succès
      const roleLabel = result.role === "admin" ? "Administrateur" 
        : result.role === "driver" ? "Chauffeur" 
        : result.role === "client" ? "Client" 
        : "Utilisateur";
      
      toast.success("Connexion réussie !", {
        description: `Bienvenue ${roleLabel} !`,
        duration: 2000,
      });

      // Récupérer les données driver si nécessaire pour la navigation
      // CRITIQUE: Inclure TOUS les champs d'accès pour une navigation correcte
      let driverData: any = null;
      if (result.role === "driver" && result.user) {
        try {
          const { data } = await supabase
            .from("drivers")
            .select(`
              is_fleet_driver, 
              fleet_manager_id, 
              is_pioneer, 
              stripe_customer_id,
              free_access_granted,
              free_access_type,
              free_access_end_date,
              subscription_paid,
              subscription_status,
              created_at
            `)
            .eq("user_id", result.user.id)
            .maybeSingle();
          driverData = data;
        } catch {
          // Ignorer - utiliser navigation par défaut
        }
      }

      // Navigation instantanée
      const path = getNavigationPath(result.role, result.isEmployee, driverData);
      navigate(path, { replace: true });
    } catch (error: any) {
      logger.error("Signin error", { error });
      
      // Message d'erreur adapté et clair
      let errorMessage = "Vérifiez votre email et mot de passe";
      if (error.message?.includes("trop lente") || error.message?.includes("timeout") || error.message?.includes("abort")) {
        errorMessage = "Connexion lente - réessayez dans quelques instants";
      } else if (error.message?.includes("Invalid login") || error.message?.includes("invalid_credentials")) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.message?.includes("fetch") || error.message?.includes("network")) {
        errorMessage = "Problème de réseau - vérifiez votre connexion";
      }
      
      toast.error("Connexion échouée", {
        description: errorMessage,
        duration: 4000,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Reset driver session marker so next login defaults to map mode
      try { sessionStorage.removeItem("solocab_driver_session_started"); } catch {}
      // Utiliser le nouveau système de déconnexion instantanée
      await instantSignOut();
      
      // Nettoyage local
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserRoles([]);
      setIsCompanyEmployee(false);
      setIsCompanyEmployeeChecked(false);
      navigate("/login");
      toast.success("Déconnexion réussie", {
        description: "À bientôt sur SoloCab !",
        duration: 2000,
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
