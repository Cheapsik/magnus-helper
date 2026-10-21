import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  base: "/magnus-helper/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "icons/*.png"],
      manifest: {
        name: "Magnus Helper — pomocnik MG",
        short_name: "Magnus Helper",
        lang: "pl",
        display: "standalone",
        scope: "/magnus-helper/",
        start_url: "/magnus-helper/",
        theme_color: "#0c0e13",
        background_color: "#0c0e13",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,mp3,json,wasm,woff2}"],
        // pink.webp is 4 MB and optional; cached at runtime on first use instead
        globIgnores: ["**/textures/pink.webp", "**/.DS_Store"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/magnus-helper/index.html",
        runtimeCaching: [
          { urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"), handler: "NetworkOnly" },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/magnus-helper/assets/dice-box/"),
            handler: "CacheFirst",
            options: { cacheName: "dice-assets" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
