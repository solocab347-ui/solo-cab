import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NavigationHeaderProps {
  showBack?: boolean;
  showHome?: boolean;
  homeRoute?: string;
  onBack?: () => void;
  className?: string;
}

export const NavigationHeader = ({ 
  showBack = true, 
  showHome = true, 
  homeRoute,
  onBack,
  className = "" 
}: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [autoHomeRoute, setAutoHomeRoute] = useState<string>("");

  // Détection automatique du rôle utilisateur
  useEffect(() => {
    const detectUserRole = async () => {
      if (!user) {
        setAutoHomeRoute("/");
        return;
      }

      try {
        // Vérifier le rôle dans user_roles
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData?.role) {
          setUserRole(roleData.role);
          
          // Définir la route d'accueil selon le rôle
          switch (roleData.role) {
            case "driver":
              setAutoHomeRoute("/driver-dashboard");
              break;
            case "client":
              setAutoHomeRoute("/client-dashboard");
              break;
            case "admin":
              setAutoHomeRoute("/admin-dashboard");
              break;
            default:
              setAutoHomeRoute("/");
          }
        } else {
          setAutoHomeRoute("/");
        }
      } catch (error) {
        console.error("Erreur détection rôle:", error);
        setAutoHomeRoute("/");
      }
    };

    detectUserRole();
  }, [user]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    // Utiliser homeRoute si fourni, sinon utiliser la route automatique
    const targetRoute = homeRoute || autoHomeRoute;
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-white hover:bg-white/10"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}
      {showHome && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHome}
          className="text-white hover:bg-white/10 gap-2"
          title="Accueil"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Accueil</span>
        </Button>
      )}
    </div>
  );
};
