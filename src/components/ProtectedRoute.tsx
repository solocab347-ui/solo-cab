import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const navigate = useNavigate();
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [checkingDriver, setCheckingDriver] = useState(requireValidatedDriver);
  const hasChecked = useRef(false); // Éviter les vérifications multiples

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
        console.error("Error checking driver status:", error);
        setCheckingDriver(false);
        return;
      }

      if (!driver) {
        console.error("⛔ Aucun profil chauffeur trouvé");
        setDriverStatus("no_profile");
        setCheckingDriver(false);
        return;
      }

      // SÉCURITÉ CRITIQUE : Vérifier paiement ou accès gratuit
      if (!driver.subscription_paid && !driver.free_access_granted) {
        console.error("⛔ Accès refusé : paiement requis");
        setDriverStatus("payment_required");
      } else if (driver.status === "on_hold" && !driver.free_access_granted) {
        // ⚠️ SÉCURITÉ: Bloquer les drivers "on_hold" sans paiement ni accès gratuit
        console.error("⛔ Accès refusé : inscription incomplète");
        setDriverStatus("payment_required");
      } else if (driver.free_access_granted) {
        // ✅ Accès gratuit = validation automatique
        console.log("✅ Accès gratuit accordé : validation automatique");
        setDriverStatus("validated");
      } else {
        setDriverStatus(driver.status);
      }
    } catch (error) {
      console.error("Erreur vérification driver:", error);
      setDriverStatus("error");
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
                console.error("Erreur déconnexion:", error);
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

  return <>{children}</>;
};
