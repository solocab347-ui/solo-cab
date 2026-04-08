import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/lib/notificationSounds';

export interface CallSession {
  id: string;
  ride_id: string;
  room_id: string;
  caller_id: string;
  caller_type: 'client' | 'driver';
  receiver_id: string;
  receiver_type: 'client' | 'driver';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface UseCallSessionOptions {
  
  /** Current user ID */
  userId: string;
  /** Current user type */
  userType: 'client' | 'driver';
  /** Ride ID to scope calls */
  rideId: string | null;
  enabled?: boolean;
}

export function useCallSession({ userId, userType, rideId, enabled = true }: UseCallSessionOptions) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<NodeJS.Timeout | null>(null);

  // Start a call
  const startCall = useCallback(async (receiverId: string, receiverType: 'client' | 'driver') => {
    if (!rideId) return null;

    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        ride_id: rideId,
        caller_id: userId,
        caller_type: userType,
        receiver_id: receiverId,
        receiver_type: receiverType,
      })
      .select()
      .single();

    if (error) {
      console.error('[Call] Start error:', error);
      return null;
    }

    const session = data as unknown as CallSession;
    setActiveCall(session);
    return session;
  }, [rideId, userId, userType]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    const { error } = await supabase
      .from('call_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', incomingCall.id);

    if (error) {
      console.error('[Call] Accept error:', error);
      return;
    }

    setActiveCall({ ...incomingCall, status: 'active' });
    setIncomingCall(null);
    stopRingtone();
  }, [incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'rejected', ended_at: new Date().toISOString() })
      .eq('id', incomingCall.id);

    setIncomingCall(null);
    stopRingtone();
  }, [incomingCall]);

  // End active call
  const endCall = useCallback(async () => {
    if (!activeCall) return;

    await supabase
      .from('call_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', activeCall.id);

    setActiveCall(null);
    setCallDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [activeCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Ringtone management
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current);
      ringtoneRef.current = null;
    }
  }, []);

  // Duration timer
  useEffect(() => {
    if (activeCall?.status === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall?.status]);

  // Listen for incoming calls
  useEffect(() => {
    if (!userId || !enabled || !rideId) return;

    const channel = supabase
      .channel(`call-incoming-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const call = payload.new as unknown as CallSession;
          if (call.ride_id === rideId && call.status === 'ringing') {
            setIncomingCall(call);
            // Play ringtone
            playNotificationSound('ride', 0.8);
            if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
            ringtoneRef.current = setInterval(() => {
              playNotificationSound('ride', 0.8);
              if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
    };
  }, [userId, enabled, rideId, stopRingtone]);

  // Listen for call status changes (accept, reject, end by other party)
  useEffect(() => {
    if (!activeCall && !incomingCall) return;
    const callId = activeCall?.id || incomingCall?.id;
    if (!callId) return;

    const channel = supabase
      .channel(`call-status-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as CallSession;
          if (['ended', 'rejected', 'missed'].includes(updated.status)) {
            setActiveCall(null);
            setIncomingCall(null);
            setCallDuration(0);
            stopRingtone();
            if (timerRef.current) clearInterval(timerRef.current);
          } else if (updated.status === 'active' && activeCall) {
            setActiveCall(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCall?.id, incomingCall?.id, stopRingtone]);

  // Auto-miss after 30s ringing
  useEffect(() => {
    if (!incomingCall) return;
    const timeout = setTimeout(async () => {
      await supabase
        .from('call_sessions')
        .update({ status: 'missed', ended_at: new Date().toISOString() })
        .eq('id', incomingCall.id)
        .eq('status', 'ringing');
      setIncomingCall(null);
      stopRingtone();
    }, 30000);
    return () => clearTimeout(timeout);
  }, [incomingCall, stopRingtone]);

  return {
    activeCall,
    incomingCall,
    callDuration,
    isMuted,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
