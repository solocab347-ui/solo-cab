/**
 * Centralized helper to open external URLs (Stripe Connect onboarding, etc.)
 *
 * Strategy (mobile-first, resilient):
 * 1. Native (Capacitor) → try @capacitor/browser (Custom Tabs / SFSafariViewController).
 *    Best UX: stays in app context, native back button, fires onClose on return.
 * 2. If @capacitor/browser plugin is not available natively (e.g. older APK build
 *    where `npx cap sync` was not run), fallback to opening in the system browser
 *    via window.location (this ALWAYS works inside the WebView).
 * 3. Web → window.open in new tab; if popup blocked, navigate same tab.
 *
 * IMPORTANT: window.open(_blank) is unreliable inside Capacitor WebView. We must
 * never silently fail — the user clicked, something MUST happen.
 */
import { Capacitor } from "@capacitor/core";

interface OpenExternalOptions {
  /** Called when the in-app browser is closed by the user (mobile only, in-app browser path). */
  onClose?: () => void;
}

export async function openExternalUrl(
  url: string,
  options: OpenExternalOptions = {}
): Promise<void> {
  if (!url) {
    console.error("[openExternalUrl] empty URL");
    return;
  }

  if (Capacitor.isNativePlatform()) {
    // 1. Try @capacitor/browser (best UX — in-app browser with return callback)
    const browserPluginAvailable = Capacitor.isPluginAvailable("Browser");
    if (browserPluginAvailable) {
      try {
        const { Browser } = await import("@capacitor/browser");

        let listenerHandle: Awaited<ReturnType<typeof Browser.addListener>> | null = null;
        if (options.onClose) {
          listenerHandle = await Browser.addListener("browserFinished", () => {
            try {
              options.onClose?.();
            } finally {
              listenerHandle?.remove();
            }
          });
        }

        await Browser.open({
          url,
          presentationStyle: "popover",
          windowName: "_self",
        });
        return;
      } catch (err) {
        console.error("[openExternalUrl] Capacitor Browser failed, trying App.openUrl", err);
        // Fall through
      }
    } else {
      console.warn("[openExternalUrl] @capacitor/browser plugin not available natively — using App.openUrl fallback. Run `npx cap sync` and rebuild APK to enable in-app browser.");
    }

    // 2. Fallback: navigate the WebView to the URL.
    //    On Capacitor Android with allowNavigation not whitelisted, the WebView
    //    will delegate to the OS browser (Chrome). On iOS the WebView will load it.
    //    Either way, the user reaches Stripe — never a silent failure.
    try {
      window.location.href = url;
      return;
    } catch (err) {
      console.error("[openExternalUrl] window.location.href failed", err);
    }
    return;
  }

  // Web (desktop / mobile browser): try _blank, fall back to same-tab if popup blocked
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win || win.closed || typeof win.closed === "undefined") {
    window.location.href = url;
  }
}

/**
 * Close the in-app browser programmatically (mobile only).
 */
export async function closeExternalUrl(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!Capacitor.isPluginAvailable("Browser")) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // ignore
  }
}
