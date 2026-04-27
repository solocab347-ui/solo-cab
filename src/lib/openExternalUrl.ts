/**
 * Centralized helper to open external URLs (Stripe Connect onboarding, etc.)
 * 
 * - On Native (Android/iOS Capacitor): uses @capacitor/browser (Custom Tabs / SFSafariViewController)
 *   which keeps the user inside the app context and provides a native back button.
 *   When the user closes the in-app browser, a callback is fired so the caller can refresh status.
 * - On Web: opens in a new tab via window.open (fallback to same-tab if popup blocked).
 * 
 * IMPORTANT: window.open(_blank) does NOT work reliably inside Capacitor WebView
 * (it either does nothing or opens an orphan window with no way back to the app).
 */
import { Capacitor } from "@capacitor/core";

interface OpenExternalOptions {
  /** Called when the in-app browser is closed by the user (mobile only). */
  onClose?: () => void;
}

export async function openExternalUrl(url: string, options: OpenExternalOptions = {}): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      
      // Listen for browser close BEFORE opening, to trigger refresh on return
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
      console.error("[openExternalUrl] Capacitor Browser failed, falling back to window.open", err);
      // Fall through to web fallback
    }
  }

  // Web (or fallback): try _blank, fall back to same-tab if popup blocked
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win || win.closed || typeof win.closed === "undefined") {
    // Popup blocked → navigate same tab
    window.location.href = url;
  }
}

/**
 * Close the in-app browser programmatically (mobile only).
 * Useful after detecting a successful return URL inside the in-app browser.
 */
export async function closeExternalUrl(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // ignore
  }
}
