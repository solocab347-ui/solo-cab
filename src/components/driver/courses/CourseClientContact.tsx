import { Phone } from "lucide-react";
import { RideChatPanel } from "@/components/chat/RideChatPanel";

interface CourseClientContactProps {
  course: {
    id?: string;
    is_guest_booking?: boolean;
    guest_phone?: string | null;
    guest_name?: string | null;
    clients?: {
      profiles?: {
        phone?: string | null;
        full_name?: string | null;
      };
    };
    ride_type?: string; // 'immediate' or other
  };
  employeePhone?: string | null;
  driverId?: string | null;
  rideRequestId?: string | null;
}

export function CourseClientContact({ course, employeePhone, driverId, rideRequestId }: CourseClientContactProps) {
  const getClientPhone = (): string | null => {
    if (employeePhone) return employeePhone;
    if (course.is_guest_booking || !course.clients?.profiles?.phone) {
      return course.guest_phone || null;
    }
    return course.clients.profiles.phone;
  };

  const getClientFirstName = (): string => {
    if (course.guest_name) {
      return course.guest_name.split(' ')[0];
    }
    if (course.clients?.profiles?.full_name) {
      return course.clients.profiles.full_name.split(' ')[0];
    }
    return 'Client';
  };

  const phone = getClientPhone();
  const isImmediate = course.ride_type === 'immediate';

  return (
    <div className="space-y-2">
      {/* Pour les courses immédiates: pas de téléphone, uniquement chat */}
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

      {/* Chat button — always available if we have a ride request ID */}
      {rideRequestId && driverId && (
        <RideChatPanel
          rideId={rideRequestId}
          senderType="driver"
          senderId={driverId}
          otherName={getClientFirstName()}
          triggerLabel={isImmediate ? "Contacter le client" : "Chat course"}
        />
      )}

      {/* For immediate rides: privacy notice */}
      {isImmediate && !rideRequestId && (
        <p className="text-xs text-muted-foreground italic">
          Communication via chat uniquement pour les courses immédiates
        </p>
      )}
    </div>
  );
}
