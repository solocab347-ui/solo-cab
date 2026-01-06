import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/productionLogger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "driver" | "client" | "company" | "fleet_manager")[];
  requireValidatedDriver?: boolean;
  requireCompanyAdmin?: boolean; // Pour vérifier si l'utilisateur est admin d'entreprise
  requireCompanyEmployee?: boolean; // Pour vérifier si l'utilisateur est un collaborateur d'entreprise
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles,
  requireValidatedDriver = false,
  requireCompanyAdmin = false,
  requireCompanyEmployee = false
}: ProtectedRouteProps) => {
  const { user, userRole, isCompanyEmployee: authIsCompanyEmployee, isCompanyEmployeeChecked, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [checkingDriver, setCheckingDriver] = useState(requireValidatedDriver);
  const [checkingCompanyAdmin, setCheckingCompanyAdmin] = useState(false);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState<boolean | null>(null);
  const hasChecked = useRef(false); // Éviter les vérifications multiples
  const hasCheckedCompanyAdmin = useRef(false);

  // Vérification du statut admin entreprise
  useEffect(() => {
    if (requireCompanyAdmin && user && !hasCheckedCompanyAdmin.current) {
      hasCheckedCompanyAdmin.current = true;
      checkCompanyAdminStatus();
    } else if (!requireCompanyAdmin || !user) {
      setCheckingCompanyAdmin(false);
      hasCheckedCompanyAdmin.current = false;
    }
  }, [user?.id, requireCompanyAdmin]);

  const checkCompanyAdminStatus = async () => {
    if (!user) {
      setCheckingCompanyAdmin(false);
      return;
    }

    setCheckingCompanyAdmin(true);
    try {
      // Vérifier si l'utilisateur est propriétaire d'une entreprise
      const { data: ownedCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedCompany) {
        setIsCompanyAdmin(true);
        setCheckingCompanyAdmin(false);
        return;
      }

      // Vérifier si l'utilisateur est un administrateur d'entreprise
      const { data: adminData } = await supabase
        .from("company_administrators")
        .select("id, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (adminData) {
        setIsCompanyAdmin(true);
        setCheckingCompanyAdmin(false);
        return;
      }

      // L'utilisateur n'est pas admin - peut-être un collaborateur
      setIsCompanyAdmin(false);
    } catch (error) {
      logger.error("Error checking company admin status", { error });
      setIsCompanyAdmin(false);
    } finally {
      setCheckingCompanyAdmin(false);
    }
  };
  // Note: La vérification du statut collaborateur est maintenant gérée par useAuth via isCompanyEmployee

  useEffect(() => {
    // Ne vérifier qu'une seule fois
    if (requireValidatedDriver && user && userRole === "driver" && !hasChecked.current) {
      hasChecked.current = true;
      checkDriverStatus();
    } else if (!requireValidatedDriver || !user || userRole !== "driver") {
      setCheckingDriver(false);
      hasChecked.current = false;
    }
  }, [user?.id, userRole, requireValidatedDriver]); // Ne re-vérifier que si user.id change

  const checkDriverStatus = async () => {
    if (!user) {
      setCheckingDriver(false);
      return;
    }

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("status, subscription_paid, free_access_granted")
        .eq("user_id", user.id)
        .maybeSingle(); // Utiliser maybeSingle au lieu de single

      if (error) {
        logger.error("Error checking driver status", { error });
        setCheckingDriver(false);
        return;
      }

      if (!driver) {
        logger.error("Aucun profil chauffeur trouvé");
        setDriverStatus("no_profile");
        setCheckingDriver(false);
        return;
      }

      // SÉCURITÉ CRITIQUE : Vérifier paiement ou accès gratuit
      if (!driver.subscription_paid && !driver.free_access_granted) {
        logger.error("Accès refusé : paiement requis");
        setDriverStatus("payment_required");
      } else if (driver.status === "on_hold" && !driver.free_access_granted) {
        // ⚠️ SÉCURITÉ: Bloquer les drivers "on_hold" sans paiement ni accès gratuit
        logger.error("Accès refusé : inscription incomplète");
        setDriverStatus("payment_required");
      } else if (driver.free_access_granted) {
        // ✅ Accès gratuit = validation automatique
        logger.info("Accès gratuit accordé : validation automatique");
        setDriverStatus("validated");
      } else {
        setDriverStatus(driver.status);
      }
    } catch (error) {
      logger.error("Erreur vérification driver", { error });
      setDriverStatus("error");
    } finally {
      setCheckingDriver(false);
    }
  };

  // Utiliser un loader minimal et cohérent pour éviter les flash
  // CRITIQUE: Attendre que isCompanyEmployeeChecked soit true si requireCompanyEmployee est true
  const needsEmployeeCheck = requireCompanyEmployee && !isCompanyEmployeeChecked && userRole === "client";
  
  if (loading || checkingDriver || checkingCompanyAdmin || needsEmployeeCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background auth-loading-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier si l'utilisateur essaie d'accéder au company-dashboard sans être admin
  if (requireCompanyAdmin && isCompanyAdmin === false) {
    return <Navigate to="/company-employee-dashboard" replace />;
  }

  // Vérifier si l'utilisateur essaie d'accéder à l'espace collaborateur sans être collaborateur
  // CRITIQUE: Ne rediriger que si la vérification est TERMINÉE et que l'utilisateur n'est pas collaborateur
  if (requireCompanyEmployee && isCompanyEmployeeChecked && authIsCompanyEmployee === false) {
    // Rediriger vers le client dashboard s'il n'est pas un vrai collaborateur
    return <Navigate to="/client-dashboard" replace />;
  }

  // Rediriger les chauffeurs sans paiement vers une page d'erreur claire
  if (
    requireValidatedDriver &&
    userRole === "driver" &&
    driverStatus === "payment_required"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="p-8 max-w-md text-center space-y-4 bg-white">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Paiement Requis</h2>
          <p className="text-gray-700">
            Votre inscription est incomplète. Veuillez compléter le paiement pour accéder à votre espace chauffeur.
          </p>
          <div className="space-y-2">
            <Button onClick={() => navigate("/register-driver")} className="w-full">
              Compléter l'inscription
            </Button>
            <Button variant="outline" onClick={async () => {
              try {
                await supabase.auth.signOut();
                navigate("/login");
              } catch (error) {
                logger.error("Erreur déconnexion", { error });
                navigate("/login");
              }
            }} className="w-full">
              Se déconnecter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Rediriger les chauffeurs non validés vers la page d'attente
  if (
    requireValidatedDriver && 
    userRole === "driver" && 
    driverStatus !== "validated" &&
    location.pathname !== "/driver-pending-validation"
  ) {
    return <Navigate to="/driver-pending-validation" replace />;
  }

  return <div className="page-transition">{children}</div>;
};
