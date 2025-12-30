import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Send, Star, Car, AlertTriangle, Hash, Phone, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Partner {
  id: string;
  driver_a_id: string;
  driver_b_id: string;
  commission_percentage: number;
  status: string;
  partner_name: string;
  partner_photo: string | null;
  partner_code: string;
  partner_rating: number;
  partner_rides: number;
  partner_driver_id: string;
  sharing_blocked: boolean;
  sharing_number: number | null;
  partner_phone: string | null;
}

interface ShareCourseWithPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    client_id: string;
    clients?: {
      profiles?: {
        full_name?: string;
      };
    };
    devis?: Array<{
      amount: number;
    }>;
  } | null;
  driverId: string;
  onSuccess: () => void;
}

type ShareMode = 'choose' | 'specific' | 'all';

export function ShareCourseWithPartnerDialog({
  open,
  onOpenChange,
  course,
  driverId,
  onSuccess,
}: ShareCourseWithPartnerDialogProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientMessage, setClientMessage] = useState('');
  const [shareMode, setShareMode] = useState<ShareMode>('choose');

  useEffect(() => {
    if (open && driverId) {
      loadPartners();
      setShareMode('choose');
      setSelectedPartner(null);
    }
  }, [open, driverId]);

  useEffect(() => {
    if (selectedPartner) {
      setClientMessage(
        `Je ne peux pas effectuer cette course mais je vous confie à mon partenaire de confiance ${selectedPartner.partner_name} qui prendra soin de vous. Vous restez mon client et pourrez me recontacter pour vos prochaines courses.`
      );
    } else if (shareMode === 'all') {
      setClientMessage(
        `Je ne peux pas effectuer cette course mais je vous confie à l'un de mes partenaires de confiance qui prendra soin de vous. Vous restez mon client et pourrez me recontacter pour vos prochaines courses.`
      );
    }
  }, [selectedPartner, shareMode]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const { data: partnershipsData, error } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'active');

      if (error) throw error;

      const enrichedPartners: Partner[] = [];
      for (const p of partnershipsData || []) {
        const partnerId = p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id;
        
        const { data: partnerData } = await supabase
          .from('drivers')
          .select('driver_code, rating, total_rides, user_id, sharing_number')
          .eq('id', partnerId)
          .single();

        if (partnerData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', partnerData.user_id)
            .single();

          enrichedPartners.push({
            ...p,
            partner_name: profileData?.full_name || 'Chauffeur',
            partner_photo: profileData?.profile_photo_url,
            partner_phone: profileData?.phone,
            partner_code: partnerData.driver_code,
            partner_rating: partnerData.rating || 0,
            partner_rides: partnerData.total_rides || 0,
            partner_driver_id: partnerId,
            sharing_number: partnerData.sharing_number,
          });
        }
      }
      setPartners(enrichedPartners);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Erreur lors du chargement des partenaires');
    } finally {
      setLoading(false);
    }
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return 'N/A';
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  const handleSendCourse = async () => {
    if (shareMode === 'specific' && !selectedPartner) {
      toast.error('Veuillez sélectionner un partenaire');
      return;
    }
    if (!course) return;
    
    // VÉRIFICATION CRITIQUE: Seules les courses avec devis accepté peuvent être partagées
    const acceptedDevis = course.devis?.find(d => (d as any).status === 'accepted');
    if (!acceptedDevis) {
      toast.error('Le devis doit être accepté avant de partager la course');
      return;
    }

    setSending(true);
    try {
      const finalClientMessage = notifyClient && clientMessage
        ? clientMessage
        : shareMode === 'all'
        ? `Je ne peux pas effectuer cette course mais je vous confie à l'un de mes partenaires de confiance.`
        : `Je ne peux pas effectuer cette course mais je vous confie à mon partenaire de confiance ${selectedPartner?.partner_name}.`;

      if (shareMode === 'all') {
        // Send to all partners
        const courseAmount = course.devis?.[0]?.amount || 0;
        
        for (const partner of partners.filter(p => !p.sharing_blocked)) {
          const commissionAmount = (courseAmount * partner.commission_percentage) / 100;
          
          await supabase.from('shared_courses').insert({
            course_id: course.id,
            partnership_id: partner.id,
            sender_driver_id: driverId,
            receiver_driver_id: partner.partner_driver_id,
            course_amount: courseAmount,
            commission_percentage: partner.commission_percentage,
            commission_amount: commissionAmount,
            status: 'pending',
            client_notified: false,
            client_message: null,
          });

          // Notify each partner
          const { data: receiverData } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', partner.partner_driver_id)
            .single();

          if (receiverData?.user_id) {
            await supabase.from('notifications').insert({
              user_id: receiverData.user_id,
              title: '🤝 Nouvelle course disponible',
              message: `Une course est disponible pour le ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
              type: 'info',
              link: '/driver-dashboard',
            });
          }
        }

        // Notify client once if enabled
        if (notifyClient && course.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('user_id')
            .eq('id', course.client_id)
            .single();

          if (clientData?.user_id) {
            await supabase.from('notifications').insert({
              user_id: clientData.user_id,
              title: '🚗 Information sur votre course',
              message: finalClientMessage,
              type: 'info',
              link: '/client-dashboard',
            });
          }
        }

        toast.success(`Course envoyée à ${partners.filter(p => !p.sharing_blocked).length} partenaires !`);
      } else if (shareMode === 'specific' && selectedPartner) {
        // Send to specific partner
        if (selectedPartner.sharing_blocked) {
          toast.error('Le partage est bloqué pour ce partenariat');
          setSending(false);
          return;
        }

        const courseAmount = course.devis?.[0]?.amount || 0;
        const commissionAmount = (courseAmount * selectedPartner.commission_percentage) / 100;

        const { error } = await supabase.from('shared_courses').insert({
          course_id: course.id,
          partnership_id: selectedPartner.id,
          sender_driver_id: driverId,
          receiver_driver_id: selectedPartner.partner_driver_id,
          course_amount: courseAmount,
          commission_percentage: selectedPartner.commission_percentage,
          commission_amount: commissionAmount,
          status: 'pending',
          client_notified: notifyClient,
          client_notified_at: notifyClient ? new Date().toISOString() : null,
          client_message: notifyClient ? finalClientMessage : null,
        });

        if (error) throw error;

        // Notify client
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

        // Notify receiving driver
        const { data: receiverData } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', selectedPartner.partner_driver_id)
          .single();

        if (receiverData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: receiverData.user_id,
            title: '🤝 Nouvelle course partagée',
            message: `Un partenaire vous a envoyé une course pour le ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
            type: 'info',
            link: '/driver-dashboard',
          });
        }

        toast.success(`Course envoyée à ${selectedPartner.partner_name} !`);
      }

      onOpenChange(false);
      setSelectedPartner(null);
      setClientMessage('');
      setShareMode('choose');
      onSuccess();
    } catch (error: any) {
      console.error('Error sending course:', error);
      toast.error('Erreur lors de l\'envoi de la course');
    } finally {
      setSending(false);
    }
  };

  if (!course) return null;

  const availablePartners = partners.filter(p => !p.sharing_blocked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Partager la course
          </DialogTitle>
          <DialogDescription>
            Envoyez cette course à un ou plusieurs partenaires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <p className="font-medium">{course.clients?.profiles?.full_name || 'Client'}</p>
            <p className="text-muted-foreground text-xs">
              {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground truncate">{course.pickup_address}</p>
            <p className="text-xs text-muted-foreground truncate">→ {course.destination_address}</p>
            {course.devis?.[0] && (
              <p className="text-primary font-semibold mt-2">{course.devis[0].amount.toFixed(2)}€</p>
            )}
          </div>

          {/* Share mode selection */}
          {shareMode === 'choose' && (
            <div className="space-y-3">
              <Label>Comment souhaitez-vous partager ?</Label>
              {loading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : partners.length === 0 ? (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Aucun partenaire actif
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Créez un partenariat depuis l'onglet "Partage" de votre tableau de bord.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setShareMode('specific')}
                  >
                    <UserCheck className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Choisir un partenaire</p>
                      <p className="text-xs text-muted-foreground">
                        Sélectionnez un partenaire spécifique
                      </p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setShareMode('all')}
                  >
                    <Users className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Envoyer à tous ({availablePartners.length})</p>
                      <p className="text-xs text-muted-foreground">
                        Le premier à accepter prend la course
                      </p>
                    </div>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Partner selection */}
          {shareMode === 'specific' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sélectionner un partenaire</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShareMode('choose');
                    setSelectedPartner(null);
                  }}
                >
                  Retour
                </Button>
              </div>
              
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => !partner.sharing_blocked && setSelectedPartner(partner)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPartner?.id === partner.id
                        ? 'border-primary bg-primary/10'
                        : partner.sharing_blocked
                        ? 'border-destructive/30 bg-destructive/5 cursor-not-allowed opacity-60'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={partner.partner_photo || undefined} />
                        <AvatarFallback>{partner.partner_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{partner.partner_name}</p>
                        
                        {/* Sharing number prominently displayed */}
                        <div className="flex items-center gap-1 text-primary font-mono text-sm">
                          <Hash className="w-3 h-3" />
                          {formatSharingNumber(partner.sharing_number)}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {partner.partner_rating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {partner.partner_rides || 0}
                          </span>
                          {partner.partner_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {partner.partner_phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {partner.commission_percentage}%
                      </Badge>
                    </div>
                    {partner.sharing_blocked && (
                      <p className="text-xs text-destructive mt-2">Partage bloqué</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All partners confirmation */}
          {shareMode === 'all' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Envoyer à tous les partenaires</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShareMode('choose')}
                >
                  Retour
                </Button>
              </div>
              
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  {availablePartners.length} partenaire{availablePartners.length > 1 ? 's' : ''} recevr{availablePartners.length > 1 ? 'ont' : 'a'} cette course
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Le premier à accepter prendra la course automatiquement.
                </p>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availablePartners.map((partner) => (
                  <div key={partner.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={partner.partner_photo || undefined} />
                      <AvatarFallback className="text-xs">{partner.partner_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{partner.partner_name}</span>
                    <span className="text-xs text-primary font-mono">{formatSharingNumber(partner.sharing_number)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client notification */}
          {(shareMode === 'specific' && selectedPartner) || shareMode === 'all' ? (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-client">Notifier le client</Label>
                <Switch
                  id="notify-client"
                  checked={notifyClient}
                  onCheckedChange={setNotifyClient}
                />
              </div>
              {notifyClient && (
                <div className="space-y-2">
                  <Label className="text-xs">Message au client</Label>
                  <Textarea
                    value={clientMessage}
                    onChange={(e) => setClientMessage(e.target.value)}
                    placeholder="Message envoyé au client..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {(shareMode === 'specific' || shareMode === 'all') && (
            <Button
              onClick={handleSendCourse}
              disabled={(shareMode === 'specific' && !selectedPartner) || sending || availablePartners.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Envoi...' : shareMode === 'all' ? 'Envoyer à tous' : 'Envoyer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
