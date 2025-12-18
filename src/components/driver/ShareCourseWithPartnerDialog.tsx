import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Send, Star, Car, AlertTriangle } from 'lucide-react';
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

  useEffect(() => {
    if (open && driverId) {
      loadPartners();
    }
  }, [open, driverId]);

  useEffect(() => {
    if (selectedPartner) {
      setClientMessage(
        `Je ne peux pas effectuer cette course mais je vous confie à mon partenaire de confiance ${selectedPartner.partner_name} qui prendra soin de vous. Vous restez mon client et pourrez me recontacter pour vos prochaines courses.`
      );
    }
  }, [selectedPartner]);

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
            partner_driver_id: partnerId,
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

  const handleSendCourse = async () => {
    if (!selectedPartner || !course) return;

    if (selectedPartner.sharing_blocked) {
      toast.error('Le partage est bloqué pour ce partenariat');
      return;
    }

    setSending(true);
    try {
      const courseAmount = course.devis?.[0]?.amount || 0;
      const commissionAmount = (courseAmount * selectedPartner.commission_percentage) / 100;

      const finalClientMessage = notifyClient && clientMessage
        ? clientMessage
        : `Je ne peux pas effectuer cette course mais je vous confie à mon partenaire de confiance ${selectedPartner.partner_name} qui prendra soin de vous.`;

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

      // Notify client if enabled
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

      toast.success('Course envoyée au partenaire !');
      onOpenChange(false);
      setSelectedPartner(null);
      setClientMessage('');
      onSuccess();
    } catch (error: any) {
      console.error('Error sending course:', error);
      toast.error('Erreur lors de l\'envoi de la course');
    } finally {
      setSending(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Partager avec un partenaire
          </DialogTitle>
          <DialogDescription>
            Envoyez cette course à un chauffeur partenaire. Le client reste votre client.
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

          {/* Partners list */}
          <div className="space-y-2">
            <Label>Sélectionner un partenaire</Label>
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
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={partner.partner_photo || undefined} />
                        <AvatarFallback>{partner.partner_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{partner.partner_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {partner.partner_rating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {partner.partner_rides || 0} courses
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {partner.commission_percentage}%
                      </Badge>
                    </div>
                    {partner.sharing_blocked && (
                      <p className="text-xs text-destructive mt-2">Partage bloqué</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client notification */}
          {selectedPartner && (
            <div className="space-y-3">
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
                  <Label>Message au client</Label>
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSendCourse}
            disabled={!selectedPartner || sending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
