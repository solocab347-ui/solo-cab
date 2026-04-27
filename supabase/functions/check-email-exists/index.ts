// Edge function: check-email-exists
// Vérifie si une adresse email est déjà inscrite, et de quel type de compte il s'agit.
// Public (verify_jwt = false) — utilisée AVANT signUp pour éviter les doublons silencieux
// (Supabase ne renvoie plus toujours d'erreur "already registered" depuis 2024 par sécurité).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "driver" | "client" | "admin" | "unknown" | null;

interface CheckResponse {
  exists: boolean;
  role: Role;
  message?: string;
}

const json = (body: CheckResponse, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json().catch(() => ({ email: "" }));
    const cleanEmail = String(email || "").trim().toLowerCase();

    // Validation basique format email
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ exists: false, role: null, message: "Email invalide" }, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Recherche dans auth.users via Admin API (paginated)
    //    On utilise listUsers (max 1000 par page) avec un filtre côté client.
    //    Pour de gros volumes, prévoir une RPC SECURITY DEFINER dédiée.
    let foundUserId: string | null = null;
    let page = 1;
    const perPage = 1000;
    while (page <= 5) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[check-email-exists] listUsers error", error);
        break;
      }
      const match = data.users.find((u) => (u.email || "").toLowerCase() === cleanEmail);
      if (match) {
        foundUserId = match.id;
        break;
      }
      if (data.users.length < perPage) break;
      page += 1;
    }

    if (!foundUserId) {
      return json({ exists: false, role: null });
    }

    // 2) Déterminer le rôle pour proposer la bonne page de connexion
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", foundUserId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const role = (roleRow?.role as Role) ?? "unknown";
    return json({ exists: true, role });
  } catch (err) {
    console.error("[check-email-exists] unexpected error", err);
    // En cas d'erreur, on ne bloque PAS l'inscription côté client (fail-open).
    return json({ exists: false, role: null, message: "check_failed" }, 200);
  }
});
