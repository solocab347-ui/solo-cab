import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Car, 
  Calendar, 
  Euro, 
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CircleDot,
  ArrowRight,
  TrendingUp,
  Send,
  Receipt,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PushCourseToPartners } from '../PushCourseToPartners';

interface Props {
  driverId: string | null;
}

interface SentCourse {
  id: string;
  course_id: string;
  partnership_id: string;
  receiver_driver_id: string;
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
  // Receiver info
  receiver_name: string;
  receiver_photo: string | null;
  receiver_company: string | null;
  receiver_sharing_number: number | null;
  // Invoice info
  has_invoice: boolean;
  invoice_number: string | null;
  invoice_amount: number | null;
}

export function SentPartnerCourses({ driverId }: Props) {
  const [courses, setCourses] = useState<SentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [showPropose, setShowPropose] = useState(false);

  useEffect(() => {
    if (driverId) {
      loadSentCourses();
    }
  }, [driverId]);

  const loadSentCourses = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_courses')
        .select(`
          id,
          course_id,
          partnership_id,
          receiver_driver_id,
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
        .eq('sender_driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedCourses: SentCourse[] = [];
      
      for (const item of data || []) {
        // Get receiver driver info
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, sharing_number')
          .eq('id', item.receiver_driver_id)
          .single();

        // Check for invoice
        const { data: invoiceData } = await supabase
          .from('factures')
          .select('invoice_number, amount')
          .eq('course_id', item.course_id)
          .eq('driver_id', driverId)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url')
            .eq('id', driverData.user_id)
            .single();

          const course = item.courses as any;
          enrichedCourses.push({
            id: item.id,
            course_id: item.course_id,
            partnership_id: item.partnership_id,
            receiver_driver_id: item.receiver_driver_id,
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
            receiver_name: profile?.full_name || 'Chauffeur',
            receiver_photo: profile?.profile_photo_url,
            receiver_company: driverData.company_name,
            receiver_sharing_number: driverData.sharing_number,
            has_invoice: !!invoiceData,
            invoice_number: invoiceData?.invoice_number,
            invoice_amount: invoiceData?.amount,
          });
        }
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error('Error loading sent courses:', error);
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

  const getStatusBadge = (sharedStatus: string, courseStatus: string) => {
    // Priority: shared course status first
    switch (sharedStatus) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-600 border-0">En attente d'acceptation</Badge>;
      case 'declined':
        return <Badge className="bg-red-500/20 text-red-600 border-0">Refusée</Badge>;
    }
    // Then course status
    switch (courseStatus) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-600 border-0">Terminée</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-600 border-0">En cours</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary/20 text-primary border-0">Acceptée</Badge>;
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

  const pendingCourses = courses.filter(c => c.status === 'pending' || (c.status === 'accepted' && c.course_status !== 'completed'));
  const completedCourses = courses.filter(c => c.status === 'completed' || c.course_status === 'completed');
  const declinedCourses = courses.filter(c => c.status === 'declined');

  // Calculate totals
  const totalCommissionToReceive = completedCourses.reduce((acc, c) => acc + c.commission_amount, 0);
  const pendingCommission = pendingCourses.reduce((acc, c) => acc + c.commission_amount, 0);

  if (showPropose) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPropose(false)}
          className="mb-4"
        >
          ← Retour aux courses envoyées
        </Button>
        <PushCourseToPartners />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action button */}
      <Button
        onClick={() => setShowPropose(true)}
        className="w-full"
        size="lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        Proposer une course à un partenaire
      </Button>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <Send className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-amber-600 font-medium">En cours</p>
            <p className="text-lg font-bold">{pendingCourses.length}</p>
            <p className="text-xs text-muted-foreground">{pendingCommission.toFixed(2)} € comm.</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-green-600 font-medium">À recevoir</p>
            <p className="text-lg font-bold text-green-600">{totalCommissionToReceive.toFixed(2)} €</p>
            <p className="text-xs text-muted-foreground">{completedCourses.length} courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <Alert className="bg-primary/10 border-primary/30">
        <Receipt className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Vos courses déléguées</strong> : Vous conservez la relation client et la facture. 
          Votre partenaire vous reverse la commission négociée après chaque course.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="text-xs">
            En cours ({pendingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Terminées ({completedCourses.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending courses */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingCourses.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Aucune course envoyée en cours.
              </AlertDescription>
            </Alert>
          ) : (
            pendingCourses.map((course) => (
              <SentCourseCard 
                key={course.id} 
                course={course} 
                shortenAddress={shortenAddress}
                formatSharingNumber={formatSharingNumber}
                getStatusBadge={getStatusBadge}
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
                Aucune course déléguée terminée.
              </AlertDescription>
            </Alert>
          ) : (
            completedCourses.map((course) => (
              <SentCourseCard 
                key={course.id} 
                course={course} 
                shortenAddress={shortenAddress}
                formatSharingNumber={formatSharingNumber}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SentCourseCardProps {
  course: SentCourse;
  shortenAddress: (address: string) => string;
  formatSharingNumber: (num: number | null) => string | null;
  getStatusBadge: (sharedStatus: string, courseStatus: string) => JSX.Element;
}

function SentCourseCard({ course, shortenAddress, formatSharingNumber, getStatusBadge }: SentCourseCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header - Receiver info */}
        <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={course.receiver_photo || undefined} />
              <AvatarFallback className="text-sm">{course.receiver_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium flex items-center gap-1">
                <Send className="h-3 w-3 text-muted-foreground" />
                Envoyé à {course.receiver_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {course.receiver_sharing_number && (
                  <span className="font-mono text-primary">{formatSharingNumber(course.receiver_sharing_number)}</span>
                )}
                {course.receiver_company && (
                  <span>• {course.receiver_company}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(course.status, course.course_status)}
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
        </div>

        {/* Footer - Financial info */}
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Facture client</p>
              <p className="font-semibold">{course.invoice_amount?.toFixed(2) || course.course_amount.toFixed(2)} €</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Commission ({course.commission_percentage}%)</p>
              <p className="font-semibold text-green-600">+{course.commission_amount.toFixed(2)} €</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Vous recevez</p>
              <p className="font-bold text-primary">{course.commission_amount.toFixed(2)} €</p>
            </div>
          </div>
          
          {/* Invoice status */}
          {course.has_invoice && (
            <div className="p-2 bg-green-500/10 rounded-md border border-green-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Facture générée</span>
              </div>
              <span className="text-sm font-mono text-green-600">{course.invoice_number}</span>
            </div>
          )}

          {course.course_status === 'completed' && (
            <div className="mt-2 p-2 bg-green-500/10 rounded-md border border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Commission à recevoir</span>
                </div>
                <span className="font-bold text-green-600">{course.commission_amount.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
