/**
 * Détection de la plateforme d'exécution.
 *
 * Conformité App Store (Apple Guideline 3.1.1) et Google Play :
 * Les paiements d'abonnements numériques ne doivent JAMAIS être proposés
 * dans une application mobile native distribuée via les stores.
 *
 * Cette fonction est utilisée pour masquer toute interface de paiement
 * Stripe (checkout, upgrade, redirection) lorsque l'utilisateur est dans
 * l'app mobile (Capacitor iOS/Android).
 *
 * Le système d'abonnement reste pleinement fonctionnel sur le web.
 */
import { Capacitor } from "@capacitor/core";

/**
 * `true` si l'application tourne dans un conteneur natif Capacitor (iOS/Android).
 * `false` sur le web.
 */
export const isMobileApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Plateforme native exacte : 'ios' | 'android' | 'web'. */
export const getPlatform = (): "ios" | "android" | "web" => {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
    return "web";
  } catch {
    return "web";
  }
};

/**
 * Indique si les paiements in-app doivent être masqués.
 * Toujours `true` dans une app native (App Store / Play Store).
 */
export const shouldHideInAppPayments = (): boolean => isMobileApp();
