import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
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
  Phone,
  Mail,
  Eye,
  User
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DeclineCourseDialog } from '../partnership/DeclineCourseDialog';


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
  // Sender info (complet avec visibilité)
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;  // contact_phone prioritaire, sinon profile.phone si show_phone_for_sharing
  sender_email: string | null;
  sender_vehicle_brand: string | null;
  sender_vehicle_model: string | null;
  sender_vehicle_color: string | null;
  sender_rating: number | null;  // null si show_rating_for_sharing = false
  sender_total_rides: number | null;  // null si show_rides_for_sharing = false
  sender_show_phone: boolean;
  sender_show_email: boolean;
  sender_show_rating: boolean;
  sender_show_rides: boolean;
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
  // Sender info (complet avec visibilité)
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;  // contact_phone prioritaire, sinon profile.phone si show_phone_for_sharing
  sender_email: string | null;
  sender_vehicle_brand: string | null;
  sender_vehicle_model: string | null;
  sender_vehicle_color: string | null;
  sender_rating: number | null;  // null si show_rating_for_sharing = false
  sender_total_rides: number | null;  // null si show_rides_for_sharing = false
  sender_bio: string | null;
  sender_services_offered: string[] | null;
  sender_show_phone: boolean;
  sender_show_email: boolean;
  sender_show_rating: boolean;
  sender_show_rides: boolean;
  // Client info
  client_name: string | null;
  client_phone: string | null;
  client_photo: string | null;
  client_email: string | null;
}

interface PartnerCoursePoolProps {
  driverId?: string;
}

export function PartnerCoursePool({ driverId: propDriverId }: PartnerCoursePoolProps = {}) {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(propDriverId || null);
  const [pooledCourses, setPooledCourses] = useState<PooledCourse[]>([]);
  const [sharedCourses, setSharedCourses] = useState<SharedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'pool'>('direct');
  
  // Dialog states
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<SharedCourse | null>(null);

  // If propDriverId is provided, use it directly
  useEffect(() => {
    if (propDriverId) {
      console.log('[PartnerCoursePool] Using provided driverId:', propDriverId);
      setDriverId(propDriverId);
      Promise.all([loadPooledCourses(), loadSharedCoursesForDriver(propDriverId)])
        .finally(() => setLoading(false));
    } else if (user?.id) {
      console.log('[PartnerCoursePool] Loading for user:', user.id);
      loadDriverAndCourses();
    }
  }, [user?.id, propDriverId]);

  // Realtime subscription via centralized manager
  useEffect(() => {
    if (!driverId) return;

    const cleanupPool = subscriptionManager.subscribe(
      `pool-changes-${driverId}`,
      { table: 'partner_course_pool', event: '*', debounceMs: 500 },
      () => loadPooledCourses()
    );

    const cleanupShared = subscriptionManager.subscribe(
      `shared-changes-${driverId}`,
      { table: 'shared_courses', event: '*', debounceMs: 500 },
      () => loadSharedCourses()
    );

    return () => {
      cleanupPool();
      cleanupShared();
    };
  }, [driverId]);

  const loadDriverAndCourses = async () => {
    try {
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('[PartnerCoursePool] Error loading driver:', error);
        setLoading(false);
        return;
      }

      if (driver) {
        console.log('[PartnerCoursePool] Found driver:', driver.id);
        setDriverId(driver.id);
        // Pass driver.id directly to avoid race condition with state update
        await Promise.all([loadPooledCourses(), loadSharedCoursesForDriver(driver.id)]);
      }
    } catch (err) {
      console.error('[PartnerCoursePool] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Wrapper that uses state driverId for realtime callbacks
  const loadSharedCourses = async () => {
    if (!driverId) return;
    await loadSharedCoursesForDriver(driverId);
  };

  // Main function that accepts driverId as parameter to avoid race conditions
  const loadSharedCoursesForDriver = async (targetDriverId: string) => {
    try {
      console.log('[PartnerCoursePool] Loading shared courses for driver:', targetDriverId);
      
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
            distance_km,
            client_id
          )
        `)
        .eq('receiver_driver_id', targetDriverId)
        .eq('status', 'pending')
        .is('cancelled_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PartnerCoursePool] Query error:', error);
        throw error;
      }
      
      console.log('[PartnerCoursePool] Found shared courses:', data?.length || 0, data);

      const enrichedCourses: SharedCourse[] = [];
      for (const item of data || []) {
        // Récupérer TOUTES les infos du driver sender avec champs de visibilité
        const { data: driverData } = await supabase
          .from('drivers')
          .select(`
            user_id, 
            company_name, 
            sharing_number,
            vehicle_brand,
            vehicle_model,
            vehicle_color,
            rating,
            total_rides,
            bio,
            services_offered,
            card_photo_url,
            contact_phone,
            contact_email,
            show_phone_for_sharing,
            show_email,
            show_rating_for_sharing,
            show_rides_for_sharing
          `)
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone, email')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          
          // Load client info for this shared course
          let clientInfo: { client_name: string | null; client_phone: string | null; client_photo: string | null; client_email: string | null } = {
            client_name: null,
            client_phone: null,
            client_photo: null,
            client_email: null
          };
          
          // Get client info from the course
          if (course.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('user_id')
              .eq('id', course.client_id)
              .single();
            
            if (clientData?.user_id) {
              const { data: clientProfile } = await supabase
                .from('profiles')
                .select('full_name, phone, profile_photo_url, email')
                .eq('id', clientData.user_id)
                .single();
              
              if (clientProfile) {
                clientInfo = {
                  client_name: clientProfile.full_name,
                  client_phone: clientProfile.phone,
                  client_photo: clientProfile.profile_photo_url,
                  client_email: clientProfile.email
                };
              }
            }
          }
          
          // Utiliser card_photo_url en priorité, sinon profile_photo_url
          const senderPhoto = driverData.card_photo_url || profile?.profile_photo_url;
          
          // Respecter les paramètres de visibilité
          const showPhone = driverData.show_phone_for_sharing || false;
          const showEmail = driverData.show_email || false;
          const showRating = true; // Rating always visible
          const showRides = driverData.show_rides_for_sharing || false;
          
          // Téléphone: contact_phone prioritaire, sinon profile.phone si autorisé
          const senderPhone = showPhone 
            ? (driverData.contact_phone || profile?.phone) 
            : null;
          
          // Email: contact_email prioritaire, sinon profile.email si autorisé
          const senderEmail = showEmail 
            ? (driverData.contact_email || profile?.email) 
            : null;
          
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
            // Sender info avec respect de la visibilité
            sender_name: profile?.full_name || 'Partenaire',
            sender_photo: senderPhoto,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: senderPhone,
            sender_email: senderEmail,
            sender_vehicle_brand: driverData.vehicle_brand,
            sender_vehicle_model: driverData.vehicle_model,
            sender_vehicle_color: driverData.vehicle_color,
            sender_rating: showRating ? driverData.rating : null,
            sender_total_rides: showRides ? driverData.total_rides : null,
            sender_bio: driverData.bio,
            sender_services_offered: driverData.services_offered,
            sender_show_phone: showPhone,
            sender_show_email: showEmail,
            sender_show_rating: showRating,
            sender_show_rides: showRides,
            // Client info
            client_name: clientInfo.client_name,
            client_phone: clientInfo.client_phone,
            client_photo: clientInfo.client_photo,
            client_email: clientInfo.client_email,
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
      // Load all available pool courses - new open network model
      // Filter: not sender, status available, and either:
      // - scope=network (visible to all Stripe Connect drivers)
      // - scope=favorites with current driver in target_driver_ids
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
          sharing_scope,
          target_driver_ids,
          solocab_fee_cents,
          pickup_latitude,
          pickup_longitude,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km
          )
        `)
        .eq('status', 'available')
        .neq('sender_driver_id', driverId || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by scope: network = visible to all, favorites = only if driver is in target_driver_ids
      const filteredData = (data || []).filter(item => {
        const scope = (item as any).sharing_scope || 'network';
        if (scope === 'network') return true;
        if (scope === 'favorites') {
          const targets = (item as any).target_driver_ids as string[] | null;
          return targets?.includes(driverId || '') ?? false;
        }
        return false;
      });

      const enrichedCourses: PooledCourse[] = [];
      for (const item of filteredData) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select(`
            user_id, 
            company_name, 
            sharing_number,
            vehicle_brand,
            vehicle_model,
            vehicle_color,
            rating,
            total_rides,
            card_photo_url,
            contact_phone,
            contact_email,
            show_phone_for_sharing,
            show_email,
            show_rating_for_sharing,
            show_rides_for_sharing
          `)
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone, email')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          const senderPhoto = driverData.card_photo_url || profile?.profile_photo_url;
          
          // Respecter les paramètres de visibilité
          const showPhone = driverData.show_phone_for_sharing || false;
          const showEmail = driverData.show_email || false;
          const showRating = true; // Rating always visible
          const showRides = driverData.show_rides_for_sharing || false;
          
          // Téléphone: contact_phone prioritaire, sinon profile.phone si autorisé
          const senderPhone = showPhone 
            ? (driverData.contact_phone || profile?.phone) 
            : null;
          
          // Email: contact_email prioritaire, sinon profile.email si autorisé
          const senderEmail = showEmail 
            ? (driverData.contact_email || profile?.email) 
            : null;
          
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
            // Sender info avec respect de la visibilité
            sender_name: profile?.full_name || 'Partenaire',
            sender_photo: senderPhoto,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: senderPhone,
            sender_email: senderEmail,
            sender_vehicle_brand: driverData.vehicle_brand,
            sender_vehicle_model: driverData.vehicle_model,
            sender_vehicle_color: driverData.vehicle_color,
            sender_rating: showRating ? driverData.rating : null,
            sender_total_rides: showRides ? driverData.total_rides : null,
            sender_show_phone: showPhone,
            sender_show_email: showEmail,
            sender_show_rating: showRating,
            sender_show_rides: showRides,
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
      if (course.sharing_mode === 'pool') {
        const { data, error } = await supabase.rpc('claim_pool_course', {
          p_pool_id: course.id,
          p_claimer_driver_id: driverId
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
        toast.error(result?.error || result?.message || '\'Cette course nest plus disponible');
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

  // Decline shared course with reason
  const declineSharedCourse = async (sharedCourseId: string, reason: string) => {
    if (!driverId) return;
    
    setClaiming(sharedCourseId);
    try {
      const { data, error } = await supabase.rpc('decline_shared_course', {
        p_shared_course_id: sharedCourseId,
        p_driver_id: driverId,
        p_reason: reason || null
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

  // Handler for decline dialog
  const handleDeclineWithReason = async (reason: string) => {
    if (!selectedCourse) return;
    await declineSharedCourse(selectedCourse.id, reason);
    setSelectedCourse(null);
  };

  // Claim pooled course
  const claimPooledCourse = async (poolId: string) => {
    if (!driverId) return;
    
    setClaiming(poolId);
    try {
      const { data, error } = await supabase.rpc('claim_pool_course', {
        p_pool_id: poolId,
        p_claimer_driver_id: driverId
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast.success(result.message);
        loadPooledCourses();
      } else {
        toast.error(result?.message || '\'Cette course nest plus disponible');
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
                  {/* Sender info header - ENRICHI */}
                  <div className="p-3 border-b bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-primary/30">
                          <AvatarImage src={course.sender_photo || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {course.sender_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-primary font-medium uppercase tracking-wide">Partenaire</p>
                          <p className="font-semibold truncate">{course.sender_name}</p>
                          {course.sender_company && (
                            <p className="text-xs text-muted-foreground truncate">{course.sender_company}</p>
                          )}
                          {course.sender_sharing_number && (
                            <span className="text-xs text-primary font-mono">
                              #{formatSharingNumber(course.sender_sharing_number)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {course.sharing_mode === 'pool' ? (
                          <Badge className="bg-amber-500/20 text-amber-600 border-0 text-xs">
                            Premier arrivé
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/20 text-primary border-0 text-xs">
                            Pour vous
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary hover:text-primary/80"
                          onClick={() => {
                            setSelectedCourse(course);
                            setProfileDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Voir profil
                        </Button>
                      </div>
                    </div>
                    
                    {/* Sender vehicle & rating info */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                      {(course.sender_vehicle_brand || course.sender_vehicle_model) && (
                        <Badge variant="outline" className="text-xs">
                          <Car className="h-3 w-3 mr-1" />
                          {[course.sender_vehicle_brand, course.sender_vehicle_model].filter(Boolean).join(' ')}
                          {course.sender_vehicle_color && ` • ${course.sender_vehicle_color}`}
                        </Badge>
                      )}
                      {course.sender_rating && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10">
                          <span className="text-yellow-600 mr-1">★</span>
                          {course.sender_rating.toFixed(1)}
                        </Badge>
                      )}
                      {course.sender_total_rides !== null && course.sender_total_rides > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {course.sender_total_rides} courses
                        </Badge>
                      )}
                    </div>
                    
                    {/* Sender contact */}
                    {(course.sender_phone || course.sender_email) && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {course.sender_phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(`tel:${course.sender_phone}`, '_self')}
                          >
                            <Phone className="h-3 w-3 mr-1 text-green-600" />
                            {course.sender_phone}
                          </Button>
                        )}
                        {course.sender_email && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(`mailto:${course.sender_email}`, '_blank')}
                          >
                            <Mail className="h-3 w-3 mr-1 text-blue-600" />
                            Email
                          </Button>
                        )}
                      </div>
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
                    
                    {/* Client Info Section - Enhanced */}
                    {course.client_name && (
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border-2 border-blue-500/30">
                              <AvatarImage src={course.client_photo || undefined} />
                              <AvatarFallback className="bg-blue-500/20 text-blue-600 text-sm">
                                {course.client_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Client</p>
                              <p className="text-sm font-semibold">{course.client_name}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Client contact info */}
                        <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-blue-500/20">
                          {course.client_phone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 justify-start text-xs bg-blue-500/10 hover:bg-blue-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`tel:${course.client_phone}`, '_self');
                              }}
                            >
                              <Phone className="h-3 w-3 mr-2 text-blue-600" />
                              {course.client_phone}
                            </Button>
                          )}
                          {course.client_email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 justify-start text-xs bg-blue-500/10 hover:bg-blue-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`mailto:${course.client_email}`, '_blank');
                              }}
                            >
                              <Mail className="h-3 w-3 mr-2 text-blue-600" />
                              {course.client_email}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
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
                        onClick={() => {
                          setSelectedCourse(course);
                          setDeclineDialogOpen(true);
                        }}
                        disabled={claiming === course.id}
                        className="h-9 border-red-500/30 text-red-600 hover:bg-red-500/10"
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

      {/* Decline Dialog */}
      <DeclineCourseDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onConfirm={handleDeclineWithReason}
        senderName={selectedCourse?.sender_name || 'Partenaire'}
      />

      {/* Sender Profile Dialog removed (obsolete) */}
    </div>
  );
}
