import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "driver" | "client")[];
  requireValidatedDriver?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles,
  requireValidatedDriver = false 
}: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [checkingDriver, setCheckingDriver] = useState(requireValidatedDriver);

  useEffect(() => {
    if (requireValidatedDriver && user && userRole === "driver") {
      checkDriverStatus();
    } else {
      setCheckingDriver(false);
    }
  }, [user, userRole, requireValidatedDriver]);

  const checkDriverStatus = async () => {
    if (!user) return;

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("status, subscription_paid, free_access_granted")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      // SÉCURITÉ CRITIQUE : Vérifier paiement ou accès gratuit
      if (!driver.subscription_paid && !driver.free_access_granted) {
        console.error("⛔ Accès refusé : paiement requis");
        setDriverStatus("payment_required");
        return;
      }

      setDriverStatus(driver.status);
    } catch (error) {
      console.error("Error checking driver status:", error);
    } finally {
      setCheckingDriver(false);
    }
  };

  if (loading || checkingDriver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-premium" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  // Bloquer accès si paiement manquant
  if (
    requireValidatedDriver &&
    userRole === "driver" &&
    driverStatus === "payment_required"
  ) {
    return <Navigate to="/login" replace />;
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

  return <>{children}</>;
};
