import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

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
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 500 });
    }
    
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("✓ Signature verified", { type: event.type });

    // ========================================
    // DRIVER SUBSCRIPTION EVENTS
    // ========================================
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata || {};
      const driverId = metadata.driver_id;
      const fleetManagerId = metadata.fleet_manager_id;
      const isPioneer = metadata.is_pioneer === "true";
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
      
      // Handle DRIVER subscriptions
      if (driverId && metadata.type !== "fleet_manager_subscription") {
        const effectiveStatus = (subscription.status === "active" || subscription.status === "trialing") ? "active" : subscription.status;
        
        const updateData: Record<string, unknown> = {
          subscription_status: effectiveStatus,
          subscription_stripe_id: subscription.id,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        };
        
        if (customerId) {
          updateData.stripe_customer_id = customerId;
        }
        
        // CRITICAL FIX: Set subscription_paid=true for ALL trialing or active subscriptions
        // Not just Pioneer subscriptions - standard trial also counts as paid
        if (subscription.status === "trialing" || subscription.status === "active") {
          updateData.subscription_paid = true;
        }
        
        const { error } = await supabaseClient
          .from("drivers")
          .update(updateData)
          .eq("id", driverId);

        if (error) {
          logStep("ERROR updating driver subscription", { error: error.message });
        } else {
          logStep("Driver subscription updated", { driverId, status: effectiveStatus, isPioneer });
        }
      }
      
      // Handle FLEET MANAGER subscriptions
      if (fleetManagerId || metadata.type === "fleet_manager_subscription") {
        const fmId = fleetManagerId || metadata.fleet_manager_id;
        const isTrialing = subscription.status === "trialing";
        const isActive = subscription.status === "active" || isTrialing;
        
        const updateData: Record<string, unknown> = {
          subscription_status: isTrialing ? "trialing" : (isActive ? "active" : subscription.status),
          subscription_stripe_id: subscription.id,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          subscription_paid: isActive,
        };
        
        if (customerId) {
          updateData.stripe_customer_id = customerId;
        }
        
        // Set trial dates if trialing
        if (isTrialing && subscription.trial_end) {
          updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
          if (subscription.trial_start) {
            updateData.trial_started_at = new Date(subscription.trial_start * 1000).toISOString();
          }
        }
        
        const { error } = await supabaseClient
          .from("fleet_managers")
          .update(updateData)
          .eq("id", fmId);

        if (error) {
          logStep("ERROR updating fleet manager subscription", { error: error.message });
        } else {
          logStep("Fleet manager subscription updated", { fleetManagerId: fmId, status: subscription.status, isTrialing });
        }
      }
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // SUBSCRIPTION CANCELLED
    // ========================================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata || {};
      const driverId = metadata.driver_id;
      const fleetManagerId = metadata.fleet_manager_id;

      // Driver subscription cancelled
      if (driverId && metadata.type !== "fleet_manager_subscription") {
        const { error } = await supabaseClient
          .from("drivers")
          .update({
            subscription_status: "canceled",
            subscription_stripe_id: null,
            subscription_end_date: null,
            subscription_paid: false,
          })
          .eq("id", driverId);

        if (error) {
          logStep("ERROR cancelling driver subscription", { error: error.message });
        } else {
          logStep("Driver subscription cancelled", { driverId });
        }
      }
      
      // Fleet manager subscription cancelled
      if (fleetManagerId || metadata.type === "fleet_manager_subscription") {
        const fmId = fleetManagerId || metadata.fleet_manager_id;
        const { error } = await supabaseClient
          .from("fleet_managers")
          .update({
            subscription_status: "canceled",
            subscription_stripe_id: null,
            subscription_end_date: null,
            subscription_paid: false,
          })
          .eq("id", fmId);

        if (error) {
          logStep("ERROR cancelling fleet manager subscription", { error: error.message });
        } else {
          logStep("Fleet manager subscription cancelled", { fleetManagerId: fmId });
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // INVOICE PAID (after trial ends)
    // ========================================
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        // Get subscription to check metadata
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
        const metadata = subscription.metadata || {};
        
        // Fleet manager invoice paid
        if (metadata.type === "fleet_manager_subscription" || metadata.fleet_manager_id) {
          const fmId = metadata.fleet_manager_id;
          
          const { error } = await supabaseClient
            .from("fleet_managers")
            .update({
              subscription_status: "active",
              subscription_paid: true,
              subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
              next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", fmId);

          if (error) {
            logStep("ERROR updating fleet manager after invoice paid", { error: error.message });
          } else {
            logStep("Fleet manager invoice paid - subscription activated", { fleetManagerId: fmId, amount: invoice.amount_paid });
          }
        }
        
        // Driver invoice paid
        if (metadata.driver_id && metadata.type !== "fleet_manager_subscription") {
          const { error } = await supabaseClient
            .from("drivers")
            .update({
              subscription_status: "active",
              subscription_paid: true,
              subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", metadata.driver_id);

          if (error) {
            logStep("ERROR updating driver after invoice paid", { error: error.message });
          } else {
            logStep("Driver invoice paid", { driverId: metadata.driver_id });
          }
        }
      }
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // INVOICE PAYMENT FAILED
    // ========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription;
      
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
        const metadata = subscription.metadata || {};
        
        // Fleet manager payment failed
        if (metadata.type === "fleet_manager_subscription" || metadata.fleet_manager_id) {
          logStep("Fleet manager payment failed", { 
            fleetManagerId: metadata.fleet_manager_id, 
            amount: invoice.amount_due 
          });
          
          // Could send notification email here
        }
        
        // Driver payment failed
        if (metadata.driver_id && metadata.type !== "fleet_manager_subscription") {
          logStep("Driver payment failed", { 
            driverId: metadata.driver_id, 
            amount: invoice.amount_due 
          });
        }
      }
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // CHECKOUT SESSION COMPLETED
    // ========================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      // CASE 1: Driver registration payment
      if (metadata.driver_id && !metadata.devis_id && metadata.type !== "fleet_manager_subscription") {
        const driverId = metadata.driver_id;
        logStep("Driver registration payment", { driverId });

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
          logStep("ERROR updating driver payment", { error: driverError.message });
          throw driverError;
        }

        logStep("✅ Driver registration payment validated");

        // Send emails
        try {
          await supabaseClient.functions.invoke("send-driver-registration-email", {
            body: { driver_id: driverId }
          });
          await supabaseClient.functions.invoke("send-admin-driver-pending", {
            body: { driver_id: driverId }
          });
        } catch (emailError) {
          logStep("Email sending error (non-blocking)", { error: String(emailError) });
        }

        return new Response(JSON.stringify({ received: true, type: "driver_registration" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // CASE 2: Fleet manager subscription checkout completed
      if (metadata.type === "fleet_manager_subscription" || metadata.fleet_manager_id) {
        const fmId = metadata.fleet_manager_id;
        logStep("Fleet manager subscription checkout completed", { fleetManagerId: fmId });

        // Subscription status will be updated via subscription.created/updated webhook
        return new Response(JSON.stringify({ received: true, type: "fleet_manager_subscription" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // CASE 3: Course payment (devis_id + course_id)
      if (metadata.devis_id && metadata.course_id) {
        const devis_id = metadata.devis_id;
        const course_id = metadata.course_id;
        const driver_id = metadata.driver_id;
        const client_id = metadata.client_id;

        logStep("Course payment", { devisId: devis_id, courseId: course_id });

        // Update devis
        const { error: devisError } = await supabaseClient
          .from("devis")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", devis_id);

        if (devisError) throw devisError;

        // Update course
        const { error: courseError } = await supabaseClient
          .from("courses")
          .update({ status: "accepted" })
          .eq("id", course_id);

        if (courseError) throw courseError;

        // Generate invoice
        const { data: invoiceNumberData, error: invoiceNumberError } = await supabaseClient
          .rpc("generate_invoice_number", { _driver_id: driver_id });

        if (invoiceNumberError) throw invoiceNumberError;

        const invoiceNumber = invoiceNumberData;

        // Get devis amount
        const { data: devisData } = await supabaseClient
          .from("devis")
          .select("amount")
          .eq("id", devis_id)
          .single();

        // Create facture
        const { error: factureError } = await supabaseClient
          .from("factures")
          .insert({
            invoice_number: invoiceNumber,
            course_id,
            driver_id,
            client_id,
            devis_id,
            amount: devisData?.amount || 0,
            payment_status: "paid",
            payment_method: "stripe",
            stripe_payment_id: session.payment_intent as string,
            paid_at: new Date().toISOString(),
          });

        if (factureError) throw factureError;

        logStep("✅ Course payment completed", { invoiceNumber });

        // Send confirmation email
        try {
          const { data: clientData } = await supabaseClient
            .from("clients")
            .select("user_id")
            .eq("id", client_id)
            .single();

          if (clientData?.user_id) {
            const { data: profileData } = await supabaseClient
              .from("profiles")
              .select("email, full_name")
              .eq("id", clientData.user_id)
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
            }
          }
        } catch (emailError) {
          logStep("Email error (non-blocking)", { error: String(emailError) });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400 });
  }
});
