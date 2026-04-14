import { useState, useEffect } from 'react';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Check, 
  Handshake, 
  X, 
  Loader2,
  CalendarClock,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDriverPremium } from '@/hooks/useDriverPremium';

interface OutOfScheduleAlertsProps {
  driverId: string;
}

interface ScheduleAlert {
  id: string;
  course_id: string;
  scheduled_date: string;
  day_of_week: number;
  course_time: string;
  driver_start_time: string;
  driver_end_time: string;
  action: string;
  courses?: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    status: string;
    course_number: string | null;
    clients?: {
      profiles?: {
        full_name: string;
      };
    };
    devis?: Array<{
      amount: number;
    }>;
  };
}

const DAYS_LABELS: Record<number, string> = {
  0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi',
  4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi'
};

export function OutOfScheduleAlerts({ driverId }: OutOfScheduleAlertsProps) {
  const [alerts, setAlerts] = useState<ScheduleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { isPremium } = useDriverPremium();

  useEffect(() => {
    fetchAlerts();

    const cleanup = subscriptionManager.subscribe(
      `schedule-alerts-${driverId}`,
      { table: 'out_of_schedule_alerts', event: '*', debounceMs: 500 },
      () => fetchAlerts()
    );

    return cleanup;
  }, [driverId]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('out_of_schedule_alerts')
        .select(`
          *,
          courses(
            id, pickup_address, destination_address, 
            scheduled_date, status, course_number,
            clients(profiles:user_id(full_name)),
            devis(amount)
          )
        `)
        .eq('driver_id', driverId)
        .eq('action', 'pending')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setAlerts((data as any) || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (alertId: string, courseId: string, action: 'keep' | 'share_partner' | 'dismissed') => {
    setActionLoading(alertId);
    try {
      // Update alert
      await supabase
        .from('out_of_schedule_alerts')
        .update({ 
          action, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      // Update course flag
      await supabase
        .from('courses')
        .update({ out_of_schedule_action: action })
        .eq('id', courseId);

      if (action === 'keep') {
        toast.success('Course conservée dans votre planning');
      } else if (action === 'share_partner') {
        toast.success('Course marquée pour partage partenaire');
        // TODO: When partnerships open, auto-dispatch to sharing system
      } else {
        toast.info('Alerte ignorée');
      }

      fetchAlerts();
    } catch (error) {
      console.error('Error handling action:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return null; // Don't show loading state for alerts
  }

  if (alerts.length === 0) {
    return null; // No alerts = no component
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Courses hors planning
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map(alert => {
          const course = alert.courses;
          if (!course) return null;
          
          const scheduledDate = parseISO(course.scheduled_date);
          const clientName = (course.clients as any)?.profiles?.full_name || 'Client';
          const amount = course.devis?.[0]?.amount;
          
          // Detect buffer zone vs fully outside
          const courseMin = parseInt(alert.course_time.split(':')[0]) * 60 + parseInt(alert.course_time.split(':')[1]);
          const startMin = parseInt(alert.driver_start_time.split(':')[0]) * 60 + parseInt(alert.driver_start_time.split(':')[1]);
          const endMin = parseInt(alert.driver_end_time.split(':')[0]) * 60 + parseInt(alert.driver_end_time.split(':')[1]);
          const isBufferZone = courseMin >= startMin && courseMin <= endMin;

          return (
            <div key={alert.id} className={cn(
              "rounded-lg border p-3 space-y-2",
              isBufferZone 
                ? "border-blue-500/20 bg-blue-500/5" 
                : "border-amber-500/20 bg-background"
            )}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarClock className={cn("w-4 h-4 shrink-0", isBufferZone ? "text-blue-500" : "text-amber-500")} />
                    <span className="font-medium text-sm truncate">
                      {DAYS_LABELS[alert.day_of_week]} {format(scheduledDate, 'dd MMM', { locale: fr })}
                    </span>
                    {isBufferZone && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600">
                        Zone tampon
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Course à <strong>{alert.course_time}</strong> — vos horaires : {alert.driver_start_time}-{alert.driver_end_time}
                  </p>
                </div>
                {amount && (
                  <Badge variant="outline" className="shrink-0">
                    {amount.toFixed(0)}€
                  </Badge>
                )}
              </div>

              {/* Addresses */}
              <div className="space-y-1 text-xs">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  <span className="truncate">{course.pickup_address}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  <span className="truncate">{course.destination_address}</span>
                </div>
              </div>

              {/* Client */}
              <p className="text-xs text-muted-foreground">
                Client : {clientName}
                {course.course_number && ` • #${course.course_number}`}
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 h-8 text-xs gap-1"
                  disabled={actionLoading === alert.id}
                  onClick={() => handleAction(alert.id, alert.course_id, 'keep')}
                >
                  {actionLoading === alert.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Conserver
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "w-full h-8 text-xs gap-1",
                            isPremium 
                              ? "border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
                              : "border-muted text-muted-foreground opacity-60 cursor-not-allowed"
                          )}
                          disabled={actionLoading === alert.id || !isPremium}
                          onClick={() => isPremium && handleAction(alert.id, alert.course_id, 'share_partner')}
                        >
                          {isPremium ? (
                            <Handshake className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          Partenaire
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!isPremium && (
                      <TooltipContent>
                        <p>Fonctionnalité Premium — Passez à 19,99€/mois pour partager vos courses</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  disabled={actionLoading === alert.id}
                  onClick={() => handleAction(alert.id, alert.course_id, 'dismissed')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
