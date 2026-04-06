import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RideChatPanel } from "@/components/chat/RideChatPanel";

interface CourseClientContactProps {
  course: {
    id?: string;
    is_guest_booking?: boolean;
    guest_phone?: string | null;
    guest_name?: string | null;
    status?: string;
    clients?: {
      profiles?: {
        phone?: string | null;
        full_name?: string | null;
      };
    };
    ride_type?: string;
  };
  employeePhone?: string | null;
  driverId?: string | null;
}

export function CourseClientContact({ course, employeePhone, driverId }: CourseClientContactProps) {
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);

  // Look up ride_request linked to this course
  useEffect(() => {
    if (!course.id) return;
    const isActive = ['accepted', 'in_progress', 'driver_arrived'].includes(course.status || '');
    if (!isActive) return;

    supabase
      .from('ride_requests')
      .select('id')
      .eq('final_course_id', course.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setRideRequestId(data[0].id);
      });
  }, [course.id, course.status]);

  const getClientPhone = (): string | null => {
    if (employeePhone) return employeePhone;
    if (course.is_guest_booking || !course.clients?.profiles?.phone) {
      return course.guest_phone || null;
    }
    return course.clients.profiles.phone;
  };

  const getClientFirstName = (): string => {
    if (course.guest_name) return course.guest_name.split(' ')[0];
    if (course.clients?.profiles?.full_name) return course.clients.profiles.full_name.split(' ')[0];
    return 'Client';
  };

  const phone = getClientPhone();
  const isImmediate = course.ride_type === 'immediate';
  const isActive = ['accepted', 'in_progress', 'driver_arrived'].includes(course.status || '');

  return (
    <div className="space-y-2">
      {/* Pour les courses NON immédiates: afficher téléphone */}
      {!isImmediate && phone && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
          <Phone className="w-4 h-4 text-primary shrink-0" />
          <a 
            href={`tel:${phone}`} 
            className="text-sm font-medium text-primary hover:underline"
          >
            {phone}
          </a>
          <span className="text-xs text-muted-foreground">- Appeler le passager</span>
        </div>
      )}

      {/* Chat button — pour les courses actives avec ride_request */}
      {rideRequestId && driverId && isActive && (
        <RideChatPanel
          rideId={rideRequestId}
          senderType="driver"
          senderId={driverId}
          otherName={getClientFirstName()}
          triggerLabel={isImmediate ? "💬 Contacter le client" : "💬 Chat course"}
        />
      )}

      {/* Notice confidentialité pour courses immédiates */}
      {isImmediate && !phone && !rideRequestId && (
        <p className="text-xs text-muted-foreground italic">
          Communication via chat uniquement
        </p>
      )}
    </div>
  );
}
