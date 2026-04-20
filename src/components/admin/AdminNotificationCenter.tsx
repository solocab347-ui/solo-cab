import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Loader2,
  ExternalLink,
  Users,
  Building2,
  CreditCard,
  X,
  CheckCheck
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

const getCategoryIcon = (category: string | null, type?: string) => {
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
    case 'subscription':
      return <CreditCard className="w-4 h-4" />;
    case 'company':
      return <Building2 className="w-4 h-4" />;
    case 'client_registration':
      return <Users className="w-4 h-4" />;
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
    case 'partnership_dispute':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'subscription':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'company':
      return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    case 'client_registration':
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

export const AdminNotificationCenter = ({ onNavigate }: AdminNotificationCenterProps) => {
  const navigate = useNavigate();
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

  // ✅ NOUVEAU : Marquer toutes les notifs d'une catégorie comme lues
  const markCategoryAsRead = async (category: string | null) => {
    if (!user) return;
    let q = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (category) q = q.eq("category", category);
    await q;
    setNotifications(prev =>
      prev.map(n =>
        (!category || n.category === category) ? { ...n, is_read: true } : n
      )
    );
  };

  // ✅ NOUVEAU : Dismiss individuel (suppression d'une notif)
  const dismissNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // ✅ NAVIGATION GRANULAIRE AMÉLIORÉE
    if (notification.link) {
      const url = new URL(notification.link, window.location.origin);
      const section = url.searchParams.get('section');
      const tab = url.searchParams.get('tab');
      
      // Extraire les IDs pour une navigation précise
      const driverId = url.searchParams.get('driverId');
      const clientId = url.searchParams.get('clientId');
      const companyId = url.searchParams.get('companyId');
      const courseId = url.searchParams.get('courseId');
      const disputeId = url.searchParams.get('disputeId');
      const errorId = url.searchParams.get('errorId');
      const feedbackId = url.searchParams.get('feedbackId');
      const fleetManagerId = url.searchParams.get('fleetManagerId');
      const view = url.searchParams.get('view');

      // Si onNavigate est fourni (navigation interne admin), l'utiliser
      if (onNavigate && section) {
        // Construire les paramètres pour la navigation interne
        const params = new URLSearchParams();
        if (tab) params.set('tab', tab);
        if (driverId) params.set('driverId', driverId);
        if (clientId) params.set('clientId', clientId);
        if (companyId) params.set('companyId', companyId);
        if (courseId) params.set('courseId', courseId);
        if (disputeId) params.set('disputeId', disputeId);
        if (errorId) params.set('errorId', errorId);
        if (feedbackId) params.set('feedbackId', feedbackId);
        if (fleetManagerId) params.set('fleetManagerId', fleetManagerId);
        if (view) params.set('view', view);
        
        // Appeler onNavigate avec section et tab
        onNavigate(section, tab || undefined);
        
        // Mettre à jour l'URL avec tous les paramètres pour le deep linking
        const fullUrl = `${url.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', fullUrl);
      } else {
        // Navigation directe via React Router
        navigate(notification.link);
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
    { key: 'dispute', label: 'Litiges', count: notifications.filter(n => n.category === 'dispute' || n.category === 'partnership_dispute').length },
    { key: 'subscription', label: 'Abonnements', count: notifications.filter(n => n.category === 'subscription').length },
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
        <div className="flex items-center gap-2">
          {filter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markCategoryAsRead(filter)}
              title="Marquer cette catégorie comme lue"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Catégorie lue
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
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
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 group relative ${
                    !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                >
                  {/* ✅ NOUVEAU : Bouton dismiss individuel */}
                  <button
                    onClick={(e) => dismissNotification(notification.id, e)}
                    className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Supprimer cette notification"
                    aria-label="Supprimer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-start gap-3 pr-6">
                    <div className={`p-2 rounded-full ${getCategoryColor(notification.category)}`}>
                      {getCategoryIcon(notification.category, notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        {notification.link && (
                          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                        {notification.link && (
                          <span className="text-xs text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                            Cliquer pour voir →
                          </span>
                        )}
                      </div>
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
