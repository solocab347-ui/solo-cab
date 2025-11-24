import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceBoost } from "./lib/performanceBoost";

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('./registerSW.ts');
}

// Initialiser les optimisations de performance ULTRA
initPerformanceBoost();

createRoot(document.getElementById("root")!).render(<App />);
