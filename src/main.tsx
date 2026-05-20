import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { setupGlobalErrorHandler } from "./lib/errorHandlerV2";
import "./lib/performanceMonitor"; // Auto-instrument fetch for API timing
import { initRememberOnBoot } from "./lib/authStorage";
import { restoreNativeSession, initNativeSessionBridge } from "./lib/nativeSessionPersistence";
import { initRealtimeIdleManager } from "./lib/realtimeIdleManager";

// Pause WS realtime si l'onglet/app reste caché >5min (Phase 3 cost-opt)
initRealtimeIdleManager();

// 2) Appliquer la préférence "Se souvenir de moi" (web only)
initRememberOnBoot();

// Initialiser Sentry et le gestionnaire d'erreurs global
initSentry();
setupGlobalErrorHandler();

// 1) Restaurer la session depuis Capacitor Preferences (Android natif uniquement)
//    AVANT que Supabase ne lise sa session depuis localStorage. Ça garantit que
//    la connexion du chauffeur survit aux nettoyages de la WebView.
// 3) Brancher la persistance native sur les événements auth (sync continu)
void (async () => {
  await restoreNativeSession();
  await initNativeSessionBridge();
})();

createRoot(document.getElementById("root")!).render(<App />);
