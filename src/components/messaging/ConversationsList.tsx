import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageSquare, Car, FileText, Receipt, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Conversation } from "@/hooks/useMessaging";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const selectedConvo = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="p-4">
      <Select
        value={selectedConversation || undefined}
        onValueChange={onSelectConversation}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sélectionner une conversation">
            {selectedConvo && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={selectedConvo.other_user.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-trust text-trust-foreground text-xs">
                    {selectedConvo.other_user.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedConvo.other_user.full_name}</span>
                {selectedConvo.unread_count > 0 && (
                  <Badge variant="default" className="bg-primary ml-1">
                    {selectedConvo.unread_count}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {conversations.map((conversation) => (
            <SelectItem key={conversation.id} value={conversation.id}>
              <div className="flex items-center gap-3 py-1 w-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={conversation.other_user.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-trust text-trust-foreground text-xs">
                    {conversation.other_user.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate text-sm">
                      {conversation.other_user.full_name}
                    </span>
                    {conversation.unread_count > 0 && (
                      <Badge variant="default" className="bg-primary flex items-center gap-1 text-xs">
                        <MessageCircle className="w-3 h-3" />
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>

                  {/* Notifications badges */}
                  <div className="flex flex-wrap gap-1">
                    {notifications[conversation.id]?.courses > 0 && (
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent text-xs flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {notifications[conversation.id].courses}
                      </Badge>
                    )}
                    {notifications[conversation.id]?.devis > 0 && (
                      <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary text-xs flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {notifications[conversation.id].devis}
                      </Badge>
                    )}
                    {notifications[conversation.id]?.factures > 0 && (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning text-xs flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        {notifications[conversation.id].factures}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Preview card of selected conversation */}
      {selectedConvo && (
        <Card className="mt-4 p-4 border border-border/50">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedConvo.other_user.profile_photo_url || undefined} />
                <AvatarFallback className="bg-gradient-trust text-trust-foreground">
                  {selectedConvo.other_user.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{selectedConvo.other_user.full_name}</h4>
                {selectedConvo.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedConvo.last_message.content}
                  </p>
                )}
              </div>
            </div>

            {/* Notifications in preview */}
            {(notifications[selectedConvo.id]?.courses > 0 || 
              notifications[selectedConvo.id]?.devis > 0 || 
              notifications[selectedConvo.id]?.factures > 0) && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                {notifications[selectedConvo.id]?.courses > 0 && (
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent text-xs flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    {notifications[selectedConvo.id].courses} course{notifications[selectedConvo.id].courses > 1 ? 's' : ''}
                  </Badge>
                )}
                {notifications[selectedConvo.id]?.devis > 0 && (
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary text-xs flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {notifications[selectedConvo.id].devis} devis
                  </Badge>
                )}
                {notifications[selectedConvo.id]?.factures > 0 && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning text-xs flex items-center gap-1">
                    <Receipt className="w-3 h-3" />
                    {notifications[selectedConvo.id].factures} facture{notifications[selectedConvo.id].factures > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
