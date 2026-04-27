import { supabase } from "@/integrations/supabase/client";

export type ExistingAccountRole = "driver" | "client" | "admin" | "unknown" | null;

export interface EmailExistsResult {
  exists: boolean;
  role: ExistingAccountRole;
}

/**
 * Vérifie côté serveur si un email est déjà inscrit avant un signUp.
 *
 * Pourquoi : depuis 2024, Supabase Auth ne renvoie PLUS systématiquement
 * d'erreur "User already registered" lors d'un `signUp` (protection
 * anti-énumération). Le résultat : un utilisateur peut croire avoir créé
 * un compte alors qu'il existait déjà → confusion, double inscription
 * silencieuse, frustration.
 *
 * Cette fonction interroge une edge function `check-email-exists` qui
 * utilise la service role key pour vérifier la présence de l'email dans
 * `auth.users`, et identifier le rôle existant (driver/client) afin de
 * proposer la bonne page de connexion.
 *
 * Comportement "fail-open" : si la vérification échoue (réseau, etc.),
 * on retourne `{exists: false}` pour ne PAS bloquer une inscription
 * légitime. La création échouera proprement côté Supabase si l'email
 * est réellement pris.
 */
export async function checkEmailExists(email: string): Promise<EmailExistsResult> {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return { exists: false, role: null };

  try {
    const { data, error } = await supabase.functions.invoke("check-email-exists", {
      body: { email: cleanEmail },
    });
    if (error) {
      console.warn("[checkEmailExists] invoke error", error);
      return { exists: false, role: null };
    }
    return {
      exists: Boolean(data?.exists),
      role: (data?.role ?? null) as ExistingAccountRole,
    };
  } catch (err) {
    console.warn("[checkEmailExists] unexpected error", err);
    return { exists: false, role: null };
  }
}

/**
 * Construit le message utilisateur + URL de connexion adaptée
 * en fonction du rôle existant détecté.
 */
export function buildExistingAccountMessage(role: ExistingAccountRole): {
  message: string;
  loginPath: string;
} {
  switch (role) {
    case "driver":
      return {
        message:
          "Un compte chauffeur existe déjà avec cet email. Connectez-vous pour accéder à votre tableau de bord.",
        loginPath: "/login?redirect=/driver-dashboard",
      };
    case "client":
      return {
        message:
          "Un compte client existe déjà avec cet email. Connectez-vous pour réserver votre course.",
        loginPath: "/login?redirect=/client-dashboard",
      };
    case "admin":
      return {
        message: "Un compte administrateur existe déjà avec cet email. Veuillez vous connecter.",
        loginPath: "/login",
      };
    default:
      return {
        message:
          "Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
        loginPath: "/login",
      };
  }
}
