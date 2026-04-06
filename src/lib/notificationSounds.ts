/**
 * SoloCab Notification Sound System
 * 
 * 3 categories:
 * - RIDE: Full ride-request ringtone (MP3) — for new course requests only
 * - INFO: Short subtle chime (Web Audio) — for messages, payments, general info
 * - SILENT: No sound — for cancellations, read confirmations, status updates
 */
import { getSharedAudioContext, ensureAudioUnlocked } from './audioEngine';
import { playSoloCabSound } from './solocabNotificationSound';

/** Notification types that should be SILENT (no sound at all) */
const SILENT_TYPES = new Set([
  'cancellation',
  'course_cancelled',
  'cancelled',
  'status_update',
  'read',
  'info', // generic info like "course annulée"
]);

/** Notification title patterns that indicate cancellation/silent */
const SILENT_TITLE_PATTERNS = [
  /annul/i,
  /refus/i,
  /expiré/i,
  /expir/i,
];

/** Notification types that trigger the FULL ride sound */
const RIDE_SOUND_TYPES = new Set([
  'ride_request',
  'new_course',
  'course_request',
  'incoming_ride',
]);

/** Title patterns that indicate a ride request */
const RIDE_TITLE_PATTERNS = [
  /nouvelle course/i,
  /demande de course/i,
  /course reçue/i,
  /nouvelle demande/i,
];

/**
 * Determine the sound category for a notification
 */
export type SoundCategory = 'ride' | 'info' | 'silent';

export function getSoundCategory(type?: string, title?: string): SoundCategory {
  const normalizedType = (type || '').toLowerCase();
  const normalizedTitle = (title || '').toLowerCase();

  // Check silent first (cancellations, status updates)
  if (SILENT_TYPES.has(normalizedType)) return 'silent';
  if (SILENT_TITLE_PATTERNS.some(p => p.test(normalizedTitle))) return 'silent';

  // Check ride sound (new course requests)
  if (RIDE_SOUND_TYPES.has(normalizedType)) return 'ride';
  if (RIDE_TITLE_PATTERNS.some(p => p.test(normalizedTitle))) return 'ride';

  // Default: info chime for everything else (messages, payments, etc.)
  return 'info';
}

/**
 * Play a short, subtle info chime via Web Audio API
 * Two-tone ascending chime — distinct from the ride ringtone
 */
export async function playInfoChime(volume: number = 0.4): Promise<void> {
  try {
    await ensureAudioUnlocked();
    const ctx = getSharedAudioContext();

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = Math.max(0, Math.min(1, volume));
    masterGain.connect(ctx.destination);

    // Note 1: C5 (523 Hz) — short
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 523;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.6, now);
    g1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(g1);
    g1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Note 2: E5 (659 Hz) — slightly delayed
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 659;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.5, now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc2.connect(g2);
    g2.connect(masterGain);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.3);

    // Cleanup
    setTimeout(() => {
      masterGain.disconnect();
    }, 500);
  } catch (error) {
    console.warn('[SoloCab] Info chime failed:', error);
  }
}

/**
 * Play the appropriate sound for a notification
 */
export async function playNotificationSoundByType(
  type?: string,
  title?: string,
  volume?: number
): Promise<void> {
  const category = getSoundCategory(type, title);

  switch (category) {
    case 'ride':
      await playSoloCabSound(volume ?? 1.0);
      break;
    case 'info':
      await playInfoChime(volume ?? 0.4);
      break;
    case 'silent':
      // No sound
      break;
  }
}
