import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { setupGlobalErrorHandler } from "./lib/errorHandlerV2";
import "./lib/performanceMonitor"; // Auto-instrument fetch for API timing
import { initRememberOnBoot } from "./lib/authStorage";

// Appliquer la préférence "Se souvenir de moi" AVANT que Supabase ne lise sa session
initRememberOnBoot();

// Initialiser Sentry et le gestionnaire d'erreurs global
initSentry();
setupGlobalErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);
