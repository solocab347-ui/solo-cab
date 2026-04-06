/**
 * Plays a distinct sound when driver goes online/offline.
 * Online: energetic rising double-chime
 * Offline: firm descending tone
 */
import { getSharedAudioContext, ensureAudioUnlocked } from './audioEngine';

export async function playAvailabilitySound(goingOnline: boolean) {
  try {
    await ensureAudioUnlocked();
    const ctx = getSharedAudioContext();
    const now = ctx.currentTime;

    if (goingOnline) {
      // Triple ascending chime — loud and energetic
      const notes = [
        { freq: 880, start: 0, dur: 0.15 },
        { freq: 1320, start: 0.16, dur: 0.15 },
        { freq: 1760, start: 0.32, dur: 0.22 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.9, now + start);
        gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    } else {
      // Strong descending tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(250, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.45);
      if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
    }
  } catch {
    // AudioContext not supported — silent fallback
  }
}
