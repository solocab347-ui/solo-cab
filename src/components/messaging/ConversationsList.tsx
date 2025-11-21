import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Conversation } from "@/hooks/useMessaging";
import { MessageSquare, Car, FileText, Receipt, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading: boolean;
}

interface NotificationCounts {
  courses: number;
  devis: number;
  factures: number;
}

export const ConversationsList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  loading,
}: ConversationsListProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Record<string, NotificationCounts>>({});

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id || conversations.length === 0) return;

      const counts: Record<string, NotificationCounts> = {};

      // Récupérer le driver_id de l'utilisateur actuel
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driverData) return;

      for (const conversation of conversations) {
        const clientUserId = conversation.other_user.id;
        
        // Trouver le client_id correspondant
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', clientUserId)
          .single();

        if (!clientData) continue;

        // Compter les courses en attente pour ce client
        const { count: coursesCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientData.id)
          .eq('driver_id', driverData.id)
          .eq('status', 'pending');

        // Compter les devis en attente pour ce client
        const { count: devisCount } = await supabase
          .from('devis')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientData.id)
          .eq('driver_id', driverData.id)
          .eq('status', 'pending');

        // Compter les factures non payées pour ce client
        const { count: facturesCount } = await supabase
          .from('factures')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientData.id)
          .eq('driver_id', driverData.id)
          .eq('payment_status', 'pending');

        counts[conversation.id] = {
          courses: coursesCount || 0,
          devis: devisCount || 0,
          factures: facturesCount || 0,
        };
      }

      setNotifications(counts);
    };

    fetchNotifications();
  }, [conversations, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune conversation</h3>
        <p className="text-sm text-muted-foreground">
          Commencez une nouvelle conversation en sélectionnant un contact
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {conversations.map((conversation) => (
          <Card
            key={conversation.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedConversation === conversation.id
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={conversation.other_user.profile_photo_url || undefined} />
                <AvatarFallback className="bg-gradient-trust text-trust-foreground">
                  {conversation.other_user.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold truncate">
                    {conversation.other_user.full_name}
                  </h4>
                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="bg-primary ml-2 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>

                {/* Notifications badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {notifications[conversation.id]?.courses > 0 && (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent text-xs flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {notifications[conversation.id].courses} course{notifications[conversation.id].courses > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {notifications[conversation.id]?.devis > 0 && (
                    <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary text-xs flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {notifications[conversation.id].devis} devis
                    </Badge>
                  )}
                  {notifications[conversation.id]?.factures > 0 && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning text-xs flex items-center gap-1">
                      <Receipt className="w-3 h-3" />
                      {notifications[conversation.id].factures} facture{notifications[conversation.id].factures > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {conversation.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message.content}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(conversation.last_message_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
