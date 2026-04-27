import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  MapPin, 
  Calendar, 
  Euro, 
  Loader2,
  Users,
  Phone,
  Play,
  CheckCheck,
  Handshake,
  Car,
  Navigation,
  CreditCard,
  Banknote,
  Smartphone,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SharedCourseClientInfo } from '../partnership/SharedCourseClientInfo';
import { getNavigationOptions, type NavigationDestination } from '@/lib/navigationApp';

interface Props {
  driverId: string;
}

interface SharedCourseDisplay {
  id: string;
  course_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  // Course details
  pickup_address: string;
  destination_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  course_status: string;
  course_number: string | null;
  payment_method_requested: string | null;
  // Sender info
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;
}

// ⚠️ Les courses partagées n'acceptent JAMAIS le paiement en espèces.
// Le règlement passe obligatoirement par Stripe (lien/QR) afin de garantir
// la traçabilité, le déclenchement de la commission et la clôture.
const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire (Stripe)', icon: CreditCard },
  { value: 'transfer', label: 'Virement', icon: Smartphone },
];

export function SharedCoursesInCoursesList({ driverId }: Props) {
  const [courses, setCourses] = useState<SharedCourseDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  
  // Navigation dialog state
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [navigationDestination, setNavigationDestination] = useState<NavigationDestination | null>(null);

  useEffect(() => {
    loadSharedCourses();
  }, [driverId]);

  const loadSharedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_courses')
        .select(`
          id,
          course_id,
          sender_driver_id,
          course_amount,
          commission_percentage,
          commission_amount,
          status,
          courses!inner(
            pickup_address,
            destination_address,
            pickup_latitude,
            pickup_longitude,
            destination_latitude,
            destination_longitude,
            scheduled_date,
            passengers_count,
            distance_km,
            status,
            course_number,
            payment_method_requested
          )
        `)
        .eq('receiver_driver_id', driverId)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedCourses: SharedCourseDisplay[] = [];
      
      for (const item of data || []) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, sharing_number, show_phone_for_sharing, card_photo_url')
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          const senderPhoto = driverData.card_photo_url || profile?.profile_photo_url;
          
          enrichedCourses.push({
            id: item.id,
            course_id: item.course_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            commission_amount: item.commission_amount,
            status: item.status,
            pickup_address: course.pickup_address,
            destination_address: course.destination_address,
            pickup_latitude: course.pickup_latitude,
            pickup_longitude: course.pickup_longitude,
            destination_latitude: course.destination_latitude,
            destination_longitude: course.destination_longitude,
            scheduled_date: course.scheduled_date,
            passengers_count: course.passengers_count,
            distance_km: course.distance_km,
            course_status: course.status,
            course_number: course.course_number,
            payment_method_requested: course.payment_method_requested,
            sender_name: profile?.full_name || 'Partenaire',
            sender_photo: senderPhoto,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: profile?.phone || null, // Always show phone during active course
          });
        }
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error('Error loading shared courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async (sharedCourseId: string) => {
    setActionLoading(sharedCourseId);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', sharedCourseId);
      
      if (error) throw error;
      toast.success('Course démarrée !');
      loadSharedCourses();
    } catch (error) {
      console.error('Error starting course:', error);
      toast.error('Erreur lors du démarrage');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPaymentDialog = (courseId: string, requestedMethod: string | null) => {
    setSelectedCourseId(courseId);
    // Cash interdit sur courses partagées : on n'auto-sélectionne jamais 'cash'
    const safeMethod = requestedMethod && requestedMethod !== 'cash' ? requestedMethod : '';
    setPaymentMethod(safeMethod);
    setShowPaymentDialog(true);
  };

  const handleCompleteCourse = async () => {
    if (!selectedCourseId || !paymentMethod) {
      toast.error('Veuillez sélectionner un moyen de paiement');
      return;
    }

    setActionLoading(selectedCourseId);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          payment_method_used: paymentMethod 
        })
        .eq('id', selectedCourseId);
      
      if (error) throw error;
      
      toast.success('Course terminée ! Bon de commande généré.');
      setShowPaymentDialog(false);
      setPaymentMethod('');
      setSelectedCourseId(null);
      loadSharedCourses();
    } catch (error) {
      console.error('Error completing course:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNavigate = (destination: NavigationDestination) => {
    setNavigationDestination(destination);
    setShowNavigationDialog(true);
  };

  const openNavigation = (url: string) => {
    window.open(url, '_blank');
    setShowNavigationDialog(false);
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return null;
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found?.label || method;
  };

  if (loading) {
    return null;
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mt-4 border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Handshake className="h-5 w-5" />
            Courses partenaires en cours ({courses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {courses.map((course) => {
            const isLoading = actionLoading === course.id;
            const canStart = course.status === 'accepted';
            const canComplete = course.status === 'in_progress';

            return (
              <Card key={course.id} className="overflow-hidden border-purple-500/20">
                {/* Header - Sender info */}
                <div className="p-2 sm:p-3 border-b bg-purple-500/10">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-purple-500/30 shrink-0">
                      <AvatarImage src={course.sender_photo || undefined} />
                      <AvatarFallback className="bg-purple-500/20 text-purple-600 text-xs sm:text-sm">
                        {course.sender_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">{course.sender_name}</p>
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                        {course.sender_sharing_number && (
                          <span className="font-mono text-purple-600">{formatSharingNumber(course.sender_sharing_number)}</span>
                        )}
                        {course.sender_company && (
                          <span className="hidden sm:inline">• {course.sender_company}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={cn(
                        "text-[10px] sm:text-xs",
                        course.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600' : 'bg-green-500/20 text-green-600'
                      )}>
                        {course.status === 'in_progress' ? 'En cours' : 'Acceptée'}
                      </Badge>
                      {course.course_number && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 font-mono">#{course.course_number}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Course details */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <span className="truncate flex-1">{course.pickup_address}</span>
                      {canStart && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-600 hover:text-green-700"
                          onClick={() => handleNavigate({
                            address: course.pickup_address,
                            latitude: course.pickup_latitude || undefined,
                            longitude: course.pickup_longitude || undefined
                          })}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="truncate flex-1">{course.destination_address}</span>
                      {canComplete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700"
                          onClick={() => handleNavigate({
                            address: course.destination_address,
                            latitude: course.destination_latitude || undefined,
                            longitude: course.destination_longitude || undefined
                          })}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {course.distance_km && (
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {course.distance_km.toFixed(0)} km
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.passengers_count} pass.
                    </span>
                    {course.payment_method_requested && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {getPaymentMethodLabel(course.payment_method_requested)}
                      </Badge>
                    )}
                  </div>

                  {/* Client info */}
                  <SharedCourseClientInfo 
                    sharedCourseId={course.id} 
                    driverId={driverId} 
                    sharedStatus={course.status}
                  />
                </div>

                {/* Footer - Commission info + Actions */}
                <div className="p-3 border-t bg-muted/20">
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Montant</p>
                      <p className="font-semibold text-sm sm:text-base">{course.course_amount.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Commission ({course.commission_percentage}%)</p>
                      <p className="font-semibold text-sm sm:text-base text-red-600">-{course.commission_amount.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Vous gardez</p>
                      <p className="font-bold text-sm sm:text-base text-green-600">
                        {(course.course_amount - course.commission_amount).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {canStart && (
                      <Button
                        onClick={() => handleStartCourse(course.id)}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                        Démarrer
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        onClick={() => handleOpenPaymentDialog(course.id, course.payment_method_requested)}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="h-4 w-4 mr-2" />}
                        Terminer
                      </Button>
                    )}
                    {course.sender_phone && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`tel:${course.sender_phone}`, '_blank')}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-green-600" />
              Terminer la course partenaire
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le moyen de paiement utilisé par le client pour cette course.
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={method.value} id={method.value} />
                  <Label htmlFor={method.value} className="flex items-center gap-2 cursor-pointer flex-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {method.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCompleteCourse} 
              disabled={!paymentMethod || actionLoading !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Confirmer et générer bon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Dialog */}
      <Dialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Choisir l'application GPS
            </DialogTitle>
          </DialogHeader>
          
          {navigationDestination && (
            <div className="space-y-2">
              {getNavigationOptions(navigationDestination).map((option) => (
                <Button
                  key={option.app}
                  variant="outline"
                  className="w-full justify-start text-left h-12"
                  onClick={() => openNavigation(option.url)}
                >
                  <span className="text-xl mr-3">{option.icon}</span>
                  {option.name}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
