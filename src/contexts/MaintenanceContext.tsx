import { createContext, useContext, ReactNode } from "react";

// MAINTENANCE MODE TOGGLE - Set to true to enable maintenance mode
// Set to false to disable maintenance mode and restore normal access
const MAINTENANCE_MODE_ENABLED = false;

// Admin emails that can bypass maintenance mode
const ADMIN_BYPASS_EMAILS = [
  "admin@solocab.fr",
  "solocab.vtc@gmail.com",
  // Add more admin emails here
];

// Routes that should always be accessible even in maintenance mode
const BYPASS_ROUTES = [
  "/login",  // Needed for admins to log in
  "/safe-mode",
  "/mentions-legales",
  "/privacy-policy",
  "/terms-of-service",
  "/politique-annulation",
  "/delete-account",
  "/supprimer-compte",
];

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  canBypass: (email: string | null | undefined) => boolean;
  shouldShowMaintenance: (route: string, email: string | null | undefined) => boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
  isMaintenanceMode: false,
  canBypass: () => false,
  shouldShowMaintenance: () => false,
});

export const useMaintenanceMode = () => useContext(MaintenanceContext);

interface MaintenanceProviderProps {
  children: ReactNode;
}

export const MaintenanceProvider = ({ children }: MaintenanceProviderProps) => {
  const isMaintenanceMode = MAINTENANCE_MODE_ENABLED;

  const canBypass = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return ADMIN_BYPASS_EMAILS.includes(email.toLowerCase());
  };

  const shouldShowMaintenance = (route: string, email: string | null | undefined): boolean => {
    // If not in maintenance mode, never show
    if (!isMaintenanceMode) return false;
    
    // Check if route is bypassed
    if (BYPASS_ROUTES.some(bypassRoute => route.startsWith(bypassRoute))) {
      return false;
    }
    
    // Check if user can bypass
    if (canBypass(email)) {
      return false;
    }
    
    return true;
  };

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, canBypass, shouldShowMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
};
