import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Handshake,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  FileText,
  Phone,
  Euro,
  Calendar,
  AlertTriangle,
  Clock,
  Download
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
  partner_id: string;
  partner_name: string;
  partner_photo: string | null;
  partner_company: string | null;
  partner_phone: string | null;
  partner_rating: number;
  partner_rides: number;
  show_phone_for_sharing: boolean;
}

interface PartnershipBalance {
  total_sent_amount: number;
  total_received_amount: number;
  total_sent_commission: number;
  total_received_commission: number;
  net_balance: number;
  courses_sent: number;
  courses_received: number;
  last_settlement_date: string | null;
}

export function MyPartnersList() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Partner[]>([]);
  const [balances, setBalances] = useState<Record<string, PartnershipBalance>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

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
          .select('user_id, company_name, rating, total_rides, show_phone_for_sharing')
          .eq('id', partnerId)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          const partnerData: Partner = {
            ...p,
            partner_id: partnerId,
            partner_name: profile?.full_name || 'Chauffeur',
            partner_photo: profile?.profile_photo_url || null,
            partner_company: driverData.company_name,
            partner_phone: driverData.show_phone_for_sharing ? profile?.phone : null,
            partner_rating: driverData.rating || 0,
            partner_rides: driverData.total_rides || 0,
            show_phone_for_sharing: driverData.show_phone_for_sharing || false,
          };

          if (p.status === 'pending' && p.proposed_by !== myDriverId) {
            pending.push(partnerData);
          } else if (p.status === 'active') {
            enrichedPartners.push(partnerData);
            // Charger le solde
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
    try {
      if (accept) {
        // Marquer comme accepté et signé par les deux parties
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
        toast.success('Partenariat accepté ! Le contrat a été généré.');
      } else {
        const { error } = await supabase
          .from('driver_partnerships')
          .update({ status: 'rejected' })
          .eq('id', partnershipId);

        if (error) throw error;
        toast.success('Demande refusée');
      }

      if (driverId) loadPartners(driverId);
    } catch (error) {
      console.error('Response error:', error);
      toast.error('Erreur lors de la réponse');
    }
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'per_course': return 'À chaque course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return schedule;
    }
  };

  const generateContractDocument = (partner: Partner) => {
    const today = format(new Date(), "d MMMM yyyy", { locale: fr });
    
    const contractText = `
CONTRAT DE PARTENARIAT CHAUFFEUR VTC

Entre les parties :

CHAUFFEUR A : ${partner.driver_a_id === driverId ? 'Vous' : partner.partner_name}
CHAUFFEUR B : ${partner.driver_b_id === driverId ? 'Vous' : partner.partner_name}

ARTICLE 1 - OBJET
Le présent contrat établit les termes du partenariat pour le partage de courses VTC entre les deux chauffeurs.

ARTICLE 2 - COMMISSION
Le taux de commission convenu est de ${partner.commission_percentage}%.
Ce taux s'applique de manière réciproque : lorsqu'un chauffeur envoie une course à son partenaire, il perçoit ${partner.commission_percentage}% du montant de la course.

ARTICLE 3 - MODALITÉS DE PAIEMENT
Fréquence de paiement : ${getPaymentScheduleLabel(partner.payment_schedule)}

ARTICLE 4 - ENGAGEMENTS
Les deux parties s'engagent à :
- Respecter les termes de ce partenariat
- Effectuer les paiements dans les délais convenus
- Maintenir une communication transparente

ARTICLE 5 - RÉSILIATION
Chaque partie peut résilier ce partenariat à tout moment avec un préavis raisonnable.

Date de signature : ${today}
Référence du contrat : PART-${partner.id.substring(0, 8).toUpperCase()}

---
Ce document vaut contrat entre les deux parties.
Généré automatiquement par SoloCab.
    `;

    return contractText;
  };

  const downloadContract = (partner: Partner) => {
    const contract = generateContractDocument(partner);
    const blob = new Blob([contract], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrat-partenariat-${partner.partner_name.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contrat téléchargé');
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

  const activePartners = partners.filter(p => p.status === 'active');
  const sentRequests = partners.filter(p => p.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              Demandes de partenariat en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={request.partner_photo || undefined} />
                    <AvatarFallback>{request.partner_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{request.partner_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Commission proposée : {request.commission_percentage}% | 
                      Paiement : {getPaymentScheduleLabel(request.payment_schedule)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => respondToRequest(request.id, true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accepter
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => respondToRequest(request.id, false)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Partners */}
      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Partenaires actifs ({activePartners.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Demandes envoyées ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="mt-4">
          {activePartners.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vous n'avez pas encore de partenaire actif. Recherchez des chauffeurs et proposez-leur un partenariat.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {activePartners.map((partner) => {
                const balance = balances[partner.id];
                return (
                  <Card key={partner.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={partner.partner_photo || undefined} />
                          <AvatarFallback className="text-lg">{partner.partner_name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-lg">{partner.partner_name}</p>
                              {partner.partner_company && (
                                <p className="text-sm text-muted-foreground">{partner.partner_company}</p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span>⭐ {partner.partner_rating.toFixed(1)}</span>
                                <span>•</span>
                                <span>{partner.partner_rides} courses</span>
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <Handshake className="h-3 w-3 mr-1" />
                              Actif
                            </Badge>
                          </div>

                          {/* Contact */}
                          {partner.partner_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-primary" />
                              <a href={`tel:${partner.partner_phone}`} className="text-primary hover:underline">
                                {partner.partner_phone}
                              </a>
                            </div>
                          )}

                          {/* Terms */}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Euro className="h-4 w-4 text-muted-foreground" />
                              Commission : <strong>{partner.commission_percentage}%</strong>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {getPaymentScheduleLabel(partner.payment_schedule)}
                            </div>
                          </div>

                          {/* Balance */}
                          {balance && (
                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg mt-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Courses envoyées</p>
                                <p className="font-semibold">{balance.courses_sent} ({balance.total_sent_commission.toFixed(2)} € à recevoir)</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Courses reçues</p>
                                <p className="font-semibold">{balance.courses_received} ({balance.total_received_commission.toFixed(2)} € à payer)</p>
                              </div>
                              <div className="col-span-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Solde net</span>
                                  <span className={`font-bold flex items-center gap-1 ${balance.net_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {balance.net_balance > 0 ? (
                                      <>
                                        <TrendingDown className="h-4 w-4" />
                                        Vous devez {balance.net_balance.toFixed(2)} €
                                      </>
                                    ) : balance.net_balance < 0 ? (
                                      <>
                                        <TrendingUp className="h-4 w-4" />
                                        On vous doit {Math.abs(balance.net_balance).toFixed(2)} €
                                      </>
                                    ) : (
                                      'Équilibré'
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Contract */}
                          {partner.contract_generated_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadContract(partner)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger le contrat
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {sentRequests.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucune demande de partenariat en attente de réponse.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <Card key={request.id} className="border-dashed">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.partner_photo || undefined} />
                        <AvatarFallback>{request.partner_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.partner_name}</p>
                        <p className="text-sm text-muted-foreground">
                          En attente de réponse • {request.commission_percentage}%
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      En attente
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
