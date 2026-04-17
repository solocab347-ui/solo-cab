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
    
    // CRITICAL: must use ASYNC variant in Deno (SubtleCrypto is async)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
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
      
      // Check if subscription is scheduled for cancellation
      const cancelAtPeriodEnd = subscription.cancel_at_period_end;
      const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null;
      
      // Handle DRIVER subscriptions
      if (driverId && metadata.type !== "fleet_manager_subscription") {
        const effectiveStatus = (subscription.status === "active" || subscription.status === "trialing") ? "active" : subscription.status;
        
        const updateData: Record<string, unknown> = {
          subscription_status: effectiveStatus,
          subscription_stripe_id: subscription.id,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          // Track cancellation scheduled status
          subscription_cancel_at_period_end: cancelAtPeriodEnd,
          subscription_cancel_at: cancelAt,
        };
        
        // If cancellation was reversed (user resumed subscription)
        if (!cancelAtPeriodEnd && subscription.status === "active") {
          updateData.subscription_canceled_at = null;
          logStep("Driver subscription resumed - cancellation reversed", { driverId });
        }
        
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
          logStep("Driver subscription updated", { 
            driverId, 
            status: effectiveStatus, 
            isPioneer,
            cancelAtPeriodEnd,
            cancelAt 
          });
          
          // Send notification if subscription is scheduled for cancellation
          if (cancelAtPeriodEnd && cancelAt) {
            try {
              const { data: driverData } = await supabaseClient
                .from("drivers")
                .select("user_id")
                .eq("id", driverId)
                .single();

              if (driverData?.user_id) {
                await supabaseClient.from("notifications").insert({
                  user_id: driverData.user_id,
                  type: "subscription_cancelling",
                  title: "📅 Résiliation programmée",
                  message: `Votre abonnement prendra fin le ${new Date(cancelAt).toLocaleDateString('fr-FR')}. Vous conservez l'accès complet jusqu'à cette date.`,
                  priority: "medium",
                  action_url: "/driver-dashboard?tab=subscription",
                });
                logStep("Cancellation notification sent", { userId: driverData.user_id, cancelAt });
              }
            } catch (notifError) {
              logStep("⚠️ Failed to create cancellation notification", { error: String(notifError) });
            }
          }
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
      const wasPioneer = metadata.is_pioneer === "true";

      // Driver subscription cancelled
      if (driverId && metadata.type !== "fleet_manager_subscription") {
        // IMPORTANT: If the driver was a Pioneer and cancels, they lose the Pioneer status permanently
        const updateData: Record<string, unknown> = {
          subscription_status: "canceled",
          subscription_stripe_id: null,
          subscription_end_date: null,
          subscription_paid: false,
          // Record cancellation date for grace period logic
          subscription_canceled_at: new Date().toISOString(),
        };

        // If Pioneer cancels after trial/subscription ends, they lose Pioneer status
        if (wasPioneer) {
          updateData.pioneer_status_lost = true;
          updateData.pioneer_status_lost_at = new Date().toISOString();
          logStep("Pioneer driver cancelled - will lose Pioneer status if not resubscribed", { driverId });
        }

        const { error } = await supabaseClient
          .from("drivers")
          .update(updateData)
          .eq("id", driverId);

        if (error) {
          logStep("ERROR cancelling driver subscription", { error: error.message });
        } else {
          logStep("Driver subscription cancelled", { driverId, wasPioneer });
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
            subscription_canceled_at: new Date().toISOString(),
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
    // INVOICE PAYMENT FAILED - AUTOMATED RECOVERY
    // ========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription;
      const attemptCount = invoice.attempt_count || 1;
      
      logStep("💳 Payment failed", { 
        subscriptionId, 
        attemptCount, 
        amountDue: invoice.amount_due,
        nextAttempt: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
          : 'none'
      });
      
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
        const metadata = subscription.metadata || {};
        
        // ========== DRIVER PAYMENT FAILED ==========
        if (metadata.driver_id && metadata.type !== "fleet_manager_subscription") {
          const driverId = metadata.driver_id;
          
          // 1. Update driver status to past_due
          const { error: updateError } = await supabaseClient
            .from("drivers")
            .update({
              subscription_status: "past_due",
              payment_failed_at: new Date().toISOString(),
              payment_failure_count: attemptCount,
            })
            .eq("id", driverId);

          if (updateError) {
            logStep("ERROR updating driver payment status", { error: updateError.message });
          } else {
            logStep("✅ Driver status updated to past_due", { driverId, attemptCount });
          }

          // 2. Send payment reminder email
          try {
            await supabaseClient.functions.invoke("send-payment-reminder-email", {
              body: { 
                driver_id: driverId, 
                reminder_type: "past_due",
                attempt_count: attemptCount
              }
            });
            logStep("✅ Payment reminder email sent to driver", { driverId });
          } catch (emailError) {
            logStep("⚠️ Failed to send payment reminder email", { error: String(emailError) });
          }

          // 3. Create notification in-app
          try {
            // Get driver user_id for notification
            const { data: driverData } = await supabaseClient
              .from("drivers")
              .select("user_id")
              .eq("id", driverId)
              .single();

            if (driverData?.user_id) {
              await supabaseClient.from("notifications").insert({
                user_id: driverData.user_id,
                type: "payment_failed",
                title: "⚠️ Échec de paiement",
                message: `Votre paiement de 19,99€ n'a pas pu être effectué (tentative ${attemptCount}). Mettez à jour votre carte pour éviter la suspension.`,
                priority: "high",
                action_url: "/driver-dashboard?tab=subscription",
              });
              logStep("✅ In-app notification created", { userId: driverData.user_id });
            }
          } catch (notifError) {
            logStep("⚠️ Failed to create notification", { error: String(notifError) });
          }
        }
        
        // ========== FLEET MANAGER PAYMENT FAILED ==========
        if (metadata.type === "fleet_manager_subscription" || metadata.fleet_manager_id) {
          const fmId = metadata.fleet_manager_id;
          
          // 1. Update fleet manager status
          const { error: updateError } = await supabaseClient
            .from("fleet_managers")
            .update({
              subscription_status: "past_due",
              payment_failed_at: new Date().toISOString(),
              payment_failure_count: attemptCount,
            })
            .eq("id", fmId);

          if (updateError) {
            logStep("ERROR updating fleet manager payment status", { error: updateError.message });
          } else {
            logStep("✅ Fleet manager status updated to past_due", { fmId, attemptCount });
          }

          // 2. Get fleet manager user_id and send notification
          try {
            const { data: fmData } = await supabaseClient
              .from("fleet_managers")
              .select("user_id")
              .eq("id", fmId)
              .single();

            if (fmData?.user_id) {
              await supabaseClient.from("notifications").insert({
                user_id: fmData.user_id,
                type: "payment_failed",
                title: "⚠️ Échec de paiement flotte",
                message: `Le paiement de votre abonnement flotte n'a pas pu être effectué (tentative ${attemptCount}). Mettez à jour votre mode de paiement.`,
                priority: "high",
                action_url: "/fleet-dashboard?tab=subscription",
              });
            }
          } catch (notifError) {
            logStep("⚠️ Failed to create fleet manager notification", { error: String(notifError) });
          }
        }
      }
      
      return new Response(JSON.stringify({ received: true, processed: "payment_failed" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // STRIPE CONNECT: ACCOUNT UPDATED (scalable auto-sync)
    // ========================================
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const accountId = account.id;
      
      logStep("Connect account.updated received", { 
        accountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });

      // Find driver by stripe_connect_account_id
      const { data: driver, error: driverError } = await supabaseClient
        .from("drivers")
        .select("id, user_id, stripe_connect_charges_enabled")
        .eq("stripe_connect_account_id", accountId)
        .maybeSingle();

      if (driver) {
        let connectStatus = "pending";
        if (account.charges_enabled && account.payouts_enabled) {
          connectStatus = "active";
        } else if (account.details_submitted) {
          connectStatus = "pending_verification";
        }

        const { error: updateError } = await supabaseClient
          .from("drivers")
          .update({
            stripe_connect_status: connectStatus,
            stripe_connect_charges_enabled: account.charges_enabled ?? false,
            stripe_connect_payouts_enabled: account.payouts_enabled ?? false,
            stripe_connect_onboarding_completed: account.details_submitted ?? false,
            stripe_connect_details_submitted: account.details_submitted ?? false,
            stripe_connect_updated_at: new Date().toISOString(),
          })
          .eq("id", driver.id);

        if (updateError) {
          logStep("ERROR updating driver Connect status", { error: updateError.message });
        } else {
          logStep("✅ Driver Connect status auto-synced", { 
            driverId: driver.id, 
            connectStatus,
            chargesEnabled: account.charges_enabled,
          });

          // Notify driver when newly activated
          if (account.charges_enabled && !driver.stripe_connect_charges_enabled && driver.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: driver.user_id,
              type: "info",
              title: "✅ Paiements activés",
              message: "Votre compte Stripe Connect est maintenant actif. Vous pouvez recevoir des paiements par carte !",
              priority: "high",
              action_url: "/driver-dashboard",
            });
          }
        }
      } else {
        logStep("No driver found for Connect account", { accountId });
      }

      return new Response(JSON.stringify({ received: true, processed: "account_updated" }), {
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

      // CASE 1: Driver subscription/registration payment
      // Handles both "driver_subscription" type and legacy driver registrations
      const isDriverSubscription = metadata.type === "driver_subscription" || 
        (metadata.driver_id && !metadata.devis_id && metadata.type !== "fleet_manager_subscription");
      
      if (isDriverSubscription && metadata.driver_id) {
        const driverId = metadata.driver_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        
        logStep("Driver subscription checkout completed", { 
          driverId, 
          customerId,
          subscriptionId,
          subscriptionType: metadata.subscription_type,
          withPlate: metadata.with_plate,
          paymentStatus: session.payment_status
        });

        // Prepare update data
        const updateData: Record<string, unknown> = {
          subscription_paid: true,
          subscription_status: "active",
          registration_step: null,
          registration_data: null,
        };

        // Add stripe_customer_id if available
        if (customerId) {
          updateData.stripe_customer_id = customerId;
        }

        // Add subscription ID if available (for subscription mode)
        if (subscriptionId) {
          updateData.subscription_stripe_id = subscriptionId;
        }

        const { error: driverError } = await supabaseClient
          .from("drivers")
          .update(updateData)
          .eq("id", driverId);

        if (driverError) {
          logStep("ERROR updating driver payment", { error: driverError.message });
          throw driverError;
        }

        logStep("✅ Driver subscription payment validated", { 
          driverId, 
          customerId, 
          subscriptionId 
        });

        // Update NFC plate order status if applicable AND update driver has_nfc_plate
        if (metadata.with_plate === "true" && session.id) {
          try {
            // Try to find existing order first
            const { data: existingOrder } = await supabaseClient
              .from("nfc_plate_orders")
              .select("id, qr_code_link, shipping_address, shipping_city, shipping_postal_code")
              .eq("stripe_checkout_session_id", session.id)
              .single();

            let plateOrderId: string | null = null;

            // If order doesn't exist, create it using metadata from checkout session
            if (!existingOrder && metadata.shipping_address) {
              const orderNumber = `NFC-${Date.now().toString(36).toUpperCase()}`;
              
              // Get driver info for QR link and profile data
              const { data: driverInfo } = await supabaseClient
                .from("drivers")
                .select("qr_code_url, user_id")
                .eq("id", driverId)
                .single();

              // Get user profile for name and phone
              const { data: profileData } = await supabaseClient
                .from("profiles")
                .select("full_name, phone, email")
                .eq("id", metadata.user_id)
                .single();

              const fullName = profileData?.full_name || '';
              const nameParts = fullName.split(' ');
              const siteUrl = Deno.env.get("SITE_URL") || "https://solocab.fr";
              const qrCodeLink = driverInfo?.qr_code_url || `${siteUrl}/chauffeur/${driverId}`;

              const hasValidAddress = metadata.shipping_address && 
                metadata.shipping_address !== '' && 
                metadata.shipping_city && 
                metadata.shipping_city !== '';

              const { data: newOrder, error: createError } = await supabaseClient
                .from("nfc_plate_orders")
                .insert({
                  email: profileData?.email || '',
                  first_name: nameParts[0] || '',
                  last_name: nameParts.slice(1).join(' ') || '',
                  phone: profileData?.phone || null,
                  shipping_address: metadata.shipping_address || 'À compléter',
                  shipping_city: metadata.shipping_city || 'À compléter',
                  shipping_postal_code: metadata.shipping_postal_code || '00000',
                  shipping_country: "France",
                  plate_type: metadata.plate_type || 'premium',
                  amount: metadata.plate_type === 'standard' ? 1199 : 2399,
                  driver_id: driverId,
                  qr_code_link: qrCodeLink,
                  payment_status: "paid",
                  delivery_status: hasValidAddress ? "pending" : "pending_address",
                  stripe_checkout_session_id: session.id,
                  order_number: orderNumber,
                })
                .select("id")
                .single();

              if (createError) throw createError;
              plateOrderId = newOrder?.id;
              logStep("✅ NFC plate order created from webhook metadata", { orderNumber, plateOrderId });
            } else if (existingOrder) {
              // Update existing order to paid
              const hasValidAddress = existingOrder.shipping_address && 
                existingOrder.shipping_address !== 'À compléter' &&
                existingOrder.shipping_city !== 'À compléter';

              await supabaseClient
                .from("nfc_plate_orders")
                .update({ 
                  payment_status: "paid",
                  delivery_status: hasValidAddress ? "pending" : "pending_address"
                })
                .eq("id", existingOrder.id);
              
              plateOrderId = existingOrder.id;
            }

            if (plateOrderId) {
              // Update driver with has_nfc_plate and nfc_plate_order_id
              await supabaseClient
                .from("drivers")
                .update({ 
                  has_nfc_plate: true,
                  nfc_plate_order_id: plateOrderId,
                  nfc_plate_ordered_at: new Date().toISOString(),
                })
                .eq("id", driverId);

              logStep("✅ NFC plate order marked as paid, driver updated", { plateOrderId });
            } else {
              logStep("⚠️ NFC plate order could not be found or created", { sessionId: session.id });
            }
          } catch (plateError) {
            logStep("⚠️ Failed to update plate order (non-blocking)", { error: String(plateError) });
          }
        }

        // Send emails
        try {
          await supabaseClient.functions.invoke("send-email", {
            body: { driver_id: driverId, type: "driver_registration" }
          });
          await supabaseClient.functions.invoke("send-admin-driver-pending", {
            body: { driver_id: driverId }
          });
        } catch (emailError) {
          logStep("Email sending error (non-blocking)", { error: String(emailError) });
        }

        return new Response(JSON.stringify({ received: true, type: "driver_subscription" }), {
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

        const { data: existingCourse } = await supabaseClient
          .from("courses")
          .select("status, course_finalized_by_driver_at")
          .eq("id", course_id)
          .maybeSingle();

        const isCourseClosed = ['completed', 'cancelled', 'refused'].includes(existingCourse?.status || '')
          || Boolean(existingCourse?.course_finalized_by_driver_at);

        logStep("Course payment", { devisId: devis_id, courseId: course_id });

        if (isCourseClosed) {
          logStep("Ignoring late course payment webhook for closed course", { courseId: course_id, status: existingCourse?.status });
          return new Response(JSON.stringify({ received: true, ignored: true, reason: "course_already_closed" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Update devis
        const { error: devisError } = await supabaseClient
          .from("devis")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", devis_id);

        if (devisError) throw devisError;

        // Update course
        const { error: courseError } = await supabaseClient
          .from("courses")
          .update({ status: "driver_approaching" })
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

      // CASE 4: Course payment via create-course-payment (with bank imprint support)
      if (metadata.type === "course_payment" && metadata.course_id) {
        const course_id = metadata.course_id;
        const driver_id = metadata.driver_id;
        const devis_id = metadata.devis_id;
        const capture_method = metadata.capture_method || "automatic";

        const { data: existingCourse } = await supabaseClient
          .from("courses")
          .select("status, course_finalized_by_driver_at")
          .eq("id", course_id)
          .maybeSingle();

        const isCourseClosed = ['completed', 'cancelled', 'refused'].includes(existingCourse?.status || '')
          || Boolean(existingCourse?.course_finalized_by_driver_at);

        logStep("Course payment (new flow)", { 
          courseId: course_id, 
          captureMethod: capture_method 
        });

        // Get payment intent details
        const paymentIntentId = session.payment_intent as string;
        const paymentIntent = paymentIntentId ? await stripe.paymentIntents.retrieve(paymentIntentId) : null;

        // Update course with payment info
        const courseUpdate: Record<string, unknown> = {
          stripe_payment_intent_id: paymentIntentId,
          stripe_checkout_session_id: session.id,
          payment_method: "stripe",
        };

        // If manual capture (bank imprint), payment is authorized but not captured yet
        if (capture_method === "manual" && paymentIntent?.status === "requires_capture") {
          courseUpdate.payment_status = "bank_imprint_captured";
          courseUpdate.bank_imprint_at = new Date().toISOString();
          logStep("Bank imprint captured, awaiting course completion", { paymentIntentId });
        } else if (paymentIntent?.status === "succeeded") {
          // Automatic capture - payment is complete
          courseUpdate.payment_status = "paid";
          courseUpdate.payment_captured_at = new Date().toISOString();
          if (!isCourseClosed) {
            courseUpdate.status = "driver_approaching";
          }

          // WEEKLY SETTLEMENT: Calculate SoloCab fee (always 0.50€ per course)
          const SOLOCAB_FEE = 0.50;
          courseUpdate.solocab_fee_amount = SOLOCAB_FEE;

          logStep("Payment captured automatically", { 
            amount: (paymentIntent.amount_received || 0) / 100 
          });
        }

        await supabaseClient
          .from("courses")
          .update(courseUpdate)
          .eq("id", course_id);

        // Update devis if exists
        if (devis_id) {
          await supabaseClient
            .from("devis")
            .update({ 
              status: capture_method === "manual" ? "bank_imprint" : "accepted",
              accepted_at: capture_method === "manual" ? null : new Date().toISOString()
            })
            .eq("id", devis_id);
        }

        // If automatic capture, generate invoice
        if (paymentIntent?.status === "succeeded") {
          try {
            await supabaseClient.functions.invoke("create-facture-auto", {
              body: { course_id }
            });
          } catch (invoiceError) {
            logStep("Invoice generation error (non-blocking)", { error: String(invoiceError) });
          }

          // Notify driver
          const { data: driverData } = await supabaseClient
            .from("drivers")
            .select("user_id")
            .eq("id", driver_id)
            .single();

          if (driverData?.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: driverData.user_id,
              title: "💳 Paiement client reçu",
              message: `Un client a payé ${((paymentIntent.amount_received || 0) / 100).toFixed(2)}€ pour une course.`,
              type: "info",
            });
          }
        }

        return new Response(JSON.stringify({ 
          received: true, 
          type: "course_payment",
          capture_method 
        }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // CASE 5: Shared course payment
      if (metadata.type === "shared_course_payment" && metadata.shared_course_id) {
        const sharedCourseId = metadata.shared_course_id;
        const courseId = metadata.course_id;
        const senderDriverId = metadata.sender_driver_id;
        const receiverDriverId = metadata.receiver_driver_id;
        // New commission model: fixed 15%(<30€) / 20%(≥30€) + 0.25€ SoloCab fee
        const commissionAmount = parseFloat(metadata.commission_amount || "0");
        const solocabFee = parseFloat(metadata.solocab_fee || "0.25");
        const senderStripeAccount = metadata.sender_stripe_account;

        logStep("Shared course payment completed", { 
          sharedCourseId, 
          courseId, 
          commissionAmount,
          senderStripeAccount 
        });

        // Update shared course payment record
        await supabaseClient
          .from("shared_course_payments")
          .update({
            stripe_payment_intent_id: session.payment_intent as string,
            status: "paid",
            payment_captured_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id);

        // Update shared course status
        await supabaseClient
          .from("shared_courses")
          .update({
            payment_status: "paid",
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", sharedCourseId);

        // Update course status
        await supabaseClient
          .from("courses")
          .update({ status: "completed" })
          .eq("id", courseId);

        // NETTING: Commission transfer is now DEFERRED to weekly settlement
        // Instead of immediate transfer, mark payment as completed for weekly batch processing
        if (senderStripeAccount && commissionAmount > 0) {
          await supabaseClient
            .from("shared_course_payments")
            .update({
              status: "completed",
              platform_fee: solocabFee || 0.25,
            })
            .eq("stripe_checkout_session_id", session.id);

          await supabaseClient
            .from("shared_courses")
            .update({ payment_status: "paid_pending_settlement" })
            .eq("id", sharedCourseId);

          // Notify sender that commission will be settled weekly
          const { data: senderData } = await supabaseClient
            .from("drivers")
            .select("user_id")
            .eq("id", senderDriverId)
            .single();

          if (senderData?.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: senderData.user_id,
              title: "💰 Revenus partenaire en attente",
              message: `${commissionAmount.toFixed(2)}€ de revenus partenaire enregistrés. Versement groupé chaque lundi.`,
              type: "info",
            });
          }

          logStep("Commission deferred to weekly settlement", {
            amount: commissionAmount,
            sender: senderDriverId,
          });
        }

        // Notify receiver driver
        const { data: receiverData } = await supabaseClient
          .from("drivers")
          .select("user_id")
          .eq("id", receiverDriverId)
          .single();

        if (receiverData?.user_id) {
          const totalAmount = parseFloat(session.amount_total?.toString() || "0") / 100;
          const receiverAmount = totalAmount - commissionAmount - solocabFee;
          await supabaseClient.from("notifications").insert({
            user_id: receiverData.user_id,
            title: "✅ Paiement course partagée reçu",
            message: `Le client a payé. Vous gardez ${receiverAmount.toFixed(2)}€ (rétribution ${commissionAmount.toFixed(2)}€ + frais 0.25€).`,
            type: "info",
          });
        }
      }

      // CASE 6: Deposit payment
      if (metadata.type === "deposit_payment" && metadata.course_id) {
        const course_id = metadata.course_id;
        const driver_id = metadata.driver_id;
        const deposit_percentage = parseInt(metadata.deposit_percentage || "0");
        const total_amount = parseFloat(metadata.total_amount || "0");
        const remaining_amount = parseFloat(metadata.remaining_amount || "0");

        logStep("Deposit payment completed", { 
          courseId: course_id,
          depositPercentage: deposit_percentage,
          remainingAmount: remaining_amount
        });

        const paymentIntentId = session.payment_intent as string;

        // Update course
        await supabaseClient
          .from("courses")
          .update({
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            deposit_stripe_payment_intent_id: paymentIntentId,
            deposit_status: "paid",
            status: "driver_approaching",
          })
          .eq("id", course_id);

        // Update deposit transaction
        await supabaseClient
          .from("deposit_transactions")
          .update({
            stripe_payment_intent_id: paymentIntentId,
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("course_id", course_id)
          .eq("transaction_type", "deposit");

        // Update devis if exists
        if (metadata.devis_id) {
          await supabaseClient
            .from("devis")
            .update({ 
              status: "deposit_paid",
            })
            .eq("id", metadata.devis_id);
        }

        // Notify driver
        const { data: driverData } = await supabaseClient
          .from("drivers")
          .select("user_id")
          .eq("id", driver_id)
          .single();

        if (driverData?.user_id) {
          const depositAmount = (session.amount_total || 0) / 100;
          await supabaseClient.from("notifications").insert({
            user_id: driverData.user_id,
            title: "💳 Acompte reçu",
            message: `Un client a versé un acompte de ${depositAmount.toFixed(2)}€ (${deposit_percentage}%). Reste à percevoir: ${remaining_amount.toFixed(2)}€`,
            type: "info",
          });
        }

        return new Response(JSON.stringify({ 
          received: true, 
          type: "deposit_payment",
          deposit_percentage 
        }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // CASE 7: Final payment (after deposit)
      if (metadata.type === "final_payment" && metadata.course_id) {
        const course_id = metadata.course_id;
        const driver_id = metadata.driver_id;
        const deposit_amount = parseFloat(metadata.deposit_amount || "0");

        logStep("Final payment completed", { 
          courseId: course_id,
          depositAmount: deposit_amount
        });

        const paymentIntentId = session.payment_intent as string;
        const finalAmount = (session.amount_total || 0) / 100;
        const totalPaid = deposit_amount + finalAmount;

        // Update course
        await supabaseClient
          .from("courses")
          .update({
            final_payment_status: "paid",
            final_payment_stripe_id: paymentIntentId,
            payment_status: "paid",
            payment_captured_at: new Date().toISOString(),
            status: "completed",
            deposit_status: "captured",
          })
          .eq("id", course_id);

        // Update final payment transaction
        await supabaseClient
          .from("deposit_transactions")
          .update({
            stripe_payment_intent_id: paymentIntentId,
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("course_id", course_id)
          .eq("transaction_type", "final_payment");

        // Generate invoice
        try {
          await supabaseClient.functions.invoke("create-facture-auto", {
            body: { course_id }
          });
        } catch (invoiceError) {
          logStep("Invoice generation error (non-blocking)", { error: String(invoiceError) });
        }

        // Notify driver
        const { data: driverData } = await supabaseClient
          .from("drivers")
          .select("user_id")
          .eq("id", driver_id)
          .single();

        if (driverData?.user_id) {
          await supabaseClient.from("notifications").insert({
            user_id: driverData.user_id,
            title: "✅ Paiement complet reçu",
            message: `Le client a réglé le solde de ${finalAmount.toFixed(2)}€. Total encaissé: ${totalPaid.toFixed(2)}€`,
            type: "info",
          });
        }

        return new Response(JSON.stringify({ 
          received: true, 
          type: "final_payment",
          total_paid: totalPaid
        }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // ========================================
    // PAYMENT INTENT EVENTS (course payments)
    // ========================================

    // payment_intent.amount_capturable_updated = Bank hold confirmed (manual capture)
    if (event.type === "payment_intent.amount_capturable_updated") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata || {};

      logStep("🔒 Bank hold confirmed (amount_capturable_updated)", { 
        piId: paymentIntent.id,
        courseId: metadata.course_id,
        amountCapturable: paymentIntent.amount_capturable / 100,
        status: paymentIntent.status,
      });

      if (metadata.course_id && paymentIntent.status === "requires_capture") {
        const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
          ? paymentIntent.payment_method 
          : paymentIntent.payment_method?.id;

        // Save payment method and confirm hold on course
        // IMPORTANT: do not auto-accept the course here.
        // A client card validation must never replace the explicit driver acceptance step.
        const courseUpdate: Record<string, unknown> = {
          payment_status: "bank_imprint_captured",
          bank_imprint_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_method_id: paymentMethodId || null,
          card_hold_status: "confirmed",
          card_hold_confirmed_at: new Date().toISOString(),
          card_hold_amount: paymentIntent.amount / 100,
        };

        await supabaseClient
          .from("courses")
          .update(courseUpdate)
          .eq("id", metadata.course_id);

        // Update devis to accepted
        if (metadata.devis_id) {
          await supabaseClient
            .from("devis")
            .update({ 
              status: "accepted",
              accepted_at: new Date().toISOString(),
            })
            .eq("id", metadata.devis_id);
        }

        // Record in payments table
        await supabaseClient.from("payments").insert({
          course_id: metadata.course_id,
          driver_id: metadata.driver_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: "requires_capture",
          payment_type: "bank_imprint",
          capture_method: "manual",
          authorized_at: new Date().toISOString(),
          metadata: metadata,
        }).onConflict("stripe_payment_intent_id").ignore();

        // Notify driver
        if (metadata.driver_id) {
          const { data: driverData } = await supabaseClient
            .from("drivers")
            .select("user_id")
            .eq("id", metadata.driver_id)
            .single();

          if (driverData?.user_id) {
            const amount = paymentIntent.amount / 100;
            await supabaseClient.from("notifications").insert({
              user_id: driverData.user_id,
              title: "✅ Empreinte bancaire validée",
              message: `Le client a confirmé son empreinte bancaire de ${amount.toFixed(2)}€. Vous pouvez maintenant confirmer la course si elle est encore en attente.`,
              type: "course_accepted",
              priority: "high",
              link: "/driver-dashboard?tab=courses",
            });
          }
        }

        logStep("✅ Bank hold confirmed without auto-accepting course", { courseId: metadata.course_id });
      }

      return new Response(JSON.stringify({ received: true, type: "payment_intent.amount_capturable_updated" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata || {};
      
      if (metadata.course_id && metadata.type === "course_final_payment") {
        logStep("PaymentIntent succeeded for course", { 
          courseId: metadata.course_id, 
          amount: paymentIntent.amount / 100 
        });

        // Record in payments table
        await supabaseClient.from("payments").insert({
          course_id: metadata.course_id,
          driver_id: metadata.driver_id,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge as string || null,
          amount: paymentIntent.amount / 100,
          captured_amount: paymentIntent.amount_received / 100,
          application_fee_amount: (paymentIntent.application_fee_amount || 0) / 100,
          status: "succeeded",
          payment_type: metadata.type || "course_payment",
          capture_method: paymentIntent.capture_method,
          authorized_at: new Date().toISOString(),
          captured_at: new Date().toISOString(),
          metadata: metadata,
        });
      }

      // Course payment captured (manual capture flow completed)
      if (metadata.course_id && metadata.type === "course_payment") {
        logStep("Course payment captured", { courseId: metadata.course_id });

        await supabaseClient
          .from("courses")
          .update({
            payment_status: "paid",
            payment_captured_at: new Date().toISOString(),
            final_payment_status: "succeeded",
          })
          .eq("id", metadata.course_id);

        // Generate invoice
        try {
          await supabaseClient.functions.invoke("create-facture-auto", {
            body: { course_id: metadata.course_id }
          });
        } catch (e) {
          logStep("Invoice generation error (non-blocking)", { error: String(e) });
        }
      }

      // Card hold captured
      if (metadata.type === "reservation_hold") {
        logStep("Card hold PaymentIntent succeeded", { 
          courseId: metadata.course_id 
        });

        await supabaseClient.from("payments").insert({
          course_id: metadata.course_id || null,
          driver_id: metadata.driver_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          captured_amount: paymentIntent.amount_received / 100,
          status: "succeeded",
          payment_type: "card_hold",
          capture_method: "manual",
          captured_at: new Date().toISOString(),
          metadata: metadata,
        });
      }

      return new Response(JSON.stringify({ received: true, type: "payment_intent.succeeded" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata || {};
      const lastError = paymentIntent.last_payment_error;

      logStep("PaymentIntent failed", { 
        piId: paymentIntent.id,
        courseId: metadata.course_id,
        error: lastError?.message 
      });

      if (metadata.course_id) {
        // Update course
        await supabaseClient
          .from("courses")
          .update({
            payment_status: "failed",
            last_payment_error: lastError?.message || "Payment failed",
            payment_retry_count: (await supabaseClient
              .from("courses")
              .select("payment_retry_count")
              .eq("id", metadata.course_id)
              .single()
            ).data?.payment_retry_count + 1 || 1,
          })
          .eq("id", metadata.course_id);

        // Record in payments table
        await supabaseClient.from("payments").insert({
          course_id: metadata.course_id,
          driver_id: metadata.driver_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: "failed",
          payment_type: metadata.type || "course_payment",
          last_error: lastError?.message || "Payment failed",
          failure_code: lastError?.code || null,
          failed_at: new Date().toISOString(),
          metadata: metadata,
        });

        // Notify driver
        if (metadata.driver_id) {
          const { data: driverData } = await supabaseClient
            .from("drivers")
            .select("user_id")
            .eq("id", metadata.driver_id)
            .single();

          if (driverData?.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: driverData.user_id,
              title: "❌ Échec de paiement client",
              message: `Le paiement de ${(paymentIntent.amount / 100).toFixed(2)}€ a échoué. Le client doit réessayer.`,
              type: "warning",
              priority: "high",
            });
          }
        }
      }

      return new Response(JSON.stringify({ received: true, type: "payment_intent.payment_failed" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (event.type === "payment_intent.canceled") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata || {};

      logStep("PaymentIntent canceled", { 
        piId: paymentIntent.id, 
        courseId: metadata.course_id 
      });

      if (metadata.course_id) {
        await supabaseClient
          .from("courses")
          .update({
            payment_status: "canceled",
            card_hold_status: metadata.type === "reservation_hold" ? "canceled" : undefined,
          })
          .eq("id", metadata.course_id);

        await supabaseClient.from("payments").insert({
          course_id: metadata.course_id,
          driver_id: metadata.driver_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: "canceled",
          payment_type: metadata.type || "course_payment",
          canceled_at: new Date().toISOString(),
          metadata: metadata,
        });
      }

      return new Response(JSON.stringify({ received: true, type: "payment_intent.canceled" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // SETUP INTENT SUCCEEDED (Card saved for future use)
    // ========================================
    if (event.type === "setup_intent.succeeded") {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const metadata = setupIntent.metadata || {};
      const customerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id;
      const paymentMethodId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id;

      logStep("SetupIntent succeeded - card saved", {
        setupIntentId: setupIntent.id,
        customerId,
        paymentMethodId,
        clientId: metadata.client_id,
      });

      if (customerId && paymentMethodId) {
        // Set as default payment method on customer
        try {
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
          });
        } catch (e) {
          logStep("⚠️ Failed to set default PM on customer", { error: String(e) });
        }

        // Update client record with saved card info
        if (metadata.client_id) {
          // Get card details for display
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          const cardInfo = {
            id: paymentMethodId,
            brand: pm.card?.brand || "unknown",
            last4: pm.card?.last4 || "****",
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
            saved_at: new Date().toISOString(),
          };

          // Get existing saved cards
          const { data: clientData } = await supabaseClient
            .from("clients")
            .select("saved_cards, default_payment_method_id")
            .eq("id", metadata.client_id)
            .single();

          const existingCards = (clientData?.saved_cards as any[]) || [];
          // Avoid duplicates
          const filteredCards = existingCards.filter((c: any) => c.id !== paymentMethodId);
          filteredCards.push(cardInfo);

          await supabaseClient
            .from("clients")
            .update({
              saved_cards: filteredCards,
              default_payment_method_id: clientData?.default_payment_method_id || paymentMethodId,
            })
            .eq("id", metadata.client_id);

          logStep("✅ Client card saved", { clientId: metadata.client_id, brand: cardInfo.brand, last4: cardInfo.last4 });

          // Notify client
          if (metadata.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: metadata.user_id,
              title: "💳 Carte enregistrée",
              message: `Votre carte ${cardInfo.brand.toUpperCase()} ****${cardInfo.last4} a été enregistrée. Vos futurs paiements seront automatiques.`,
              type: "info",
            });
          }
        }
      }

      return new Response(JSON.stringify({ received: true, type: "setup_intent.succeeded" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
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
