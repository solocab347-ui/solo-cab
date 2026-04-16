import { useMemo } from "react";
import { getPlatform, isMobileApp, shouldHideInAppPayments } from "@/lib/platform";

/**
 * Hook React pour accéder aux infos de plateforme et au flag
 * masquant les paiements in-app (conformité App Store / Play Store).
 */
export function usePlatform() {
  return useMemo(
    () => ({
      isMobileApp: isMobileApp(),
      platform: getPlatform(),
      hidePayments: shouldHideInAppPayments(),
    }),
    []
  );
}
