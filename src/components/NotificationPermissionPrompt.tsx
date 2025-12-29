import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, X, Loader2 } from 'lucide-react';
import { usePushNotificationsV2 } from '@/hooks/usePushNotificationsV2';
import { useAuth } from '@/hooks/useAuth';

export const NotificationPermissionPrompt = () => {
  const { user } = useAuth();
  const { 
    permission, 
    isSupported, 
    isSubscribed,
    isLoading,
    requestPermissionAndSubscribe 
  } = usePushNotificationsV2();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Ne pas afficher si:
    // - Pas d'utilisateur connecté
    // - Non supporté
    // - Permission déjà accordée ou refusée
    // - Déjà inscrit aux push
    // - Déjà refusé via localStorage
    if (!user || !isSupported || permission === 'denied' || isSubscribed || isDismissed) {
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

    // Afficher le prompt après 2 secondes pour les nouveaux utilisateurs
    const timer = setTimeout(() => {
      // Ne montrer que si permission est 'default' (pas encore demandée)
      if (permission === 'default') {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isSupported, permission, isSubscribed, isDismissed]);

  const handleAccept = async () => {
    const success = await requestPermissionAndSubscribe();
    if (success) {
      setIsVisible(false);
      // Marquer comme configuré
      localStorage.setItem('notification-permission-configured', 'true');
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
      <Card className="border-primary/20 shadow-lg bg-background">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Notifications push</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Recevez des alertes instantanées pour vos courses, devis, messages et partenariats - même quand l'application est fermée.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button 
            onClick={handleAccept} 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activation...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Activer
              </>
            )}
          </Button>
          <Button 
            onClick={handleDismiss} 
            variant="outline" 
            className="flex-1"
            disabled={isLoading}
          >
            <BellOff className="mr-2 h-4 w-4" />
            Plus tard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
