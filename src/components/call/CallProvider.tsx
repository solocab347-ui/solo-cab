import { createContext, useContext, ReactNode } from 'react';
import { useCallSession, CallSession } from '@/hooks/useCallSession';
import { IncomingCallScreen } from './IncomingCallScreen';
import { ActiveCallScreen } from './ActiveCallScreen';

interface CallContextValue {
  startCall: (receiverId: string, receiverType: 'client' | 'driver') => Promise<CallSession | null>;
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}

interface CallProviderProps {
  userId: string;
  userType: 'client' | 'driver';
  rideId: string | null;
  otherName: string;
  children: ReactNode;
}

export function CallProvider({ userId, userType, rideId, otherName, children }: CallProviderProps) {
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
  } = useCallSession({ userId, userType, rideId });

  return (
    <CallContext.Provider value={{ startCall, activeCall, incomingCall }}>
      {children}

      {/* Incoming call overlay */}
      {incomingCall && (
        <IncomingCallScreen
          call={incomingCall}
          callerName={otherName}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active call overlay */}
      {activeCall && !incomingCall && (
        <ActiveCallScreen
          call={activeCall}
          otherName={otherName}
          duration={callDuration}
          isMuted={isMuted}
          onEndCall={endCall}
          onToggleMute={toggleMute}
        />
      )}
    </CallContext.Provider>
  );
}
