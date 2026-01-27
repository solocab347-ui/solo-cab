import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "execute_fix" | "analyze_patterns" | "get_recommendations" | "run_learning_cycle";
  solution_id?: string;
  occurrence_id?: string;
  pattern_id?: string;
}

interface FixResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ERROR-INTELLIGENCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body: RequestBody = await req.json();
    logStep("Processing request", { action: body.action });

    let result: any;

    switch (body.action) {
      case "execute_fix":
        result = await executeFix(supabaseClient, body.solution_id!, body.occurrence_id!);
        break;

      case "analyze_patterns":
        result = await analyzePatterns(supabaseClient);
        break;

      case "get_recommendations":
        result = await getRecommendations(supabaseClient, body.pattern_id!);
        break;

      case "run_learning_cycle":
        result = await runLearningCycle(supabaseClient);
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Exécute une correction automatique basée sur la solution
 */
async function executeFix(
  supabase: any, 
  solutionId: string, 
  occurrenceId: string
): Promise<FixResult> {
  logStep("Executing fix", { solutionId, occurrenceId });

  // Récupérer la solution
  const { data: solution, error: solutionError } = await supabase
    .from("error_solutions")
    .select("*, pattern:error_patterns(*)")
    .eq("id", solutionId)
    .single();

  if (solutionError || !solution) {
    return { success: false, message: "Solution not found" };
  }

  // Récupérer l'occurrence pour le contexte
  const { data: occurrence } = await supabase
    .from("error_occurrences")
    .select("*")
    .eq("id", occurrenceId)
    .single();

  const patternCode = solution.pattern?.pattern_code;

  // Exécuter la correction en fonction du pattern
  try {
    switch (patternCode) {
      case "MISSING_INVOICE":
        return await fixMissingInvoice(supabase, occurrence);

      case "MISSING_DEVIS":
        return await fixMissingDevis(supabase, occurrence);

      case "ORPHAN_COURSE":
        return await fixOrphanCourse(supabase, occurrence);

      case "DUPLICATE_INVOICE":
        return await fixDuplicateInvoice(supabase, occurrence);

      default:
        // Pour les patterns non spécifiques, utiliser fix_query si disponible
        if (solution.fix_query) {
          const { error: queryError } = await supabase.rpc("exec_sql", { 
            sql: solution.fix_query 
          });
          if (queryError) {
            return { success: false, message: queryError.message };
          }
          return { success: true, message: "Fix query executed" };
        }
        return { success: false, message: `No fix handler for pattern: ${patternCode}` };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logStep("Fix execution failed", { error: errorMsg });
    return { success: false, message: errorMsg };
  }
}

/**
 * Corrige les factures manquantes
 */
async function fixMissingInvoice(supabase: any, occurrence: any): Promise<FixResult> {
  const courseId = occurrence?.entity_id;
  if (!courseId) {
    return { success: false, message: "No course ID in occurrence" };
  }

  // Récupérer la course et le devis accepté
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select(`
      id, client_id, driver_id, status,
      devis:devis(id, amount, status)
    `)
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return { success: false, message: "Course not found" };
  }

  if (course.status !== "completed") {
    return { success: false, message: "Course is not completed" };
  }

  const acceptedDevis = course.devis?.find((d: any) => d.status === "accepted");
  if (!acceptedDevis) {
    return { success: false, message: "No accepted devis found" };
  }

  // Vérifier si une facture existe déjà
  const { data: existingInvoice } = await supabase
    .from("factures")
    .select("id")
    .eq("course_id", courseId)
    .single();

  if (existingInvoice) {
    return { success: true, message: "Invoice already exists" };
  }

  // Générer le numéro de facture
  const { data: lastInvoice } = await supabase
    .from("factures")
    .select("invoice_number")
    .like("invoice_number", "FAC-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastInvoice?.invoice_number) {
    const match = lastInvoice.invoice_number.match(/FAC-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const invoiceNumber = `FAC-${String(nextNumber).padStart(6, "0")}`;

  // Créer la facture
  const { error: insertError } = await supabase
    .from("factures")
    .insert({
      course_id: courseId,
      client_id: course.client_id,
      driver_id: course.driver_id,
      devis_id: acceptedDevis.id,
      amount: acceptedDevis.amount,
      payment_method: "pending",
      payment_status: "pending",
      invoice_number: invoiceNumber
    });

  if (insertError) {
    return { success: false, message: insertError.message };
  }

  logStep("Created missing invoice", { courseId, invoiceNumber });
  return { 
    success: true, 
    message: `Invoice ${invoiceNumber} created`,
    details: { invoiceNumber, courseId }
  };
}

/**
 * Corrige les devis manquants (alerte seulement)
 */
async function fixMissingDevis(supabase: any, occurrence: any): Promise<FixResult> {
  const courseId = occurrence?.entity_id;
  
  // Les devis manquants nécessitent une intervention manuelle
  // On crée une alerte pour le chauffeur
  await supabase
    .from("error_alerts")
    .upsert({
      pattern_id: occurrence.pattern_id,
      alert_type: "warning",
      title: "Devis manquant",
      message: `La course ${courseId} n'a pas de devis associé`,
      context: { courseId }
    }, { onConflict: "pattern_id" });

  return { 
    success: true, 
    message: "Alert created for missing devis",
    details: { courseId, requiresManualAction: true }
  };
}

/**
 * Corrige les courses orphelines
 */
async function fixOrphanCourse(supabase: any, occurrence: any): Promise<FixResult> {
  const courseId = occurrence?.entity_id;
  if (!courseId) {
    return { success: false, message: "No course ID in occurrence" };
  }

  // Marquer la course comme annulée si elle est orpheline depuis longtemps
  const { data: course } = await supabase
    .from("courses")
    .select("id, created_at, status")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { success: false, message: "Course not found" };
  }

  const ageHours = (Date.now() - new Date(course.created_at).getTime()) / (1000 * 60 * 60);

  if (ageHours > 24 && ["pending", "draft"].includes(course.status)) {
    // Annuler la course orpheline de plus de 24h
    const { error } = await supabase
      .from("courses")
      .update({ status: "cancelled", notes: "Auto-cancelled: orphan course" })
      .eq("id", courseId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { 
      success: true, 
      message: "Orphan course cancelled",
      details: { courseId, ageHours }
    };
  }

  return { 
    success: true, 
    message: "Orphan course flagged for review",
    details: { courseId, ageHours, requiresManualAction: true }
  };
}

/**
 * Corrige les factures en double
 */
async function fixDuplicateInvoice(supabase: any, occurrence: any): Promise<FixResult> {
  const courseId = occurrence?.entity_id;
  if (!courseId) {
    return { success: false, message: "No course ID in occurrence" };
  }

  // Récupérer toutes les factures pour cette course
  const { data: invoices, error } = await supabase
    .from("factures")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error || !invoices || invoices.length <= 1) {
    return { success: true, message: "No duplicate invoices found" };
  }

  // Garder la première facture, marquer les autres comme annulées
  const duplicates = invoices.slice(1);
  
  for (const dup of duplicates) {
    await supabase
      .from("factures")
      .update({ 
        payment_status: "cancelled",
        invoice_number: `CANCELLED-${dup.invoice_number}`
      })
      .eq("id", dup.id);
  }

  logStep("Fixed duplicate invoices", { courseId, cancelledCount: duplicates.length });
  return { 
    success: true, 
    message: `${duplicates.length} duplicate invoice(s) cancelled`,
    details: { courseId, keptInvoice: invoices[0].invoice_number }
  };
}

/**
 * Analyse les patterns d'erreurs pour détecter de nouvelles tendances
 */
async function analyzePatterns(supabase: any): Promise<any> {
  logStep("Analyzing error patterns");

  // Récupérer les occurrences récentes non associées à un pattern
  const { data: recentErrors } = await supabase
    .from("error_occurrences")
    .select("*")
    .is("pattern_id", null)
    .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100);

  if (!recentErrors || recentErrors.length === 0) {
    return { patterns_found: 0, message: "No unclassified errors found" };
  }

  // Grouper par fingerprint
  const groups: Record<string, typeof recentErrors> = {};
  for (const err of recentErrors) {
    const fp = err.error_fingerprint;
    if (!groups[fp]) groups[fp] = [];
    groups[fp].push(err);
  }

  let patternsCreated = 0;

  // Créer des patterns pour les groupes récurrents
  for (const [fingerprint, errors] of Object.entries(groups)) {
    if (errors.length >= 3) {
      const sample = errors[0];
      
      // Créer un nouveau pattern
      const { data: newPattern, error: insertError } = await supabase
        .from("error_patterns")
        .insert({
          pattern_code: `AUTO_${Date.now()}`,
          pattern_name: sample.error_message?.substring(0, 100),
          description: `Pattern auto-détecté: ${errors.length} occurrences`,
          fingerprint,
          entity_type: sample.entity_type,
          severity: errors.length >= 10 ? "high" : "medium",
          occurrences_count: errors.length
        })
        .select("id")
        .single();

      if (!insertError && newPattern) {
        // Mettre à jour les occurrences
        await supabase
          .from("error_occurrences")
          .update({ pattern_id: newPattern.id })
          .eq("error_fingerprint", fingerprint);

        patternsCreated++;
      }
    }
  }

  return {
    patterns_found: patternsCreated,
    errors_analyzed: recentErrors.length,
    groups_detected: Object.keys(groups).length
  };
}

/**
 * Génère des recommandations pour un pattern
 */
async function getRecommendations(supabase: any, patternId: string): Promise<any> {
  logStep("Getting recommendations", { patternId });

  // Récupérer le pattern et ses métriques
  const { data: metrics } = await supabase
    .from("error_learning_metrics")
    .select("*")
    .eq("pattern_id", patternId)
    .single();

  if (!metrics) {
    return { recommendations: [] };
  }

  const recommendations: string[] = [];

  // Analyser les métriques
  if (metrics.occurrences_count > 50 && !metrics.auto_fix_enabled) {
    recommendations.push("Ce pattern est très fréquent. Considérez activer l'auto-fix.");
  }

  if (metrics.learning_confidence > 0.8) {
    recommendations.push("La confiance d'apprentissage est élevée. L'auto-fix devrait être fiable.");
  }

  if (metrics.consecutive_failures > 0) {
    recommendations.push(`${metrics.consecutive_failures} échec(s) consécutif(s). Revoyez la solution.`);
  }

  if (metrics.manual_fixes_count > 5 && !metrics.auto_fix_enabled) {
    recommendations.push("Plusieurs corrections manuelles enregistrées. L'automatisation est recommandée.");
  }

  return {
    pattern_id: patternId,
    metrics,
    recommendations,
    suggested_action: metrics.learning_confidence > 0.7 ? "enable_auto_fix" : "review_solution"
  };
}

/**
 * Exécute un cycle complet d'apprentissage
 */
async function runLearningCycle(supabase: any): Promise<any> {
  logStep("Running learning cycle");

  const results = {
    patterns_analyzed: 0,
    solutions_updated: 0,
    auto_fixes_adjusted: 0,
    alerts_created: 0
  };

  // 1. Analyser les nouveaux patterns
  const patternAnalysis = await analyzePatterns(supabase);
  results.patterns_analyzed = patternAnalysis.patterns_found;

  // 2. Mettre à jour les taux de succès des solutions
  const { data: solutions } = await supabase
    .from("error_solutions")
    .select("id, total_attempts, successful_fixes");

  for (const sol of (solutions || [])) {
    if (sol.total_attempts > 0) {
      const successRate = sol.successful_fixes / sol.total_attempts;
      await supabase
        .from("error_solutions")
        .update({ success_rate: successRate })
        .eq("id", sol.id);
      results.solutions_updated++;
    }
  }

  // 3. Ajuster les auto-fixes basés sur la confiance
  const { data: patterns } = await supabase
    .from("error_patterns")
    .select("id, learning_confidence, auto_fix_enabled, consecutive_failures");

  for (const pattern of (patterns || [])) {
    // Désactiver si trop d'échecs
    if (pattern.consecutive_failures >= 5 && pattern.auto_fix_enabled) {
      await supabase
        .from("error_patterns")
        .update({ 
          auto_fix_enabled: false,
          cooldown_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        })
        .eq("id", pattern.id);
      results.auto_fixes_adjusted++;
    }
    
    // Activer si confiance élevée
    if (pattern.learning_confidence > 0.85 && !pattern.auto_fix_enabled && pattern.consecutive_failures === 0) {
      await supabase
        .from("error_patterns")
        .update({ auto_fix_enabled: true })
        .eq("id", pattern.id);
      results.auto_fixes_adjusted++;
    }
  }

  // 4. Créer des alertes pour les patterns problématiques
  const { data: problematicPatterns } = await supabase
    .from("error_patterns")
    .select("*")
    .eq("is_active", true)
    .gt("consecutive_failures", 3);

  for (const pattern of (problematicPatterns || [])) {
    const { data: existingAlert } = await supabase
      .from("error_alerts")
      .select("id")
      .eq("pattern_id", pattern.id)
      .is("resolved_at", null)
      .single();

    if (!existingAlert) {
      await supabase
        .from("error_alerts")
        .insert({
          pattern_id: pattern.id,
          alert_type: "warning",
          title: "Pattern problématique détecté",
          message: `Le pattern ${pattern.pattern_name} a ${pattern.consecutive_failures} échecs consécutifs`,
          context: { learning_confidence: pattern.learning_confidence }
        });
      results.alerts_created++;
    }
  }

  logStep("Learning cycle completed", results);
  return results;
}
