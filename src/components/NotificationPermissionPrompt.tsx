import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

export const NotificationPermissionPrompt = () => {
  const { user } = useAuth();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Ne pas afficher si déjà accordée, refusée, non supportée, ou si l'utilisateur n'est pas connecté
    if (!user || !isSupported || permission !== 'default' || isDismissed) {
      setIsVisible(false);
      return;
    }

    // Vérifier si l'utilisateur a déjà refusé dans localStorage
    const dismissed = localStorage.getItem('notification-permission-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      setIsVisible(false);
      return;
    }

    // Afficher le prompt après 3 secondes
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, isSupported, permission, isDismissed]);

  const handleAccept = async () => {
    const granted = await requestPermission();
    if (granted) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('notification-permission-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Activer les notifications</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Recevez des notifications en temps réel pour vos courses, devis et messages
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleAccept} className="flex-1">
            <Bell className="mr-2 h-4 w-4" />
            Activer
          </Button>
          <Button onClick={handleDismiss} variant="outline" className="flex-1">
            <BellOff className="mr-2 h-4 w-4" />
            Plus tard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};