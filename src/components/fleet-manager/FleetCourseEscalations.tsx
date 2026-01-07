import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Share2, 
  X, 
  Bell,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SuggestedAction {
  action: string;
  label: string;
}

interface Escalation {
  id: string;
  course_id: string;
  escalation_reason: string;
  escalation_level: number;
  suggested_actions: SuggestedAction[] | null;
  resolution_status: string;
  created_at: string;
  course?: {
    pickup_address: string | null;
    destination_address: string;
    scheduled_date: string;
    client_id: string;
  };
}

interface FleetCourseEscalationsProps {
  fleetManagerId: string;
}

export function FleetCourseEscalations({ fleetManagerId }: FleetCourseEscalationsProps) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEscalations();
    
    // Realtime subscription
    const channel = supabase
      .channel('escalations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_escalations',
          filter: `fleet_manager_id=eq.${fleetManagerId}`
        },
        () => fetchEscalations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fleetManagerId]);

  const fetchEscalations = async () => {
    try {
      const { data, error } = await supabase
        .from('course_escalations')
        .select(`
          *,
          course:courses(
            pickup_address,
            destination_address,
            scheduled_date,
            client_id
          )
        `)
        .eq('fleet_manager_id', fleetManagerId)
        .eq('resolution_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map(item => ({
        ...item,
        suggested_actions: (item.suggested_actions as unknown) as SuggestedAction[] | null
      }));
      setEscalations(mapped);
    } catch (error) {
      console.error('Error fetching escalations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (escalationId: string, action: string, courseId: string) => {
    setProcessingId(escalationId);
    try {
      let newStatus = 'resolved';
      
      if (action === 'share_with_partner' || action === 'share_externally') {
        newStatus = 'shared_with_partner';
        // TODO: Open share dialog
        toast.info('Ouvrir le dialogue de partage avec partenaire');
      } else if (action === 'cancel') {
        newStatus = 'cancelled';
        // Cancel the course
        await supabase
          .from('courses')
          .update({ status: 'cancelled' })
          .eq('id', courseId);
      } else if (action === 'notify_company') {
        // TODO: Send notification to company
        toast.info('Notification envoyée à l\'entreprise');
      }

      const { error } = await supabase
        .from('course_escalations')
        .update({
          resolution_status: newStatus,
          resolved_at: new Date().toISOString()
        })
        .eq('id', escalationId);

      if (error) throw error;
      
      toast.success('Escalade traitée');
      fetchEscalations();
    } catch (error) {
      console.error('Error handling escalation:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessingId(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      no_driver_available: 'Aucun chauffeur disponible',
      all_declined: 'Tous les chauffeurs ont décliné',
      timeout: 'Délai dépassé',
      smart_buffer_conflict: 'Conflit de planning',
      manual: 'Escalade manuelle'
    };
    return labels[reason] || reason;
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'no_driver_available':
        return <Users className="w-4 h-4" />;
      case 'all_declined':
        return <X className="w-4 h-4" />;
      case 'timeout':
        return <Clock className="w-4 h-4" />;
      case 'smart_buffer_conflict':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (escalations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success/50" />
          <p className="text-muted-foreground">Aucune escalade en attente</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Toutes les courses sont correctement assignées
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h3 className="font-semibold">Escalades en attente</h3>
          <Badge variant="destructive">{escalations.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchEscalations}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {escalations.map((escalation) => (
          <Card key={escalation.id} className="border-warning/30 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-warning border-warning/50">
                      {getReasonIcon(escalation.escalation_reason)}
                      {getReasonLabel(escalation.escalation_reason)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(escalation.created_at), "dd MMM à HH:mm", { locale: fr })}
                    </span>
                  </div>

                  {escalation.course && (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="truncate">{escalation.course.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="truncate">{escalation.course.destination_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(escalation.course.scheduled_date), "EEEE dd MMM à HH:mm", { locale: fr })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {escalation.suggested_actions?.map((action) => (
                      <Button
                        key={action.action}
                        size="sm"
                        variant={action.action === 'cancel' ? 'destructive' : 'outline'}
                        onClick={() => handleAction(escalation.id, action.action, escalation.course_id)}
                        disabled={processingId === escalation.id}
                        className="gap-1"
                      >
                        {processingId === escalation.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : action.action.includes('share') ? (
                          <Share2 className="w-3 h-3" />
                        ) : action.action === 'cancel' ? (
                          <X className="w-3 h-3" />
                        ) : (
                          <Bell className="w-3 h-3" />
                        )}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
