// Mise à jour du RIB d'un chauffeur sur son compte Stripe Connect Express.
// Stratégie en cascade :
//  1) Tentative API directe via bank account token (Stripe Elements côté client)
//  2) Fallback : Account Link Stripe (account_update) si l'API refuse
// Sécurité : rate-limit 3 changements / 30 jours, audit log complet.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { action: "update_with_token"; bank_token: string }
  | { action: "create_account_link"; return_url: string; refresh_url: string }
  | { action: "get_status" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Invalid token");
    const userId = userData.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("id, stripe_connect_account_id, bank_account_last4, bank_account_bank_name, bank_account_country, bank_account_updated_at")
      .eq("user_id", userId)
      .single();
    if (driverErr || !driver) throw new Error("Driver not found");
    if (!driver.stripe_connect_account_id) throw new Error("No Stripe Connect account configured");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

    const accountId = driver.stripe_connect_account_id;
    const body = (await req.json()) as Action;

    // ========== GET STATUS ==========
    if (body.action === "get_status") {
      const account = await stripe.accounts.retrieve(accountId);
      const externalAccounts = (account.external_accounts?.data ?? []) as Stripe.BankAccount[];
      const defaultBank = externalAccounts.find(
        (ba) => ba.object === "bank_account" && ba.default_for_currency
      );

      // Rate-limit info
      const { data: rateLimit } = await supabase.rpc("check_rib_change_allowed", {
        _driver_id: driver.id,
      });

      return json({
        has_bank_account: !!defaultBank,
        bank_account: defaultBank
          ? {
              id: defaultBank.id,
              last4: defaultBank.last4,
              bank_name: defaultBank.bank_name,
              country: defaultBank.country,
              currency: defaultBank.currency,
              status: defaultBank.status,
              fingerprint: defaultBank.fingerprint,
            }
          : null,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled,
        rate_limit: rateLimit,
        updated_at: driver.bank_account_updated_at,
      });
    }

    // ========== CREATE ACCOUNT LINK (fallback) ==========
    if (body.action === "create_account_link") {
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_update",
        refresh_url: body.refresh_url,
        return_url: body.return_url,
        collect: "currently_due",
      });
      return json({ url: link.url, expires_at: link.expires_at });
    }

    // ========== UPDATE WITH TOKEN (chemin idéal) ==========
    if (body.action === "update_with_token") {
      // 1. Vérifier rate-limit
      const { data: rateLimitCheck } = await supabase.rpc("check_rib_change_allowed", {
        _driver_id: driver.id,
      });
      if (rateLimitCheck && !rateLimitCheck.allowed) {
        return json(
          { error: rateLimitCheck.message ?? "Rate limit exceeded", rate_limit: rateLimitCheck },
          429
        );
      }

      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const userAgent = req.headers.get("user-agent") ?? null;

      // 2. Récupérer ancien RIB pour audit
      const account = await stripe.accounts.retrieve(accountId);
      const externalAccounts = (account.external_accounts?.data ?? []) as Stripe.BankAccount[];
      const oldDefault = externalAccounts.find((ba) => ba.default_for_currency);

      try {
        // 3. Ajouter le nouveau RIB et le définir comme défaut
        const newBank = (await stripe.accounts.createExternalAccount(accountId, {
          external_account: body.bank_token,
          default_for_currency: true,
        })) as Stripe.BankAccount;

        // 4. Supprimer l'ancien (s'il existe et différent)
        if (oldDefault && oldDefault.id !== newBank.id) {
          try {
            await stripe.accounts.deleteExternalAccount(accountId, oldDefault.id);
          } catch (delErr) {
            console.warn("Could not delete old bank account:", delErr);
          }
        }

        // 5. Mettre à jour la copie locale (sans IBAN)
        await supabase
          .from("drivers")
          .update({
            bank_account_last4: newBank.last4,
            bank_account_bank_name: newBank.bank_name,
            bank_account_country: newBank.country,
            bank_account_updated_at: new Date().toISOString(),
          })
          .eq("id", driver.id);

        // 6. Audit log
        await supabase.from("rib_change_history").insert({
          driver_id: driver.id,
          changed_by_user_id: userId,
          change_method: "stripe_elements",
          old_bank_account_id: oldDefault?.id ?? null,
          old_last4: oldDefault?.last4 ?? null,
          old_fingerprint: oldDefault?.fingerprint ?? null,
          new_bank_account_id: newBank.id,
          new_last4: newBank.last4,
          new_fingerprint: newBank.fingerprint,
          new_bank_name: newBank.bank_name,
          new_country: newBank.country,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: true,
        });

        // 7. Trigger retry des virements échoués (fire-and-forget)
        try {
          await supabase.functions.invoke("retry-failed-transfers", {
            body: { driver_id: driver.id, trigger: "rib_updated" },
          });
        } catch (retryErr) {
          console.warn("Retry trigger failed (non-blocking):", retryErr);
        }

        return json({
          success: true,
          bank_account: {
            id: newBank.id,
            last4: newBank.last4,
            bank_name: newBank.bank_name,
            country: newBank.country,
          },
        });
      } catch (stripeErr: any) {
        // Audit log de l'échec
        await supabase.from("rib_change_history").insert({
          driver_id: driver.id,
          changed_by_user_id: userId,
          change_method: "stripe_elements",
          old_bank_account_id: oldDefault?.id ?? null,
          old_last4: oldDefault?.last4 ?? null,
          success: false,
          error_message: stripeErr.message,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return json(
          {
            error: stripeErr.message,
            code: stripeErr.code,
            requires_account_link: stripeErr.code === "account_invalid" || stripeErr.code === "verification_required",
          },
          400
        );
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("update-driver-bank-account error:", err);
    return json({ error: err.message }, 400);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
