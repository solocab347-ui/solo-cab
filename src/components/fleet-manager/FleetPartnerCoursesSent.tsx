import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Car, MapPin, Calendar, Clock, Euro, CheckCircle, 
  XCircle, Loader2, Send, Users, AlertCircle, User, Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FleetShareCourseWithPartnerDialog } from './FleetShareCourseWithPartnerDialog';

interface FleetPartnerCourse {
  id: string;
  course_id: string;
  partnership_id: string;
  driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  earnings_for_driver: number;
  equipment_type: string;
  status: string;
  sharing_mode: string;
  created_at: string;
  decline_reason: string | null;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    passengers_count: number;
    notes: string | null;
    status: string;
  };
  driver: {
    id: string;
    company_name: string | null;
    user_id: string;
  };
  driver_profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

interface FleetPartnerCoursesSentProps {
  fleetManagerId: string;
}

export function FleetPartnerCoursesSent({ fleetManagerId }: FleetPartnerCoursesSentProps) {
  const [courses, setCourses] = useState<FleetPartnerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    
    // Realtime subscription
    const channel = supabase
      .channel('fleet_partner_courses_fleet')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fleet_partner_courses',
          filter: `fleet_manager_id=eq.${fleetManagerId}`
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fleetManagerId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('fleet_partner_courses')
        .select(`
          *,
          course:courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            notes,
            status
          ),
          driver:drivers(
            id,
            company_name,
            user_id
          )
        `)
        .eq('fleet_manager_id', fleetManagerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les profils
      const enrichedCourses = await Promise.all((data || []).map(async (course) => {
        if (course.driver?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url')
            .eq('id', course.driver.user_id)
            .single();
          
          return { ...course, driver_profile: profile };
        }
        return course;
      }));

      setCourses(enrichedCourses);
    } catch (error) {
      console.error('Error fetching fleet partner courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      const { error } = await supabase
        .from('fleet_partner_courses')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'Annulé par le gestionnaire'
        })
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Demande annulée');
      fetchCourses();
    } catch (error: any) {
      console.error('Error cancelling course:', error);
      toast.error('Erreur lors de l\'annulation');
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
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Terminée</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Refusée</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Annulée</Badge>;
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
  const completedCourses = courses.filter(c => c.status === 'completed');
  const declinedCourses = courses.filter(c => c.status === 'declined');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{pendingCourses.length}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeCourses.length}</p>
            <p className="text-xs text-muted-foreground">Actives</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{completedCourses.length}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{declinedCourses.length}</p>
            <p className="text-xs text-muted-foreground">Refusées</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending courses */}
      {pendingCourses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            En attente de réponse
          </h3>
          
          {pendingCourses.map((course) => (
            <Card key={course.id} className="border-l-4 border-l-warning">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.driver_profile?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{course.driver_profile?.full_name || 'Chauffeur'}</p>
                      {course.driver?.company_name && (
                        <p className="text-xs text-muted-foreground">{course.driver.company_name}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(course.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>
                      {format(new Date(course.course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="line-clamp-1">{course.course.pickup_address}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      {course.equipment_type === 'fleet_provided' ? (
                        <><Wrench className="w-3 h-3" /> Véhicule flotte</>
                      ) : (
                        <><User className="w-3 h-3" /> Son véhicule</>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {course.commission_percentage}% commission
                    </Badge>
                  </div>
                  <span className="font-medium">{course.course_amount.toFixed(2)}€</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCancel(course.id)}
                  disabled={actionLoading === course.id}
                >
                  {actionLoading === course.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  Annuler la demande
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active courses */}
      {activeCourses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Missions en cours
          </h3>
          
          {activeCourses.map((course) => (
            <Card key={course.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.driver_profile?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{course.driver_profile?.full_name || 'Chauffeur'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(course.course.scheduled_date), "d MMM 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(course.status)}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {course.course.pickup_address.substring(0, 40)}...
                  </span>
                  <span className="font-medium text-success">
                    +{course.commission_amount.toFixed(2)}€
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Declined courses */}
      {declinedCourses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Refusées récemment
          </h3>
          
          {declinedCourses.slice(0, 3).map((course) => (
            <Card key={course.id} className="border-l-4 border-l-destructive/50 opacity-75">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{course.driver_profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(course.course.scheduled_date), "d MMM yyyy", { locale: fr })}
                    </p>
                    {course.decline_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Motif: {course.decline_reason}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(course.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {courses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune mission envoyée aux partenaires</p>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisez le bouton "Assigner à un partenaire" sur vos courses
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
