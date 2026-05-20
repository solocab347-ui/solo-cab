import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  createLocalAudioTrack,
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';

/** Timeout d'inactivité (s) avant auto-hangup si aucun remote ne rejoint la room.
 *  Évite de payer des minutes LiveKit sur des appels orphelins (l'autre partie
 *  n'a jamais décroché, kill du process, etc.). */
const NO_REMOTE_TIMEOUT_MS = 120_000;

interface UseLiveKitCallOptions {
  callId: string | null;
  enabled: boolean;
  isMuted: boolean;
}

export function useLiveKitCall({ callId, enabled, isMuted }: UseLiveKitCallOptions) {
  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect
  useEffect(() => {
    if (!enabled || !callId) return;
    let cancelled = false;
    let noRemoteTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('livekit-token', {
          body: { callId },
        });
        if (fnErr || !data?.token) {
          throw new Error(fnErr?.message || data?.error || 'Token error');
        }
        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: { dtx: true, red: true },
        });
        roomRef.current = room;

        // Audio element for remote audio playback
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        (audioEl as any).playsInline = true;
        document.body.appendChild(audioEl);
        audioElRef.current = audioEl;

        // Auto-hangup si aucun remote n'a rejoint après NO_REMOTE_TIMEOUT_MS
        noRemoteTimer = setTimeout(() => {
          if (room.remoteParticipants.size === 0) {
            console.warn('[LiveKit] auto-hangup: aucun remote après', NO_REMOTE_TIMEOUT_MS, 'ms');
            setError('timeout_no_answer');
            room.disconnect().catch(() => {});
          }
        }, NO_REMOTE_TIMEOUT_MS);

        room.on(RoomEvent.ParticipantConnected, () => {
          if (noRemoteTimer) { clearTimeout(noRemoteTimer); noRemoteTimer = null; }
        });

        room.on(RoomEvent.TrackSubscribed, (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          _participant: RemoteParticipant
        ) => {
          if (track.kind === Track.Kind.Audio) {
            track.attach(audioEl);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          setConnected(false);
        });

        await room.connect(data.url, data.token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        const mic = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
        await room.localParticipant.publishTrack(mic);
        setConnected(true);
      } catch (e) {
        console.error('[LiveKit] connect error', e);
        setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      if (noRemoteTimer) { clearTimeout(noRemoteTimer); noRemoteTimer = null; }
      const r = roomRef.current;
      roomRef.current = null;
      if (r) r.disconnect().catch(() => {});
      const a = audioElRef.current;
      audioElRef.current = null;
      if (a) {
        try { a.pause(); a.remove(); } catch {}
      }
      setConnected(false);
    };
  }, [callId, enabled]);

    return () => {
      cancelled = true;
      const r = roomRef.current;
      roomRef.current = null;
      if (r) r.disconnect().catch(() => {});
      const a = audioElRef.current;
      audioElRef.current = null;
      if (a) {
        try { a.pause(); a.remove(); } catch {}
      }
      setConnected(false);
    };
  }, [callId, enabled]);

  // Toggle mute
  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant.audioTrackPublications.forEach((pub) => {
      if (isMuted) pub.mute(); else pub.unmute();
    });
  }, [isMuted, connected]);

  return { connected, error };
}
