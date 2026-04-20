import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, ArrowLeft, Check, Trash2, ExternalLink, Calendar, DollarSign, MessageSquare, Users, AlertTriangle, CheckCircle2, XCircle, Info, Star } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  category?: string;
  created_at: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Scroll vers une notification spécifique si ID passé en paramètre
  useEffect(() => {
    const notificationId = searchParams.get('id');
    if (notificationId && notifications.length > 0) {
      const element = document.getElementById(`notification-${notificationId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary');
        }, 2000);
      }
    }
  }, [searchParams, notifications]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);

      if (error) throw error;
      
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
      
      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast.success("Notification supprimée");
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marquer comme lu
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // ✅ NAVIGATION VERS LE LIEN SPÉCIFIQUE
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "course":
        return <Calendar className="w-5 h-5 text-primary" />;
      case "devis":
      case "facture":
      case "payment":
        return <DollarSign className="w-5 h-5 text-success" />;
      case "client":
      case "driver":
        return <Users className="w-5 h-5 text-accent" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-accent" />;
      case "rating":
        return <Star className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success/10 border-success/20 text-success";
      case "warning":
        return "bg-warning/10 border-warning/20 text-warning";
      case "error":
        return "bg-destructive/10 border-destructive/20 text-destructive";
      default:
        return "bg-primary/10 border-primary/20 text-primary";
    }
  };

  const filteredNotifications = filter 
    ? notifications.filter(n => n.type === filter || n.category === filter)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filterOptions = [
    { key: null, label: 'Tous', count: notifications.length },
    { key: 'course', label: 'Courses', count: notifications.filter(n => n.type === 'course').length },
    { key: 'devis', label: 'Devis', count: notifications.filter(n => n.type === 'devis').length },
    { key: 'facture', label: 'Factures', count: notifications.filter(n => n.type === 'facture').length },
    { key: 'success', label: 'Succès', count: notifications.filter(n => n.type === 'success').length },
    { key: 'warning', label: 'Alertes', count: notifications.filter(n => n.type === 'warning').length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-white border-white/30"
              >
                <Check className="w-4 h-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mt-4">
            {filterOptions.map(opt => (
              <Button
                key={opt.key || 'all'}
                variant={filter === opt.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(opt.key)}
                className="gap-1"
              >
                {opt.label}
                {opt.count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {opt.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </Card>

        {/* Notifications List */}
        <Card className="p-0 bg-card/80 backdrop-blur-sm border-primary/20 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-20 text-white" />
              <p className="text-white">Aucune notification</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    id={`notification-${notification.id}`}
                    className={`p-6 hover:bg-muted/10 cursor-pointer transition-all duration-200 relative group ${
                      !notification.is_read ? "bg-primary/5 border-l-4 border-l-primary" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          
                          <Badge className={getNotificationColor(notification.type)}>
                            {notification.type === "success" && "Succès"}
                            {notification.type === "warning" && "Attention"}
                            {notification.type === "error" && "Erreur"}
                            {notification.type === "info" && "Info"}
                            {notification.type === "course" && "Course"}
                            {notification.type === "devis" && "Devis"}
                            {notification.type === "facture" && "Facture"}
                            {notification.type === "payment" && "Paiement"}
                            {notification.type === "client" && "Client"}
                            {notification.type === "driver" && "Chauffeur"}
                            {notification.type === "partnership" && "Partenariat"}
                            {notification.type === "fleet" && "Flotte"}
                            {notification.type === "message" && "Message"}
                            {notification.type === "rating" && "Note"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                            <span className="text-xs text-muted-foreground/50">
                              {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {notification.link && (
                              <span className="text-xs text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                Voir détails
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
