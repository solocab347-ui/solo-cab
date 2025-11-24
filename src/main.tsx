import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { memoryManager } from "./lib/memoryManager";
import { performanceMonitor } from "./lib/performanceMonitor";

// Démarrer le monitoring de performance
if (import.meta.env.DEV) {
  performanceMonitor.start();
  console.log('🚀 Performance monitoring activé');
}

// Cleanup global pour éviter les fuites mémoire
window.addEventListener('beforeunload', () => {
  console.log('🧹 Cleanup global avant déchargement');
  performanceMonitor.stop();
});

createRoot(document.getElementById("root")!).render(<App />);
