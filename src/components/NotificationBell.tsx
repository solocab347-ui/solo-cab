import { useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, XCircle, Info, Calendar, MessageSquare, DollarSign, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  // Show only first 3 notifications
  const displayedNotifications = notifications.slice(0, 3);
  const hasMore = notifications.length > 3;

  const handleNotificationClick = (notification: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    markAsRead(notification.id);
    
    if (notification.link) {
      setOpen(false);
      // Petit délai pour laisser le popover se fermer avant navigation
      setTimeout(() => {
        navigate(notification.link);
      }, 50);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "course":
        return <Calendar className="h-5 w-5 text-primary" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-accent" />;
      case "payment":
        return <DollarSign className="h-5 w-5 text-success" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getNotificationBg = (type: string, isRead: boolean) => {
    if (isRead) return "bg-background";
    switch (type) {
      case "success":
        return "bg-success/5";
      case "warning":
        return "bg-warning/5";
      case "error":
        return "bg-destructive/5";
      default:
        return "bg-primary/5";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative transition-all",
            unreadCount > 0 && "animate-pulse"
          )}
        >
          <Bell className={cn(
            "h-5 w-5 transition-colors",
            unreadCount > 0 && "text-primary"
          )} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-in zoom-in-50"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 shadow-xl" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs hover:bg-primary/10"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <ScrollArea className="h-[450px]">
          {displayedNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Bell className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm font-medium mb-1">Aucune notification</p>
              <p className="text-xs">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {displayedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-sm",
                    getNotificationBg(notification.type, notification.is_read),
                    !notification.is_read && "border-l-4 border-l-primary"
                  )}
                  onClick={(e) => handleNotificationClick(notification, e)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-semibold line-clamp-2",
                          !notification.is_read && "text-foreground"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground/70 font-medium">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-muted/20 space-y-2">
          {hasMore && (
            <Button
              variant="ghost"
              className="w-full hover:bg-primary/10 font-medium"
              onClick={() => {
                navigate("/notifications");
                setOpen(false);
              }}
            >
              Voir toutes les notifications ({notifications.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              navigate("/notification-settings");
              setOpen(false);
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Paramètres des notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
