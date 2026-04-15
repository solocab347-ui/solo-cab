import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MaintenanceResult {
  task: string;
  issues_found: number;
  issues_fixed: number;
  details: any[];
}

interface MaintenanceResponse {
  success: boolean;
  timestamp: string;
  tasks: MaintenanceResult[];
  total_issues_found: number;
  total_issues_fixed: number;
  learning_applied: string[];
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLATFORM-MAINTENANCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting platform maintenance");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const response: MaintenanceResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      tasks: [],
      total_issues_found: 0,
      total_issues_fixed: 0,
      learning_applied: [],
    };

    // Task 1: Check and fix driver visibility issues
    logStep("Task 1: Checking driver visibility issues");
    const { data: visibilityIssues, error: visError } = await supabaseClient
      .rpc('ensure_driver_profile_visibility');
    
    if (visError) {
      logStep("Visibility check error", { error: visError.message });
    } else {
      const visibilityResult: MaintenanceResult = {
        task: "driver_visibility",
        issues_found: visibilityIssues?.length || 0,
        issues_fixed: 0,
        details: visibilityIssues || [],
      };
      response.tasks.push(visibilityResult);
      response.total_issues_found += visibilityResult.issues_found;
      
      if (visibilityResult.issues_found > 0) {
        response.learning_applied.push("Updated visibility conditions to include subscription_paid=true drivers");
      }
    }

    // Task 2: Run data integrity fixes
    logStep("Task 2: Running data integrity checks");
    const { data: dataIssues, error: dataError } = await supabaseClient
      .rpc('detect_and_fix_data_issues');
    
    if (dataError) {
      logStep("Data integrity check error", { error: dataError.message });
    } else {
      const dataResult: MaintenanceResult = {
        task: "data_integrity",
        issues_found: dataIssues?.length || 0,
        issues_fixed: dataIssues?.filter((i: any) => i.fix_success)?.length || 0,
        details: dataIssues || [],
      };
      response.tasks.push(dataResult);
      response.total_issues_found += dataResult.issues_found;
      response.total_issues_fixed += dataResult.issues_fixed;
      
      if (dataResult.issues_fixed > 0) {
        response.learning_applied.push("Applied automatic fixes for data integrity issues");
      }
    }

    // Task 3: Check for stuck courses
    logStep("Task 3: Checking for stuck courses");
    const { data: stuckCourses, error: stuckError } = await supabaseClient
      .from('courses')
      .select('id, status, updated_at, driver_id')
      .in('status', ['accepted', 'driver_approaching', 'driver_arrived', 'in_progress'])
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(20);
    
    if (!stuckError && stuckCourses && stuckCourses.length > 0) {
      const stuckResult: MaintenanceResult = {
        task: "stuck_courses",
        issues_found: stuckCourses.length,
        issues_fixed: 0,
        details: stuckCourses.map(c => ({ id: c.id, status: c.status, hours_stuck: Math.round((Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60)) })),
      };
      response.tasks.push(stuckResult);
      response.total_issues_found += stuckResult.issues_found;
      
      // Log for learning
      response.learning_applied.push(`Detected ${stuckCourses.length} stuck courses for manual review`);
    }

    // Task 4: Check for subscription status mismatches
    logStep("Task 4: Checking subscription status mismatches");
    const { data: subMismatches, error: subError } = await supabaseClient
      .from('drivers')
      .select('id, subscription_paid, subscription_status')
      .eq('subscription_paid', true)
      .eq('subscription_status', 'inactive');
    
    if (!subError && subMismatches && subMismatches.length > 0) {
      // Auto-fix: Update subscription status
      const { error: fixError } = await supabaseClient
        .from('drivers')
        .update({ subscription_status: 'active' })
        .eq('subscription_paid', true)
        .eq('subscription_status', 'inactive');
      
      const subResult: MaintenanceResult = {
        task: "subscription_status_mismatch",
        issues_found: subMismatches.length,
        issues_fixed: fixError ? 0 : subMismatches.length,
        details: subMismatches,
      };
      response.tasks.push(subResult);
      response.total_issues_found += subResult.issues_found;
      response.total_issues_fixed += subResult.issues_fixed;
      
      if (!fixError) {
        response.learning_applied.push("Auto-corrected subscription status for paid drivers");
      }
    }

    // Task 5: Ensure new drivers have default settings
    logStep("Task 5: Checking new driver defaults");
    const { data: newDriversWithIssues, error: newDriverError } = await supabaseClient
      .from('drivers')
      .select('id, subscription_status, created_at')
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .is('subscription_status', null);
    
    if (!newDriverError && newDriversWithIssues && newDriversWithIssues.length > 0) {
      // Auto-fix: Set default subscription_status
      for (const driver of newDriversWithIssues) {
        await supabaseClient
          .from('drivers')
          .update({ subscription_status: 'inactive' })
          .eq('id', driver.id);
      }
      
      const newDriverResult: MaintenanceResult = {
        task: "new_driver_defaults",
        issues_found: newDriversWithIssues.length,
        issues_fixed: newDriversWithIssues.length,
        details: newDriversWithIssues,
      };
      response.tasks.push(newDriverResult);
      response.total_issues_found += newDriverResult.issues_found;
      response.total_issues_fixed += newDriverResult.issues_fixed;
      
      response.learning_applied.push("Applied default subscription_status for new drivers");
    }

    // Task 6: Send reengagement emails
    logStep("Task 6: Sending reengagement emails");
    try {
      const reengagementResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-reengagement-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        }
      );
      
      if (reengagementResponse.ok) {
        const reengagementData = await reengagementResponse.json();
        const reengagementResult: MaintenanceResult = {
          task: "reengagement_emails",
          issues_found: reengagementData.processed || 0,
          issues_fixed: reengagementData.results?.filter((r: any) => r.success)?.length || 0,
          details: reengagementData.results || [],
        };
        response.tasks.push(reengagementResult);
        response.total_issues_found += reengagementResult.issues_found;
        response.total_issues_fixed += reengagementResult.issues_fixed;
        
        if (reengagementResult.issues_fixed > 0) {
          response.learning_applied.push(`Sent ${reengagementResult.issues_fixed} reengagement emails to inactive drivers`);
        }
      }
    } catch (reengagementError) {
      logStep("Reengagement emails error", { error: String(reengagementError) });
    }

    // Task 7: Check expired trials and send trial emails
    logStep("Task 7: Checking expired trials");
    try {
      // Check expired trials
      const expiredTrialsResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-expired-trials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        }
      );
      
      if (expiredTrialsResponse.ok) {
        const expiredData = await expiredTrialsResponse.json();
        const expiredResult: MaintenanceResult = {
          task: "expired_trials",
          issues_found: expiredData.expired_count || 0,
          issues_fixed: expiredData.expired_count || 0,
          details: expiredData.results || [],
        };
        response.tasks.push(expiredResult);
        response.total_issues_found += expiredResult.issues_found;
        response.total_issues_fixed += expiredResult.issues_fixed;
        
        if (expiredResult.issues_fixed > 0) {
          response.learning_applied.push(`Marked ${expiredResult.issues_fixed} trials as expired`);
        }
      }

      // Send trial emails
      const trialEmailsResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-trial-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        }
      );
      
      if (trialEmailsResponse.ok) {
        const trialEmailsData = await trialEmailsResponse.json();
        const trialEmailsResult: MaintenanceResult = {
          task: "trial_emails",
          issues_found: trialEmailsData.processed || 0,
          issues_fixed: trialEmailsData.results?.filter((r: any) => r.success)?.length || 0,
          details: trialEmailsData.results || [],
        };
        response.tasks.push(trialEmailsResult);
        response.total_issues_found += trialEmailsResult.issues_found;
        response.total_issues_fixed += trialEmailsResult.issues_fixed;
        
        if (trialEmailsResult.issues_fixed > 0) {
          response.learning_applied.push(`Sent ${trialEmailsResult.issues_fixed} trial reminder emails`);
        }
      }
    } catch (trialError) {
      logStep("Trial tasks error", { error: String(trialError) });
    }

    // Log maintenance run
    logStep("Maintenance completed", {
      total_issues_found: response.total_issues_found,
      total_issues_fixed: response.total_issues_fixed,
      learning_count: response.learning_applied.length
    });

    // Store maintenance log for learning
    await supabaseClient
      .from('auto_fix_logs')
      .insert({
        entity_type: 'system',
        entity_id: '00000000-0000-0000-0000-000000000000',
        fix_applied: 'platform_maintenance_run',
        success: true,
        context: {
          timestamp: response.timestamp,
          total_issues_found: response.total_issues_found,
          total_issues_fixed: response.total_issues_fixed,
          learning_applied: response.learning_applied,
          tasks_summary: response.tasks.map(t => ({
            task: t.task,
            found: t.issues_found,
            fixed: t.issues_fixed
          }))
        }
      });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in platform-maintenance", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});