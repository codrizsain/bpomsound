// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// The app is server-rendered, so there is no static index.html in the build output.
// We precache the rendered "/" page itself (revisioned per build) and use it as the
// offline fallback for every navigation.
const BUILD_REV = String(Date.now());

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: false,
        filename: "sw.js",
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest}"],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          additionalManifestEntries: [{ url: "/", revision: BUILD_REV }],
          navigateFallback: null,
          runtimeCaching: [
            {
              // Pages: try network first (fresh after deploy), fall back to the
              // precached app shell when offline.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "pages",
                networkTimeoutSeconds: 3,
                precacheFallback: { fallbackURL: "/" },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-css" },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-files",
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:png|ico|svg|webp|webmanifest|js|css)$/.test(url.pathname),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "static-assets" },
            },
          ],
        },
      }),
    ],
  },
});
