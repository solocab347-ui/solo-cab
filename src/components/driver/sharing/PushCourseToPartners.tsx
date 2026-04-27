import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Car, Calendar, Users, Euro, Send, AlertCircle, Loader2, ArrowRight, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShareCourseWithPartnerDialog } from './ShareCourseWithPartnerDialog';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';

interface AvailableCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  status: string;
  devis_amount: number | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  client_id: string | null;
  devis: any[];
}

export function PushCourseToPartners() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<AvailableCourse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { isNotConnected: stripeNotConnected } = useStripeConnectStatus(driverId || undefined);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!driver) { setLoading(false); return; }
    setDriverId(driver.id);

    // Load available courses with accepted devis
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id, pickup_address, destination_address, scheduled_date,
        passengers_count, distance_km, status, client_id,
        pickup_latitude, pickup_longitude,
        devis!inner(id, amount, status)
      `)
      .eq('driver_id', driver.id)
      .eq('status', 'accepted')
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true });

    if (courses) {
      const enriched: AvailableCourse[] = courses
        .filter(c => (c.devis as any[])?.some(d => d.status === 'accepted'))
        .map(c => ({
          id: c.id,
          pickup_address: c.pickup_address,
          destination_address: c.destination_address,
          scheduled_date: c.scheduled_date,
          passengers_count: c.passengers_count,
          distance_km: c.distance_km,
          status: c.status,
          client_id: c.client_id,
          pickup_latitude: c.pickup_latitude,
          pickup_longitude: c.pickup_longitude,
          devis_amount: (c.devis as any[])?.find(d => d.status === 'accepted')?.amount || null,
          devis: c.devis as any[],
        }));
      setAvailableCourses(enriched);
    }

    setLoading(false);
  };

  const shortenAddress = (address: string) => {
    if (address.length > 35) return address.substring(0, 32) + '...';
    return address;
  };

  const getCommissionLabel = (amount: number | null) => {
    if (!amount) return '';
    const pct = 22; // default 22% (range 20-25%)
    const comm = (amount * pct) / 100;
    return `${pct}% → ${comm.toFixed(2)}€`;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (stripeNotConnected) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <CreditCard className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm">
          Configurez Stripe Connect dans vos paramètres pour partager des courses sur le réseau.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" />
          Proposer une course
        </h3>
        <p className="text-xs text-muted-foreground">
          Partagez sur le réseau ouvert, à vos favoris ou à un chauffeur spécifique
        </p>
      </div>

      {availableCourses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Aucune course avec devis accepté disponible à partager.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {availableCourses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                    </div>
                    {course.devis_amount && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {getCommissionLabel(course.devis_amount)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="truncate flex-1">{shortenAddress(course.pickup_address)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />{course.passengers_count}
                      </span>
                      {course.distance_km && (
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />{course.distance_km.toFixed(0)} km
                        </span>
                      )}
                      {course.devis_amount && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Euro className="h-3 w-3" />{course.devis_amount.toFixed(2)}€
                        </span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => { setSelectedCourse(course); setDialogOpen(true); }} className="h-8">
                      <Send className="h-3 w-3 mr-1" />
                      Partager
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCourse && driverId && (
        <ShareCourseWithPartnerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          course={selectedCourse}
          driverId={driverId}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
