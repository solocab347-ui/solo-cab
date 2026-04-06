import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Phone, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CourseNavigationButtons } from '@/components/course/CourseNavigationButtons';

interface ActiveCourse {
  id: string;
  status: string;
  pickup_address: string;
  destination_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_estimated_price: number | null;
  final_payment_amount: number | null;
  clients: { profiles: { full_name: string; phone: string | null } | null } | null;
}

interface ActiveCourseCardProps {
  driverId: string;
}

export function ActiveCourseCard({ driverId }: ActiveCourseCardProps) {
  const [course, setCourse] = useState<ActiveCourse | null>(null);

  useEffect(() => {
    const fetchActive = async () => {
      const { data } = await supabase
        .from('courses')
        .select(`
          id, status, pickup_address, destination_address,
          pickup_latitude, pickup_longitude,
          destination_latitude, destination_longitude,
          guest_name, guest_phone, guest_estimated_price, final_payment_amount,
          clients(profiles:user_id(full_name, phone))
        `)
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'confirmed', 'in_progress'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCourse(data as unknown as ActiveCourse | null);
    };

    fetchActive();

    // Listen for course status changes
    const channel = supabase
      .channel(`active-course-${driverId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'courses',
        filter: `driver_id=eq.${driverId}`,
      }, () => fetchActive())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const clientName = course?.clients?.profiles?.full_name || course?.guest_name || 'Client';
  const clientPhone = course?.clients?.profiles?.phone || course?.guest_phone;
  const price = course?.final_payment_amount || course?.guest_estimated_price;

  return (
    <AnimatePresence>
      {course && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="absolute top-[env(safe-area-inset-top,0px)] left-0 right-0 z-[9995] px-3 pt-2"
          style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl p-4 space-y-3">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  course.status === 'in_progress' ? 'bg-green-500' : 'bg-amber-500'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {course.status === 'in_progress' ? 'En course' : 'Course acceptée'}
                </span>
              </div>
              {price && (
                <span className="text-sm font-bold text-primary">{price.toFixed(2)}€</span>
              )}
            </div>

            {/* Client info */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{clientName}</span>
              {clientPhone && (
                <a href={`tel:${clientPhone}`} className="ml-auto">
                  <Button size="sm" variant="outline" className="h-7 px-2 rounded-full">
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
            </div>

            {/* Addresses */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 border border-green-300 mt-0.5 flex-shrink-0" />
                <p className="text-xs truncate">{course.pickup_address}</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-300 mt-0.5 flex-shrink-0" />
                <p className="text-xs truncate">{course.destination_address}</p>
              </div>
            </div>

            {/* Navigation button */}
            <CourseNavigationButtons
              status={course.status}
              pickupAddress={course.pickup_address}
              pickupLatitude={course.pickup_latitude}
              pickupLongitude={course.pickup_longitude}
              destinationAddress={course.destination_address}
              destinationLatitude={course.destination_latitude}
              destinationLongitude={course.destination_longitude}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
