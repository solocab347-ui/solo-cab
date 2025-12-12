import { useState, useEffect } from 'react';
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
  Car
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
}

export function DriverCourseSharing() {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<{ id: string; driver_code: string } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [sharedCourses, setSharedCourses] = useState<SharedCourse[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<DriverSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [proposedCommission, setProposedCommission] = useState(10);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadDriverInfo();
    }
  }, [user?.id]);

  useEffect(() => {
    if (driverInfo?.id) {
      loadData();
    }
  }, [driverInfo?.id]);

  const loadDriverInfo = async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, driver_code')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error loading driver info:', error);
      return;
    }
    setDriverInfo(data);
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
        toast.error('Aucun chauffeur trouvé avec ce code');
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
      .single();

    const courseAmount = devisData?.amount || 0;
    const commissionAmount = (courseAmount * partnership.commission_percentage) / 100;

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
      });

      if (error) throw error;

      toast.success('Course envoyée au partenaire !');
      setSendDialogOpen(false);
      setSelectedCourse('');
      setSelectedPartner('');
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
        // Update the original course to assign to receiver
        const sharedCourse = sharedCourses.find(sc => sc.id === sharedCourseId);
        if (sharedCourse) {
          await supabase
            .from('courses')
            .update({ driver_id: sharedCourse.receiver_driver_id })
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

  const copyDriverCode = () => {
    if (driverInfo?.driver_code) {
      navigator.clipboard.writeText(driverInfo.driver_code);
      toast.success('Code copié !');
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
      {/* Driver Code Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Votre Code Chauffeur
          </CardTitle>
          <CardDescription>
            Partagez ce code avec d'autres chauffeurs pour créer un partenariat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="bg-background rounded-lg px-6 py-3 border-2 border-primary font-mono text-2xl font-bold tracking-wider">
              {driverInfo?.driver_code || 'N/A'}
            </div>
            <Button variant="outline" size="icon" onClick={copyDriverCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
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
                  placeholder="Code chauffeur (ex: DRV-ABC123)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button onClick={searchDriver} disabled={searching}>
                  <Search className="h-4 w-4 mr-2" />
                  {searching ? 'Recherche...' : 'Rechercher'}
                </Button>
              </div>

              {searchResult && (
                <Card className="bg-muted/50">
                  <CardContent className="flex items-center justify-between p-4">
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Commission:</Label>
                        <span className="font-bold">{proposedCommission}%</span>
                      </div>
                      <Slider
                        value={[proposedCommission]}
                        onValueChange={(v) => setProposedCommission(v[0])}
                        min={5}
                        max={30}
                        step={1}
                        className="w-32"
                      />
                      <Button size="sm" onClick={proposePartnership}>
                        <Handshake className="h-4 w-4 mr-2" />
                        Proposer
                      </Button>
                    </div>
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
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={p.partner_photo || undefined} />
                        <AvatarFallback>{p.partner_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{p.partner_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Commission proposée: {p.commission_percentage}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => respondToPartnership(p.id, false)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => respondToPartnership(p.id, true)}>
                        <Check className="h-4 w-4" />
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
                    const balance = calculateBalance(
                      p.driver_a_id === driverInfo?.id ? p.driver_b_id : p.driver_a_id
                    );
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
              <Button className="w-full" disabled={activePartners.length === 0 || availableCourses.length === 0}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer une course à un partenaire
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Envoyer une course</DialogTitle>
                <DialogDescription>
                  Sélectionnez un partenaire et une course à lui transférer
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
                      {activePartners.map((p) => {
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
                          <span className="text-muted-foreground ml-2">
                            (commission: {sc.commission_amount.toFixed(2)}€)
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
                      <div className="text-sm">
                        Montant: <strong>{sc.course_amount.toFixed(2)}€</strong>
                        <span className="text-green-600 ml-2">
                          (+{sc.commission_amount.toFixed(2)}€ à recevoir)
                        </span>
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
                        balance.net > 0 ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20' :
                        balance.net < 0 ? 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20' :
                        'border-muted'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={p.partner_photo || undefined} />
                                <AvatarFallback>{p.partner_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{p.partner_name}</p>
                                <p className="text-sm text-muted-foreground font-mono">{p.partner_code}</p>
                              </div>
                            </div>
                            <Badge variant="outline">{p.commission_percentage}%</Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Vous devez</p>
                              <p className="text-lg font-bold text-red-600">
                                {balance.iOwe.toFixed(2)}€
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Vous recevez</p>
                              <p className="text-lg font-bold text-green-600">
                                {balance.theyOwe.toFixed(2)}€
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Solde net</p>
                              <p className={`text-lg font-bold flex items-center justify-center gap-1 ${
                                balance.net > 0 ? 'text-green-600' : balance.net < 0 ? 'text-red-600' : ''
                              }`}>
                                {balance.net > 0 ? <TrendingUp className="h-4 w-4" /> : 
                                 balance.net < 0 ? <TrendingDown className="h-4 w-4" /> : null}
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
    </div>
  );
}
