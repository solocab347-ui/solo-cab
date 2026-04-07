import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { OAuthClientOnboarding } from "@/components/oauth/OAuthClientOnboarding";
import { OAuthDriverOnboarding } from "@/components/oauth/OAuthDriverOnboarding";
import logo from "@/assets/logo-solocab.png";

const OAuthOnboarding = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<"client" | "driver" | null>(null);
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/signup", { replace: true });
          return;
        }

        setUser(user);

        // Check if already has roles (existing user logging in)
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roles && roles.length > 0) {
          const roleList = roles.map(r => r.role);
          if (roleList.includes("admin")) {
            navigate("/admin-dashboard", { replace: true });
          } else if (roleList.includes("driver")) {
            // Check if onboarding completed
            const { data: driver } = await supabase
              .from("drivers")
              .select("id, status")
              .eq("user_id", user.id)
              .maybeSingle();
            
            if (driver) {
              navigate("/driver-dashboard", { replace: true });
            } else {
              setUserType("driver");
            }
          } else if (roleList.includes("client")) {
            const { data: client } = await supabase
              .from("clients")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();
            
            if (client) {
              navigate("/client-dashboard", { replace: true });
            } else {
              setUserType("client");
            }
          }
          setChecking(false);
          return;
        }

        // New user — check stored type
        const storedType = localStorage.getItem("solocab_oauth_signup_type") as "client" | "driver" | null;
        if (!storedType) {
          navigate("/signup", { replace: true });
          return;
        }

        setUserType(storedType);
      } catch (err) {
        toast.error("Erreur de chargement");
        navigate("/signup", { replace: true });
      } finally {
        setChecking(false);
      }
    };

    init();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logo} alt="SoloCab" className="w-12 h-12 mx-auto" />
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Préparation de votre compte...</p>
        </div>
      </div>
    );
  }

  if (userType === "client" && user) {
    return <OAuthClientOnboarding user={user} />;
  }

  if (userType === "driver" && user) {
    return <OAuthDriverOnboarding user={user} />;
  }

  return null;
};

export default OAuthOnboarding;
