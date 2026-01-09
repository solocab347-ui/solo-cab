import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, MapPin, Calendar, Users, CheckCircle, 
  XCircle, Loader2, Phone, Truck, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingFleetCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  notes: string | null;
  status: string;
  fleet_manager_id: string;
  client_id: string | null;
  fleet_manager?: {
    id: string;
    company_name: string;
    logo_url: string | null;
    contact_phone: string | null;
  };
  client?: {
    user_id: string;
    profiles?: {
      full_name: string;
      phone: string | null;
    };
  };
}

interface PendingFleetCoursesInCoursesListProps {
  driverId: string;
  onCountChange?: (count: number) => void;
  onCourseAccepted?: () => void;
}

export function PendingFleetCoursesInCoursesList({ 
  driverId, 
  onCountChange,
  onCourseAccepted 
}: PendingFleetCoursesInCoursesListProps) {
  const [courses, setCourses] = useState<PendingFleetCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<PendingFleetCourse | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const fetchCourses = useCallback(async () => {
    try {
      // Récupérer les gestionnaires de flotte partenaires
      const { data: partnerships } = await supabase
        .from('fleet_driver_partnerships')
        .select('fleet_manager_id')
        .eq('driver_id', driverId)
        .eq('status', 'accepted');

      const fleetManagerIds = partnerships?.map(p => p.fleet_manager_id) || [];

      // Récupérer aussi les gestionnaires internes
      const { data: internalFleets } = await supabase
        .from('fleet_manager_drivers')
        .select('fleet_manager_id')
        .eq('driver_id', driverId)
        .eq('status', 'active');

      const internalFleetIds = internalFleets?.map(f => f.fleet_manager_id) || [];
      const allFleetManagerIds = [...new Set([...fleetManagerIds, ...internalFleetIds])];

      if (allFleetManagerIds.length === 0) {
        setCourses([]);
        onCountChange?.(0);
        setLoading(false);
        return;
      }

      // Récupérer les courses en attente sans chauffeur assigné
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          passengers_count,
          notes,
          status,
          fleet_manager_id,
          client_id,
          driver_id
        `)
        .in('fleet_manager_id', allFleetManagerIds)
        .is('driver_id', null)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Enrichir avec les données des gestionnaires et clients
      if (coursesData && coursesData.length > 0) {
        const uniqueFleetManagerIds = [...new Set(coursesData.map(c => c.fleet_manager_id).filter(Boolean))];
        const uniqueClientIds = [...new Set(coursesData.map(c => c.client_id).filter(Boolean))];

        const [{ data: fleetManagers }, { data: clients }] = await Promise.all([
          supabase
            .from('fleet_managers')
            .select('id, company_name, logo_url, contact_phone')
            .in('id', uniqueFleetManagerIds as string[]),
          uniqueClientIds.length > 0
            ? supabase
                .from('clients')
                .select('id, user_id')
                .in('id', uniqueClientIds as string[])
            : { data: [] }
        ]);

        const clientUserIds = (clients || []).map((c: any) => c.user_id);
        const { data: profiles } = clientUserIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .in('id', clientUserIds)
          : { data: [] };

        const enrichedCourses = coursesData.map(course => ({
          ...course,
          fleet_manager: fleetManagers?.find(fm => fm.id === course.fleet_manager_id),
          client: course.client_id
            ? {
                user_id: clients?.find((c: any) => c.id === course.client_id)?.user_id,
                profiles: profiles?.find(
                  p => p.id === clients?.find((c: any) => c.id === course.client_id)?.user_id
                )
              }
            : null
        }));

        setCourses(enrichedCourses as PendingFleetCourse[]);
        onCountChange?.(enrichedCourses.length);
      } else {
        setCourses([]);
        onCountChange?.(0);
      }
    } catch (error) {
      console.error('Error fetching pending fleet courses:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId, onCountChange]);

  useEffect(() => {
    fetchCourses();

    // Realtime subscription
    const channel = supabase
      .channel(`pending-fleet-courses-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, fetchCourses]);

  const handleAccept = async (course: PendingFleetCourse) => {
    setActionLoading(course.id);
    try {
      // Utiliser la fonction RPC sécurisée avec verrouillage atomique
      const { data, error } = await supabase
        .rpc('accept_fleet_course_safely', {
          p_course_id: course.id,
          p_driver_id: driverId
        });

      if (error) throw error;

      // Handle response - RPC returns array or single object
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || !(result as { success: boolean }).success) {
        toast.error((result as { message: string })?.message || 'Cette course a déjà été prise par un autre chauffeur');
        fetchCourses();
        return;
      }

      toast.success('Course acceptée !');
      onCourseAccepted?.();
      fetchCourses();
    } catch (error: any) {
      console.error('Error accepting course:', error);
      toast.error('Cette course a déjà été prise par un autre chauffeur');
      fetchCourses();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineClick = (course: PendingFleetCourse) => {
    setSelectedCourse(course);
    setShowDeclineDialog(true);
  };

  const handleConfirmDecline = async () => {
    if (!selectedCourse) return;
    setActionLoading(selectedCourse.id);
    try {
      // Ajouter le chauffeur à la liste d'exclusion pour cette course
      await supabase.from('course_driver_exclusions').insert({
        course_id: selectedCourse.id,
        driver_id: driverId,
        exclusion_reason: declineReason || 'Refus manuel'
      });

      // Notifier le gestionnaire
      if (selectedCourse.fleet_manager_id) {
        const { data: fmData } = await supabase
          .from('fleet_managers')
          .select('user_id')
          .eq('id', selectedCourse.fleet_manager_id)
          .single();

        if (fmData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: fmData.user_id,
            title: '❌ Course refusée',
            message: `Un chauffeur a décliné une course${declineReason ? `: ${declineReason}` : ''}`,
            type: 'info',
            link: '/fleet-dashboard?tab=courses'
          });
        }
      }

      toast.success('Vous avez passé cette course');
      setShowDeclineDialog(false);
      setSelectedCourse(null);
      setDeclineReason('');
      // La course reste visible pour d'autres, on la cache localement
      setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
      onCountChange?.(courses.length - 1);
    } catch (error: any) {
      console.error('Error declining course:', error);
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return null;
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Truck className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">Courses Gestionnaire</h3>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse">
          {courses.length}
        </Badge>
      </div>

      {courses.map((course) => (
        <Card key={course.id} className="relative overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="p-4 space-y-3">
            {/* Header avec gestionnaire */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-amber-500/30">
                  <AvatarImage src={course.fleet_manager?.logo_url || undefined} />
                  <AvatarFallback className="bg-amber-500/10">
                    <Building2 className="w-5 h-5 text-amber-500" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {course.fleet_manager?.company_name || 'Gestionnaire de flotte'}
                  </p>
                  {course.fleet_manager?.contact_phone && (
                    <a 
                      href={`tel:${course.fleet_manager.contact_phone}`}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {course.fleet_manager.contact_phone}
                    </a>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                <Clock className="w-3 h-3 mr-1" />
                En attente
              </Badge>
            </div>

            {/* Client info */}
            {course.client?.profiles && (
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{course.client.profiles.full_name}</p>
                  {course.client.profiles.phone && (
                    <a 
                      href={`tel:${course.client.profiles.phone}`}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {course.client.profiles.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Date et heure */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {format(new Date(course.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>

            {/* Adresses */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="font-medium">{course.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Arrivée</p>
                  <p className="font-medium">{course.destination_address}</p>
                </div>
              </div>
            </div>

            {/* Passagers */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {course.passengers_count} passager{course.passengers_count > 1 ? 's' : ''}
            </div>

            {/* Notes */}
            {course.notes && (
              <div className="p-2 bg-muted/20 rounded text-sm text-muted-foreground">
                {course.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => handleDeclineClick(course)}
                disabled={actionLoading === course.id}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Passer
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-success hover:bg-success/90"
                onClick={() => handleAccept(course)}
                disabled={actionLoading === course.id}
              >
                {actionLoading === course.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                Accepter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Decline dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passer cette course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous pouvez indiquer une raison (optionnel). La course restera disponible pour d'autres chauffeurs.
            </p>
            <Textarea
              placeholder="Raison (optionnel)..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmDecline}
              disabled={actionLoading !== null}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
