import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialiser Sentry avant tout le reste
initSentry();

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('./registerSW.ts');
}

createRoot(document.getElementById("root")!).render(<App />);
