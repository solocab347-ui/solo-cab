import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Users, 
  Euro,
  Send,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { format, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AvailableCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  status: string;
  devis_amount: number | null;
}

interface Partnership {
  id: string;
  partner_id: string;
  partner_name: string;
  commission_percentage: number;
}

export function PushCourseToPartners() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AvailableCourse | null>(null);
  const [message, setMessage] = useState('');
  const [expirationHours, setExpirationHours] = useState('4');
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    
    // Get driver ID
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!driver) {
      setLoading(false);
      return;
    }
    
    setDriverId(driver.id);

    // Load available courses (accepted courses that can be shared)
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id,
        pickup_address,
        destination_address,
        scheduled_date,
        passengers_count,
        distance_km,
        status,
        devis!inner(amount, status)
      `)
      .eq('driver_id', driver.id)
      .in('status', ['pending', 'accepted'])
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true });

    if (courses) {
      const enrichedCourses: AvailableCourse[] = courses.map(c => ({
        id: c.id,
        pickup_address: c.pickup_address,
        destination_address: c.destination_address,
        scheduled_date: c.scheduled_date,
        passengers_count: c.passengers_count,
        distance_km: c.distance_km,
        status: c.status,
        devis_amount: (c.devis as any[])?.find(d => d.status === 'accepted' || d.status === 'pending')?.amount || null,
      }));
      setAvailableCourses(enrichedCourses);
    }

    // Load active partnerships
    const { data: partnerData } = await supabase
      .from('driver_partnerships')
      .select('*')
      .or(`driver_a_id.eq.${driver.id},driver_b_id.eq.${driver.id}`)
      .eq('status', 'active');

    if (partnerData) {
      const enriched: Partnership[] = [];
      for (const p of partnerData) {
        const partnerId = p.driver_a_id === driver.id ? p.driver_b_id : p.driver_a_id;
        const { data: partnerDriver } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', partnerId)
          .single();

        if (partnerDriver) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', partnerDriver.user_id)
            .single();

          enriched.push({
            id: p.id,
            partner_id: partnerId,
            partner_name: profile?.full_name || 'Chauffeur',
            commission_percentage: p.commission_percentage,
          });
        }
      }
      setPartnerships(enriched);
    }

    setLoading(false);
  };

  const openPushDialog = (course: AvailableCourse) => {
    setSelectedCourse(course);
    setMessage(`Je ne peux pas effectuer cette course. Elle est disponible pour vous si vous êtes intéressé.`);
    setDialogOpen(true);
  };

  const pushCourseToPool = async () => {
    if (!selectedCourse || !driverId || partnerships.length === 0) return;

    setPushing(true);
    try {
      const partnershipIds = partnerships.map(p => p.id);
      const avgCommission = partnerships.reduce((acc, p) => acc + p.commission_percentage, 0) / partnerships.length;
      const courseAmount = selectedCourse.devis_amount || 0;
      const estimatedCommission = (courseAmount * avgCommission) / 100;
      const expiresAt = addHours(new Date(), parseInt(expirationHours));

      const { error } = await supabase.from('partner_course_pool').insert({
        course_id: selectedCourse.id,
        sender_driver_id: driverId,
        partnership_ids: partnershipIds,
        course_amount: courseAmount,
        commission_percentage: avgCommission,
        estimated_commission: estimatedCommission,
        message: message,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success('Course proposée à vos partenaires !');
      setDialogOpen(false);
      setSelectedCourse(null);
      setMessage('');
      loadData();
    } catch (error: any) {
      console.error('Push error:', error);
      if (error.code === '23505') {
        toast.error('Cette course est déjà dans le pool de partage');
      } else {
        toast.error('Erreur lors de la proposition');
      }
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (partnerships.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Vous devez avoir au moins un partenariat actif pour proposer des courses.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Send className="h-5 w-5" />
          Proposer une course à vos partenaires
        </h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez une course que vous ne pouvez pas effectuer pour la proposer à vos partenaires
        </p>
      </div>

      {availableCourses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez aucune course disponible à partager pour le moment.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3">
          {availableCourses.map((course) => (
            <Card key={course.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(course.scheduled_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      <Badge variant="outline">{course.status}</Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="line-clamp-1">{course.pickup_address}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                        <span className="line-clamp-1">{course.destination_address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.passengers_count}
                      </span>
                      {course.distance_km && (
                        <span className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {course.distance_km.toFixed(1)} km
                        </span>
                      )}
                      {course.devis_amount && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Euro className="h-4 w-4" />
                          {course.devis_amount.toFixed(2)} €
                        </span>
                      )}
                    </div>
                  </div>

                  <Button onClick={() => openPushDialog(course)}>
                    <Send className="h-4 w-4 mr-2" />
                    Proposer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Push Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer la course à vos partenaires</DialogTitle>
            <DialogDescription>
              Cette course sera visible par tous vos partenaires actifs. Le premier à la réclamer l'obtiendra.
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedCourse.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                  {selectedCourse.pickup_address}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                  {selectedCourse.destination_address}
                </div>
                {selectedCourse.devis_amount && (
                  <div className="flex items-center gap-2 font-medium">
                    <Euro className="h-4 w-4" />
                    {selectedCourse.devis_amount.toFixed(2)} €
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Partenaires qui recevront cette offre</Label>
                <div className="flex flex-wrap gap-2">
                  {partnerships.map(p => (
                    <Badge key={p.id} variant="secondary">
                      {p.partner_name} ({p.commission_percentage}%)
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Durée de validité</Label>
                <Select value={expirationHours} onValueChange={setExpirationHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 heures</SelectItem>
                    <SelectItem value="4">4 heures</SelectItem>
                    <SelectItem value="8">8 heures</SelectItem>
                    <SelectItem value="24">24 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message (optionnel)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ajoutez un message pour vos partenaires..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={pushCourseToPool} disabled={pushing}>
              {pushing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Proposer aux partenaires
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
