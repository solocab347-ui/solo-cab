import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
  RefreshCw,
  ArrowRight
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
  const [refreshing, setRefreshing] = useState(false);

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
            distance_km
          )
        `)
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPooledCourses();
    setRefreshing(false);
    toast.success('Liste actualisée');
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
      toast.error('Cette course a déjà été prise');
    } finally {
      setClaiming(null);
    }
  };

  // Helper to shorten address
  const shortenAddress = (address: string) => {
    if (address.length > 40) {
      return address.substring(0, 37) + '...';
    }
    return address;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Car className="h-4 w-4" />
            Courses disponibles
          </h3>
          <p className="text-xs text-muted-foreground">
            Premier arrivé, premier servi
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {pooledCourses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Aucune course disponible. Vos partenaires peuvent proposer des courses ici.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {pooledCourses.map((course) => (
            <Card key={course.pool_id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Top section - Sender & Expiry */}
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={course.sender_photo || undefined} />
                      <AvatarFallback className="text-xs">{course.sender_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{course.sender_name}</p>
                      {course.sender_company && (
                        <p className="text-[10px] text-muted-foreground">{course.sender_company}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(course.expires_at), { locale: fr, addSuffix: false })}
                  </Badge>
                </div>

                {/* Course info */}
                <div className="p-3 space-y-3">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                  </div>

                  {/* Addresses */}
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <span className="text-sm">{shortenAddress(course.pickup_address)}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-0.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="text-sm">{shortenAddress(course.destination_address)}</span>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.passengers_count}
                    </span>
                    {course.distance_km && (
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {course.distance_km.toFixed(0)} km
                      </span>
                    )}
                  </div>

                  {/* Message if any */}
                  {course.message && (
                    <p className="text-xs italic text-muted-foreground bg-muted/50 p-2 rounded">
                      "{course.message}"
                    </p>
                  )}
                </div>

                {/* Footer - Price & Action */}
                <div className="p-3 border-t bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      {course.course_amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      -{course.commission_percentage}% = {course.estimated_commission.toFixed(2)}€ comm.
                    </p>
                  </div>
                  <Button
                    onClick={() => claimCourse(course.pool_id)}
                    disabled={claiming === course.pool_id}
                    size="sm"
                    className="h-10 px-4"
                  >
                    {claiming === course.pool_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Prendre
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
