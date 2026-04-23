import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { toast } from 'sonner';
import { 
  Building2, MapPin, Calendar, Clock, Euro, CheckCircle, 
  XCircle, Play, Loader2, Wrench, User, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DeclineCourseDialog } from '@/components/driver/partnership/DeclineCourseDialog';

interface FleetPartnerCourse {
  id: string;
  course_id: string;
  fleet_manager_id: string;
  driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  earnings_for_driver: number;
  equipment_type: string;
  status: string;
  sharing_mode: string;
  created_at: string;
  partner_reference_number: string | null;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    passengers_count: number;
    notes: string | null;
    status: string;
    course_number: string | null;
  };
  fleet_manager: {
    id: string;
    company_name: string;
    logo_url: string | null;
    contact_phone: string | null;
  };
}

interface FleetPartnerCoursesReceivedProps {
  driverId: string;
}

export function FleetPartnerCoursesReceived({ driverId }: FleetPartnerCoursesReceivedProps) {
  const [courses, setCourses] = useState<FleetPartnerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<FleetPartnerCourse | null>(null);

  useEffect(() => {
    fetchCourses();
    
    // Realtime subscription via centralized manager
    const cleanup = subscriptionManager.subscribe(
      `fleet-partner-courses-${driverId}`,
      { table: 'fleet_partner_courses', event: '*', filter: `driver_id=eq.${driverId}`, debounceMs: 500 },
      () => fetchCourses()
    );

    return cleanup;
  }, [driverId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('fleet_partner_courses')
        .select(`
          *,
          partner_reference_number,
          course:courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            notes,
            status,
            course_number
          ),
          fleet_manager:fleet_managers(
            id,
            company_name,
            logo_url,
            contact_phone
          )
        `)
        .eq('driver_id', driverId)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching fleet partner courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      const { error } = await supabase
        .from('fleet_partner_courses')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Mission acceptée !');
      fetchCourses();
    } catch (error: any) {
      console.error('Error accepting course:', error);
      toast.error('\'Erreur lors de lacceptation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (reason: string) => {
    if (!selectedCourse) return;
    setActionLoading(selectedCourse.id);
    try {
      const { error } = await supabase
        .from('fleet_partner_courses')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: reason
        })
        .eq('id', selectedCourse.id);

      if (error) throw error;

      // Notifier le gestionnaire
      const { data: fmData } = await supabase
        .from('fleet_managers')
        .select('user_id')
        .eq('id', selectedCourse.fleet_manager_id)
        .single();

      if (fmData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: fmData.user_id,
          title: '❌ Mission refusée',
          message: `Un chauffeur partenaire a refusé une mission${reason ? `: ${reason}` : ''}`,
          type: 'warning',
          link: '/fleet-dashboard?tab=courses'
        });
      }

      toast.success('Mission refusée');
      setShowDeclineDialog(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error: any) {
      console.error('Error declining course:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      const { error } = await supabase
        .from('fleet_partner_courses')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Mission démarrée !');
      fetchCourses();
    } catch (error: any) {
      console.error('Error starting course:', error);
      toast.error('Erreur lors du démarrage');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      const { error } = await supabase
        .from('fleet_partner_courses')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Mission terminée !');
      fetchCourses();
    } catch (error: any) {
      console.error('Error completing course:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">En attente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-info/10 text-info border-info/30">Acceptée</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">En cours</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingCourses = courses.filter(c => c.status === 'pending');
  const activeCourses = courses.filter(c => c.status === 'accepted' || c.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Pending courses */}
      {pendingCourses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Missions en attente
            <Badge variant="destructive" className="animate-pulse">{pendingCourses.length}</Badge>
          </h3>
          
          {pendingCourses.map((course) => (
            <Card key={course.id} className="border-l-4 border-l-warning">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.fleet_manager?.logo_url || undefined} />
                      <AvatarFallback>
                        <Building2 className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{course.fleet_manager?.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(course.created_at), "d MMM à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(course.status)}
                    {/* Display partner reference number if available */}
                    {course.partner_reference_number ? (
                      <div className="mt-1">
                        <p className="text-xs font-mono font-semibold text-primary">#{course.partner_reference_number}</p>
                        {course.course?.course_number && (
                          <p className="text-[10px] text-muted-foreground font-mono">Orig: {course.course.course_number}</p>
                        )}
                      </div>
                    ) : course.course?.course_number ? (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">#{course.course.course_number}</p>
                    ) : null}
                  </div>
                </div>

                {/* Course details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>
                      {format(new Date(course.course.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="line-clamp-1">{course.course.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="line-clamp-1">{course.course.destination_address}</span>
                  </div>
                </div>

                {/* Equipment & Earnings */}
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    {course.equipment_type === 'fleet_provided' ? (
                      <Badge variant="outline" className="gap-1">
                        <Wrench className="w-3 h-3" />
                        Véhicule flotte
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <User className="w-3 h-3" />
                        Mon véhicule
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{course.earnings_for_driver.toFixed(2)}€</p>
                    <p className="text-xs text-muted-foreground">
                      {course.course_amount.toFixed(2)}€ - {course.commission_amount.toFixed(2)}€ commission
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCourse(course);
                      setShowDeclineDialog(true);
                    }}
                    disabled={actionLoading === course.id}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAccept(course.id)}
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
        </div>
      )}

      {/* Active courses */}
      {activeCourses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Missions actives
          </h3>
          
          {activeCourses.map((course) => (
            <Card key={course.id} className={`border-l-4 ${course.status === 'in_progress' ? 'border-l-primary' : 'border-l-info'}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.fleet_manager?.logo_url || undefined} />
                      <AvatarFallback>
                        <Building2 className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{course.fleet_manager?.company_name}</p>
                      <p className="text-sm text-success font-medium">
                        {course.earnings_for_driver.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(course.status)}
                    {/* Display partner reference number if available */}
                    {course.partner_reference_number ? (
                      <p className="text-xs font-mono font-semibold text-primary mt-1">#{course.partner_reference_number}</p>
                    ) : course.course?.course_number ? (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">#{course.course.course_number}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>
                      {format(new Date(course.course.scheduled_date), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="line-clamp-1">{course.course.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="line-clamp-1">{course.course.destination_address}</span>
                  </div>
                </div>

                {/* Action button */}
                {course.status === 'accepted' && (
                  <Button
                    className="w-full"
                    onClick={() => handleStart(course.id)}
                    disabled={actionLoading === course.id}
                  >
                    {actionLoading === course.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    Démarrer la mission
                  </Button>
                )}
                {course.status === 'in_progress' && (
                  <Button
                    className="w-full bg-success hover:bg-success/90"
                    onClick={() => handleComplete(course.id)}
                    disabled={actionLoading === course.id}
                  >
                    {actionLoading === course.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    Terminer la mission
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {courses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune mission de flotte en attente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les missions des gestionnaires partenaires apparaîtront ici
            </p>
          </CardContent>
        </Card>
      )}

      {/* Decline dialog */}
      <DeclineCourseDialog
        open={showDeclineDialog}
        onOpenChange={setShowDeclineDialog}
        onConfirm={handleDecline}
        senderName={selectedCourse?.fleet_manager?.company_name || 'Gestionnaire'}
      />
    </div>
  );
}
