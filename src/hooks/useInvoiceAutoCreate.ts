/**
 * Hook pour créer automatiquement une facture après qu'une course soit terminée
 * SYSTÈME ANTI-OUBLI: S'assure qu'aucune course terminée ne reste sans facture
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { logger } from "@/lib/productionLogger";

interface CourseForInvoice {
  id: string;
  status: string;
  client_id: string | null;
  driver_id: string | null;
}

/**
 * Hook qui écoute les changements de statut des courses
 * et crée automatiquement les factures quand une course passe à "completed"
 */
export function useInvoiceAutoCreate(driverId: string | undefined) {
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!driverId) return;

    // S'abonner aux changements de statut des courses via centralized manager
    const cleanup = subscriptionManager.subscribe(
      `invoice-auto-create-${driverId}`,
      { table: 'courses', event: 'UPDATE', filter: `driver_id=eq.${driverId}` },
      async (payload) => {
        const newCourse = payload.new as CourseForInvoice;
        const oldCourse = payload.old as CourseForInvoice;

        // Vérifier si la course vient de passer à "completed"
        if (newCourse.status === 'completed' && oldCourse.status !== 'completed') {
          await createInvoiceIfMissing(newCourse.id);
        }
      }
    );

    return cleanup;
  }, [driverId]);

  /**
   * Crée une facture si elle n'existe pas déjà
   */
  async function createInvoiceIfMissing(courseId: string) {
    // Éviter les traitements en double
    if (processingRef.current.has(courseId)) {
      logger.debug("Invoice creation already in progress", { courseId });
      return;
    }

    processingRef.current.add(courseId);

    try {
      // Vérifier si une facture existe déjà
      const { data: existingInvoice } = await supabase
        .from('factures')
        .select('id')
        .eq('course_id', courseId)
        .maybeSingle();

      if (existingInvoice) {
        logger.debug("Invoice already exists", { courseId });
        return;
      }

      // Récupérer les infos de la course et du devis accepté
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
          id, client_id, driver_id,
          devis:devis(id, amount, status)
        `)
        .eq('id', courseId)
        .maybeSingle();

      if (courseError || !course) {
        logger.error("Failed to fetch course for invoice", { courseId, error: courseError?.message });
        return;
      }

      // Trouver le devis accepté
      const devisArray = course.devis as any[] | null;
      const acceptedDevis = devisArray?.find((d: any) => d.status === 'accepted');
      
      if (!acceptedDevis) {
        logger.warn("No accepted devis found for completed course", { courseId });
        return;
      }

      // Générer le numéro de facture
      const { data: lastInvoice } = await supabase
        .from('factures')
        .select('invoice_number')
        .like('invoice_number', 'FAC-%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/FAC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const invoiceNumber = `FAC-${String(nextNumber).padStart(6, '0')}`;

      // Récupérer les infos Stripe du chauffeur pour déterminer le mode de paiement
      const { data: driverInfo } = await supabase
        .from('drivers')
        .select('stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', course.driver_id)
        .maybeSingle();

      // Récupérer le mode de paiement de la course
      const { data: coursePayment } = await supabase
        .from('courses')
        .select('payment_method')
        .eq('id', courseId)
        .maybeSingle();

      const isStripeDriver = !!driverInfo?.stripe_connect_account_id && 
                             driverInfo?.stripe_connect_charges_enabled === true;
      const coursePaymentMethod = coursePayment?.payment_method;

      // Déterminer le payment_method de la facture
      let facturePaymentMethod = 'cash';
      let facturePaymentStatus = 'pending';

      if (coursePaymentMethod === 'stripe' || (coursePaymentMethod === 'card' && isStripeDriver)) {
        facturePaymentMethod = 'stripe';
        facturePaymentStatus = 'paid';
      } else if (coursePaymentMethod === 'card') {
        facturePaymentMethod = 'card';
        facturePaymentStatus = 'pending'; // TPE - le chauffeur encaisse lui-même
      } else if (coursePaymentMethod === 'cash') {
        facturePaymentMethod = 'cash';
        facturePaymentStatus = 'pending'; // Espèces - le chauffeur encaisse lui-même
      }

      // Créer la facture
      const factureInsert: Record<string, any> = {
        course_id: courseId,
        client_id: course.client_id,
        driver_id: course.driver_id,
        devis_id: acceptedDevis.id,
        amount: acceptedDevis.amount,
        payment_method: facturePaymentMethod,
        payment_status: facturePaymentStatus,
        invoice_number: invoiceNumber,
      };
      if (facturePaymentStatus === 'paid') {
        factureInsert.paid_at = new Date().toISOString();
      }

      const { error: insertError } = await supabase
        .from('factures')
        .insert(factureInsert as any);

      if (insertError) {
        logger.error("Failed to auto-create invoice", { courseId, error: insertError.message });
        return;
      }

      logger.info("✅ Auto-created invoice on course completion", { courseId, invoiceNumber });

      // Logger dans auto_fix_logs
      try {
        await supabase
          .from('auto_fix_logs')
          .insert({
            entity_type: 'course',
            entity_id: courseId,
            fix_applied: `Auto-created invoice ${invoiceNumber} on course completion`,
            success: true,
            context: { trigger: 'realtime_subscription' }
          });
      } catch {
        // Ignorer les erreurs de log
      }

    } catch (err) {
      logger.exception(err, { context: "createInvoiceIfMissing", courseId });
    } finally {
      processingRef.current.delete(courseId);
    }
  }
}
