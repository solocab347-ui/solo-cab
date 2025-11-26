import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceBoost, monitorMemory } from "./lib/performanceBoost";
import { initSentry } from "./lib/sentry";
import "./lib/whiteScreenGuard";

// Initialiser Sentry avant tout le reste
initSentry();

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('./registerSW.ts');
}

// Initialiser les optimisations de performance ULTRA
initPerformanceBoost();

// Monitor memory in dev mode
if (import.meta.env.DEV) {
  setInterval(monitorMemory, 30000);
}

createRoot(document.getElementById("root")!).render(<App />);
