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

      // Déléguer à l'edge function `create-facture-auto`
      // (gère: numérotation RES-XXX, frais Stripe/SoloCab, devis emergency, courses entreprise, guests)
      const { error: invokeError } = await supabase.functions.invoke('create-facture-auto', {
        body: { course_id: courseId },
      });

      if (invokeError) {
        logger.error("Failed to invoke create-facture-auto", { courseId, error: invokeError.message });
        return;
      }

      logger.info("✅ Auto-created invoice on course completion", { courseId });

      // Logger dans auto_fix_logs
      try {
        await supabase
          .from('auto_fix_logs')
          .insert({
            entity_type: 'course',
            entity_id: courseId,
            fix_applied: `Auto-invoked create-facture-auto on course completion`,
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
