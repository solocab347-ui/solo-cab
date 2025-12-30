import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotificationsV2 } from '@/hooks/usePushNotificationsV2';
import { toast } from 'sonner';
import { logger } from '@/lib/productionLogger';

interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  notify_new_course: boolean;
  notify_new_devis: boolean;
  notify_course_accepted: boolean;
  notify_new_message: boolean;
  notify_new_facture: boolean;
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { permission, isSupported, requestPermissionAndSubscribe, unsubscribe, isSubscribed } = usePushNotificationsV2();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: false,
    email_enabled: true,
    notify_new_course: true,
    notify_new_devis: true,
    notify_course_accepted: true,
    notify_new_message: true,
    notify_new_facture: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignorer l'erreur "not found"
        logger.error('Erreur chargement préférences:', error);
        return;
      }

      if (data) {
        setPreferences({
          push_enabled: data.push_enabled || false,
          email_enabled: data.email_enabled || true,
          notify_new_course: data.notify_new_course !== false,
          notify_new_devis: data.notify_new_devis !== false,
          notify_course_accepted: data.notify_course_accepted !== false,
          notify_new_message: data.notify_new_message !== false,
          notify_new_facture: data.notify_new_facture !== false
        });
      }
    } catch (error) {
      logger.error('Erreur récupération préférences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          [key]: value
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Erreur mise à jour préférence:', error);
        toast.error('Erreur lors de la mise à jour');
        return;
      }

      setPreferences(prev => ({ ...prev, [key]: value }));
      toast.success('Préférence mise à jour');
    } catch (error) {
      logger.error('Erreur mise à jour préférence:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleTogglePushNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
      setPreferences(prev => ({ ...prev, push_enabled: false }));
    } else {
      const success = await requestPermissionAndSubscribe();
      if (success) {
        setPreferences(prev => ({ ...prev, push_enabled: true }));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos préférences de notifications
            </p>
          </div>
        </div>

        {/* Notifications Push */}
        {isSupported && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isSubscribed ? (
                  <Bell className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
                Notifications Push
              </CardTitle>
              <CardDescription>
                Recevez des notifications en temps réel même quand l'application est fermée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* État actuel */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${
                  isSubscribed ? 'bg-green-500' : 
                  permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></span>
                {isSubscribed ? 'Actif' : permission === 'denied' ? 'Bloqué par le navigateur' : 'Non activé'}
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="push-enabled">
                  Activer les notifications push
                </Label>
                <Switch
                  id="push-enabled"
                  checked={isSubscribed}
                  onCheckedChange={handleTogglePushNotifications}
                  disabled={permission === 'denied'}
                />
              </div>
              
              {permission === 'default' && !isSubscribed && (
                <p className="text-sm text-primary">
                  Cliquez pour autoriser les notifications push.
                </p>
              )}

              {permission === 'denied' && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    Les notifications sont bloquées par votre navigateur.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pour les activer : ouvrez les paramètres de votre navigateur → Site → Notifications → Autoriser
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notifications Email */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications par Email</CardTitle>
            <CardDescription>
              Recevez des alertes par email pour les événements importants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled">
                Activer les notifications email
              </Label>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Types de notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Types de notifications</CardTitle>
            <CardDescription>
              Choisissez les événements pour lesquels vous souhaitez être notifié
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-course">Nouvelles courses</Label>
              <Switch
                id="notify-course"
                checked={preferences.notify_new_course}
                onCheckedChange={(checked) => updatePreference('notify_new_course', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-devis">Nouveaux devis</Label>
              <Switch
                id="notify-devis"
                checked={preferences.notify_new_devis}
                onCheckedChange={(checked) => updatePreference('notify_new_devis', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-accepted">Courses acceptées</Label>
              <Switch
                id="notify-accepted"
                checked={preferences.notify_course_accepted}
                onCheckedChange={(checked) => updatePreference('notify_course_accepted', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-message">Nouveaux messages</Label>
              <Switch
                id="notify-message"
                checked={preferences.notify_new_message}
                onCheckedChange={(checked) => updatePreference('notify_new_message', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-facture">Nouvelles factures</Label>
              <Switch
                id="notify-facture"
                checked={preferences.notify_new_facture}
                onCheckedChange={(checked) => updatePreference('notify_new_facture', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Support Info */}
        {!isSupported && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="text-warning">Notifications non supportées</CardTitle>
              <CardDescription>
                Votre navigateur ou appareil ne supporte pas les notifications push. 
                Vous recevrez uniquement des notifications par email.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}