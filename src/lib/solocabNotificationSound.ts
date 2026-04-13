/**
 * SoloCab Ride Request Notification Sound
 * Uses the custom MP3 ringtone for all ride request alerts.
 * Prevents double-play by tracking active playback.
 */
import { getSharedAudioContext, ensureAudioUnlocked } from './audioEngine';

const RIDE_SOUND_URL = '/sounds/ride-request.mp3';

let cachedAudioBuffer: AudioBuffer | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeGain: GainNode | null = null;
let activeAudioElement: HTMLAudioElement | null = null;

/**
 * Pre-load the MP3 into an AudioBuffer for low-latency playback via Web Audio API
 */
async function loadSoundBuffer(): Promise<AudioBuffer | null> {
  if (cachedAudioBuffer) return cachedAudioBuffer;

  try {
    const ctx = getSharedAudioContext();
    const response = await fetch(RIDE_SOUND_URL);
    const arrayBuffer = await response.arrayBuffer();
    cachedAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return cachedAudioBuffer;
  } catch (err) {
    console.warn('[SoloCab Sound] Failed to decode MP3 via Web Audio:', err);
    return null;
  }
}

/**
 * Stop any currently playing sound to prevent overlap
 */
export function stopCurrentPlayback() {
  try {
    if (activeSource) {
      activeSource.stop();
      activeSource.disconnect();
      activeSource = null;
    }
    if (activeGain) {
      activeGain.disconnect();
      activeGain = null;
    }
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    }
  } catch {
    // Ignore errors from already-stopped sources
  }
}

/**
 * Play the SoloCab notification sound (ride request ringtone)
 * Stops any previous playback first to prevent double/overlapping sound.
 */
export async function playSoloCabSound(volume: number = 1.0): Promise<void> {
  try {
    // Stop any currently playing instance FIRST
    stopCurrentPlayback();

    await ensureAudioUnlocked();

    // Try Web Audio API first (best for in-app, low latency)
    const buffer = await loadSoundBuffer();
    if (buffer) {
      const ctx = getSharedAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      activeSource = source;
      activeGain = gainNode;
      
      source.start(0);

      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        if (activeSource === source) {
          activeSource = null;
          activeGain = null;
        }
      };
      return;
    }

    // Fallback: HTMLAudioElement (works when Web Audio fails)
    if (!activeAudioElement) {
      activeAudioElement = new Audio(RIDE_SOUND_URL);
    }
    activeAudioElement.volume = Math.max(0, Math.min(1, volume));
    activeAudioElement.currentTime = 0;
    await activeAudioElement.play();
  } catch (error) {
    console.warn('[SoloCab Sound] Playback failed:', error);
  }
}

/**
 * Pre-load the sound for instant playback later
 */
export async function preloadRideSound(): Promise<void> {
  try {
    await loadSoundBuffer();
  } catch {
    // Silent fail — sound will load on first play
  }
}

export const SOLOCAB_VIBRATION_PATTERN = [100, 50, 200, 80, 150];

export default playSoloCabSound;
