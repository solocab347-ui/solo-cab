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
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: "driver" | "client", additionalData?: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

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
      return primaryRole;
    } catch (error) {
      logger.error("Error fetching user role", { error });
      setUserRoles([]);
      setUserRole(null);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutCleared = false;
    let refreshRetryCount = 0;
    let isInitializing = true; // Flag pour ignorer les événements pendant l'init
    const MAX_REFRESH_RETRIES = 3;

    // TIMEOUT DE SÉCURITÉ: garantir loading=false après 5 secondes MAX
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !timeoutCleared) {
        logger.warn("SAFETY TIMEOUT - forcing loading to false");
        isInitializing = false;
        setLoading(false);
      }
    }, 5000);

    // Fonction pour gérer l'échec du refresh token avec retry
    const handleRefreshFailure = async () => {
      refreshRetryCount++;
      
      if (refreshRetryCount <= MAX_REFRESH_RETRIES) {
        const backoffDelay = Math.min(1000 * Math.pow(2, refreshRetryCount - 1), 5000);
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

    // Init rapide avec batch des états pour éviter les flash
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        logger.info("Session init", { found: !!session });
        
        // Batch state updates pour éviter les re-renders multiples
        if (session?.user) {
          // Récupérer le rôle AVANT de mettre à jour les états
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          
          const roles = roleData?.map((r) => r.role) || [];
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
          
          // Une seule mise à jour groupée
          setSession(session);
          setUser(session.user);
          setUserRoles(roles);
          setUserRole(primaryRole);
        } else {
          setSession(null);
          setUser(null);
          setUserRoles([]);
          setUserRole(null);
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

      // Récupérer le rôle - SIMPLE et RAPIDE
      const role = await fetchUserRole(data.user.id);
      
      // Toast de succès avec description claire
      const roleLabel = role === "admin" ? "Administrateur" : role === "fleet_manager" ? "Gestionnaire de flotte" : role === "driver" ? "Chauffeur" : role === "client" ? "Client" : "Utilisateur";
      toast.success("Connexion réussie !", {
        description: `Bienvenue ${roleLabel} ! Redirection vers votre espace...`,
        duration: 3000,
      });

      // Check if driver is a fleet driver
      if (role === "driver") {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("is_fleet_driver, fleet_manager_id")
          .eq("user_id", data.user.id)
          .single();
        
        if (driverData?.is_fleet_driver && driverData?.fleet_manager_id) {
          navigate("/fleet-driver-dashboard", { replace: true });
          return;
        }
      }

      // Navigation basée sur le rôle
      if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "fleet_manager") {
        navigate("/fleet-dashboard", { replace: true });
      } else if (role === "driver") {
        navigate("/driver-dashboard", { replace: true });
      } else if (role === "company") {
        navigate("/company-dashboard", { replace: true });
      } else if (role === "client") {
        // Vérifier si c'est un collaborateur d'entreprise
        const { data: employeeData } = await supabase
          .from("company_employees")
          .select("id, is_active")
          .eq("user_id", data.user.id)
          .eq("is_active", true)
          .maybeSingle();
        
        if (employeeData) {
          navigate("/company-employee-dashboard", { replace: true });
        } else {
          navigate("/client-dashboard", { replace: true });
        }
      } else {
        logger.warn("Unknown role, redirecting to home");
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
        loading,
        signUp,
        signIn,
        signOut,
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
