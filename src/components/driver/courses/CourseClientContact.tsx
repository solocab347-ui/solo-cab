import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RideChatPanel } from "@/components/chat/RideChatPanel";
import { VoipCallButton } from "@/components/call/VoipCallButton";
import { useCallSession } from "@/hooks/useCallSession";
import { IncomingCallScreen } from "@/components/call/IncomingCallScreen";
import { ActiveCallScreen } from "@/components/call/ActiveCallScreen";

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
  /** Driver auth user_id (used as caller_id in call_sessions) */
  driverId?: string | null;
}

export function CourseClientContact({ course, employeePhone, driverId }: CourseClientContactProps) {
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [clientUserId, setClientUserId] = useState<string | null>(null);

  const isActive = ['accepted', 'in_progress', 'driver_arrived'].includes(course.status || '');

  // Look up ride_request linked to this course
  useEffect(() => {
    if (!course.id || !isActive) return;

    supabase
      .from('ride_requests')
      .select('id, client_id')
      .eq('final_course_id', course.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setRideRequestId(data[0].id);
          setClientUserId(data[0].client_id);
        }
      });
  }, [course.id, isActive]);

  // VoIP session — enabled only when we have driver + ride
  const {
    activeCall,
    incomingCall,
    callDuration,
    isMuted,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useCallSession({
    userId: driverId || '',
    userType: 'driver',
    rideId: rideRequestId,
    enabled: Boolean(driverId && rideRequestId && isActive),
  });

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
  const clientName = getClientFirstName();

  const handleCall = () => {
    if (clientUserId) {
      startCall(clientUserId, 'client');
    }
  };

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

      {/* Appel VoIP anonyme — pour les courses actives */}
      {isActive && clientUserId && driverId && (
        <VoipCallButton
          onClick={handleCall}
          label={`Appeler ${clientName}`}
          variant="compact"
          disabled={Boolean(activeCall || incomingCall)}
        />
      )}

      {/* Chat button — pour les courses actives avec ride_request */}
      {rideRequestId && driverId && isActive && (
        <RideChatPanel
          rideId={rideRequestId}
          senderType="driver"
          senderId={driverId}
          otherName={clientName}
          triggerLabel={isImmediate ? "💬 Contacter le client" : "💬 Chat course"}
          onCallPress={clientUserId ? handleCall : undefined}
        />
      )}

      {/* Notice confidentialité pour courses immédiates */}
      {isImmediate && !phone && !rideRequestId && (
        <p className="text-xs text-muted-foreground italic">
          Communication via chat uniquement
        </p>
      )}

      {/* Incoming call overlay */}
      {incomingCall && (
        <IncomingCallScreen
          call={incomingCall}
          callerName={clientName}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active call overlay */}
      {activeCall && !incomingCall && (
        <ActiveCallScreen
          call={activeCall}
          otherName={clientName}
          duration={callDuration}
          isMuted={isMuted}
          onEndCall={endCall}
          onToggleMute={toggleMute}
        />
      )}
    </div>
  );
}
