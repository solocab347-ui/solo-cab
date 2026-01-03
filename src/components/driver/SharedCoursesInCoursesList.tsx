import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  MapPin, 
  Calendar, 
  Euro, 
  Loader2,
  Users,
  Phone,
  Play,
  CheckCheck,
  Handshake,
  Car
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SharedCourseClientInfo } from './partnership/SharedCourseClientInfo';

interface Props {
  driverId: string;
}

interface SharedCourseDisplay {
  id: string;
  course_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  // Course details
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  course_status: string;
  course_number: string | null;
  // Sender info
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;
}

export function SharedCoursesInCoursesList({ driverId }: Props) {
  const [courses, setCourses] = useState<SharedCourseDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSharedCourses();
  }, [driverId]);

  const loadSharedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_courses')
        .select(`
          id,
          course_id,
          sender_driver_id,
          course_amount,
          commission_percentage,
          commission_amount,
          status,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km,
            status,
            course_number
          )
        `)
        .eq('receiver_driver_id', driverId)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedCourses: SharedCourseDisplay[] = [];
      
      for (const item of data || []) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, sharing_number, show_phone_for_sharing, card_photo_url')
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          const senderPhoto = driverData.card_photo_url || profile?.profile_photo_url;
          
          enrichedCourses.push({
            id: item.id,
            course_id: item.course_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            commission_amount: item.commission_amount,
            status: item.status,
            pickup_address: course.pickup_address,
            destination_address: course.destination_address,
            scheduled_date: course.scheduled_date,
            passengers_count: course.passengers_count,
            distance_km: course.distance_km,
            course_status: course.status,
            course_number: course.course_number,
            sender_name: profile?.full_name || 'Partenaire',
            sender_photo: senderPhoto,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: driverData.show_phone_for_sharing ? profile?.phone : null,
          });
        }
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error('Error loading shared courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async (sharedCourseId: string) => {
    setActionLoading(sharedCourseId);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', sharedCourseId);
      
      if (error) throw error;
      toast.success('Course démarrée !');
      loadSharedCourses();
    } catch (error) {
      console.error('Error starting course:', error);
      toast.error('Erreur lors du démarrage');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteCourse = async (sharedCourseId: string) => {
    setActionLoading(sharedCourseId);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sharedCourseId);
      
      if (error) throw error;
      toast.success('Course terminée ! Commission enregistrée.');
      loadSharedCourses();
    } catch (error) {
      console.error('Error completing course:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setActionLoading(null);
    }
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return null;
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  if (loading) {
    return null; // Don't show loading, just render nothing until ready
  }

  if (courses.length === 0) {
    return null; // No shared courses, don't render anything
  }

  return (
    <Card className="mt-4 border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Handshake className="h-5 w-5" />
          Courses partenaires en cours ({courses.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.map((course) => {
          const isLoading = actionLoading === course.id;
          const canStart = course.status === 'accepted';
          const canComplete = course.status === 'in_progress';

          return (
            <Card key={course.id} className="overflow-hidden border-purple-500/20">
              {/* Header - Sender info */}
              <div className="p-3 border-b bg-purple-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                    <AvatarImage src={course.sender_photo || undefined} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-600">
                      {course.sender_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{course.sender_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {course.sender_sharing_number && (
                        <span className="font-mono text-purple-600">{formatSharingNumber(course.sender_sharing_number)}</span>
                      )}
                      {course.sender_company && (
                        <span>• {course.sender_company}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={course.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600' : 'bg-green-500/20 text-green-600'}>
                    {course.status === 'in_progress' ? 'En cours' : 'Acceptée'}
                  </Badge>
                  {course.course_number && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">#{course.course_number}</p>
                  )}
                </div>
              </div>

              {/* Course details */}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span className="truncate">{course.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span className="truncate">{course.destination_address}</span>
                  </div>
                </div>

                {course.distance_km && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Car className="h-3 w-3" />
                    {course.distance_km.toFixed(0)} km
                    <span className="ml-2"><Users className="h-3 w-3 inline mr-1" />{course.passengers_count} pass.</span>
                  </div>
                )}

                {/* Client info */}
                <SharedCourseClientInfo 
                  sharedCourseId={course.id} 
                  driverId={driverId} 
                  sharedStatus={course.status}
                />
              </div>

              {/* Footer - Commission info + Actions */}
              <div className="p-3 border-t bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p className="font-semibold">{course.course_amount.toFixed(2)} €</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Commission ({course.commission_percentage}%)</p>
                    <p className="font-semibold text-red-600">-{course.commission_amount.toFixed(2)} €</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Vous gardez</p>
                    <p className="font-bold text-green-600">
                      {(course.course_amount - course.commission_amount).toFixed(2)} €
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {canStart && (
                    <Button
                      onClick={() => handleStartCourse(course.id)}
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      Démarrer
                    </Button>
                  )}
                  {canComplete && (
                    <Button
                      onClick={() => handleCompleteCourse(course.id)}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="h-4 w-4 mr-2" />}
                      Terminer
                    </Button>
                  )}
                  {course.sender_phone && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`tel:${course.sender_phone}`, '_blank')}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
