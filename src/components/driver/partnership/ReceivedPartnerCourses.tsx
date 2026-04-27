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
  Car, Calendar, Euro, FileText, AlertCircle, Loader2, Hash,
  CheckCircle2, CircleDot, ArrowRight, TrendingDown, Play, CheckCheck, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SharedCourseClientInfo } from './SharedCourseClientInfo';
import { SharedCoursePaymentLinkDialog } from '../sharing/SharedCoursePaymentLinkDialog';
import { SharedCourseProgressTimeline } from '../sharing/SharedCourseProgressTimeline';

interface Props {
  driverId: string | null;
}

interface ReceivedCourse {
  id: string;
  course_id: string;
  sender_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  solocab_fee: number;
  earnings: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  course_status: string;
  course_number: string | null;
  shared_status: string;
  partner_reference_number: string | null;
  payment_status: string | null;
  client_payment_url: string | null;
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
    if (driverId) loadReceivedCourses();
  }, [driverId]);

  const loadReceivedCourses = async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_courses')
        .select(`
          id, course_id, sender_driver_id, course_amount,
          commission_percentage, commission_amount, solocab_fee_cents,
          earnings_for_receiver, status, created_at, completed_at,
          partner_reference_number, payment_status, client_payment_url,
          courses!inner(
            pickup_address, destination_address, scheduled_date,
            passengers_count, distance_km, status, course_number
          )
        `)
        .eq('receiver_driver_id', driverId)
        .in('status', ['accepted', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched: ReceivedCourse[] = [];
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
          const solocabFee = ((item as any).solocab_fee_cents || 25) / 100;
          const earnings = (item as any).earnings_for_receiver || (item.course_amount - item.commission_amount - solocabFee);

          enriched.push({
            id: item.id,
            course_id: item.course_id,
            sender_driver_id: item.sender_driver_id,
            course_amount: item.course_amount,
            commission_percentage: item.commission_percentage,
            commission_amount: item.commission_amount,
            solocab_fee: solocabFee,
            earnings,
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
            partner_reference_number: (item as any).partner_reference_number,
            payment_status: (item as any).payment_status ?? null,
            client_payment_url: (item as any).client_payment_url ?? null,
            sender_name: profile?.full_name || 'Partenaire',
            sender_photo: driverData.card_photo_url || profile?.profile_photo_url,
            sender_company: driverData.company_name,
            sender_sharing_number: driverData.sharing_number,
            sender_phone: driverData.show_phone_for_sharing ? profile?.phone : null,
          });
        }
      }
      setCourses(enriched);
    } catch (error) {
      console.error('Error loading received courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const shortenAddress = (a: string) => a.length > 35 ? a.substring(0, 32) + '...' : a;
  const formatSharingNumber = (n: number | null) => n ? `SOLO-${String(n).padStart(6, '0')}` : null;

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-600 border-0">Terminée</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/20 text-blue-600 border-0">En cours</Badge>;
      case 'confirmed': return <Badge className="bg-primary/20 text-primary border-0">Confirmée</Badge>;
      case 'pending': return <Badge className="bg-amber-500/20 text-amber-600 border-0">En attente</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const activeCourses = courses.filter(c => c.shared_status === 'accepted' || c.shared_status === 'in_progress');
  const completedCourses = courses.filter(c => c.shared_status === 'completed');
  const totalEarnings = completedCourses.reduce((acc, c) => acc + c.earnings, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <CircleDot className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-amber-600 font-medium">En cours</p>
            <p className="text-lg font-bold">{activeCourses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 text-center">
            <Euro className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-green-600 font-medium">Revenus nets</p>
            <p className="text-lg font-bold text-green-600">{totalEarnings.toFixed(2)} €</p>
            <p className="text-xs text-muted-foreground">{completedCourses.length} courses</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="bg-blue-500/10 border-blue-500/30">
        <FileText className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Courses reçues</strong> : La commission ({activeCourses[0]?.commission_percentage || '20-25'}%) et les frais (Stripe + SoloCab) sont déduits automatiquement.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="text-xs">En cours ({activeCourses.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Terminées ({completedCourses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeCourses.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">Aucune course en cours.</AlertDescription></Alert>
          ) : activeCourses.map(course => (
            <ReceivedCourseCard 
              key={course.id} course={course} driverId={driverId!}
              shortenAddress={shortenAddress} formatSharingNumber={formatSharingNumber}
              getStatusBadge={getStatusBadge} onAction={loadReceivedCourses}
              actionLoading={actionLoading} setActionLoading={setActionLoading}
            />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedCourses.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">Aucune course terminée.</AlertDescription></Alert>
          ) : completedCourses.map(course => (
            <ReceivedCourseCard 
              key={course.id} course={course} driverId={driverId!}
              shortenAddress={shortenAddress} formatSharingNumber={formatSharingNumber}
              getStatusBadge={getStatusBadge} onAction={loadReceivedCourses}
              actionLoading={actionLoading} setActionLoading={setActionLoading}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReceivedCourseCard({ course, driverId, shortenAddress, formatSharingNumber, getStatusBadge, onAction, actionLoading, setActionLoading }: {
  course: ReceivedCourse; driverId: string;
  shortenAddress: (a: string) => string; formatSharingNumber: (n: number | null) => string | null;
  getStatusBadge: (s: string) => JSX.Element; onAction: () => void;
  actionLoading: string | null; setActionLoading: (id: string | null) => void;
}) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const handleStartCourse = async () => {
    setActionLoading(course.id);
    try {
      const { error } = await supabase.from('shared_courses').update({ status: 'in_progress' }).eq('id', course.id);
      if (error) throw error;
      toast.success('Course démarrée !');
      onAction();
    } catch { toast.error('Erreur'); } finally { setActionLoading(null); }
  };

  const isPaid = String(course.payment_status || '').startsWith('paid');

  const handleCompleteCourse = async () => {
    // GARDE-FOU : aucune course partagée ne peut être terminée sans confirmation Stripe
    if (!isPaid) {
      toast.error('Paiement Stripe non confirmé — générez ou vérifiez le lien client avant de terminer');
      setPaymentDialogOpen(true);
      return;
    }
    setActionLoading(course.id);
    try {
      const { error } = await supabase.from('shared_courses').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', course.id);
      if (error) throw error;
      toast.success('Course terminée — paiement Stripe déjà encaissé.');
      onAction();
    } catch { toast.error('Erreur'); } finally { setActionLoading(null); }
  };

  const isLoading = actionLoading === course.id;
  const canStart = course.shared_status === 'accepted';
  const canComplete = course.shared_status === 'in_progress';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
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
                {course.sender_company && <span>• {course.sender_company}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(course.shared_status === 'in_progress' ? 'in_progress' : course.course_status)}
            {course.partner_reference_number && (
              <p className="text-xs font-mono font-semibold text-primary mt-1">#{course.partner_reference_number}</p>
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
            <div className="flex items-center gap-2 ml-0.5"><ArrowRight className="h-3 w-3 text-muted-foreground" /></div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <span>{shortenAddress(course.destination_address)}</span>
            </div>
          </div>
          {course.distance_km && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Car className="h-3 w-3" />{course.distance_km.toFixed(0)} km
            </div>
          )}
          <SharedCourseClientInfo sharedCourseId={course.id} driverId={driverId} sharedStatus={course.shared_status} />

          {/* Timeline de progression bilatérale (sync temps réel) */}
          <div className="pt-2">
            <SharedCourseProgressTimeline
              sharedCourseId={course.id}
              perspective="receiver"
              initial={{
                status: course.shared_status,
                payment_status: course.payment_status,
                completed_at: course.completed_at,
              }}
            />
          </div>
        </div>

        {/* Financial breakdown */}
        <div className="p-3 border-t bg-muted/20">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant course</span>
              <span className="font-medium">{course.course_amount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission expéditeur ({course.commission_percentage}%)</span>
              <span className="text-red-500">-{course.commission_amount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de transaction</span>
              <span className="text-red-500">-{course.solocab_fee.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between pt-1 border-t font-semibold text-sm">
              <span>Vous recevez</span>
              <span className="text-green-600">{course.earnings.toFixed(2)} €</span>
            </div>
          </div>

          {(canStart || canComplete) && (
            <div className="mt-3 space-y-2">
              {!isPaid && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-primary/40 text-primary"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Lien / QR de paiement client
                </Button>
              )}
              <div className="flex gap-2">
                {canStart && (
                  <Button size="sm" className="flex-1" onClick={handleStartCourse} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1" />Démarrer</>}
                  </Button>
                )}
                {canComplete && (
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    onClick={handleCompleteCourse}
                    disabled={isLoading || !isPaid}
                    title={!isPaid ? 'Stripe doit confirmer le paiement avant de terminer' : undefined}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCheck className="h-4 w-4 mr-1" />Terminer</>}
                  </Button>
                )}
              </div>
              {!isPaid && canComplete && (
                <p className="text-[10px] text-amber-700 text-center">
                  ⚠ Bouton "Terminer" verrouillé tant que Stripe n'a pas confirmé le paiement TTC.
                </p>
              )}
            </div>
          )}
        </div>

        <SharedCoursePaymentLinkDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          sharedCourseId={course.id}
          amountTtc={course.course_amount}
          courseLabel={`${shortenAddress(course.pickup_address)} → ${shortenAddress(course.destination_address)}`}
          onPaid={onAction}
        />
      </CardContent>
    </Card>
  );
}
