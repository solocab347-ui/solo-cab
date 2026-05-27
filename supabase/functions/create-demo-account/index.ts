// One-off: create a demo client account for Apple review team
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "demo.apple@solocab.fr";
  const password = "AppleReview2026!";
  const fullName = "Apple Review Demo";
  const phone = "+33600000000";

  // Check if user exists
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list?.users.find((u) => u.email === email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    user = data.user!;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  // Profile
  await admin.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    phone,
    email,
    onboarding_completed: true,
    preferred_language: "fr",
  });

  // Client record
  const { data: existingClient } = await admin.from("clients").select("id").eq("user_id", user.id).maybeSingle();
  if (!existingClient) {
    await admin.from("clients").insert({
      user_id: user.id,
      is_exclusive: false,
      driver_ids: [],
    });
  }

  // Role
  await admin.rpc("assign_user_role", { p_user_id: user.id, p_role: "client" });

  return new Response(
    JSON.stringify({ ok: true, email, password, user_id: user.id }),
    { headers: { ...corsHeaders, "content-type": "application/json" } }
  );
});
