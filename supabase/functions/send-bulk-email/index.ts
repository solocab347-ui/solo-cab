import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Non autorisé");
    }

    // Vérifier le rôle admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Accès non autorisé - admin uniquement");
    }

    const { subject, content, recipient_type, recipient_ids } = await req.json();

    if (!subject || !content || !recipient_type) {
      throw new Error("Paramètres manquants");
    }

    // Récupérer les emails des destinataires
    let recipients: string[] = [];

    if (recipient_type === "all_drivers") {
      const { data: drivers, error } = await supabaseClient
        .from("drivers")
        .select("profiles:user_id(email)")
        .eq("status", "validated");

      if (error) throw error;
      recipients = drivers?.map((d: any) => d.profiles.email).filter(Boolean) || [];
    } else if (recipient_type === "all_clients") {
      const { data: clients, error } = await supabaseClient
        .from("clients")
        .select("profiles:user_id(email)");

      if (error) throw error;
      recipients = clients?.map((c: any) => c.profiles.email).filter(Boolean) || [];
    } else if (recipient_type === "specific_drivers") {
      if (!recipient_ids || recipient_ids.length === 0) {
        throw new Error("Aucun chauffeur sélectionné");
      }

      const { data: drivers, error } = await supabaseClient
        .from("drivers")
        .select("profiles:user_id(email)")
        .in("id", recipient_ids);

      if (error) throw error;
      recipients = drivers?.map((d: any) => d.profiles.email).filter(Boolean) || [];
    } else if (recipient_type === "specific_clients") {
      if (!recipient_ids || recipient_ids.length === 0) {
        throw new Error("Aucun client sélectionné");
      }

      const { data: clients, error } = await supabaseClient
        .from("clients")
        .select("profiles:user_id(email)")
        .in("id", recipient_ids);

      if (error) throw error;
      recipients = clients?.map((c: any) => c.profiles.email).filter(Boolean) || [];
    }

    if (recipients.length === 0) {
      throw new Error("Aucun destinataire trouvé");
    }

    // Initialiser Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");

    // Envoyer les emails (en batch de 50 max)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    let successCount = 0;
    const errors = [];

    for (const batch of batches) {
      try {
        await resend.emails.send({
          from: "SoloCab <noreply@solocab.fr>",
          to: batch,
          subject: subject,
          html: content,
        });
        successCount += batch.length;
      } catch (error: any) {
        console.error("Erreur envoi batch:", error);
        errors.push(error.message);
      }
    }

    // Enregistrer dans l'historique
    await supabaseClient.from("email_history").insert({
      subject,
      content,
      recipient_type,
      recipient_ids: recipient_ids || [],
      recipients_count: successCount,
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: successCount,
        total_recipients: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending bulk email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
