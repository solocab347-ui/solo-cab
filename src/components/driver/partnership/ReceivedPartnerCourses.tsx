import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Euro, 
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  Hash,
  CheckCircle2,
  CircleDot,
  Phone,
  ArrowRight,
  TrendingDown,
  Play,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SharedCourseClientInfo } from './SharedCourseClientInfo';

interface Props {
  driverId: string | null;
}

interface ReceivedCourse {
  id: string;
  course_id: string;
  partnership_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  // Course details
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  course_status: string;
  course_number: string | null;
  shared_status: string;
  // Sender info
  sender_name: string;
  sender_photo: string | null;
  sender_company: string | null;
  sender_sharing_number: number | null;
  sender_phone: string | null;
}

export function ReceivedPartnerCourses({ driverId }: Props) {
  const [courses, setCourses] = useState<ReceivedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (driverId) {
      loadReceivedCourses();
    }
  }, [driverId]);

  const loadReceivedCourses = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_courses')
        .select(`
          id,
          course_id,
          partnership_id,
          sender_driver_id,
          course_amount,
          commission_percentage,
          commission_amount,
          status,
          created_at,
          completed_at,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km,
            status,
            course_number
          )
        `)
        .eq('receiver_driver_id', driverId)
        .in('status', ['accepted', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedCourses: ReceivedCourse[] = [];
      
      for (const item of data || []) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, sharing_number, show_phone_for_sharing')
          .eq('id', item.sender_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          enrichedCourses.push({
            id: item.id,
            course_id: item.course_id,
            partnership_id: item.partnership_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            commission_amount: item.commission_amount,
            status: item.status,
            created_at: item.created_at,
            completed_at: item.completed_at,
            pickup_address: course.pickup_address,
            destination_address: course.destination_address,
            scheduled_date: course.scheduled_date,
            passengers_count: course.passengers_count,
            distance_km: course.distance_km,
            course_status: course.status,
            course_number: course.course_number,
            shared_status: item.status,
            sender_name: profile?.full_name || 'Chauffeur',
            sender_photo: profile?.profile_photo_url,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: driverData.show_phone_for_sharing ? profile?.phone : null,
          });
        }
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error('Error loading received courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const shortenAddress = (address: string) => {
    if (address.length > 35) {
      return address.substring(0, 32) + '...';
    }
    return address;
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return null;
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  const getStatusBadge = (courseStatus: string) => {
    switch (courseStatus) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-600 border-0">Terminée</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-600 border-0">En cours</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary/20 text-primary border-0">Confirmée</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-600 border-0">En attente</Badge>;
      default:
        return <Badge variant="outline">{courseStatus}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeCourses = courses.filter(c => c.shared_status === 'accepted' || c.shared_status === 'in_progress');
  const completedCourses = courses.filter(c => c.shared_status === 'completed');

  // Calculate totals
  const totalCommissionDue = completedCourses.reduce((acc, c) => acc + c.commission_amount, 0);
  const activeCommission = activeCourses.reduce((acc, c) => acc + c.commission_amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <CircleDot className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-amber-600 font-medium">En cours</p>
            <p className="text-lg font-bold">{activeCourses.length}</p>
            <p className="text-xs text-muted-foreground">{activeCommission.toFixed(2)} € comm.</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-red-600 font-medium">Commission due</p>
            <p className="text-lg font-bold text-red-600">{totalCommissionDue.toFixed(2)} €</p>
            <p className="text-xs text-muted-foreground">{completedCourses.length} courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <FileText className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Bon de commande partenaire</strong> : Lorsqu'un partenaire vous envoie une course, vous effectuez la prestation. 
          La facture reste chez le partenaire expéditeur. Vous lui devez la commission négociée.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="text-xs">
            En cours ({activeCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Terminées ({completedCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* Active courses */}
        <TabsContent value="active" className="mt-4 space-y-3">
          {activeCourses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Aucune course partenaire en cours.
              </AlertDescription>
            </Alert>
          ) : (
            activeCourses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course}
                receiverDriverId={driverId!}
                shortenAddress={shortenAddress}
                formatSharingNumber={formatSharingNumber}
                getStatusBadge={getStatusBadge}
                showCommissionDue={false}
                onAction={loadReceivedCourses}
                actionLoading={actionLoading}
                setActionLoading={setActionLoading}
              />
            ))
          )}
        </TabsContent>

        {/* Completed courses */}
        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedCourses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Aucune course partenaire terminée.
              </AlertDescription>
            </Alert>
          ) : (
            completedCourses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course}
                receiverDriverId={driverId!}
                shortenAddress={shortenAddress}
                formatSharingNumber={formatSharingNumber}
                getStatusBadge={getStatusBadge}
                showCommissionDue={true}
                onAction={loadReceivedCourses}
                actionLoading={actionLoading}
                setActionLoading={setActionLoading}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CourseCardProps {
  course: ReceivedCourse;
  receiverDriverId: string;
  shortenAddress: (address: string) => string;
  formatSharingNumber: (num: number | null) => string | null;
  getStatusBadge: (status: string) => JSX.Element;
  showCommissionDue: boolean;
  onAction: () => void;
  actionLoading: string | null;
  setActionLoading: (id: string | null) => void;
}

function CourseCard({ 
  course, 
  receiverDriverId,
  shortenAddress, 
  formatSharingNumber, 
  getStatusBadge, 
  showCommissionDue,
  onAction,
  actionLoading,
  setActionLoading
}: CourseCardProps) {
  
  const handleStartCourse = async () => {
    setActionLoading(course.id);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ status: 'in_progress' })
        .eq('id', course.id);
      
      if (error) throw error;
      toast.success('Course démarrée !');
      onAction();
    } catch (error) {
      console.error('Error starting course:', error);
      toast.error('Erreur lors du démarrage de la course');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteCourse = async () => {
    setActionLoading(course.id);
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({ status: 'completed' })
        .eq('id', course.id);
      
      if (error) throw error;
      toast.success('Course terminée ! La commission a été enregistrée.');
      onAction();
    } catch (error) {
      console.error('Error completing course:', error);
      toast.error('Erreur lors de la finalisation de la course');
    } finally {
      setActionLoading(null);
    }
  };

  const isLoading = actionLoading === course.id;
  const canStart = course.shared_status === 'accepted' && course.course_status !== 'in_progress';
  const canComplete = course.shared_status === 'in_progress' || (course.shared_status === 'accepted' && course.course_status === 'in_progress');

  // Vérifier si on a accès aux infos client (seulement pendant course active)
  const showClientInfo = ['pending', 'accepted', 'in_progress'].includes(course.shared_status);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header - Sender info */}
        <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={course.sender_photo || undefined} />
              <AvatarFallback className="text-sm">{course.sender_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{course.sender_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {course.sender_sharing_number && (
                  <span className="font-mono text-primary">{formatSharingNumber(course.sender_sharing_number)}</span>
                )}
                {course.sender_company && (
                  <span>• {course.sender_company}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(course.shared_status === 'in_progress' ? 'in_progress' : course.course_status)}
            {course.course_number && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">#{course.course_number}</p>
            )}
          </div>
        </div>

        {/* Course details */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <span>{shortenAddress(course.pickup_address)}</span>
            </div>
            <div className="flex items-center gap-2 ml-0.5">
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>{shortenAddress(course.destination_address)}</span>
            </div>
          </div>

          {course.distance_km && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Car className="h-3 w-3" />
              {course.distance_km.toFixed(0)} km
            </div>
          )}

          {/* Infos client temporaires */}
          <SharedCourseClientInfo 
            sharedCourseId={course.id} 
            driverId={receiverDriverId} 
            sharedStatus={course.shared_status}
          />
        </div>

        {/* Footer - Commission info */}
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Montant course</p>
              <p className="font-semibold">{course.course_amount.toFixed(2)} €</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Commission ({course.commission_percentage}%)</p>
              <p className={`font-semibold ${showCommissionDue ? 'text-red-600' : 'text-muted-foreground'}`}>
                -{course.commission_amount.toFixed(2)} €
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Vous gardez</p>
              <p className="font-bold text-green-600">
                {(course.course_amount - course.commission_amount).toFixed(2)} €
              </p>
            </div>
          </div>
          
          {/* Action buttons for active courses */}
          {!showCommissionDue && (canStart || canComplete) && (
            <div className="mt-3 flex gap-2">
              {canStart && (
                <Button
                  onClick={handleStartCourse}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Démarrer la course
                </Button>
              )}
              {canComplete && (
                <Button
                  onClick={handleCompleteCourse}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Terminer la course
                </Button>
              )}
            </div>
          )}
          
          {showCommissionDue && (
            <div className="mt-3 p-2 bg-red-500/10 rounded-md border border-red-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Commission à payer au partenaire</span>
                </div>
                <span className="font-bold text-red-600">{course.commission_amount.toFixed(2)} €</span>
              </div>
            </div>
          )}

          {/* Contact button */}
          {course.sender_phone && (
            <a 
              href={`tel:${course.sender_phone}`}
              className="mt-3 flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              <Phone className="h-4 w-4" />
              Contacter le partenaire
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
