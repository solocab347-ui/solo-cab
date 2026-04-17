import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playInfoChime } from '@/lib/notificationSounds';
import { getRideChatClient } from '@/lib/rideChatClient';

export interface RideMessage {
  id: string;
  ride_id: string;
  sender_type: 'client' | 'driver' | 'guest';
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface UseRideChatOptions {
  rideId: string | null;
  senderType: 'client' | 'driver' | 'guest';
  senderId: string;
  /** Required for guest senders — the guest_tracking_token from the URL */
  guestToken?: string | null;
  enabled?: boolean;
}

export function useRideChat({ rideId, senderType, senderId, guestToken, enabled = true }: UseRideChatOptions) {
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatClosed, setChatClosed] = useState(false);
  const isFirstLoad = useRef(true);
  const chatClient = useMemo(() => getRideChatClient(senderType), [senderType]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!rideId || !enabled) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      let data: any[] | null = null;

      if (senderType === 'guest' && guestToken) {
        const { data: rpcData, error } = await supabase.rpc(
          'get_guest_ride_messages' as any,
          { _token: guestToken }
        );
        if (error) throw error;
        data = (rpcData as any[]) || [];
      } else {
        const { data: rows, error } = await chatClient
          .from('ride_messages')
          .select('*')
          .eq('ride_id', rideId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        data = rows || [];
      }

      setMessages((data || []) as unknown as RideMessage[]);

      const unread = (data || []).filter(
        (m: any) => !m.is_read && m.sender_type !== senderType
      ).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('[RideChat] Fetch error:', err);
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [rideId, enabled, senderType, guestToken, chatClient]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!rideId || !text.trim() || chatClosed) return false;
    setSending(true);

    const trimmedMessage = text.trim();
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: RideMessage = {
      id: optimisticId,
      ride_id: rideId,
      sender_type: senderType,
      sender_id: senderId,
      message: trimmedMessage,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      let data: any = null;

      if (senderType === 'guest' && guestToken) {
        const { data: rpcResult, error } = await supabase.rpc(
          'send_guest_ride_message' as any,
          { _token: guestToken, _message: trimmedMessage }
        );
        if (error) throw error;
        if (!rpcResult || (rpcResult as any).success !== true) {
          throw new Error((rpcResult as any)?.error || 'send_failed');
        }
        // Build a local representation; the realtime channel will reconcile id
        data = {
          id: (rpcResult as any).id,
          ride_id: rideId,
          sender_type: 'guest',
          sender_id: senderId,
          message: trimmedMessage,
          is_read: false,
          created_at: new Date().toISOString(),
        };
      } else {
        const { data: row, error } = await chatClient
          .from('ride_messages')
          .insert({
            ride_id: rideId,
            sender_type: senderType,
            sender_id: senderId,
            message: trimmedMessage,
          })
          .select('*')
          .single();
        if (error) throw error;
        data = row;
      }

      if (data) {
        setMessages(prev => prev.map(message => (
          message.id === optimisticId ? (data as unknown as RideMessage) : message
        )));
      }

      return true;
    } catch (err) {
      setMessages(prev => prev.filter(message => message.id !== optimisticId));
      console.error('[RideChat] Send error:', err);
      return false;
    } finally {
      setSending(false);
    }
  }, [rideId, senderType, senderId, chatClosed, chatClient, guestToken]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!rideId) return;

    const unreadIds = messages
      .filter(m => !m.is_read && m.sender_type !== senderType)
      .map(m => m.id);

    if (unreadIds.length === 0) return;

    // Optimistic update
    setMessages(prev => prev.map(m =>
      unreadIds.includes(m.id) ? { ...m, is_read: true } : m
    ));
    setUnreadCount(0);

    if (senderType === 'guest' && guestToken) {
      await supabase.rpc('mark_guest_ride_messages_read' as any, { _token: guestToken });
    } else {
      await chatClient
        .from('ride_messages')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  }, [rideId, messages, senderType, guestToken, chatClient]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!rideId || !enabled) return;

    const channel = chatClient
      .channel(`ride-chat-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_messages',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as RideMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Play sound for incoming messages from others
          if (newMsg.sender_type !== senderType && !isFirstLoad.current) {
            playInfoChime(0.5);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      chatClient.removeChannel(channel);
    };
  }, [rideId, enabled, senderType, chatClient]);

  // Check if ride is completed => chat becomes read-only
  useEffect(() => {
    if (!rideId || !enabled) return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from('ride_requests')
        .select('status')
        .eq('id', rideId)
        .single();

      if (data && ['completed', 'cancelled', 'expired'].includes(data.status || '')) {
        setChatClosed(true);
      }
    };

    checkStatus();

    const channel = supabase
      .channel(`ride-status-chat-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const status = (payload.new as any).status;
          if (['completed', 'cancelled', 'expired'].includes(status)) {
            setChatClosed(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, enabled]);

  return {
    messages,
    loading,
    sending,
    unreadCount,
    chatClosed,
    sendMessage,
    markAsRead,
    refresh: fetchMessages,
  };
}
