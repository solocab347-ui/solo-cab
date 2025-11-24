import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    if (homeRoute) {
      navigate(homeRoute);
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
      {showHome && homeRoute && (
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
