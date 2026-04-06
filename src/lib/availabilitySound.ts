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
      const notes = [
        { freq: 880, start: 0, dur: 0.12 },
        { freq: 1320, start: 0.13, dur: 0.18 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.45, now + start);
        gain.gain.exponentialRampToValueAtTime(0.01, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
      if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.35);
      if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
    }
  } catch {
    // AudioContext not supported — silent fallback
  }
}
