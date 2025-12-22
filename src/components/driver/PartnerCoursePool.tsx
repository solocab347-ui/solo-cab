import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Users, 
  Euro, 
  Clock,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PooledCourse {
  pool_id: string;
  course_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  estimated_commission: number;
  message: string | null;
  expires_at: string;
  created_at: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  duration_minutes: number | null;
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
}

export function PartnerCoursePool() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pooledCourses, setPooledCourses] = useState<PooledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDriverAndCourses();
    }
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pool-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_course_pool'
        },
        () => {
          loadPooledCourses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const loadDriverAndCourses = async () => {
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (driver) {
      setDriverId(driver.id);
      await loadPooledCourses();
    }
    setLoading(false);
  };

  const loadPooledCourses = async () => {
    try {
      // Charger les courses du pool disponibles pour ce chauffeur
      const { data, error } = await supabase
        .from('partner_course_pool')
        .select(`
          id,
          course_id,
          sender_driver_id,
          course_amount,
          commission_percentage,
          estimated_commission,
          message,
          expires_at,
          created_at,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km,
            duration_minutes
          )
        `)
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les infos du sender
      const enrichedCourses: PooledCourse[] = [];
      for (const item of data || []) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name')
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          enrichedCourses.push({
            pool_id: item.id,
            course_id: item.course_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            estimated_commission: item.estimated_commission,
            message: item.message,
            expires_at: item.expires_at,
            created_at: item.created_at,
            pickup_address: course.pickup_address,
            destination_address: course.destination_address,
            scheduled_date: course.scheduled_date,
            passengers_count: course.passengers_count,
            distance_km: course.distance_km,
            duration_minutes: course.duration_minutes,
            sender_name: profile?.full_name || 'Chauffeur',
            sender_photo: profile?.profile_photo_url,
            sender_company: driverData.company_name,
          });
        }
      }
      setPooledCourses(enrichedCourses);
    } catch (error) {
      console.error('Error loading pooled courses:', error);
    }
  };

  const claimCourse = async (poolId: string) => {
    if (!driverId) return;
    
    setClaiming(poolId);
    try {
      const { data, error } = await supabase.rpc('claim_pooled_course', {
        _pool_id: poolId,
        _claimer_driver_id: driverId
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.success) {
        toast.success(result.message);
        loadPooledCourses();
      } else {
        toast.error(result?.message || 'Erreur lors de la réclamation');
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error('Erreur lors de la réclamation de la course');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5" />
            Courses disponibles de vos partenaires
          </h3>
          <p className="text-sm text-muted-foreground">
            Réclamez une course avant qu'elle ne soit prise par un autre partenaire
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPooledCourses}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {pooledCourses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune course disponible pour le moment. Vos partenaires peuvent proposer des courses qu'ils ne peuvent pas effectuer.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {pooledCourses.map((course) => (
            <Card key={course.pool_id} className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={course.sender_photo || undefined} />
                    <AvatarFallback>{course.sender_name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{course.sender_name}</p>
                        {course.sender_company && (
                          <p className="text-sm text-muted-foreground">{course.sender_company}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expire {formatDistanceToNow(new Date(course.expires_at), { locale: fr, addSuffix: true })}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="flex-1">{course.pickup_address}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                        <span className="flex-1">{course.destination_address}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(course.scheduled_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {course.passengers_count} passager(s)
                      </div>
                      {course.distance_km && (
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {course.distance_km.toFixed(1)} km
                        </div>
                      )}
                    </div>

                    {course.message && (
                      <p className="text-sm italic text-muted-foreground bg-muted/50 p-2 rounded">
                        "{course.message}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          <span className="font-semibold">{course.course_amount.toFixed(2)} €</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Commission: {course.commission_percentage}% = {course.estimated_commission.toFixed(2)} € pour le partenaire
                        </p>
                      </div>

                      <Button
                        onClick={() => claimCourse(course.pool_id)}
                        disabled={claiming === course.pool_id}
                      >
                        {claiming === course.pool_id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Réclamation...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Prendre cette course
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
