import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string;
  other_user: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
  };
  last_message?: Message;
  unread_count: number;
}

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data: convos, error } = await supabase
        .from("conversations")
        .select(`
          id,
          participant_1_id,
          participant_2_id,
          last_message_at
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      if (!convos) {
        setConversations([]);
        return;
      }

      // Fetch profiles for other participants
      const enrichedConvos = await Promise.all(
        convos.map(async (convo) => {
          const otherUserId =
            convo.participant_1_id === user.id
              ? convo.participant_2_id
              : convo.participant_1_id;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .eq("id", otherUserId)
            .single();

          // Fetch last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", convo.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", convo.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          return {
            ...convo,
            other_user: profile || { id: otherUserId, full_name: "Utilisateur", profile_photo_url: null },
            last_message: lastMsg || undefined,
            unread_count: unreadCount || 0,
          };
        })
      );

      setConversations(enrichedConvos);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Erreur lors du chargement des conversations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      // Refresh conversations to update unread count
      fetchConversations();
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Erreur lors du chargement des messages");
    }
  }, [user, fetchConversations]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    }
  }, [user]);

  // Create or get conversation
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        user1_id: user.id,
        user2_id: otherUserId,
      });

      if (error) throw error;

      await fetchConversations();
      return data as string;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Erreur lors de la création de la conversation");
      return null;
    }
  }, [user, fetchConversations]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("Message change:", payload);
          if (payload.new && selectedConversation) {
            const newMsg = payload.new as Message;
            if (newMsg.conversation_id === selectedConversation) {
              setMessages((prev) => [...prev, newMsg]);
              // Mark as read if not from current user
              if (newMsg.sender_id !== user.id) {
                supabase
                  .from("messages")
                  .update({ is_read: true })
                  .eq("id", newMsg.id)
                  .then(() => fetchConversations());
              }
            } else {
              fetchConversations();
            }
          }
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [user, selectedConversation, fetchConversations]);

  return {
    conversations,
    messages,
    selectedConversation,
    loading,
    setSelectedConversation,
    fetchMessages,
    sendMessage,
    getOrCreateConversation,
    fetchConversations,
  };
};
