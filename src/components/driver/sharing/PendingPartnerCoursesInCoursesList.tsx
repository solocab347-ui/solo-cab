import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { toast } from 'sonner';
import { 
  Handshake, MapPin, Calendar, Users, CheckCircle, 
  XCircle, Loader2, Euro, Eye, Phone, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingPartnerCourse {
  id: string;
  course_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  course_number: string | null;
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;
}

interface PendingPartnerCoursesInCoursesListProps {
  driverId: string;
  onCountChange?: (count: number) => void;
  onCourseAccepted?: () => void;
}

export function PendingPartnerCoursesInCoursesList({ 
  driverId, 
  onCountChange,
  onCourseAccepted 
}: PendingPartnerCoursesInCoursesListProps) {
  const [courses, setCourses] = useState<PendingPartnerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<PendingPartnerCourse | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const fetchCourses = useCallback(async () => {
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
          created_at,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km,
            course_number
          )
        `)
        .eq('receiver_driver_id', driverId)
        .eq('status', 'pending')
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedCourses: PendingPartnerCourse[] = [];
      for (const item of data || []) {
        // Récupérer les infos du sender
        const { data: driverData } = await supabase
          .from('drivers')
          .select(`
            user_id, 
            company_name, 
            sharing_number,
            card_photo_url,
            contact_phone,
            show_phone_for_sharing
          `)
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
          const showPhone = driverData.show_phone_for_sharing || false;
          const senderPhone = showPhone ? (driverData.contact_phone || profile?.phone) : null;
          
          enrichedCourses.push({
            id: item.id,
            course_id: item.course_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            commission_amount: item.commission_amount,
            pickup_address: course.pickup_address,
            destination_address: course.destination_address,
            scheduled_date: course.scheduled_date,
            passengers_count: course.passengers_count,
            distance_km: course.distance_km,
            course_number: course.course_number,
            sender_name: profile?.full_name || driverData.company_name || 'Partenaire',
            sender_photo: senderPhoto,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: senderPhone,
          });
        }
      }

      setCourses(enrichedCourses);
      onCountChange?.(enrichedCourses.length);
    } catch (error) {
      console.error('Error fetching pending partner courses:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId, onCountChange]);

  useEffect(() => {
    fetchCourses();
    
    // Use centralized subscription manager
    const cleanup = subscriptionManager.subscribe(
      `pending_partner_courses_${driverId}`,
      {
        table: 'shared_courses',
        event: '*',
        filter: `receiver_driver_id=eq.${driverId}`,
        debounceMs: 500,
      },
      () => {
        fetchCourses();
      }
    );

    return cleanup;
  }, [driverId, fetchCourses]);

  const handleAccept = async (course: PendingPartnerCourse) => {
    setActionLoading(course.id);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', course.id);

      if (error) throw error;

      toast.success('Course partenaire acceptée !');
      setCourses(prev => prev.filter(c => c.id !== course.id));
      onCountChange?.(courses.length - 1);
      onCourseAccepted?.();
    } catch (error) {
      console.error('Error accepting partner course:', error);
      toast.error('\'Erreur lors de lacceptation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!selectedCourse) return;
    
    setActionLoading(selectedCourse.id);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ 
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: declineReason || null
        })
        .eq('id', selectedCourse.id);

      if (error) throw error;

      toast.success('Course refusée');
      setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
      onCountChange?.(courses.length - 1);
      setShowDeclineDialog(false);
      setDeclineReason('');
      setSelectedCourse(null);
    } catch (error) {
      console.error('Error declining partner course:', error);
      toast.error('Erreur lors du refus');
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
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Handshake className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-sm text-purple-300">Courses des partenaires</h3>
          <Badge className="bg-purple-500/30 text-purple-200">{courses.length}</Badge>
        </div>

        {courses.map((course) => (
          <Card key={course.id} className="relative overflow-hidden border-l-4 border-l-purple-500 bg-purple-500/5">
            <CardContent className="p-3 sm:p-4">
              {/* Header avec partenaire */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                    <AvatarImage src={course.sender_photo || undefined} />
                    <AvatarFallback className="bg-purple-500/20 text-purple-300">
                      {course.sender_name?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
                        PARTENAIRE
                      </Badge>
                      <span className="font-semibold text-sm">{course.sender_name}</span>
                    </div>
                    {course.sender_sharing_number && (
                      <p className="text-xs text-purple-400">#SOLO-{course.sender_sharing_number}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {course.course_number && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      #{course.course_number}
                    </Badge>
                  )}
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                    Pour vous
                  </Badge>
                </div>
              </div>

              {/* Infos course */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground line-clamp-1">{course.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span className="text-muted-foreground line-clamp-1">{course.destination_address}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.passengers_count}
                  </span>
                  {course.distance_km && (
                    <span>{course.distance_km} km</span>
                  )}
                </div>
              </div>

              {/* Prix et commission */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-white/10 mb-3">
                <div>
                  <span className="text-lg font-bold text-primary">€ {course.course_amount.toFixed(2)}</span>
                  <p className="text-xs text-muted-foreground">
                    -{course.commission_percentage}% = {course.commission_amount.toFixed(2)}€ comm.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowDeclineDialog(true);
                  }}
                  disabled={actionLoading === course.id}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleAccept(course)}
                  disabled={actionLoading === course.id}
                >
                  {actionLoading === course.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accepter
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de refus */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser cette course ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous pouvez indiquer une raison pour le refus (optionnel).
            </p>
            <Textarea
              placeholder="Raison du refus..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDecline}
              disabled={!!actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
