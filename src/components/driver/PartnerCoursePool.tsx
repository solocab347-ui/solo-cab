import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Users, 
  Euro, 
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Hash,
  Phone
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
  sender_sharing_number: number | null;
  sender_phone: string | null;
}

interface SharedCourse {
  id: string;
  course_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  sharing_mode: string;
  pool_group_id: string | null;
  created_at: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;
}

export function PartnerCoursePool() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pooledCourses, setPooledCourses] = useState<PooledCourse[]>([]);
  const [sharedCourses, setSharedCourses] = useState<SharedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'pool'>('direct');

  useEffect(() => {
    if (user?.id) {
      loadDriverAndCourses();
    }
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!driverId) return;

    const poolChannel = supabase
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

    const sharedChannel = supabase
      .channel('shared-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_courses'
        },
        () => {
          loadSharedCourses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(poolChannel);
      supabase.removeChannel(sharedChannel);
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
      // Pass driver.id directly to avoid race condition with state update
      await Promise.all([loadPooledCourses(), loadSharedCoursesForDriver(driver.id)]);
    }
    setLoading(false);
  };

  // Wrapper that uses state driverId for realtime callbacks
  const loadSharedCourses = async () => {
    if (!driverId) return;
    await loadSharedCoursesForDriver(driverId);
  };

  // Main function that accepts driverId as parameter to avoid race conditions
  const loadSharedCoursesForDriver = async (targetDriverId: string) => {
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
          sharing_mode,
          pool_group_id,
          created_at,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km
          )
        `)
        .eq('receiver_driver_id', targetDriverId)
        .eq('status', 'pending')
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedCourses: SharedCourse[] = [];
      for (const item of data || []) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, sharing_number')
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          enrichedCourses.push({
            id: item.id,
            course_id: item.course_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            commission_amount: item.commission_amount,
            status: item.status,
            sharing_mode: item.sharing_mode || 'single',
            pool_group_id: item.pool_group_id,
            created_at: item.created_at,
            pickup_address: course.pickup_address,
            destination_address: course.destination_address,
            scheduled_date: course.scheduled_date,
            passengers_count: course.passengers_count,
            distance_km: course.distance_km,
            sender_name: profile?.full_name || 'Chauffeur',
            sender_photo: profile?.profile_photo_url,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: profile?.phone,
          });
        }
      }
      setSharedCourses(enrichedCourses);
    } catch (error) {
      console.error('Error loading shared courses:', error);
    }
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
          .select('user_id, company_name, sharing_number')
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
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
            sender_sharing_number: driverData.sharing_number,
            sender_phone: profile?.phone,
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
    await Promise.all([loadPooledCourses(), loadSharedCourses()]);
    setRefreshing(false);
    toast.success('Liste actualisée');
  };

  // Accept shared course - uses atomic claim for pool mode
  const acceptSharedCourse = async (course: SharedCourse) => {
    if (!driverId) return;
    
    setClaiming(course.id);
    try {
      let result;
      
      // For pool mode, use atomic claiming function
      if (course.sharing_mode === 'pool' && course.pool_group_id) {
        const { data, error } = await supabase.rpc('claim_pool_course', {
          p_pool_group_id: course.pool_group_id,
          p_receiver_driver_id: driverId
        });
        if (error) throw error;
        result = data as unknown as { success: boolean; message?: string; error?: string };
      } else {
        // For single mode, use standard accept function
        const { data, error } = await supabase.rpc('accept_shared_course', {
          p_shared_course_id: course.id,
          p_driver_id: driverId
        });
        if (error) throw error;
        result = data?.[0] as { success: boolean; message?: string };
      }

      if (result?.success) {
        toast.success(result.message || 'Course acceptée !');
        loadSharedCourses();
      } else {
        toast.error(result?.error || result?.message || 'Cette course n\'est plus disponible');
        loadSharedCourses();
      }
    } catch (error: any) {
      console.error('Accept error:', error);
      toast.error('Cette course a déjà été prise par un autre chauffeur');
      loadSharedCourses();
    } finally {
      setClaiming(null);
    }
  };

  // Decline shared course
  const declineSharedCourse = async (sharedCourseId: string) => {
    if (!driverId) return;
    
    setClaiming(sharedCourseId);
    try {
      const { data, error } = await supabase.rpc('decline_shared_course', {
        p_shared_course_id: sharedCourseId,
        p_driver_id: driverId,
        p_reason: null
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.success) {
        toast.success('Course refusée');
        loadSharedCourses();
      } else {
        toast.error(result?.message || 'Erreur');
      }
    } catch (error: any) {
      console.error('Decline error:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setClaiming(null);
    }
  };

  // Claim pooled course
  const claimPooledCourse = async (poolId: string) => {
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
        toast.error(result?.message || 'Cette course n\'est plus disponible');
        loadPooledCourses();
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error('Cette course a déjà été prise');
      loadPooledCourses();
    } finally {
      setClaiming(null);
    }
  };

  const shortenAddress = (address: string) => {
    if (address.length > 40) {
      return address.substring(0, 37) + '...';
    }
    return address;
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return null;
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalCourses = sharedCourses.length + pooledCourses.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Car className="h-4 w-4" />
            Courses disponibles
            {totalCourses > 0 && (
              <Badge variant="secondary" className="ml-1">{totalCourses}</Badge>
            )}
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

      {/* Tabs for direct vs pool */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'direct' | 'pool')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" className="text-xs">
            Pour vous ({sharedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="pool" className="text-xs">
            Pool partenaires ({pooledCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* Direct shared courses */}
        <TabsContent value="direct" className="mt-4 space-y-3">
          {sharedCourses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Aucune course ne vous a été envoyée directement.
              </AlertDescription>
            </Alert>
          ) : (
            sharedCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden border-primary/30">
                <CardContent className="p-0">
                  {/* Sender info */}
                  <div className="p-3 border-b bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={course.sender_photo || undefined} />
                        <AvatarFallback>{course.sender_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{course.sender_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {course.sender_sharing_number && (
                            <span className="flex items-center gap-0.5 text-primary font-mono">
                              <Hash className="h-3 w-3" />
                              {formatSharingNumber(course.sender_sharing_number)}
                            </span>
                          )}
                          {course.sender_phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-3 w-3" />
                              {course.sender_phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {course.sharing_mode === 'pool' ? (
                      <Badge className="bg-amber-500/20 text-amber-600 border-0">
                        Premier arrivé
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/20 text-primary border-0">
                        Pour vous
                      </Badge>
                    )}
                  </div>

                  {/* Course info */}
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                    </div>

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
                  </div>

                  {/* Footer with actions */}
                  <div className="p-3 border-t bg-muted/20 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        {course.course_amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        -{course.commission_percentage}% = {course.commission_amount.toFixed(2)}€ comm.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => declineSharedCourse(course.id)}
                        disabled={claiming === course.id}
                        className="h-9"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => acceptSharedCourse(course)}
                        disabled={claiming === course.id}
                        size="sm"
                        className="h-9 px-4"
                      >
                        {claiming === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Accepter
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pool courses */}
        <TabsContent value="pool" className="mt-4 space-y-3">
          {pooledCourses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Aucune course disponible dans le pool. Vos partenaires peuvent proposer des courses ici.
              </AlertDescription>
            </Alert>
          ) : (
            pooledCourses.map((course) => (
              <Card key={course.pool_id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Sender & Expiry */}
                  <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={course.sender_photo || undefined} />
                        <AvatarFallback className="text-xs">{course.sender_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{course.sender_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {course.sender_sharing_number && (
                            <span className="text-primary font-mono">{formatSharingNumber(course.sender_sharing_number)}</span>
                          )}
                          {course.sender_company && (
                            <span>{course.sender_company}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(course.expires_at), { locale: fr, addSuffix: false })}
                    </Badge>
                  </div>

                  {/* Course info */}
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                    </div>

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

                    {course.message && (
                      <p className="text-xs italic text-muted-foreground bg-muted/50 p-2 rounded">
                        "{course.message}"
                      </p>
                    )}
                  </div>

                  {/* Footer */}
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
                      onClick={() => claimPooledCourse(course.pool_id)}
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
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
