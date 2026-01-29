import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMaintenanceMode } from "@/contexts/MaintenanceContext";
import { MaintenanceMode } from "./MaintenanceMode";

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { shouldShowMaintenance } = useMaintenanceMode();

  if (shouldShowMaintenance(location.pathname, user?.email)) {
    return <MaintenanceMode />;
  }

  return <>{children}</>;
};
