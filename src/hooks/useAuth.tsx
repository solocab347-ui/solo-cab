import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: "admin" | "driver" | "client" | null;
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
  const [userRole, setUserRole] = useState<"admin" | "driver" | "client" | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fonction simple pour récupérer le rôle - SANS CACHE
  const fetchUserRole = async (userId: string): Promise<"admin" | "driver" | "client" | null> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      
      const roles = data?.map((r) => r.role) || [];
      
      // Set primary role (priority: admin > driver > client)
      const primaryRole: "admin" | "driver" | "client" | null = roles.includes("admin") 
        ? "admin" 
        : roles.includes("driver")
        ? "driver"
        : roles.includes("client")
        ? "client"
        : null;
      
      setUserRoles(roles);
      setUserRole(primaryRole);
      return primaryRole;
    } catch (error) {
      console.error("❌ Error fetching user role:", error);
      setUserRoles([]);
      setUserRole(null);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutCleared = false;

    // TIMEOUT DE SÉCURITÉ ABSOLU: garantir loading=false après 2 secondes MAX
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !timeoutCleared) {
        console.warn("⚠️ SAFETY TIMEOUT ACTIVATED - forcing loading to false");
        setLoading(false);
      }
    }, 2000);

    // Auth state listener - ultra simple, pas de await
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log("🔐 Auth event:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserRole(session.user.id).catch(err => {
            console.error("Role fetch failed:", err);
          });
        } else {
          setUserRole(null);
          setUserRoles([]);
        }
      }
    );

    // Init rapide - max 1.5 secondes
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        console.log("📱 Session init:", session ? "found" : "none");
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserRole(session.user.id).catch(console.error);
        }
      } catch (error) {
        console.error("❌ Init error:", error);
      } finally {
        if (isMounted) {
          timeoutCleared = true;
          clearTimeout(safetyTimeout);
          setLoading(false);
          console.log("✅ Auth init complete");
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
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
      console.error("Signup error:", error);
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
      
      toast.success("Connexion réussie !");

      // Navigation basée sur le rôle
      if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "driver") {
        navigate("/driver-dashboard", { replace: true });
      } else if (role === "client") {
        navigate("/client-dashboard", { replace: true });
      } else {
        console.warn("Unknown role, redirecting to home");
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      console.error("Signin error:", error);
      toast.error(error.message || "Email ou mot de passe incorrect");
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
      toast.success("Déconnexion réussie");
    } catch (error: any) {
      console.error("❌ Signout error:", error);
      
      // Même en cas d'erreur, on nettoie l'état local pour éviter l'UI bloqué
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserRoles([]);
      navigate("/login");
      
      toast.error("Déconnexion effectuée avec avertissement");
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
