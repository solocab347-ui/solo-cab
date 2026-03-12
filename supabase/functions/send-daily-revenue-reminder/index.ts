import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: send-daily-revenue-reminder
 * 
 * Envoie une notification push quotidienne aux chauffeurs qui:
 * 1. Ont un créneau de travail prévu aujourd'hui (driver_schedules, is_available = true)
 * 2. N'ont PAS encore saisi leur chiffre d'affaires du jour (driver_daily_entries)
 * 
 * Déclenchée via pg_cron tous les jours à 20h00 (heure Paris)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Date du jour (UTC -> Paris = UTC+1/+2 selon été/hiver)
    // Le cron tourne à 19:00 UTC = 20:00 ou 21:00 Paris
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`📊 Rappel CA quotidien — Date: ${todayStr}`);

    // 1. Récupérer tous les chauffeurs qui travaillent aujourd'hui
    const { data: schedules, error: schedError } = await supabase
      .from('driver_schedules')
      .select('driver_id')
      .eq('date', todayStr)
      .eq('is_available', true);

    if (schedError) {
      console.error('Erreur récupération schedules:', schedError);
      throw schedError;
    }

    if (!schedules || schedules.length === 0) {
      console.log('Aucun chauffeur planifié aujourd\'hui');
      return new Response(
        JSON.stringify({ success: true, message: 'No drivers scheduled today', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Dédupliquer les driver_ids (un chauffeur peut avoir plusieurs créneaux)
    const driverIds = [...new Set(schedules.map(s => s.driver_id))];
    console.log(`📊 Chauffeurs planifiés aujourd'hui: ${driverIds.length}`);

    // 2. Vérifier lesquels ont DÉJÀ saisi leur CA du jour
    const { data: existingEntries, error: entriesError } = await supabase
      .from('driver_daily_entries')
      .select('driver_id')
      .eq('entry_date', todayStr)
      .in('driver_id', driverIds)
      .gt('revenue', 0); // Seulement ceux qui ont saisi un CA > 0

    if (entriesError) {
      console.error('Erreur récupération entries:', entriesError);
      throw entriesError;
    }

    const driversWithEntries = new Set(existingEntries?.map(e => e.driver_id) || []);

    // 3. Filtrer les chauffeurs qui n'ont PAS encore saisi
    const driversToNotify = driverIds.filter(id => !driversWithEntries.has(id));
    console.log(`📊 Chauffeurs sans CA saisi: ${driversToNotify.length}/${driverIds.length}`);

    if (driversToNotify.length === 0) {
      console.log('Tous les chauffeurs ont déjà saisi leur CA !');
      return new Response(
        JSON.stringify({ success: true, message: 'All drivers already entered revenue', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Récupérer les user_id des chauffeurs à notifier
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, user_id')
      .in('id', driversToNotify);

    if (driversError) {
      console.error('Erreur récupération drivers:', driversError);
      throw driversError;
    }

    // 5. Envoyer les notifications push
    let sentCount = 0;
    let failedCount = 0;

    for (const driver of (drivers || [])) {
      if (!driver.user_id) continue;

      try {
        // Créer la notification en base (le trigger enverra le push)
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: driver.user_id,
            title: '📊 N\'oubliez pas votre CA du jour !',
            message: 'Votre journée de travail est terminée. Saisissez votre chiffre d\'affaires pour suivre vos performances.',
            type: 'info',
            link: '/driver-dashboard?tab=objectives&section=daily',
            category: 'course_completed',
            is_read: false
          });

        if (notifError) {
          console.error(`Erreur notif pour driver ${driver.id}:`, notifError);
          failedCount++;
          continue;
        }

        // Appeler aussi l'edge function push pour les notifications hors-app
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              user_id: driver.user_id,
              title: '📊 N\'oubliez pas votre CA du jour !',
              message: 'Saisissez votre chiffre d\'affaires pour suivre vos performances.',
              link: '/driver-dashboard?tab=objectives&section=daily',
              tag: 'daily-revenue-reminder'
            })
          });
        } catch (pushErr) {
          // Non-bloquant
          console.warn(`Push failed for ${driver.id}:`, pushErr);
        }

        sentCount++;
      } catch (err) {
        console.error(`Erreur pour driver ${driver.id}:`, err);
        failedCount++;
      }
    }

    console.log(`📊 Rappels envoyés: ${sentCount}, échoués: ${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily revenue reminders sent',
        scheduled_drivers: driverIds.length,
        already_entered: driversWithEntries.size,
        sent: sentCount,
        failed: failedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in send-daily-revenue-reminder:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
