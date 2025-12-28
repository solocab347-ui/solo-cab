import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { usePushNotificationsV2 } from '@/hooks/usePushNotificationsV2';
import { Badge } from '@/components/ui/badge';

interface PushNotificationSettingsProps {
  compact?: boolean;
}

export const PushNotificationSettings = ({ compact = false }: PushNotificationSettingsProps) => {
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    requestPermissionAndSubscribe,
    unsubscribe
  } = usePushNotificationsV2();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermissionAndSubscribe();
    }
  };

  if (!isSupported) {
    return compact ? null : (
      <Card className="border-destructive/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Les notifications push ne sont pas supportées sur cet appareil/navigateur.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-sm">Notifications push</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed ? "Activées" : "Désactivées"}
            </p>
          </div>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading || permission === 'denied'}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Notifications push</CardTitle>
              <CardDescription>
                Recevez des alertes instantanées sur votre appareil
              </CardDescription>
            </div>
          </div>
          <Badge variant={isSubscribed ? "default" : "outline"}>
            {isSubscribed ? "Activées" : "Désactivées"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Activez les notifications push pour être alerté immédiatement lorsque :
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Vous recevez une nouvelle demande de course</li>
          <li>Un client accepte ou refuse un devis</li>
          <li>Une course est modifiée ou annulée</li>
          <li>Vous recevez un message</li>
        </ul>

        {permission === 'denied' && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive">
              Les notifications sont bloquées par votre navigateur. 
              Veuillez les autoriser dans les paramètres de votre navigateur.
            </p>
          </div>
        )}

        <Button
          onClick={handleToggle}
          disabled={isLoading || permission === 'denied'}
          variant={isSubscribed ? "outline" : "default"}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Chargement...
            </>
          ) : isSubscribed ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Désactiver les notifications
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Activer les notifications
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
