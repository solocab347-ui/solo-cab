import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      // Native-only Capacitor plugins (no web entry) — never resolve at build time
      external: [
        '@capacitor-community/background-geolocation',
        '@capacitor-community/keep-awake',
      ],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-map': ['leaflet'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: [
      '@capacitor-community/background-geolocation',
      '@capacitor-community/keep-awake',
    ],
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
