/**
 * GuidedPermissionsBanner — bandeau non bloquant qui propose à l'utilisateur
 * d'activer les permissions critiques (localisation fine, notifications) si
 * elles manquent. Ne s'affiche jamais pendant un flow de réservation actif :
 * il suffit de ne pas le monter sur les routes /booking, /commande, /tunnel.
 *
 * Usage : <GuidedPermissionsBanner /> dans un dashboard chauffeur ou client.
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, MapPin, X } from 'lucide-react';

interface PermissionState {
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
}

const DISMISS_KEY = 'solocab_guided_perms_dismissed_at';

export function GuidedPermissionsBanner() {
  const [perms, setPerms] = useState<PermissionState>({ notifications: 'unknown', location: 'unknown' });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Re-show après 24h
    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (last && Date.now() - last < 24 * 3600 * 1000) {
      setHidden(true);
      return;
    }
    void check();
  }, []);

  const check = async () => {
    try {
      const next: PermissionState = { notifications: 'unknown', location: 'unknown' };
      if (Capacitor.isNativePlatform()) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const r = await PushNotifications.checkPermissions();
          next.notifications = r.receive === 'granted' ? 'granted' : r.receive === 'denied' ? 'denied' : 'prompt';
        } catch { /* ignore */ }
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          const g = await Geolocation.checkPermissions();
          next.location = g.location === 'granted' ? 'granted' : g.location === 'denied' ? 'denied' : 'prompt';
        } catch { /* ignore */ }
      } else if ('Notification' in window) {
        next.notifications = (Notification.permission as PermissionState['notifications']);
        if ('permissions' in navigator) {
          try {
            const s = await navigator.permissions.query({ name: 'geolocation' });
            next.location = s.state as PermissionState['location'];
          } catch { /* ignore */ }
        }
      }
      setPerms(next);
    } catch { /* ignore */ }
  };

  const requestNotifs = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.requestPermissions();
      } else if ('Notification' in window) {
        await Notification.requestPermission();
      }
    } catch { /* swallow */ }
    void check();
  };

  const requestLocation = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.requestPermissions();
      } else if ('geolocation' in navigator) {
        await new Promise<void>((res) => navigator.geolocation.getCurrentPosition(() => res(), () => res()));
      }
    } catch { /* swallow */ }
    void check();
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  };

  const needsNotifs = perms.notifications === 'prompt' || perms.notifications === 'denied';
  const needsLocation = perms.location === 'prompt' || perms.location === 'denied';

  if (hidden || (!needsNotifs && !needsLocation)) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3 flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">Améliore ta réactivité aux courses</p>
          <p className="text-xs text-muted-foreground">
            Active ces autorisations pour ne manquer aucune demande, même écran éteint.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {needsNotifs && (
              <Button size="sm" variant="default" onClick={requestNotifs} className="gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Activer les notifications
              </Button>
            )}
            {needsLocation && (
              <Button size="sm" variant="default" onClick={requestLocation} className="gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Activer la localisation
              </Button>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={dismiss} className="h-7 w-7 -mt-1">
          <X className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
