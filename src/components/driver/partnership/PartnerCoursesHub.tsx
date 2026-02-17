import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Inbox,
  Send,
  Car,
  Loader2
} from 'lucide-react';
import { PartnerCoursePool } from '../sharing/PartnerCoursePool';
import { ReceivedPartnerCourses } from './ReceivedPartnerCourses';
import { SentPartnerCourses } from './SentPartnerCourses';

interface Props {
  driverId: string | null;
}

export function PartnerCoursesHub({ driverId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'received' | 'sent'>('available');
  
  // Stats
  const [availableCount, setAvailableCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (driverId) {
      loadStats();
    }
  }, [driverId]);

  const loadStats = async () => {
    if (!driverId) return;
    setLoading(true);

    try {
      // Available courses (pool + direct)
      const { count: poolCount } = await supabase
        .from('partner_course_pool')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')
        .gt('expires_at', new Date().toISOString());

      const { count: pendingShared } = await supabase
        .from('shared_courses')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_driver_id', driverId)
        .eq('status', 'pending');

      // Received courses (accepted/completed)
      const { count: receivedActive } = await supabase
        .from('shared_courses')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_driver_id', driverId)
        .in('status', ['accepted', 'completed']);

      // Sent courses (accepted/completed)
      const { count: sentActive } = await supabase
        .from('shared_courses')
        .select('*', { count: 'exact', head: true })
        .eq('sender_driver_id', driverId)
        .in('status', ['accepted', 'completed']);

      setAvailableCount((poolCount || 0) + (pendingShared || 0));
      setReceivedCount(receivedActive || 0);
      setSentCount(sentActive || 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'available' | 'received' | 'sent')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="text-xs gap-1.5">
            <Car className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Disponibles</span>
            <span className="sm:hidden">Dispo.</span>
            {availableCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {availableCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="text-xs gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reçues</span>
            <span className="sm:hidden">Reçu</span>
            {receivedCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {receivedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs gap-1.5">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Envoyées</span>
            <span className="sm:hidden">Envoyé</span>
            {sentCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {sentCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4">
          <PartnerCoursePool />
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          <ReceivedPartnerCourses driverId={driverId} />
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <SentPartnerCourses driverId={driverId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
