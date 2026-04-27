/**
 * Shared Audio Engine for SoloCab
 * Solves mobile/Capacitor AudioContext autoplay restrictions
 * by reusing a single AudioContext and unlocking it on first user gesture.
 */

let sharedCtx: AudioContext | null = null;
let unlocked = false;

export function getSharedAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedCtx;
}

/**
 * Resume the AudioContext (required after user gesture on mobile).
 * Call this from any user-initiated event (click, touch, etc.)
 */
export async function ensureAudioUnlocked(): Promise<void> {
  const ctx = getSharedAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  if (!unlocked) {
    // Play a silent buffer to fully unlock on iOS/Android
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  }
}

// Auto-unlock on first user interaction (touch or click)
function onFirstInteraction() {
  ensureAudioUnlocked().catch(() => {});
  document.removeEventListener('touchstart', onFirstInteraction, true);
  document.removeEventListener('click', onFirstInteraction, true);
}

if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', onFirstInteraction, { capture: true, passive: true });
  document.addEventListener('click', onFirstInteraction, { capture: true });
}
