import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  UserPlus, 
  Handshake, 
  Send, 
  ArrowRightLeft, 
  Check, 
  X, 
  Clock,
  TrendingUp,
  TrendingDown,
  Copy,
  Car,
  AlertTriangle,
  Shield,
  Calendar,
  MessageSquare,
  Flag,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Partner {
  id: string;
  driver_a_id: string;
  driver_b_id: string;
  commission_percentage: number;
  status: string;
  proposed_by: string;
  accepted_at: string | null;
  partner_name: string;
  partner_photo: string | null;
  partner_code: string;
  partner_rating: number;
  partner_rides: number;
  payment_schedule: string;
  payment_day: number;
  custom_payment_days: number;
  sharing_blocked: boolean;
}

interface SharedCourse {
  id: string;
  course_id: string;
  sender_driver_id: string;
  receiver_driver_id: string;
  course_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  client_notified: boolean;
  course: {
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
  };
  partner_name: string;
}

interface DriverSearchResult {
  id: string;
  driver_code: string;
  full_name: string;
  company_name: string | null;
  profile_photo_url: string | null;
  rating: number;
  total_rides: number;
}

interface AvailableCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  client_name: string;
  client_id: string;
}

const PAYMENT_SCHEDULES = [
  { value: 'per_course', label: 'À chaque course', description: 'Paiement après chaque course terminée' },
  { value: 'weekly', label: 'Hebdomadaire', description: 'Paiement chaque semaine' },
  { value: 'monthly', label: 'Mensuel', description: 'Paiement chaque mois' },
  { value: 'custom', label: 'Personnalisé', description: 'Définir un nombre de jours' },
];

export function DriverCourseSharing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<{ id: string; driver_code: string; sharing_number: number | null } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [sharedCourses, setSharedCourses] = useState<SharedCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [canShare, setCanShare] = useState(true);
  
  // Search state
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<DriverSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Partnership proposal state
  const [proposedCommission, setProposedCommission] = useState(10);
  const [proposedPaymentSchedule, setProposedPaymentSchedule] = useState('per_course');
  const [proposedPaymentDay, setProposedPaymentDay] = useState(1);
  const [proposedCustomDays, setProposedCustomDays] = useState(30);
  
  // Send course state
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientMessage, setClientMessage] = useState('');
  
  // Report state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPartner, setReportPartner] = useState<Partner | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportAmount, setReportAmount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadDriverInfo();
    }
  }, [user?.id]);

  useEffect(() => {
    if (driverInfo?.id) {
      loadData();
      checkSharingAccess();
    }
  }, [driverInfo?.id]);

  const loadDriverInfo = async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, driver_code, sharing_number')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error loading driver info:', error);
      return;
    }
    setDriverInfo(data);
  };

  // Format sharing number as SOL-0001
  const formattedSharingNumber = driverInfo?.sharing_number 
    ? `SOL-${String(driverInfo.sharing_number).padStart(4, '0')}` 
    : null;

  const checkSharingAccess = async () => {
    if (!driverInfo?.id) return;
    
    const { data } = await supabase.rpc('can_share_courses', { _driver_id: driverInfo.id });
    setCanShare(data ?? true);
  };

  const loadData = async () => {
    if (!driverInfo?.id) return;
    setLoading(true);

    try {
      // Load partnerships
      const { data: partnershipsData, error: partnershipsError } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`);

      if (partnershipsError) throw partnershipsError;

      // Enrich with partner info
      const enrichedPartners: Partner[] = [];
      for (const p of partnershipsData || []) {
        const partnerId = p.driver_a_id === driverInfo.id ? p.driver_b_id : p.driver_a_id;
        const { data: partnerData } = await supabase
          .from('drivers')
          .select('driver_code, rating, total_rides, user_id')
          .eq('id', partnerId)
          .single();

        if (partnerData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url')
            .eq('id', partnerData.user_id)
            .single();

          enrichedPartners.push({
            ...p,
            partner_name: profileData?.full_name || 'Chauffeur',
            partner_photo: profileData?.profile_photo_url,
            partner_code: partnerData.driver_code,
            partner_rating: partnerData.rating || 0,
            partner_rides: partnerData.total_rides || 0,
          });
        }
      }
      setPartners(enrichedPartners);

      // Load shared courses
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_courses')
        .select(`
          *,
          course:courses(pickup_address, destination_address, scheduled_date)
        `)
        .or(`sender_driver_id.eq.${driverInfo.id},receiver_driver_id.eq.${driverInfo.id}`)
        .order('created_at', { ascending: false });

      if (sharedError) throw sharedError;

      // Enrich with partner names
      const enrichedCourses: SharedCourse[] = [];
      for (const sc of sharedData || []) {
        const partnerId = sc.sender_driver_id === driverInfo.id ? sc.receiver_driver_id : sc.sender_driver_id;
        const { data: partnerDriver } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', partnerId)
          .single();

        if (partnerDriver) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', partnerDriver.user_id)
            .single();

          enrichedCourses.push({
            ...sc,
            partner_name: profileData?.full_name || 'Chauffeur',
          });
        }
      }
      setSharedCourses(enrichedCourses);

      // Load available courses for sharing
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          status,
          client_id,
          client:clients(user_id)
        `)
        .eq('driver_id', driverInfo.id)
        .in('status', ['pending', 'accepted'])
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true });

      if (coursesData) {
        const enrichedCourses: AvailableCourse[] = [];
        for (const c of coursesData) {
          const clientUserId = (c.client as any)?.user_id;
          if (clientUserId) {
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', clientUserId)
              .single();
            enrichedCourses.push({
              ...c,
              client_name: clientProfile?.full_name || 'Client',
            });
          }
        }
        setAvailableCourses(enrichedCourses);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const searchDriver = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    setSearchResult(null);

    try {
      // Essayer d'abord avec le numéro de partage SOL-XXXX
      const { data: sharingData, error: sharingError } = await supabase.rpc('find_driver_by_sharing_number', {
        _number: searchCode.trim().toUpperCase()
      });

      if (!sharingError && sharingData && sharingData.length > 0) {
        const result = sharingData[0];
        if (result.id === driverInfo?.id) {
          toast.error('Vous ne pouvez pas vous ajouter vous-même');
          return;
        }
        setSearchResult({
          id: result.id,
          driver_code: result.formatted_sharing_number,
          full_name: result.full_name,
          company_name: result.company_name,
          profile_photo_url: result.profile_photo_url,
          rating: result.rating || 0,
          total_rides: result.total_rides || 0,
        });
        return;
      }

      // Fallback: ancien système avec driver_code
      const { data, error } = await supabase.rpc('find_driver_by_code', {
        _code: searchCode.trim().toUpperCase()
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.id === driverInfo?.id) {
          toast.error('Vous ne pouvez pas vous ajouter vous-même');
          return;
        }
        setSearchResult(result);
      } else {
        toast.error('Aucun chauffeur trouvé avec ce numéro');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const proposePartnership = async () => {
    if (!searchResult || !driverInfo?.id) return;

    try {
      const { error } = await supabase.from('driver_partnerships').insert({
        driver_a_id: driverInfo.id,
        driver_b_id: searchResult.id,
        commission_percentage: proposedCommission,
        proposed_by: driverInfo.id,
        status: 'pending',
        payment_schedule: proposedPaymentSchedule,
        payment_day: proposedPaymentDay,
        custom_payment_days: proposedCustomDays,
      });

      if (error) throw error;

      toast.success('Demande de partenariat envoyée !');
      setSearchResult(null);
      setSearchCode('');
      loadData();
    } catch (error: any) {
      console.error('Partnership error:', error);
      if (error.code === '23505') {
        toast.error('Un partenariat existe déjà avec ce chauffeur');
      } else {
        toast.error('Erreur lors de la création du partenariat');
      }
    }
  };

  const respondToPartnership = async (partnershipId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('driver_partnerships')
        .update({
          status: accept ? 'active' : 'terminated',
          accepted_at: accept ? new Date().toISOString() : null,
        })
        .eq('id', partnershipId);

      if (error) throw error;

      toast.success(accept ? 'Partenariat accepté !' : 'Partenariat refusé');
      loadData();
    } catch (error: any) {
      console.error('Response error:', error);
      toast.error('Erreur lors de la réponse');
    }
  };

  const sendCourse = async () => {
    if (!selectedPartner || !selectedCourse || !driverInfo?.id) return;

    const partnership = partners.find(p => 
      (p.driver_a_id === selectedPartner || p.driver_b_id === selectedPartner) &&
      p.status === 'active'
    );

    if (!partnership) {
      toast.error('Partenariat invalide');
      return;
    }

    if (partnership.sharing_blocked) {
      toast.error('Le partage est bloqué pour ce partenariat');
      return;
    }

    const course = availableCourses.find(c => c.id === selectedCourse);
    if (!course) {
      toast.error('Course introuvable');
      return;
    }

    // Get course amount from devis
    const { data: devisData } = await supabase
      .from('devis')
      .select('amount')
      .eq('course_id', selectedCourse)
      .eq('status', 'pending')
      .maybeSingle();

    const courseAmount = devisData?.amount || 0;
    const commissionAmount = (courseAmount * partnership.commission_percentage) / 100;

    // Get partner name for client message
    const partner = partners.find(p => 
      p.driver_a_id === selectedPartner || p.driver_b_id === selectedPartner
    );

    const finalClientMessage = notifyClient && clientMessage 
      ? clientMessage 
      : `Je ne peux pas effectuer cette course mais je vous confie à mon partenaire de confiance ${partner?.partner_name || 'un chauffeur'} qui prendra soin de vous. Vous restez mon client et pourrez me recontacter pour vos prochaines courses.`;

    try {
      const { error } = await supabase.from('shared_courses').insert({
        course_id: selectedCourse,
        partnership_id: partnership.id,
        sender_driver_id: driverInfo.id,
        receiver_driver_id: selectedPartner,
        course_amount: courseAmount,
        commission_percentage: partnership.commission_percentage,
        commission_amount: commissionAmount,
        status: 'pending',
        client_notified: notifyClient,
        client_notified_at: notifyClient ? new Date().toISOString() : null,
        client_message: notifyClient ? finalClientMessage : null,
      });

      if (error) throw error;

      // If client notification is enabled, create a notification for the client
      if (notifyClient && course.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('user_id')
          .eq('id', course.client_id)
          .single();

        if (clientData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: clientData.user_id,
            title: '🚗 Changement de chauffeur pour votre course',
            message: finalClientMessage,
            type: 'info',
            link: '/client-dashboard',
          });
        }
      }

      toast.success('Course envoyée au partenaire !');
      setSendDialogOpen(false);
      setSelectedCourse('');
      setSelectedPartner('');
      setClientMessage('');
      loadData();
    } catch (error: any) {
      console.error('Send course error:', error);
      toast.error('Erreur lors de l\'envoi de la course');
    }
  };

  const respondToSharedCourse = async (sharedCourseId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_courses')
        .update({
          status: accept ? 'accepted' : 'rejected',
        })
        .eq('id', sharedCourseId);

      if (error) throw error;

      if (accept) {
        // Update the original course to assign to receiver (but keep original driver relationship)
        const sharedCourse = sharedCourses.find(sc => sc.id === sharedCourseId);
        if (sharedCourse) {
          // Add receiver to driver_ids but keep original driver_id (client protection)
          await supabase
            .from('courses')
            .update({ 
              driver_ids: [sharedCourse.receiver_driver_id],
              // Note: We don't change driver_id to protect client ownership
            })
            .eq('id', sharedCourse.course_id);
        }
      }

      toast.success(accept ? 'Course acceptée !' : 'Course refusée');
      loadData();
    } catch (error: any) {
      console.error('Response error:', error);
      toast.error('Erreur lors de la réponse');
    }
  };

  const reportPartnerNonPayment = async () => {
    if (!reportPartner || !reportReason || !driverInfo?.id) return;

    const partnerId = reportPartner.driver_a_id === driverInfo.id 
      ? reportPartner.driver_b_id 
      : reportPartner.driver_a_id;

    try {
      const { error } = await supabase.from('partnership_disputes').insert({
        partnership_id: reportPartner.id,
        reporter_driver_id: driverInfo.id,
        reported_driver_id: partnerId,
        reason: reportReason,
        amount_owed: reportAmount,
        description: reportDescription,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Signalement envoyé à l\'administration');
      setReportDialogOpen(false);
      setReportPartner(null);
      setReportReason('');
      setReportDescription('');
      setReportAmount(0);
    } catch (error: any) {
      console.error('Report error:', error);
      toast.error('Erreur lors du signalement');
    }
  };

  const copySharingNumber = () => {
    if (formattedSharingNumber) {
      navigator.clipboard.writeText(formattedSharingNumber);
      toast.success('Numéro copié !');
    }
  };

  const getPaymentScheduleLabel = (schedule: string, customDays?: number) => {
    switch (schedule) {
      case 'per_course': return 'À chaque course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      case 'custom': return `Tous les ${customDays || 30} jours`;
      default: return schedule;
    }
  };

  const activePartners = partners.filter(p => p.status === 'active');
  const pendingPartners = partners.filter(p => p.status === 'pending' && p.proposed_by !== driverInfo?.id);
  const sentRequests = partners.filter(p => p.status === 'pending' && p.proposed_by === driverInfo?.id);

  const receivedCourses = sharedCourses.filter(sc => sc.receiver_driver_id === driverInfo?.id);
  const sentCourses = sharedCourses.filter(sc => sc.sender_driver_id === driverInfo?.id);

  // Calculate balances
  const calculateBalance = (partnerId: string) => {
    const partnerCourses = sharedCourses.filter(sc => 
      (sc.sender_driver_id === partnerId || sc.receiver_driver_id === partnerId) &&
      sc.status === 'completed'
    );

    let iOwe = 0;
    let theyOwe = 0;

    partnerCourses.forEach(sc => {
      if (sc.sender_driver_id === driverInfo?.id) {
        theyOwe += sc.commission_amount;
      } else {
        iOwe += sc.commission_amount;
      }
    });

    return { iOwe, theyOwe, net: theyOwe - iOwe };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Engagement de confiance</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Le partage de courses repose sur la confiance mutuelle. Respectez vos engagements de paiement envers vos partenaires. 
          <strong> Les bons comptes font les bons amis.</strong> Tout manquement aux paiements peut entraîner la suspension du partage.
        </AlertDescription>
      </Alert>

      {/* Blocked Warning */}
      {!canShare && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Partage suspendu</AlertTitle>
          <AlertDescription>
            Votre accès au partage de courses a été suspendu suite à un signalement. Contactez l'administration pour plus d'informations.
          </AlertDescription>
        </Alert>
      )}

      {/* Sharing Number Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Votre Numéro de Partage
          </CardTitle>
          <CardDescription>
            Partagez ce numéro avec d'autres chauffeurs pour créer un partenariat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-background rounded-lg px-6 py-3 border-2 border-primary font-mono text-2xl font-bold tracking-wider">
              {formattedSharingNumber || 'N/A'}
            </div>
            <Button variant="outline" size="icon" onClick={copySharingNumber}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/driver/partner-search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Rechercher des partenaires disponibles
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="partners" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Partenaires
            {pendingPartners.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingPartners.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Courses
            {receivedCourses.filter(c => c.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {receivedCourses.filter(c => c.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Soldes
          </TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4">
          {/* Search for new partner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Ajouter un partenaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Numéro de partage (ex: SOL-0001)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  disabled={!canShare}
                />
                <Button onClick={searchDriver} disabled={searching || !canShare}>
                  <Search className="h-4 w-4 mr-2" />
                  {searching ? 'Recherche...' : 'Rechercher'}
                </Button>
              </div>

              {searchResult && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={searchResult.profile_photo_url || undefined} />
                        <AvatarFallback>
                          {searchResult.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{searchResult.full_name}</p>
                        {searchResult.company_name && (
                          <p className="text-sm text-muted-foreground">{searchResult.company_name}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>⭐ {searchResult.rating?.toFixed(1) || '0.0'}</span>
                          <span>•</span>
                          <span>{searchResult.total_rides || 0} courses</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Commission: {proposedCommission}%</Label>
                        <Slider
                          value={[proposedCommission]}
                          onValueChange={(v) => setProposedCommission(v[0])}
                          min={5}
                          max={30}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                          Commission que vous recevrez quand vous envoyez une course
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Calendrier de paiement</Label>
                        <Select value={proposedPaymentSchedule} onValueChange={setProposedPaymentSchedule}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_SCHEDULES.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                <div>
                                  <div>{s.label}</div>
                                  <div className="text-xs text-muted-foreground">{s.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {proposedPaymentSchedule === 'custom' && (
                        <div className="space-y-2">
                          <Label>Nombre de jours</Label>
                          <Input
                            type="number"
                            value={proposedCustomDays}
                            onChange={(e) => setProposedCustomDays(parseInt(e.target.value) || 30)}
                            min={1}
                            max={90}
                          />
                        </div>
                      )}
                    </div>

                    <Alert>
                      <Calendar className="h-4 w-4" />
                      <AlertDescription>
                        Les deux chauffeurs doivent valider les termes du partenariat. 
                        Les paiements seront effectués {getPaymentScheduleLabel(proposedPaymentSchedule, proposedCustomDays).toLowerCase()}.
                      </AlertDescription>
                    </Alert>

                    <Button className="w-full" onClick={proposePartnership}>
                      <Handshake className="h-4 w-4 mr-2" />
                      Proposer le partenariat
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Pending requests received */}
          {pendingPartners.length > 0 && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                  <Clock className="h-5 w-5" />
                  Demandes reçues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingPartners.map((p) => (
                  <div key={p.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={p.partner_photo || undefined} />
                          <AvatarFallback>{p.partner_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{p.partner_name}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {p.partner_code}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Commission:</span>
                        <span className="ml-2 font-medium">{p.commission_percentage}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paiement:</span>
                        <span className="ml-2 font-medium">
                          {getPaymentScheduleLabel(p.payment_schedule, p.custom_payment_days)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => respondToPartnership(p.id, false)}>
                        <X className="h-4 w-4 mr-1" />
                        Refuser
                      </Button>
                      <Button size="sm" onClick={() => respondToPartnership(p.id, true)}>
                        <Check className="h-4 w-4 mr-1" />
                        Accepter
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sent requests */}
          {sentRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Demandes envoyées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sentRequests.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={p.partner_photo || undefined} />
                        <AvatarFallback>{p.partner_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{p.partner_name}</p>
                        <p className="text-sm text-muted-foreground">
                          En attente de réponse...
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">En attente</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active partners */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Partenaires actifs ({activePartners.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activePartners.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun partenaire actif. Recherchez un chauffeur par son code pour créer un partenariat.
                </p>
              ) : (
                <div className="space-y-3">
                  {activePartners.map((p) => {
                    const partnerId = p.driver_a_id === driverInfo?.id ? p.driver_b_id : p.driver_a_id;
                    const balance = calculateBalance(partnerId);
                    return (
                      <div key={p.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={p.partner_photo || undefined} />
                              <AvatarFallback>{p.partner_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{p.partner_name}</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {p.partner_code}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{p.commission_percentage}%</Badge>
                            <p className={`text-sm font-medium mt-1 ${
                              balance.net > 0 ? 'text-green-600' : balance.net < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {balance.net > 0 ? '+' : ''}{balance.net.toFixed(2)}€
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Paiement: {getPaymentScheduleLabel(p.payment_schedule, p.custom_payment_days)}
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setReportPartner(p);
                              setReportDialogOpen(true);
                            }}
                          >
                            <Flag className="h-4 w-4 mr-1" />
                            Signaler
                          </Button>
                        </div>
                        {p.sharing_blocked && (
                          <Badge variant="destructive" className="w-full justify-center">
                            <Shield className="h-3 w-3 mr-1" />
                            Partage suspendu
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          {/* Send course dialog */}
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={activePartners.length === 0 || availableCourses.length === 0 || !canShare}
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer une course à un partenaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Envoyer une course</DialogTitle>
                <DialogDescription>
                  Sélectionnez un partenaire et une course à lui transférer. 
                  Le client restera votre client.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Partenaire</Label>
                  <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un partenaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePartners.filter(p => !p.sharing_blocked).map((p) => {
                        const partnerId = p.driver_a_id === driverInfo?.id ? p.driver_b_id : p.driver_a_id;
                        return (
                          <SelectItem key={p.id} value={partnerId}>
                            {p.partner_name} ({p.commission_percentage}%)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une course" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {format(new Date(c.scheduled_date), 'dd/MM HH:mm', { locale: fr })} - {c.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notifyClient"
                      checked={notifyClient}
                      onChange={(e) => setNotifyClient(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="notifyClient" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Notifier le client du changement
                    </Label>
                  </div>
                  {notifyClient && (
                    <Textarea
                      placeholder="Message personnalisé pour le client (optionnel)"
                      value={clientMessage}
                      onChange={(e) => setClientMessage(e.target.value)}
                      rows={3}
                    />
                  )}
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Protection client:</strong> Le client reste exclusivement votre client. 
                    Votre partenaire ne pourra pas l'ajouter à sa clientèle et le client ne pourra pas l'ajouter non plus.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={sendCourse} disabled={!selectedPartner || !selectedCourse}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Received courses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Courses reçues</CardTitle>
            </CardHeader>
            <CardContent>
              {receivedCourses.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Aucune course reçue
                </p>
              ) : (
                <div className="space-y-3">
                  {receivedCourses.map((sc) => (
                    <div key={sc.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          <span className="font-medium">
                            {format(new Date(sc.course?.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <Badge variant={
                          sc.status === 'pending' ? 'secondary' :
                          sc.status === 'accepted' ? 'default' :
                          sc.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {sc.status === 'pending' ? 'En attente' :
                           sc.status === 'accepted' ? 'Acceptée' :
                           sc.status === 'completed' ? 'Terminée' : 'Refusée'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        De: {sc.partner_name}
                      </p>
                      <p className="text-sm">
                        {sc.course?.pickup_address} → {sc.course?.destination_address}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Montant: <strong>{sc.course_amount.toFixed(2)}€</strong>
                          <span className="text-red-600 ml-2">
                            (-{sc.commission_amount.toFixed(2)}€ commission)
                          </span>
                        </span>
                        {sc.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => respondToSharedCourse(sc.id, false)}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => respondToSharedCourse(sc.id, true)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sent courses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Courses envoyées</CardTitle>
            </CardHeader>
            <CardContent>
              {sentCourses.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Aucune course envoyée
                </p>
              ) : (
                <div className="space-y-3">
                  {sentCourses.map((sc) => (
                    <div key={sc.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span className="font-medium">
                            {format(new Date(sc.course?.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <Badge variant={
                          sc.status === 'pending' ? 'secondary' :
                          sc.status === 'accepted' ? 'default' :
                          sc.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {sc.status === 'pending' ? 'En attente' :
                           sc.status === 'accepted' ? 'Acceptée' :
                           sc.status === 'completed' ? 'Terminée' : 'Refusée'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        À: {sc.partner_name}
                      </p>
                      <p className="text-sm">
                        {sc.course?.pickup_address} → {sc.course?.destination_address}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          Montant: <strong>{sc.course_amount.toFixed(2)}€</strong>
                          <span className="text-green-600 ml-2">
                            (+{sc.commission_amount.toFixed(2)}€ à recevoir)
                          </span>
                        </div>
                        {sc.client_notified && (
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Client notifié
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Soldes avec vos partenaires</CardTitle>
              <CardDescription>
                Vue d'ensemble des montants à recevoir et à payer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activePartners.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun partenaire actif
                </p>
              ) : (
                <div className="space-y-4">
                  {activePartners.map((p) => {
                    const partnerId = p.driver_a_id === driverInfo?.id ? p.driver_b_id : p.driver_a_id;
                    const balance = calculateBalance(partnerId);
                    
                    return (
                      <Card key={p.id} className={`border ${
                        balance.net > 0 ? 'border-green-500/30' : 
                        balance.net < 0 ? 'border-red-500/30' : ''
                      }`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={p.partner_photo || undefined} />
                                <AvatarFallback>{p.partner_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{p.partner_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Paiement: {getPaymentScheduleLabel(p.payment_schedule, p.custom_payment_days)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">À recevoir</p>
                              <p className="font-semibold text-green-600">
                                {balance.theyOwe.toFixed(2)}€
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">À payer</p>
                              <p className="font-semibold text-red-600">
                                {balance.iOwe.toFixed(2)}€
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Solde</p>
                              <p className={`font-semibold ${
                                balance.net > 0 ? 'text-green-600' : 
                                balance.net < 0 ? 'text-red-600' : ''
                              }`}>
                                {balance.net > 0 ? '+' : ''}{balance.net.toFixed(2)}€
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Flag className="h-5 w-5" />
              Signaler un problème de paiement
            </DialogTitle>
            <DialogDescription>
              Signalez un partenaire qui ne respecte pas ses engagements de paiement. 
              L'administration examinera votre signalement.
            </DialogDescription>
          </DialogHeader>
          
          {reportPartner && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarImage src={reportPartner.partner_photo || undefined} />
                  <AvatarFallback>{reportPartner.partner_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{reportPartner.partner_name}</p>
                  <p className="text-sm text-muted-foreground">{reportPartner.partner_code}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Raison du signalement</Label>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une raison" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_payment">Non-paiement des commissions</SelectItem>
                    <SelectItem value="late_payment">Retard de paiement répété</SelectItem>
                    <SelectItem value="partial_payment">Paiement partiel</SelectItem>
                    <SelectItem value="other">Autre problème</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Montant impayé (€)</Label>
                <Input
                  type="number"
                  value={reportAmount}
                  onChange={(e) => setReportAmount(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                />
              </div>

              <div className="space-y-2">
                <Label>Description détaillée</Label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Décrivez le problème en détail..."
                  rows={4}
                />
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Les faux signalements peuvent entraîner la suspension de votre propre accès au partage.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={reportPartnerNonPayment}
              disabled={!reportReason || !reportDescription}
            >
              <Flag className="h-4 w-4 mr-2" />
              Envoyer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
