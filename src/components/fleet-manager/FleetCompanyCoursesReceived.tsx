import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, 
  MapPin, 
  Clock, 
  User,
  CheckCircle,
  X,
  Send,
  Loader2,
  RefreshCw,
  Route
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompanyCourseRequest {
  id: string;
  company_id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  company?: {
    company_name: string;
    logo_url: string | null;
    contact_name: string;
  };
}

interface FleetCompanyCoursesReceivedProps {
  fleetManagerId: string;
}

export function FleetCompanyCoursesReceived({ fleetManagerId }: FleetCompanyCoursesReceivedProps) {
  const [requests, setRequests] = useState<CompanyCourseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();

    // Realtime
    const channel = supabase
      .channel('company-requests-fleet')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_course_requests',
          filter: `target_fleet_manager_id=eq.${fleetManagerId}`
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fleetManagerId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('company_course_requests')
        .select(`
          *,
          company:companies(
            company_name,
            logo_url,
            contact_name
          )
        `)
        .eq('target_fleet_manager_id', fleetManagerId)
        .in('status', ['dispatched_to_fleet', 'pending', 'quotes_generated'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching company requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { data, error } = await supabase.rpc('dispatch_company_course_to_fleet', {
        p_company_request_id: requestId,
        p_fleet_manager_id: fleetManagerId
      });

      if (error) throw error;

      const result = data as { success?: boolean; escalation_created?: boolean; error?: string } | null;
      
      if (result?.success) {
        toast.success('Course assignée avec succès');
      } else if (result?.escalation_created) {
        toast.warning('Aucun chauffeur disponible - escalade créée');
      } else {
        toast.error(result?.error || 'Erreur lors du dispatch');
      }

      fetchRequests();
    } catch (error) {
      console.error('Error dispatching:', error);
      toast.error('Erreur lors du dispatch');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('company_course_requests')
        .update({
          status: 'declined_by_fleet',
          target_fleet_manager_id: null
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Demande refusée');
      fetchRequests();
    } catch (error) {
      console.error('Error declining:', error);
      toast.error('Erreur');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Aucune demande d'entreprise en attente</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Les demandes de vos entreprises partenaires apparaîtront ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Demandes entreprises</h3>
          <Badge>{requests.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRequests}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id} className="hover:border-primary/30 transition-all">
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.company?.logo_url || undefined} />
                  <AvatarFallback className="bg-primary/10">
                    {(request.company?.company_name || 'E').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{request.company?.company_name || 'Entreprise'}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {request.company?.contact_name}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(request.scheduled_date), "dd MMM à HH:mm", { locale: fr })}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="truncate">{request.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span className="truncate">{request.destination_address}</span>
                    </div>
                  </div>

                  {request.notes && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {request.notes}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleDispatch(request.id)}
                      disabled={processingId === request.id}
                      className="gap-1"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Dispatcher
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(request.id)}
                      disabled={processingId === request.id}
                      className="gap-1"
                    >
                      <X className="w-3 h-3" />
                      Refuser
                    </Button>
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
