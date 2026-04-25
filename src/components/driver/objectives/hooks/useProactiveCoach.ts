import { useState, useEffect, useCallback } from 'react';
import { ProactiveMessage, SOLOCAB_EDUCATION_TIPS, generateContextualMessage } from '../coaching/ProactiveCoachPopup';

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

  // Check if we should show a tip
  const shouldShowTip = useCallback((): boolean => {
    if (!enabled) return false;
    
    const lastTime = localStorage.getItem(LAST_TIP_TIME_KEY);
    if (lastTime) {
      const timeSince = Date.now() - parseInt(lastTime, 10);
      if (timeSince < TIP_COOLDOWN_MS) return false;
    }
    return true;
  }, [enabled]);

  // Get next tip to show
  const getNextTip = useCallback((): ProactiveMessage | null => {
    // First, check for contextual high-priority messages
    const contextual = generateContextualMessage(stats, driverName);
    if (contextual && contextual.priority === 'high' && !shownTips.has(contextual.id)) {
      return contextual;
    }

    // Then, try education tips that haven't been shown
    const unshownEducation = SOLOCAB_EDUCATION_TIPS.filter(tip => !shownTips.has(tip.id));
    if (unshownEducation.length > 0) {
      // Prioritize high priority tips
      const highPriority = unshownEducation.filter(t => t.priority === 'high');
      if (highPriority.length > 0) {
        return highPriority[0];
      }
      // Then medium
      const mediumPriority = unshownEducation.filter(t => t.priority === 'medium');
      if (mediumPriority.length > 0) {
        return mediumPriority[0];
      }
      // Finally low
      return unshownEducation[0];
    }

    // If all education tips shown, return contextual if available
    return contextual;
  }, [stats, driverName, shownTips]);

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
