import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { notificationService } from '@/lib/notificationService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Handshake,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Phone,
  Euro,
  Calendar,
  AlertTriangle,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  MapPin,
  MessageSquare,
  Mail,
  Star,
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
  payment_schedule: string;
  driver_a_signed: boolean;
  driver_b_signed: boolean;
  contract_generated_at: string | null;
  proposal_message: string | null;
  partner_id: string;
  partner_user_id: string;
  partner_name: string;
  partner_photo: string | null;
  partner_company: string | null;
  partner_phone: string | null;
  partner_email: string | null;
  partner_rating: number;
  partner_rides: number;
  partner_working_sectors: string[];
  partner_services_offered: string[];
  show_phone_for_sharing: boolean;
  show_email: boolean;
}

interface PartnershipBalance {
  total_sent_amount: number;
  total_received_amount: number;
  total_sent_commission: number;
  total_received_commission: number;
  net_balance: number;
  courses_sent: number;
  courses_received: number;
}

export function MyPartnersList() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Partner[]>([]);
  const [balances, setBalances] = useState<Record<string, PartnershipBalance>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDriverAndPartners();
    }
  }, [user?.id]);

  const loadDriverAndPartners = async () => {
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (driver) {
      setDriverId(driver.id);
      await loadPartners(driver.id);
    }
    setLoading(false);
  };

  const loadPartners = async (myDriverId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`driver_a_id.eq.${myDriverId},driver_b_id.eq.${myDriverId}`);

      if (error) throw error;

      const enrichedPartners: Partner[] = [];
      const pending: Partner[] = [];

      for (const p of data || []) {
        const partnerId = p.driver_a_id === myDriverId ? p.driver_b_id : p.driver_a_id;
        
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, rating, total_rides, show_phone_for_sharing, show_email, working_sectors, services_offered')
          .eq('id', partnerId)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone, email')
            .eq('id', driverData.user_id)
            .single();

          const partnerData: Partner = {
            ...p,
            partner_id: partnerId,
            partner_user_id: driverData.user_id,
            partner_name: profile?.full_name || 'Chauffeur',
            partner_photo: profile?.profile_photo_url || null,
            partner_company: driverData.company_name,
            partner_phone: driverData.show_phone_for_sharing ? profile?.phone : null,
            partner_email: driverData.show_email ? profile?.email : null,
            partner_rating: driverData.rating || 0,
            partner_rides: driverData.total_rides || 0,
            partner_working_sectors: driverData.working_sectors || [],
            partner_services_offered: driverData.services_offered || [],
            show_phone_for_sharing: driverData.show_phone_for_sharing || false,
            show_email: driverData.show_email || false,
          };

          if (p.status === 'pending' && p.proposed_by !== myDriverId) {
            pending.push(partnerData);
          } else if (p.status === 'active') {
            enrichedPartners.push(partnerData);
            loadPartnerBalance(p.id, myDriverId);
          } else if (p.status === 'pending' && p.proposed_by === myDriverId) {
            enrichedPartners.push(partnerData);
          }
        }
      }

      setPartners(enrichedPartners);
      setPendingRequests(pending);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  const loadPartnerBalance = async (partnershipId: string, myDriverId: string) => {
    const { data } = await supabase.rpc('get_partnership_balance', {
      _partnership_id: partnershipId,
      _driver_id: myDriverId
    });

    if (data?.[0]) {
      setBalances(prev => ({ ...prev, [partnershipId]: data[0] }));
    }
  };

  const respondToRequest = async (partnershipId: string, accept: boolean) => {
    setResponding(partnershipId);
    try {
      // Récupérer les infos du partenariat pour notifier l'expéditeur
      const partnership = pendingRequests.find(p => p.id === partnershipId);
      
      if (accept) {
        const { error } = await supabase
          .from('driver_partnerships')
          .update({
            status: 'active',
            accepted_at: new Date().toISOString(),
            driver_a_signed: true,
            driver_b_signed: true,
            driver_a_signed_at: new Date().toISOString(),
            driver_b_signed_at: new Date().toISOString(),
            contract_generated_at: new Date().toISOString(),
          })
          .eq('id', partnershipId);

        if (error) throw error;
        
        // Notifier l'expéditeur que le partenariat a été accepté
        if (partnership) {
          const senderDriverId = partnership.proposed_by;
          const { data: senderDriver } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', senderDriverId)
            .single();
          
          if (senderDriver) {
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user?.id)
              .single();
              
            await notificationService.notifyDriverPartnershipAccepted(
              senderDriver.user_id,
              myProfile?.full_name || 'Un chauffeur'
            );
          }
        }
        
        toast.success('Partenariat accepté !');
      } else {
        const { error } = await supabase
          .from('driver_partnerships')
          .update({ status: 'rejected' })
          .eq('id', partnershipId);

        if (error) throw error;
        
        // Notifier l'expéditeur que le partenariat a été refusé
        if (partnership) {
          const senderDriverId = partnership.proposed_by;
          const { data: senderDriver } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', senderDriverId)
            .single();
          
          if (senderDriver) {
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user?.id)
              .single();
              
            await notificationService.notifyDriverPartnershipRejected(
              senderDriver.user_id,
              myProfile?.full_name || 'Un chauffeur'
            );
          }
        }
        
        toast.success('Demande refusée');
      }

      if (driverId) loadPartners(driverId);
    } catch (error) {
      console.error('Response error:', error);
      toast.error('Erreur lors de la réponse');
    } finally {
      setResponding(null);
    }
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'per_course': return 'Par course';
      case 'weekly': return 'Hebdo';
      case 'monthly': return 'Mensuel';
      default: return schedule;
    }
  };

  const downloadContract = (partner: Partner) => {
    const today = format(new Date(), "d MMMM yyyy", { locale: fr });
    const contractText = `
CONTRAT DE PARTENARIAT VTC
===========================

Date: ${today}
Référence: PART-${partner.id.substring(0, 8).toUpperCase()}

PARTENAIRES
-----------
Chauffeur 1: ${partner.driver_a_id === driverId ? 'Vous' : partner.partner_name}
Chauffeur 2: ${partner.driver_b_id === driverId ? 'Vous' : partner.partner_name}

CONDITIONS
----------
Commission: ${partner.commission_percentage}%
Paiement: ${getPaymentScheduleLabel(partner.payment_schedule)}

Ce taux s'applique de manière réciproque entre les deux parties.

---
Généré par SoloCab
    `;

    const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrat-${partner.partner_name.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contrat téléchargé');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const activePartners = partners.filter(p => p.status === 'active');
  const sentRequests = partners.filter(p => p.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            Demandes reçues ({pendingRequests.length})
          </h3>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={request.partner_photo || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-700">
                      {request.partner_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{request.partner_name}</p>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Profil</span>
                        {expandedRequest === request.id ? (
                          <ChevronUp className="h-3 w-3 ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </div>
                    
                    {request.partner_company && (
                      <p className="text-xs text-muted-foreground">{request.partner_company}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {request.commission_percentage}%
                      </span>
                      <span>•</span>
                      <span>{getPaymentScheduleLabel(request.payment_schedule)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {request.partner_rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {request.partner_rides || 0} courses
                      </span>
                    </div>

                    {/* Message de proposition */}
                    {request.proposal_message && (
                      <div className="mt-3 p-2 bg-background/50 rounded-md border">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground italic">
                            "{request.proposal_message}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Profil étendu */}
                    {expandedRequest === request.id && (
                      <div className="mt-3 p-3 bg-background/50 rounded-md border space-y-3">
                        {/* Secteurs de travail */}
                        {request.partner_working_sectors && request.partner_working_sectors.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Secteurs de travail
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {request.partner_working_sectors.slice(0, 5).map((sector, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {sector}
                                </Badge>
                              ))}
                              {request.partner_working_sectors.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{request.partner_working_sectors.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Contact */}
                        <div className="flex flex-wrap gap-2">
                          {request.partner_phone && (
                            <a 
                              href={`tel:${request.partner_phone}`}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {request.partner_phone}
                            </a>
                          )}
                          {request.partner_email && (
                            <a 
                              href={`mailto:${request.partner_email}`}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {request.partner_email}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        onClick={() => respondToRequest(request.id, true)}
                        disabled={responding === request.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 h-9"
                      >
                        {responding === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Accepter
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => respondToRequest(request.id, false)}
                        disabled={responding === request.id}
                        className="h-9 px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Demandes envoyées ({sentRequests.length})
          </h3>
          {sentRequests.map((request) => (
            <Card key={request.id} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.partner_photo || undefined} />
                    <AvatarFallback>{request.partner_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{request.partner_name}</p>
                    <p className="text-xs text-muted-foreground">En attente de réponse</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {request.commission_percentage}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pendingRequests.length > 0 || sentRequests.length > 0 ? (
        <Separator />
      ) : null}

      {/* Active Partners */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Partenaires actifs ({activePartners.length})
        </h3>

        {activePartners.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Aucun partenaire actif. Recherchez des chauffeurs pour créer des partenariats.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {activePartners.map((partner) => {
              const balance = balances[partner.id];
              const isExpanded = expandedPartner === partner.id;

              return (
                <Card key={partner.id}>
                  <CardContent className="p-0">
                    {/* Header - always visible */}
                    <button
                      onClick={() => setExpandedPartner(isExpanded ? null : partner.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={partner.partner_photo || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {partner.partner_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{partner.partner_name}</p>
                          <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                            {partner.commission_percentage}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>⭐ {partner.partner_rating.toFixed(1)}</span>
                          <span>•</span>
                          <span>{partner.partner_rides} courses</span>
                        </div>
                      </div>
                      {/* Balance indicator */}
                      {balance && (
                        <div className="text-right shrink-0">
                          {balance.net_balance > 0 ? (
                            <p className="text-sm font-bold text-red-600">-{balance.net_balance.toFixed(0)}€</p>
                          ) : balance.net_balance < 0 ? (
                            <p className="text-sm font-bold text-green-600">+{Math.abs(balance.net_balance).toFixed(0)}€</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">0€</p>
                          )}
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t">
                        {/* Contact */}
                        {partner.partner_phone && (
                          <a 
                            href={`tel:${partner.partner_phone}`}
                            className="flex items-center gap-2 text-sm text-primary mt-3"
                          >
                            <Phone className="h-4 w-4" />
                            {partner.partner_phone}
                          </a>
                        )}

                        {/* Terms */}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            Commission: {partner.commission_percentage}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {getPaymentScheduleLabel(partner.payment_schedule)}
                          </span>
                        </div>

                        {/* Balance details */}
                        {balance && (
                          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-xs">
                            <div>
                              <p className="text-muted-foreground">Envoyées</p>
                              <p className="font-semibold">{balance.courses_sent} courses</p>
                              <p className="text-green-600">+{balance.total_sent_commission.toFixed(2)}€</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Reçues</p>
                              <p className="font-semibold">{balance.courses_received} courses</p>
                              <p className="text-red-600">-{balance.total_received_commission.toFixed(2)}€</p>
                            </div>
                            <div className="col-span-2 pt-2 border-t flex items-center justify-between">
                              <span className="font-medium">Solde</span>
                              <span className={`font-bold flex items-center gap-1 ${balance.net_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {balance.net_balance > 0 ? (
                                  <>
                                    <TrendingDown className="h-3 w-3" />
                                    Vous devez {balance.net_balance.toFixed(2)}€
                                  </>
                                ) : balance.net_balance < 0 ? (
                                  <>
                                    <TrendingUp className="h-3 w-3" />
                                    On vous doit {Math.abs(balance.net_balance).toFixed(2)}€
                                  </>
                                ) : (
                                  'Équilibré'
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Contract download */}
                        {partner.contract_generated_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadContract(partner)}
                            className="w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger le contrat
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
