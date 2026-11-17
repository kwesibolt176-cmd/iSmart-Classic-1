import { useState, useEffect, useCallback } from "react";

interface UseAppUpdateReturn {
  updateAvailable: boolean;
  isOfflineReady: boolean;
  updateApp: () => void;
  dismissUpdate: () => void;
}

type UpdateSWFn = (reloadPage?: boolean) => Promise<void>;

type RegisterSW = (options: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: unknown) => void;
}) => UpdateSWFn;

export const useAppUpdate = (): UseAppUpdateReturn => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<UpdateSWFn | null>(null);

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isPreviewHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".lovableproject.com") ||
      (host.startsWith("id-preview--") && host.endsWith(".lovable.app"));

    // IMPORTANT: Preview/dev uses Vite's module graph (node_modules/.vite/deps).
    // A service worker registered from a published build can break module loading and cause:
    // "TypeError: Importing a module script failed".
    const shouldDisableSW = !import.meta.env.PROD || isPreviewHost;

    if (shouldDisableSW) {
      // Best-effort cleanup of any previously-registered SW.
      (async () => {
        try {
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
          }

          if ("caches" in window) {
            const keys = await caches.keys();
            // Only clear workbox/PWA caches; avoid nuking unrelated caches.
            await Promise.all(
              keys
                .filter(
                  (k) =>
                    k.startsWith("workbox-") ||
                    k.startsWith("vite-pwa") ||
                    k.includes("precache") ||
                    k.includes("runtime")
                )
                .map((k) => caches.delete(k))
            );
          }
        } catch {
          // no-op
        }
      })();

      return;
    }

    let cancelled = false;

    (async () => {
      // Lazy-import so preview/dev never even tries to load the virtual module.
      const mod = (await import("virtual:pwa-register")) as unknown as { registerSW: RegisterSW };

      if (cancelled) return;

      const sw = mod.registerSW({
        immediate: true,
        onNeedRefresh() {
          // Do not reload automatically: a silent reload when the user returns to
          // the tab wiped forms and verification steps (QA BUG-01 / BUG-10).
          // UpdateNotification offers the update instead.
          setUpdateAvailable(true);
        },
        onOfflineReady() {
          setIsOfflineReady(true);
        },
        onRegisteredSW(_swUrl, registration) {
          // Check for updates frequently (every 60 seconds) so new GitHub
          // pushes propagate quickly to open browser tabs.
          if (registration) {
            setInterval(() => {
              registration.update();
            }, 60 * 1000);

          }
        },
        onRegisterError(error) {
          // Don't hard-crash the app if SW registration fails.
          console.error("[App Update] Service worker registration error:", error);
        },
      });

      setUpdateSW(() => sw);
    })().catch((error) => {
      console.error("[App Update] Failed to initialize update system:", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateApp = useCallback(() => {
    if (!updateSW) return;
    updateSW(true).catch(() => {
      // no-op
    });
  }, [updateSW]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return {
    updateAvailable,
    isOfflineReady,
    updateApp,
    dismissUpdate,
  };
};

