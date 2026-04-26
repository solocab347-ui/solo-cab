import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ProactiveMessage,
  SOLOCAB_EDUCATION_TIPS,
  generateContextualMessage,
  FIRST_SCAN_CELEBRATION,
  FIRST_SOLOCAB_COURSE_COMPLETED,
} from '../coaching/ProactiveCoachPopup';

const SHOWN_TIPS_KEY = 'solocab_shown_coach_tips';
const LAST_TIP_TIME_KEY = 'solocab_last_tip_time';
const TIP_COOLDOWN_MS = 30 * 60 * 1000; // 30 min entre 2 tips

// CAP STRICT : on ne pousse JAMAIS plus de MAX_TOTAL_TIPS pop-ups au total.
// Les célébrations / milestones contextuels (first-client, great-day) restent
// autorisés car informatifs et liés à un événement réel.
const MAX_TOTAL_TIPS = 5;
const EDUCATION_TYPES = new Set(['education', 'tip']);

interface UseProactiveCoachOptions {
  driverId: string;
  driverName?: string;
  stats: {
    todayRevenue: number;
    todayCourses: number;
    weekRevenue: number;
    monthRevenue: number;
    totalClients: number;
    streakDays: number;
    hasObjectives: boolean;
    soloCabPercentage: number;
    partnershipsCount: number;
  };
  enabled?: boolean;
}

export function useProactiveCoach({
  driverId,
  driverName,
  stats,
  enabled = true
}: UseProactiveCoachOptions) {
  const [currentMessage, setCurrentMessage] = useState<ProactiveMessage | null>(null);
  const [shownTips, setShownTips] = useState<Set<string>>(new Set());

  // Load shown tips from storage
  useEffect(() => {
    const stored = localStorage.getItem(SHOWN_TIPS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setShownTips(new Set(parsed));
      } catch {}
    }
  }, []);

  // Save shown tips to storage
  const markTipAsShown = useCallback((tipId: string) => {
    setShownTips(prev => {
      const newSet = new Set(prev);
      newSet.add(tipId);
      localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // Compteur d'éducation tips déjà vus (pour cap strict)
  const educationShownCount = [...shownTips].filter(id =>
    SOLOCAB_EDUCATION_TIPS.some(t => t.id === id)
  ).length;

  // Check if we should show a tip
  const shouldShowTip = useCallback((): boolean => {
    if (!enabled) return false;

    // CAP STRICT : si on a déjà montré MAX_TOTAL_TIPS tips éducation, silence.
    if (educationShownCount >= MAX_TOTAL_TIPS) return false;

    const lastTime = localStorage.getItem(LAST_TIP_TIME_KEY);
    if (lastTime) {
      const timeSince = Date.now() - parseInt(lastTime, 10);
      if (timeSince < TIP_COOLDOWN_MS) return false;
    }
    return true;
  }, [enabled, educationShownCount]);

  // Get next tip to show
  const getNextTip = useCallback((): ProactiveMessage | null => {
    // 1. Priorité aux célébrations / milestones contextuels (toujours autorisés)
    const contextual = generateContextualMessage(stats, driverName);
    if (contextual && !EDUCATION_TYPES.has(contextual.type) && !shownTips.has(contextual.id)) {
      return contextual;
    }

    // 2. Si cap atteint, on ne propose plus de tip éducation
    if (educationShownCount >= MAX_TOTAL_TIPS) return null;

    // 3. Tip éducation contextuel high-priority
    if (contextual && contextual.priority === 'high' && !shownTips.has(contextual.id)) {
      return contextual;
    }

    // 4. Sinon, rotation des tips éducation par priorité
    const unshownEducation = SOLOCAB_EDUCATION_TIPS.filter(tip => !shownTips.has(tip.id));
    if (unshownEducation.length > 0) {
      const highPriority = unshownEducation.filter(t => t.priority === 'high');
      if (highPriority.length > 0) return highPriority[0];
      const mediumPriority = unshownEducation.filter(t => t.priority === 'medium');
      if (mediumPriority.length > 0) return mediumPriority[0];
      return unshownEducation[0];
    }

    return null;
  }, [stats, driverName, shownTips, educationShownCount]);

  // Trigger a new tip
  const triggerTip = useCallback(() => {
    if (!shouldShowTip()) return;

    const tip = getNextTip();
    if (tip) {
      setCurrentMessage(tip);
      localStorage.setItem(LAST_TIP_TIME_KEY, Date.now().toString());
    }
  }, [shouldShowTip, getNextTip]);

  // Dismiss current message
  const dismissMessage = useCallback(() => {
    if (currentMessage) {
      markTipAsShown(currentMessage.id);
    }
    setCurrentMessage(null);
  }, [currentMessage, markTipAsShown]);

  // Force show a specific tip type
  const showTip = useCallback((tipId: string) => {
    const tip = SOLOCAB_EDUCATION_TIPS.find(t => t.id === tipId);
    if (tip) {
      setCurrentMessage(tip);
    }
  }, []);

  // Reset all shown tips (for testing or user reset)
  const resetTips = useCallback(() => {
    localStorage.removeItem(SHOWN_TIPS_KEY);
    localStorage.removeItem(LAST_TIP_TIME_KEY);
    setShownTips(new Set());
  }, []);

  // Auto-trigger on mount and when stats change significantly
  useEffect(() => {
    // Delay initial tip to let page load
    const timer = setTimeout(() => {
      triggerTip();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Trigger celebration tips when milestones are hit
  useEffect(() => {
    // Check for first client
    if (stats.totalClients === 1 && !shownTips.has('first-client')) {
      const tip = generateContextualMessage(stats, driverName);
      if (tip && tip.id === 'first-client') {
        setCurrentMessage(tip);
        markTipAsShown('first-client');
      }
    }
  }, [stats.totalClients, driverName, shownTips, markTipAsShown]);

  // Detect first QR scan & first completed SoloCab course (DB-driven, one-shot)
  useEffect(() => {
    if (!enabled || !driverId) return;

    let cancelled = false;

    const checkMilestones = async () => {
      // ── Premier scan QR ───────────────────────────────────────────────
      if (!shownTips.has(FIRST_SCAN_CELEBRATION.id)) {
        try {
          const { data: scanRows, error: scanErr } = await supabase
            .from('driver_daily_entries')
            .select('qr_scans_count')
            .eq('driver_id', driverId)
            .gt('qr_scans_count', 0)
            .limit(1);

          if (!cancelled && !scanErr && scanRows && scanRows.length > 0) {
            setCurrentMessage(FIRST_SCAN_CELEBRATION);
            markTipAsShown(FIRST_SCAN_CELEBRATION.id);
            return; // Don't stack two popups
          }
        } catch {
          // silent
        }
      }

      // ── Première course SoloCab terminée ──────────────────────────────
      if (!shownTips.has(FIRST_SOLOCAB_COURSE_COMPLETED.id)) {
        try {
          const { count, error } = await supabase
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .eq('status', 'completed');

          if (!cancelled && !error && (count ?? 0) >= 1) {
            setCurrentMessage(FIRST_SOLOCAB_COURSE_COMPLETED);
            markTipAsShown(FIRST_SOLOCAB_COURSE_COMPLETED.id);
          }
        } catch {
          // silent
        }
      }
    };

    // Slight delay so it doesn't race with initial education tip
    const t = setTimeout(checkMilestones, 4500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [enabled, driverId, shownTips, markTipAsShown]);

  return {
    currentMessage,
    dismissMessage,
    triggerTip,
    showTip,
    resetTips,
    shownTipsCount: shownTips.size,
    totalTipsCount: SOLOCAB_EDUCATION_TIPS.length
  };
}
