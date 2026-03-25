import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CourseQueueAlertProps {
  driverId: string | null;
  compact?: boolean;
}

export function CourseQueueAlert({ driverId, compact = false }: CourseQueueAlertProps) {
  const navigate = useNavigate();
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('course_queue')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (!error) {
        setQueueCount(count || 0);
      }
      setLoading(false);
    };

    fetchCount();

    // Realtime subscription via centralized manager
    const cleanup = subscriptionManager.subscribe(
      `queue-alert-count-${driverId}`,
      { table: 'course_queue', event: '*', filter: `driver_id=eq.${driverId}`, debounceMs: 500 },
      () => fetchCount()
    );

    return cleanup;
  }, [driverId]);

  if (loading || queueCount === 0) return null;

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-warning text-warning hover:bg-warning/10 gap-2"
        onClick={() => navigate('/driver-dashboard', { state: { tab: 'queue' } })}
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="hidden sm:inline">File d'attente</span>
        <Badge variant="secondary" className="bg-warning text-warning-foreground">
          {queueCount}
        </Badge>
      </Button>
    );
  }

  return (
    <Alert className="border-warning/50 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning flex items-center gap-2">
        <Clock className="h-4 w-4" />
        File d'attente intelligente
        <Badge variant="secondary" className="bg-warning text-warning-foreground">
          {queueCount} course{queueCount > 1 ? 's' : ''}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm text-muted-foreground mb-3">
          {queueCount} course{queueCount > 1 ? 's ne rentrent' : ' ne rentre'} pas dans votre planning. 
          Vous pouvez forcer l'acceptation ou les partager avec un partenaire.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => navigate('/driver-dashboard', { state: { tab: 'queue' } })}
        >
          Gérer la file d'attente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
