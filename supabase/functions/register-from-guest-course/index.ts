import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { email, password, full_name, phone, guest_token } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "weak_password" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to locate the guest course either by token, by email, or by phone
    const _phone = (phone || "").replace(/\s+/g, "");
    let course: any = null;
    if (guest_token) {
      const { data } = await admin
        .from("courses")
        .select("id, guest_email, guest_phone, guest_name")
        .eq("guest_tracking_token", guest_token)
        .eq("is_guest_booking", true)
        .maybeSingle();
      course = data;
    }
    if (!course) {
      // Fallback: find any unclaimed guest course matching email/phone
      const { data } = await admin
        .from("courses")
        .select("id, guest_email, guest_phone, guest_name")
        .eq("is_guest_booking", true)
        .is("client_id", null)
        .or(`guest_email.eq.${email.toLowerCase()},guest_phone.eq.${_normPhone}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      course = data;
    }

    // Course is OPTIONAL: if no guest course exists, we still create the
    // account normally with auto-confirmation (user came from booking flow).
    const hasGuestCourse = !!course;

    // Check if email already exists — if so, just claim the course (do not auto-login)
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;
    let createdNew = false;

    if (existing) {
      userId = existing.id;
      // If the existing user wasn't confirmed, confirm them now (originated from a real booking flow)
      if (!existing.email_confirmed_at) {
        await admin.auth.admin.updateUserById(userId, {
          email_confirm: true,
          phone_confirm: !!_phone,
          password, // re-set password so the user can log in with the one they just typed
        });
      }
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        phone: _phone || undefined,
        phone_confirm: _phone ? true : undefined,
        user_metadata: { full_name: full_name || course?.guest_name, phone: _phone },
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ success: false, error: createErr?.message || "create_failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created.user.id;
      createdNew = true;

      await admin.from("profiles").upsert({
        id: userId,
        full_name: full_name || course?.guest_name,
        phone: phone || course?.guest_phone,
        email: email.toLowerCase(),
      });

      await admin.from("user_roles").upsert(
        { user_id: userId, role: "client" },
        { onConflict: "user_id,role" }
      );
    }

    // Ensure client record (the AFTER INSERT trigger will auto-claim guest courses by email/phone)
    let { data: client } = await admin
      .from("clients").select("id").eq("user_id", userId).maybeSingle();

    if (!client) {
      const { data: newClient, error: cErr } = await admin
        .from("clients")
        .insert({ user_id: userId, is_exclusive: false, driver_ids: [] })
        .select("id").single();
      if (cErr) {
        return new Response(JSON.stringify({ success: false, error: cErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      client = newClient;
    }

    // If we have a token, also explicitly claim that one (defensive)
    if (guest_token) {
      try {
        await admin.rpc("claim_guest_course_for_user" as any, {
          _token: guest_token,
          _user_id: userId,
        });
      } catch { /* non-blocking */ }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      client_id: client!.id,
      course_id: course.id,
      created_new: createdNew,
      email_existed: !!existing,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
