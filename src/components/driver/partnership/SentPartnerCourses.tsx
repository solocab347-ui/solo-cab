import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Car, Calendar, Euro, FileText, AlertCircle, Loader2, 
  ArrowRight, TrendingUp, Send, Receipt, Plus, Globe, Heart, XCircle, Trash2,
  Sparkles, UserPlus, Crown, CreditCard, CheckCircle2, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { PushCourseToPartners } from '../sharing/PushCourseToPartners';
import { DirectCourseCreationForm } from '../courses/DirectCourseCreationForm';
import { ShareCourseWithPartnerDialog } from '../sharing/ShareCourseWithPartnerDialog';
import { SharedCoursePaymentLinkDialog } from '../sharing/SharedCoursePaymentLinkDialog';
import { SharedCourseProgressTimeline } from '../sharing/SharedCourseProgressTimeline';
import { useDriverPremium } from '@/hooks/useDriverPremium';
import { PremiumGate } from '@/components/premium/PremiumGate';

interface Props {
  driverId: string | null;
}

interface SentCourse {
  id: string;
  course_id: string;
  receiver_driver_id: string | null;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  solocab_fee: number;
  earnings_for_receiver: number;
  status: string;
  sharing_scope: string;
  created_at: string;
  completed_at: string | null;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  distance_km: number | null;
  course_status: string;
  course_number: string | null;
  payment_status: string | null;
  client_payment_url: string | null;
  receiver_name: string | null;
  receiver_photo: string | null;
  receiver_company: string | null;
  receiver_sharing_number: number | null;
  source: 'direct' | 'pool';
  pool_id?: string;
}

export function SentPartnerCourses({ driverId }: Props) {
  const [courses, setCourses] = useState<SentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [showPropose, setShowPropose] = useState(false);
  const [showCreateAndShare, setShowCreateAndShare] = useState(false);
  const [createdCourseToShare, setCreatedCourseToShare] = useState<any>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ id: string; amount: number; label: string } | null>(null);
  const { isPremium } = useDriverPremium();

  useEffect(() => {
    if (driverId) loadSentCourses();
  }, [driverId]);

  // Realtime: notifie l'émetteur quand une course partagée est terminée ou payée
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`sent-shared-${driverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shared_courses', filter: `sender_driver_id=eq.${driverId}` },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (newRow?.status === 'completed' && oldRow?.status !== 'completed') {
            toast.success(`✅ Course partagée terminée — vos frais de transaction ont été crédités.`);
          }
          if (String(newRow?.payment_status || '').startsWith('paid') && !String(oldRow?.payment_status || '').startsWith('paid')) {
            toast.success('💳 Paiement client confirmé par Stripe sur votre course partagée.');
          }
          loadSentCourses();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const loadSentCourses = async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      // Load direct shared courses
      const { data: sharedData } = await supabase
        .from('shared_courses')
        .select(`
          id, course_id, receiver_driver_id, course_amount,
          commission_percentage, commission_amount, solocab_fee_cents,
          earnings_for_receiver, payment_status, client_payment_url,
          status, sharing_scope, created_at, completed_at,
          courses!inner(pickup_address, destination_address, scheduled_date, passengers_count, distance_km, status, course_number)
        `)
        .eq('sender_driver_id', driverId)
        .order('created_at', { ascending: false });

      // Load pool courses
      const { data: poolData } = await supabase
        .from('partner_course_pool')
        .select(`
          id, course_id, sender_driver_id, course_amount,
          commission_percentage, estimated_commission, solocab_fee_cents,
          status, sharing_scope, created_at,
          courses!inner(pickup_address, destination_address, scheduled_date, passengers_count, distance_km, status, course_number)
        `)
        .eq('sender_driver_id', driverId)
        .order('created_at', { ascending: false });

      const allCourses: SentCourse[] = [];

      // Batch fetch all receiver driver info in parallel (eliminates N+1)
      const receiverIds = (sharedData || [])
        .map(item => item.receiver_driver_id)
        .filter((id): id is string => !!id);
      
      const uniqueReceiverIds = [...new Set(receiverIds)];
      
      // Single batch query for all receiver drivers + profiles
      const receiverMap = new Map<string, any>();
      if (uniqueReceiverIds.length > 0) {
        const { data: driversData } = await supabase
          .from('drivers')
          .select('id, user_id, company_name, sharing_number')
          .in('id', uniqueReceiverIds);
        
        if (driversData && driversData.length > 0) {
          const userIds = driversData.map(d => d.user_id).filter(Boolean);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, profile_photo_url')
            .in('id', userIds);
          
          const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
          
          for (const d of driversData) {
            const p = profileMap.get(d.user_id);
            receiverMap.set(d.id, {
              name: p?.full_name?.split(' ')[0] || 'Chauffeur',
              photo: p?.profile_photo_url,
              company: d.company_name,
              sharing_number: d.sharing_number,
            });
          }
        }
      }

      // Enrich direct shares using the batch-fetched map
      for (const item of sharedData || []) {
        const receiverInfo = item.receiver_driver_id ? receiverMap.get(item.receiver_driver_id) : null;
        const course = item.courses as any;
        const solocabFee = ((item as any).solocab_fee_cents || 25) / 100;
        const earnings = (item as any).earnings_for_receiver
          ?? Math.max(0, item.course_amount - item.commission_amount - solocabFee);
        allCourses.push({
          id: item.id, course_id: item.course_id, receiver_driver_id: item.receiver_driver_id,
          course_amount: item.course_amount, commission_percentage: item.commission_percentage,
          commission_amount: item.commission_amount, solocab_fee: solocabFee,
          earnings_for_receiver: earnings,
          payment_status: (item as any).payment_status ?? null,
          client_payment_url: (item as any).client_payment_url ?? null,
          status: item.status, sharing_scope: (item as any).sharing_scope || 'specific',
          created_at: item.created_at, completed_at: item.completed_at,
          pickup_address: course.pickup_address, destination_address: course.destination_address,
          scheduled_date: course.scheduled_date, passengers_count: course.passengers_count,
          distance_km: course.distance_km, course_status: course.status, course_number: course.course_number,
          receiver_name: receiverInfo?.name || null, receiver_photo: receiverInfo?.photo || null,
          receiver_company: receiverInfo?.company || null, receiver_sharing_number: receiverInfo?.sharing_number || null,
          source: 'direct',
        });
      }

      // Enrich pool courses
      for (const item of poolData || []) {
        const course = item.courses as any;
        const solocabFee = ((item as any).solocab_fee_cents || 25) / 100;
        const earnings = Math.max(0, item.course_amount - (item.estimated_commission || 0) - solocabFee);
        allCourses.push({
          id: item.id, course_id: item.course_id, receiver_driver_id: null,
          course_amount: item.course_amount, commission_percentage: item.commission_percentage,
          commission_amount: item.estimated_commission, solocab_fee: solocabFee,
          earnings_for_receiver: earnings,
          payment_status: null,
          client_payment_url: null,
          status: item.status, sharing_scope: (item as any).sharing_scope || 'network',
          created_at: item.created_at, completed_at: null,
          pickup_address: course.pickup_address, destination_address: course.destination_address,
          scheduled_date: course.scheduled_date, passengers_count: course.passengers_count,
          distance_km: course.distance_km, course_status: course.status, course_number: course.course_number,
          receiver_name: null, receiver_photo: null, receiver_company: null, receiver_sharing_number: null,
          source: 'pool', pool_id: item.id,
        });
      }

      // Deduplicate by course_id - keep direct shares over pool entries
      const seen = new Map<string, SentCourse>();
      for (const c of allCourses) {
        const existing = seen.get(c.course_id);
        if (!existing || (c.source === 'direct' && existing.source === 'pool')) {
          seen.set(c.course_id, c);
        }
      }

      setCourses(Array.from(seen.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error loading sent courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelPoolCourse = async (courseId: string, poolId?: string) => {
    setCancellingId(courseId);
    try {
      if (poolId) {
        await supabase.from('partner_course_pool').update({ status: 'cancelled' }).eq('id', poolId);
      }
      await supabase.from('shared_courses').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('course_id', courseId).eq('sender_driver_id', driverId!).eq('status', 'pending');
      toast.success('Partage annulé');
      loadSentCourses();
    } catch { toast.error('Erreur'); } finally { setCancellingId(null); }
  };

  const shortenAddress = (a: string) => a.length > 35 ? a.substring(0, 32) + '...' : a;

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'network': return <Globe className="h-3 w-3 text-blue-500" />;
      case 'favorites': return <Heart className="h-3 w-3 text-pink-500" />;
      default: return <Send className="h-3 w-3 text-orange-500" />;
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'network': return 'Réseau ouvert';
      case 'favorites': return 'Favoris';
      default: return 'Direct';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': case 'available': return <Badge className="bg-amber-500/20 text-amber-600 border-0">En attente</Badge>;
      case 'accepted': case 'claimed': return <Badge className="bg-blue-500/20 text-blue-600 border-0">Acceptée</Badge>;
      case 'completed': return <Badge className="bg-green-500/20 text-green-600 border-0">Terminée</Badge>;
      case 'declined': return <Badge className="bg-red-500/20 text-red-600 border-0">Refusée</Badge>;
      case 'cancelled': return <Badge className="bg-muted text-muted-foreground border-0">Annulée</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (showPropose) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setShowPropose(false)}>← Retour</Button>
        <PushCourseToPartners />
      </div>
    );
  }

  if (showCreateAndShare) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCreateAndShare(false);
            setCreatedCourseToShare(null);
          }}
        >← Retour</Button>

        <Alert className="bg-primary/10 border-primary/30">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Créer + partager</strong> : créez une course pour un client privé non inscrit puis partagez-la immédiatement avec un partenaire du réseau.
          </AlertDescription>
        </Alert>

        <DirectCourseCreationForm
          title="Nouvelle course à partager"
          subtitle="Pour un client privé non inscrit"
          skipPostCreationScreen
          onCancel={() => {
            setShowCreateAndShare(false);
            setCreatedCourseToShare(null);
          }}
          onCreated={async (course) => {
            // Open share dialog with the freshly created course
            setCreatedCourseToShare(course);
            setShareDialogOpen(true);
            return true;
          }}
        />

        {createdCourseToShare && driverId && (
          <ShareCourseWithPartnerDialog
            open={shareDialogOpen}
            onOpenChange={(open) => {
              setShareDialogOpen(open);
              if (!open) {
                // After share dialog closes, return to list and refresh
                setShowCreateAndShare(false);
                setCreatedCourseToShare(null);
                loadSentCourses();
              }
            }}
            course={createdCourseToShare}
            driverId={driverId}
            onSuccess={() => {
              setShareDialogOpen(false);
              setShowCreateAndShare(false);
              setCreatedCourseToShare(null);
              loadSentCourses();
            }}
          />
        )}
      </div>
    );
  }

  const activeCourses = courses.filter(c => !['cancelled', 'declined', 'completed'].includes(c.status));
  const completedCourses = courses.filter(c => c.status === 'completed');
  const totalCommission = completedCourses.reduce((acc, c) => acc + c.commission_amount, 0);

  return (
    <div className="space-y-4">
      {/* Premium: Create + share — for private off-network clients */}
      <Button
        onClick={() => {
          if (!isPremium) {
            toast.error("Cette fonctionnalité est réservée aux chauffeurs Premium.");
            return;
          }
          setShowCreateAndShare(true);
        }}
        variant="outline"
        className="w-full border-2 border-primary/40 bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20"
        size="lg"
      >
        <Crown className="h-4 w-4 mr-2 text-primary" />
        <UserPlus className="h-4 w-4 mr-2 text-primary" />
        Créer + partager une course (client privé)
        {!isPremium && <Badge variant="secondary" className="ml-2 text-[10px]">Premium</Badge>}
      </Button>

      <Button onClick={() => setShowPropose(true)} className="w-full" size="lg">
        <Plus className="h-5 w-5 mr-2" />Partager une course existante
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 text-center">
            <Send className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-amber-600 font-medium">En cours</p>
            <p className="text-lg font-bold">{activeCourses.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-green-600 font-medium">Frais de transaction gagnés</p>
            <p className="text-lg font-bold text-green-600">{totalCommission.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="bg-primary/10 border-primary/30">
        <Receipt className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Vos courses partagées</strong> : Vous conservez la relation client. Votre commission ({activeCourses[0]?.commission_percentage || '20-25'}%) est versée automatiquement via Stripe Connect.
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-500/10 border-amber-500/30">
        <Info className="h-4 w-4 text-amber-700" />
        <AlertDescription className="text-xs text-amber-900 leading-relaxed">
          <strong>Responsabilité paiement (course hors SoloCab) :</strong> si vous avez créé la course pour
          votre <strong>client privé</strong>, c'est à vous de générer le lien Stripe et de vous assurer
          que le client paie (lien copiable, QR code, partage WhatsApp/SMS). Vous pouvez aussi
          déléguer l'encaissement au chauffeur receveur, mais il est <strong>recommandé</strong> de gérer
          vous-même votre client. Aucune course ne peut être terminée sans confirmation de paiement
          Stripe.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="text-xs">En cours ({activeCourses.length})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Terminées ({completedCourses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {activeCourses.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">Aucune course partagée en cours.</AlertDescription></Alert>
          ) : activeCourses.map(course => (
            <Card key={course.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {course.receiver_name ? (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={course.receiver_photo || undefined} />
                          <AvatarFallback className="text-xs">{course.receiver_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">→ {course.receiver_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getScopeIcon(course.sharing_scope)}
                            <span>{getScopeLabel(course.sharing_scope)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getScopeIcon(course.sharing_scope)}
                        <div>
                          <p className="text-sm font-medium">{getScopeLabel(course.sharing_scope)}</p>
                          <p className="text-xs text-muted-foreground">En attente d'un chauffeur</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {getStatusBadge(course.status)}
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(course.scheduled_date), "EEE d MMM 'à' HH:mm", { locale: fr })}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="truncate">{shortenAddress(course.pickup_address)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  </div>
                </div>

                <div className="p-3 border-t bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Montant TTC</p>
                      <p className="font-semibold">{course.course_amount.toFixed(2)} €</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Vos frais de transaction</p>
                      <p className="font-semibold text-green-600">+{course.commission_amount.toFixed(2)} €</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Frais SoloCab</p>
                      <p className="text-xs text-muted-foreground">{course.solocab_fee.toFixed(2)} €</p>
                    </div>
                  </div>

                  {/* Statut paiement Stripe + bouton lien */}
                  {course.receiver_driver_id && (
                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                      {String(course.payment_status || '').startsWith('paid') ? (
                        <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Stripe confirmé
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Paiement client en attente
                        </Badge>
                      )}
                      {!String(course.payment_status || '').startsWith('paid') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/40 text-primary"
                          onClick={() => setPaymentDialog({
                            id: course.id,
                            amount: course.course_amount,
                            label: course.course_number ? `#${course.course_number}` : '',
                          })}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Lien / QR
                        </Button>
                      )}
                    </div>
                  )}

                  {(course.status === 'pending' || course.status === 'available') && (
                    <Button 
                      variant="outline" size="sm" className="w-full mt-2 text-destructive" 
                      onClick={() => cancelPoolCourse(course.course_id, course.pool_id)}
                      disabled={cancellingId === course.course_id}
                    >
                      {cancellingId === course.course_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" />Annuler le partage</>}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedCourses.length === 0 ? (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">Aucune course terminée.</AlertDescription></Alert>
          ) : completedCourses.map(course => (
            <Card key={course.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={course.receiver_photo || undefined} />
                      <AvatarFallback className="text-xs">{(course.receiver_name || '?').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{course.receiver_name || 'Chauffeur'}</p>
                  </div>
                  {getStatusBadge(course.status)}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(course.scheduled_date), "d MMM yyyy", { locale: fr })}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {course.pickup_address} → {course.destination_address}
                  </div>
                </div>
                {/* Récap financier complet bilatéral */}
                <div className="p-3 border-t bg-green-500/5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant TTC client</span>
                    <span className="font-medium">{course.course_amount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vos frais de transaction ({course.commission_percentage}%)</span>
                    <span className="font-semibold text-green-600">+{course.commission_amount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reversé au receveur</span>
                    <span className="text-foreground">{course.earnings_for_receiver.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais SoloCab</span>
                    <span className="text-muted-foreground">-{course.solocab_fee.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t font-semibold">
                    <span>Crédité sur votre portefeuille</span>
                    <span className="text-green-600">+{course.commission_amount.toFixed(2)} €</span>
                  </div>
                  {String(course.payment_status || '').startsWith('paid') && (
                    <div className="flex items-center gap-1 pt-1 text-[10px] text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Paiement Stripe confirmé
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialog lien de paiement Stripe (côté émetteur) */}
      {paymentDialog && (
        <SharedCoursePaymentLinkDialog
          open={!!paymentDialog}
          onOpenChange={(open) => { if (!open) setPaymentDialog(null); }}
          sharedCourseId={paymentDialog.id}
          amountTtc={paymentDialog.amount}
          courseLabel={paymentDialog.label}
          onPaid={() => loadSentCourses()}
        />
      )}
    </div>
  );
}
