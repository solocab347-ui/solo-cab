import { useAuth } from '@/hooks/useAuth';
import { useIncomingCourseListener } from '@/hooks/useIncomingCourseListener';
import { useOverlayPermission } from '@/hooks/useOverlayPermission';
import { IncomingCourseOverlay } from '@/components/driver/courses/IncomingCourseOverlay';
import { OverlayPermissionPrompt } from '@/components/driver/courses/OverlayPermissionPrompt';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global ride overlay — mounted at App root so it works on ANY page.
 * Only activates when the logged-in user is a driver.
 */
export function GlobalRideOverlay() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);

  // Resolve driver ID from user
  useEffect(() => {
    if (!user?.id || userRole !== 'driver') {
      setDriverId(null);
      return;
    }

    let cancelled = false;
    supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.id) setDriverId(data.id);
      });

    return () => { cancelled = true; };
  }, [user?.id, userRole]);

  const { isEnabled: overlayEnabled, shouldPrompt: showOverlayPrompt, grant: grantOverlay, deny: denyOverlay } = useOverlayPermission(driverId);

  const {
    incomingCourse,
    dismiss,
    clearCurrent,
  } = useIncomingCourseListener({
    driverId,
    enabled: !!driverId,
  });

  // After accepting → navigate to map mode to see active course
  const handleAccepted = useCallback(() => {
    clearCurrent();
    navigate('/driver-dashboard?view=map');
  }, [clearCurrent, navigate]);

  // After refusing → navigate back to map
  const handleDismiss = useCallback(() => {
    dismiss();
    navigate('/driver-dashboard?view=map');
  }, [dismiss, navigate]);

  // Don't render anything if not a driver
  if (!driverId) return null;

  return (
    <>
      <IncomingCourseOverlay
        course={incomingCourse}
        onDismiss={handleDismiss}
        onAccepted={handleAccepted}
        driverId={driverId}
      />
      <OverlayPermissionPrompt
        visible={showOverlayPrompt && !incomingCourse}
        onGrant={grantOverlay}
        onDeny={denyOverlay}
      />
    </>
  );
}