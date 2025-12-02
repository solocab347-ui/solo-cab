import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    
    // SECURITY: Always verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }), 
        { status: 500 }
      );
    }
    
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("[STRIPE-WEBHOOK] ✓ Signature verified");

    console.log("[STRIPE-WEBHOOK] Event received:", event.type);

    // Handle subscription events for driver subscriptions
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[STRIPE-WEBHOOK] Subscription event:", subscription.id, subscription.status);

      const driverId = subscription.metadata?.driver_id;
      if (driverId) {
        const { error } = await supabaseClient
          .from("drivers")
          .update({
            subscription_status: subscription.status === "active" ? "active" : subscription.status,
            subscription_stripe_id: subscription.id,
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("id", driverId);

        if (error) {
          console.error("[STRIPE-WEBHOOK] Error updating driver subscription:", error);
        } else {
          console.log("[STRIPE-WEBHOOK] Driver subscription updated:", driverId);
        }
      }
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[STRIPE-WEBHOOK] Subscription cancelled:", subscription.id);

      const driverId = subscription.metadata?.driver_id;
      if (driverId) {
        const { error } = await supabaseClient
          .from("drivers")
          .update({
            subscription_status: "canceled",
            subscription_stripe_id: null,
            subscription_end_date: null,
          })
          .eq("id", driverId);

        if (error) {
          console.error("[STRIPE-WEBHOOK] Error cancelling driver subscription:", error);
        } else {
          console.log("[STRIPE-WEBHOOK] Driver subscription cancelled:", driverId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle successful payment for courses AND driver registration
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[STRIPE-WEBHOOK] Processing payment:", session.id);

      const metadata = session.metadata;
      
      // CAS 1: Paiement d'inscription driver (driver_id sans devis_id)
      if (metadata?.driver_id && !metadata?.devis_id) {
        const driverId = metadata.driver_id;
        console.log("[STRIPE-WEBHOOK] 💳 Driver registration payment:", driverId);

        // Mettre à jour le statut de paiement du driver
        const { error: driverError } = await supabaseClient
          .from("drivers")
          .update({
            subscription_paid: true,
            subscription_status: "active",
            registration_step: null,
            registration_data: null
          })
          .eq("id", driverId);

        if (driverError) {
          console.error("[STRIPE-WEBHOOK] Error updating driver payment:", driverError);
          throw driverError;
        }

        console.log("[STRIPE-WEBHOOK] ✅ Driver registration payment validated");

        // Envoyer l'email "dossier reçu en attente de validation"
        try {
          await supabaseClient.functions.invoke("send-driver-registration-email", {
            body: { driver_id: driverId }
          });
          console.log("[STRIPE-WEBHOOK] Registration email sent to driver");
        } catch (emailError) {
          console.error("[STRIPE-WEBHOOK] Error sending registration email:", emailError);
          // Ne pas bloquer le webhook si l'email échoue
        }

        // NOUVEAU: Envoyer email à l'admin pour notification de dossier en attente
        try {
          await supabaseClient.functions.invoke("send-admin-driver-pending", {
            body: { driver_id: driverId }
          });
          console.log("[STRIPE-WEBHOOK] Admin notification email sent");
        } catch (adminEmailError) {
          console.error("[STRIPE-WEBHOOK] Error sending admin notification:", adminEmailError);
          // Ne pas bloquer le webhook si l'email échoue
        }

        return new Response(JSON.stringify({ received: true, type: "driver_registration" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // CAS 2: Paiement de course (devis_id + course_id)
      if (!metadata?.devis_id || !metadata?.course_id) {
        console.error("[STRIPE-WEBHOOK] Unknown payment type - no driver_id or devis_id");
        throw new Error("Missing metadata in session");
      }

      const devis_id = metadata.devis_id;
      const course_id = metadata.course_id;
      const driver_id = metadata.driver_id;
      const client_id = metadata.client_id;

      console.log("[STRIPE-WEBHOOK] Devis:", devis_id, "Course:", course_id);

      // 1. Update devis status to accepted
      const { error: devisError } = await supabaseClient
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devis_id);

      if (devisError) {
        console.error("[STRIPE-WEBHOOK] Error updating devis:", devisError);
        throw devisError;
      }
      console.log("[STRIPE-WEBHOOK] Devis updated to accepted");

      // 2. Update course status to accepted
      const { error: courseError } = await supabaseClient
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", course_id);

      if (courseError) {
        console.error("[STRIPE-WEBHOOK] Error updating course:", courseError);
        throw courseError;
      }
      console.log("[STRIPE-WEBHOOK] Course updated to accepted");

      // 3. Generate invoice number
      const { data: invoiceNumberData, error: invoiceNumberError } = await supabaseClient
        .rpc("generate_invoice_number", { _driver_id: driver_id });

      if (invoiceNumberError) {
        console.error("[STRIPE-WEBHOOK] Error generating invoice number:", invoiceNumberError);
        throw invoiceNumberError;
      }
      const invoiceNumber = invoiceNumberData;
      console.log("[STRIPE-WEBHOOK] Invoice number generated:", invoiceNumber);

      // 4. Get devis amount
      const { data: devisData } = await supabaseClient
        .from("devis")
        .select("amount")
        .eq("id", devis_id)
        .single();

      // 5. Create facture
      const { error: factureError } = await supabaseClient
        .from("factures")
        .insert({
          invoice_number: invoiceNumber,
          course_id: course_id,
          driver_id: driver_id,
          client_id: client_id,
          devis_id: devis_id,
          amount: devisData?.amount || 0,
          payment_status: "paid",
          payment_method: "stripe",
          stripe_payment_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        });

      if (factureError) {
        console.error("[STRIPE-WEBHOOK] Error creating facture:", factureError);
        throw factureError;
      }
      console.log("[STRIPE-WEBHOOK] Facture created:", invoiceNumber);

      // 6. Send confirmation email
      try {
        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", (await supabaseClient
            .from("clients")
            .select("user_id")
            .eq("id", client_id)
            .single()).data?.user_id)
          .single();

        const { data: courseData } = await supabaseClient
          .from("courses")
          .select("pickup_address, destination_address, scheduled_date")
          .eq("id", course_id)
          .single();

        if (profileData && courseData) {
          await resend.emails.send({
            from: "SoloCab <noreply@solocab.fr>",
            to: [profileData.email],
            subject: "Paiement confirmé - Votre course est réservée !",
            html: `
              <h1>Paiement confirmé !</h1>
              <p>Bonjour ${profileData.full_name},</p>
              <p>Votre paiement a été confirmé et votre course est maintenant réservée.</p>
              <h2>Détails de la course :</h2>
              <ul>
                <li><strong>Départ :</strong> ${courseData.pickup_address}</li>
                <li><strong>Arrivée :</strong> ${courseData.destination_address}</li>
                <li><strong>Date :</strong> ${new Date(courseData.scheduled_date).toLocaleDateString('fr-FR')}</li>
                <li><strong>Facture :</strong> ${invoiceNumber}</li>
              </ul>
              <p>Merci d'avoir choisi SoloCab !</p>
            `,
          });
          console.log("[STRIPE-WEBHOOK] Confirmation email sent");
        }
      } catch (emailError) {
        console.error("[STRIPE-WEBHOOK] Error sending email:", emailError);
        // Don't throw - email is not critical
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[STRIPE-WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
});
