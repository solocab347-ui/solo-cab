import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bell, 
  Car, 
  FileText, 
  AlertTriangle, 
  Bug, 
  MessageSquare,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string | null;
  is_read: boolean;
  link: string;
  created_at: string;
}

interface AdminNotificationCenterProps {
  onNavigate?: (section: string, tab?: string) => void;
}

const getCategoryIcon = (category: string | null) => {
  switch (category) {
    case 'driver_registration':
    case 'driver_documents':
      return <Car className="w-4 h-4" />;
    case 'vehicle':
    case 'vehicle_documents':
      return <Car className="w-4 h-4" />;
    case 'error':
      return <Bug className="w-4 h-4" />;
    case 'feedback':
    case 'suggestion':
      return <MessageSquare className="w-4 h-4" />;
    case 'dispute':
    case 'partnership_dispute':
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case 'driver_registration':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'driver_documents':
    case 'vehicle_documents':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'feedback':
    case 'suggestion':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'dispute':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

export const AdminNotificationCenter = ({ onNavigate }: AdminNotificationCenterProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter) {
        query = query.eq("category", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, filter]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Parse link to navigate
    if (onNavigate && notification.link) {
      const url = new URL(notification.link, window.location.origin);
      const section = url.searchParams.get('section');
      const tab = url.searchParams.get('tab');
      if (section) {
        onNavigate(section, tab || undefined);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const categories = [
    { key: null, label: 'Tous', count: notifications.length },
    { key: 'driver_registration', label: 'Inscriptions', count: notifications.filter(n => n.category === 'driver_registration').length },
    { key: 'driver_documents', label: 'Documents', count: notifications.filter(n => n.category === 'driver_documents' || n.category === 'vehicle_documents').length },
    { key: 'error', label: 'Erreurs', count: notifications.filter(n => n.category === 'error').length },
    { key: 'feedback', label: 'Feedbacks', count: notifications.filter(n => n.category === 'feedback' || n.category === 'suggestion').length },
    { key: 'dispute', label: 'Litiges', count: notifications.filter(n => n.category === 'dispute').length },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Centre de notifications
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <Button
              key={cat.key || 'all'}
              variant={filter === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat.key)}
              className="gap-1"
            >
              {cat.label}
              {cat.count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {cat.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune notification
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getCategoryColor(notification.category)}`}>
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
