import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Loader2,
  ArrowRight
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

    // Load available courses - UNIQUEMENT les courses avec devis ACCEPTÉ
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
      .eq('status', 'accepted') // Course confirmée
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true });

    if (courses) {
      // FILTRE CRITIQUE: Seules les courses avec devis ACCEPTÉ peuvent être partagées
      const enrichedCourses: AvailableCourse[] = courses
        .filter(c => {
          const acceptedDevis = (c.devis as any[])?.find(d => d.status === 'accepted');
          return !!acceptedDevis; // Doit avoir un devis accepté
        })
        .map(c => ({
          id: c.id,
          pickup_address: c.pickup_address,
          destination_address: c.destination_address,
          scheduled_date: c.scheduled_date,
          passengers_count: c.passengers_count,
          distance_km: c.distance_km,
          status: c.status,
          devis_amount: (c.devis as any[])?.find(d => d.status === 'accepted')?.amount || null,
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
    setMessage('');
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
        message: message || null,
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
        toast.error('Cette course est déjà proposée');
      } else {
        toast.error('Erreur lors de la proposition');
      }
    } finally {
      setPushing(false);
    }
  };

  const shortenAddress = (address: string) => {
    if (address.length > 35) return address.substring(0, 32) + '...';
    return address;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (partnerships.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Vous devez avoir au moins un partenariat actif pour proposer des courses.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" />
          Proposer une course
        </h3>
        <p className="text-xs text-muted-foreground">
          Sélectionnez une course à proposer à vos {partnerships.length} partenaire{partnerships.length > 1 ? 's' : ''}
        </p>
      </div>

      {availableCourses.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Aucune course disponible à partager.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {availableCourses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {course.status === 'accepted' ? 'Acceptée' : 'En attente'}
                    </Badge>
                  </div>

                  {/* Addresses compact */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="truncate flex-1">{shortenAddress(course.pickup_address)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2">
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
                      {course.devis_amount && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Euro className="h-3 w-3" />
                          {course.devis_amount.toFixed(0)}€
                        </span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => openPushDialog(course)} className="h-8">
                      <Send className="h-3 w-3 mr-1" />
                      Proposer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Push Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Proposer la course</DialogTitle>
            <DialogDescription>
              Tous vos partenaires verront cette offre
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-4">
              {/* Course summary */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedCourse.scheduled_date), "d MMMM 'à' HH:mm", { locale: fr })}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-xs">{selectedCourse.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <span className="text-xs">{selectedCourse.destination_address}</span>
                </div>
                {selectedCourse.devis_amount && (
                  <div className="flex items-center gap-2 font-semibold pt-1 border-t">
                    <Euro className="h-4 w-4" />
                    {selectedCourse.devis_amount.toFixed(2)} €
                  </div>
                )}
              </div>

              {/* Partners */}
              <div className="space-y-2">
                <Label className="text-xs">Partenaires notifiés</Label>
                <div className="flex flex-wrap gap-1.5">
                  {partnerships.map(p => (
                    <Badge key={p.id} variant="secondary" className="text-xs">
                      {p.partner_name} ({p.commission_percentage}%)
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label className="text-xs">Durée de validité</Label>
                <Select value={expirationHours} onValueChange={setExpirationHours}>
                  <SelectTrigger className="h-9">
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

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-xs">Message (optionnel)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ajoutez un message..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={pushCourseToPool} disabled={pushing} className="flex-1">
              {pushing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
