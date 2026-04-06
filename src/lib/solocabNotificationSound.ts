/**
 * SoloCab Signature Notification Sound
 * "Swoosh + Ding" — premium taxi sound signature
 * Uses shared AudioEngine for mobile/PWA/Capacitor compatibility
 */
import { getSharedAudioContext, ensureAudioUnlocked } from './audioEngine';

let cachedBuffer: AudioBuffer | null = null;

function generateSoloCabSound(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.85;
  const buffer = ctx.createBuffer(2, Math.ceil(sampleRate * duration), sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);

    // SWOOSH (0 - 0.35s)
    for (let i = 0; i < Math.min(data.length, Math.ceil(sampleRate * 0.35)); i++) {
      const t = i / sampleRate;
      const progress = t / 0.35;
      const swooshEnv = Math.sin(progress * Math.PI) * Math.pow(1 - progress, 0.5);
      const noise = (Math.random() * 2 - 1) * 0.15;
      const sweepFreq = 200 + progress * 2000;
      const swooshTone = Math.sin(2 * Math.PI * sweepFreq * t) * 0.08;
      data[i] = (noise + swooshTone) * swooshEnv * 0.6;
    }

    // DING (0.3s - 0.85s)
    const dingStart = Math.floor(sampleRate * 0.3);
    const dingDuration = 0.55;

    for (let i = dingStart; i < data.length; i++) {
      const t = (i - dingStart) / sampleRate;
      const progress = t / dingDuration;
      if (progress > 1) break;
      const dingEnv = Math.exp(-t * 5) * (1 - Math.exp(-t * 80));
      const fundamental = Math.sin(2 * Math.PI * 784 * t);
      const harmonic2 = Math.sin(2 * Math.PI * 1318 * t) * 0.4;
      const harmonic3 = Math.sin(2 * Math.PI * 1976 * t) * 0.15;
      const detune = Math.sin(2 * Math.PI * 787 * t) * 0.1;
      const ding = (fundamental + harmonic2 + harmonic3 + detune) * dingEnv * 0.35;
      data[i] = (data[i] || 0) + ding;
    }

    // Normalize
    let maxAmp = 0;
    for (let i = 0; i < data.length; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(data[i]));
    }
    if (maxAmp > 0.95) {
      const scale = 0.9 / maxAmp;
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
      }
    }
  }

  return buffer;
}

/**
 * Play the SoloCab notification sound
 */
export async function playSoloCabSound(volume: number = 0.7): Promise<void> {
  try {
    await ensureAudioUnlocked();
    const ctx = getSharedAudioContext();

    if (!cachedBuffer || cachedBuffer.sampleRate !== ctx.sampleRate) {
      cachedBuffer = generateSoloCabSound(ctx);
    }

    const source = ctx.createBufferSource();
    source.buffer = cachedBuffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume));

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);

    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn('SoloCab sound playback failed:', error);
  }
}

/**
 * Generate a WAV file Blob of the SoloCab sound (for SW/offline use)
 */
export function generateSoloCabWavBlob(): Blob {
  const sampleRate = 44100;
  const duration = 0.85;
  const numSamples = Math.ceil(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;

  const audioData = new Float32Array(numSamples);

  for (let i = 0; i < Math.min(numSamples, Math.ceil(sampleRate * 0.35)); i++) {
    const t = i / sampleRate;
    const progress = t / 0.35;
    const swooshEnv = Math.sin(progress * Math.PI) * Math.pow(1 - progress, 0.5);
    const noise = (Math.random() * 2 - 1) * 0.15;
    const sweepFreq = 200 + progress * 2000;
    const swooshTone = Math.sin(2 * Math.PI * sweepFreq * t) * 0.08;
    audioData[i] = (noise + swooshTone) * swooshEnv * 0.6;
  }

  const dingStart = Math.floor(sampleRate * 0.3);
  for (let i = dingStart; i < numSamples; i++) {
    const t = (i - dingStart) / sampleRate;
    const dingEnv = Math.exp(-t * 5) * (1 - Math.exp(-t * 80));
    const fundamental = Math.sin(2 * Math.PI * 784 * t);
    const harmonic2 = Math.sin(2 * Math.PI * 1318 * t) * 0.4;
    const harmonic3 = Math.sin(2 * Math.PI * 1976 * t) * 0.15;
    const detune = Math.sin(2 * Math.PI * 787 * t) * 0.1;
    const ding = (fundamental + harmonic2 + harmonic3 + detune) * dingEnv * 0.35;
    audioData[i] = (audioData[i] || 0) + ding;
  }

  let maxAmp = 0;
  for (let i = 0; i < numSamples; i++) maxAmp = Math.max(maxAmp, Math.abs(audioData[i]));
  if (maxAmp > 0.95) {
    const scale = 0.9 / maxAmp;
    for (let i = 0; i < numSamples; i++) audioData[i] *= scale;
  }

  const dataLength = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const SOLOCAB_VIBRATION_PATTERN = [100, 50, 200, 80, 150];

export default playSoloCabSound;
