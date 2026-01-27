import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { setupGlobalErrorHandler } from "./lib/errorHandlerV2";

// Initialiser Sentry et le gestionnaire d'erreurs global
initSentry();
setupGlobalErrorHandler();

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('./registerSW.ts');
}

createRoot(document.getElementById("root")!).render(<App />);
