import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      // We handle SW registration ourselves via useAppUpdate.
      // Prevent the plugin from injecting its own register script.
      injectRegister: null,
      registerType: "autoUpdate",
      // IMPORTANT: serve the new PWA worker from a different URL so we can ship a
      // legacy /sw.js "kill switch" to remove stale workers that break preview.
      filename: "pwa-sw.js",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "SME POS - Point of Sale System",
        short_name: "SME POS",
        description: "Complete POS system for restaurants, retail, and service businesses",
        theme_color: "#0EA5E9",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon",
          },
        ],
      },
      workbox: {
        // Do not precache index.html. A precached application shell can keep
        // serving routes from an older deployment until the worker updates.
        // Navigation requests below use NetworkFirst and retain an offline copy.
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "app-navigation",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
