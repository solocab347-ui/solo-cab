import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Users, Send, UserCheck, Star, Car, Phone, Hash, 
  Globe, Heart, AlertTriangle, CreditCard, ExternalLink, Loader2, Euro
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
import { useDriverPremium } from '@/hooks/useDriverPremium';
import { PremiumGate } from '@/components/premium/PremiumGate';

interface Favorite {
  id: string;
  favorite_driver_id: string;
  driver_name: string;
  driver_photo: string | null;
  driver_company: string | null;
  driver_sharing_number: number | null;
  driver_rating: number;
  driver_rides: number;
  show_rating: boolean;
  show_rides: boolean;
  show_phone: boolean;
  driver_phone: string | null;
  has_stripe_connect: boolean;
  is_premium: boolean;
}

interface ShareCourseWithPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: any;
  driverId: string;
  onSuccess: () => void;
}

type ShareMode = 'choose' | 'network' | 'favorites' | 'specific';

export function ShareCourseWithPartnerDialog({
  open,
  onOpenChange,
  course,
  driverId,
  onSuccess,
}: ShareCourseWithPartnerDialogProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedFavorite, setSelectedFavorite] = useState<Favorite | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientMessage, setClientMessage] = useState('');
  const [shareMode, setShareMode] = useState<ShareMode>('choose');
  
  const { isPremium } = useDriverPremium();
  const { isReady: stripeReady, isNotConnected: stripeNotConnected } = useStripeConnectStatus(driverId);

  useEffect(() => {
    if (open && driverId && isPremium) {
      loadFavorites();
      setShareMode('choose');
      setSelectedFavorite(null);
    }
  }, [open, driverId, isPremium]);

  useEffect(() => {
    if (selectedFavorite) {
      setClientMessage(
        `Je ne peux pas effectuer cette course mais je vous confie à mon partenaire de confiance ${selectedFavorite.driver_name} qui prendra soin de vous.`
      );
    } else if (shareMode === 'network' || shareMode === 'favorites') {
      setClientMessage(
        `Je ne peux pas effectuer cette course mais je vous confie à l'un de mes partenaires de confiance qui prendra soin de vous.`
      );
    }
  }, [selectedFavorite, shareMode]);

  // Block sharing for non-premium users
  if (open && !isPremium) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fonctionnalité Premium</DialogTitle>
            <DialogDescription>
              Le partage de courses est réservé aux abonnés Premium.
            </DialogDescription>
          </DialogHeader>
          <PremiumGate 
            isPremium={false} 
            featureName="Partage de courses" 
            featureDescription="Partagez vos courses avec d'autres chauffeurs et gagnez des rétributions."
          />
        </DialogContent>
      </Dialog>
    );
  }

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const { data: favData, error } = await supabase
        .from('driver_favorites')
        .select('id, favorite_driver_id')
        .eq('driver_id', driverId);

      if (error) throw error;

      const enriched: Favorite[] = [];
      for (const fav of favData || []) {
          const { data: driverData } = await supabase
          .from('drivers')
        .select('user_id, company_name, sharing_number, rating, total_rides, card_photo_url, contact_phone, show_phone_for_sharing, show_rating_for_sharing, show_rides_for_sharing, stripe_connect_account_id, stripe_connect_status, subscription_tier, subscription_paid, free_access_granted, free_access_type')
          .eq('id', fav.favorite_driver_id)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          enriched.push({
            id: fav.id,
            favorite_driver_id: fav.favorite_driver_id,
            driver_name: profile?.full_name?.split(' ')[0] || 'Chauffeur',
            driver_photo: driverData.card_photo_url || profile?.profile_photo_url || null,
            driver_company: driverData.company_name,
            driver_sharing_number: driverData.sharing_number,
            driver_rating: driverData.rating || 0,
            driver_rides: driverData.total_rides || 0,
            show_rating: driverData.show_rating_for_sharing ?? false,
            show_rides: driverData.show_rides_for_sharing ?? false,
            show_phone: driverData.show_phone_for_sharing ?? false,
            driver_phone: driverData.show_phone_for_sharing ? (driverData.contact_phone || profile?.phone) : null,
            has_stripe_connect: !!driverData.stripe_connect_account_id && driverData.stripe_connect_status === 'active',
            is_premium: (driverData.subscription_tier === 'premium' && driverData.subscription_paid) || 
              (driverData.free_access_granted && (driverData.free_access_type === 'unlimited' || driverData.free_access_type === 'administrative')),
          });
        }
      }
      setFavorites(enriched);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return 'N/A';
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  // Calculate commission based on new rules
  const getCourseAmount = () => {
    const acceptedDevis = course?.devis?.find((d: any) => d.status === 'accepted');
    return acceptedDevis?.amount || 0;
  };

  const getCommissionInfo = () => {
    const amount = getCourseAmount();
    const percentage = amount < 30 ? 15 : 20;
    const commission = (amount * percentage) / 100;
    const solocabFee = 0.10;
    const receiverEarnings = amount - commission - solocabFee;
    return { percentage, commission, solocabFee, receiverEarnings, amount };
  };

  const handleSendCourse = async () => {
    if (!course) return;
    
    const acceptedDevis = course.devis?.find((d: any) => d.status === 'accepted');
    if (!acceptedDevis) {
      toast.error('Le devis doit être accepté avant de partager la course');
      return;
    }

    setSending(true);
    try {
      const { amount, percentage, commission, solocabFee } = getCommissionInfo();
      const poolGroupId = crypto.randomUUID();

      if (shareMode === 'network') {
        // Push to open network pool - visible to all Stripe Connect drivers
        const { error } = await supabase.from('partner_course_pool').insert({
          course_id: course.id,
          sender_driver_id: driverId,
          partnership_ids: null,
          course_amount: amount,
          commission_percentage: percentage,
          estimated_commission: commission,
          message: null,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // No expiration
          sharing_scope: 'network',
          target_driver_ids: null,
          solocab_fee_cents: 25,
          pickup_latitude: course.pickup_latitude || null,
          pickup_longitude: course.pickup_longitude || null,
        });

        if (error) throw error;

        // Notify client
        if (notifyClient && course.client_id) {
          await notifyClientAboutShare(course.client_id, clientMessage);
        }

        toast.success('Course publiée sur le réseau de partage !');
      } else if (shareMode === 'favorites') {
        // Push to favorites only
        const stripeReadyFavorites = favorites.filter(f => f.has_stripe_connect);
        if (stripeReadyFavorites.length === 0) {
          toast.error('Aucun favori avec Stripe Connect actif');
          setSending(false);
          return;
        }

        const targetIds = stripeReadyFavorites.map(f => f.favorite_driver_id);
        
        const { error } = await supabase.from('partner_course_pool').insert({
          course_id: course.id,
          sender_driver_id: driverId,
          partnership_ids: null,
          course_amount: amount,
          commission_percentage: percentage,
          estimated_commission: commission,
          message: null,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          sharing_scope: 'favorites',
          target_driver_ids: targetIds,
          solocab_fee_cents: 25,
          pickup_latitude: course.pickup_latitude || null,
          pickup_longitude: course.pickup_longitude || null,
        });

        if (error) throw error;

        // Notify each favorite
        for (const fav of stripeReadyFavorites) {
          const { data: driverData } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', fav.favorite_driver_id)
            .single();
          
          if (driverData?.user_id) {
            await supabase.from('notifications').insert({
              user_id: driverData.user_id,
              title: '🤝 Nouvelle course disponible',
              message: `Une course est disponible pour le ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
              type: 'info',
              link: '/driver-dashboard',
            });
          }
        }

        if (notifyClient && course.client_id) {
          await notifyClientAboutShare(course.client_id, clientMessage);
        }

        toast.success(`Course envoyée à ${stripeReadyFavorites.length} favori(s) !`);
      } else if (shareMode === 'specific' && selectedFavorite) {
        if (!selectedFavorite.has_stripe_connect) {
          toast.error('Ce chauffeur n\'a pas Stripe Connect actif');
          setSending(false);
          return;
        }

        // Direct share to specific driver
        const { error } = await supabase.from('shared_courses').insert({
          course_id: course.id,
          partnership_id: null,
          sender_driver_id: driverId,
          receiver_driver_id: selectedFavorite.favorite_driver_id,
          course_amount: amount,
          commission_percentage: percentage,
          commission_amount: commission,
          solocab_fee_cents: 25,
          sharing_scope: 'specific',
          status: 'pending',
          sharing_mode: 'single',
          client_notified: notifyClient,
          client_notified_at: notifyClient ? new Date().toISOString() : null,
          client_message: notifyClient ? clientMessage : null,
          earnings_for_receiver: amount - commission - 0.10,
        });

        if (error) throw error;

        // Notify receiver
        const { data: receiverData } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', selectedFavorite.favorite_driver_id)
          .single();

        if (receiverData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: receiverData.user_id,
            title: '🤝 Nouvelle course partagée',
            message: `Un chauffeur vous a envoyé une course pour le ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
            type: 'info',
            link: '/driver-dashboard',
          });
        }

        if (notifyClient && course.client_id) {
          await notifyClientAboutShare(course.client_id, clientMessage);
        }

        toast.success(`Course envoyée à ${selectedFavorite.driver_name} !`);
      }

      onOpenChange(false);
      setSelectedFavorite(null);
      setClientMessage('');
      setShareMode('choose');
      onSuccess();
    } catch (error: any) {
      console.error('Error sending course:', error);
      if (error?.code === '23505') {
        toast.error('Cette course est déjà partagée');
      } else {
        toast.error(`Erreur lors de l'envoi: ${error?.message || 'Erreur inconnue'}`);
      }
    } finally {
      setSending(false);
    }
  };

  const notifyClientAboutShare = async (clientId: string, message: string) => {
    const { data: clientData } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .single();

    if (clientData?.user_id) {
      await supabase.from('notifications').insert({
        user_id: clientData.user_id,
        title: '🚗 Information sur votre course',
        message,
        type: 'info',
        link: '/client-dashboard',
      });
    }
  };

  if (!course) return null;

  const commissionInfo = getCommissionInfo();
  const stripeReadyFavorites = favorites.filter(f => f.has_stripe_connect);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Partager la course
          </DialogTitle>
          <DialogDescription>
            Choisissez comment partager cette course sur le réseau SoloCab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stripe Connect Required */}
          {stripeNotConnected && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 font-semibold">Stripe Connect requis</AlertTitle>
              <AlertDescription className="text-amber-600 text-sm space-y-2">
                <p>Pour partager des courses, vous devez configurer Stripe Connect.</p>
                <Button 
                  size="sm" variant="outline" className="mt-2"
                  onClick={() => { onOpenChange(false); window.location.href = '/driver-dashboard?tab=settings'; }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configurer Stripe
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Course info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <p className="font-medium">{course.clients?.profiles?.full_name || 'Client'}</p>
            <p className="text-muted-foreground text-xs">
              {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground truncate">{course.pickup_address}</p>
            <p className="text-xs text-muted-foreground truncate">→ {course.destination_address}</p>
            {commissionInfo.amount > 0 && (
              <p className="text-primary font-semibold mt-2">{commissionInfo.amount.toFixed(2)}€</p>
            )}
          </div>

          {/* Commission breakdown */}
          {commissionInfo.amount > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1 text-xs">
              <p className="font-medium text-sm flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" />
                Répartition automatique
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Votre rétribution ({commissionInfo.percentage}%)</span>
                <span className="font-medium text-primary">{commissionInfo.commission.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chauffeur exécutant</span>
                <span className="font-medium">{commissionInfo.receiverEarnings.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais de transaction</span>
                <span className="font-medium">0.25€</span>
              </div>
            </div>
          )}

          {/* Share mode selection */}
          {shareMode === 'choose' && (
            <div className="space-y-3">
              <Label>Comment souhaitez-vous partager ?</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => setShareMode('network')}
                  disabled={stripeNotConnected}
                >
                  <Globe className="w-5 h-5 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Réseau ouvert</p>
                    <p className="text-xs text-muted-foreground">
                      Tous les chauffeurs Stripe Connect proches
                    </p>
                  </div>
                </Button>
                
                {favorites.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setShareMode('favorites')}
                    disabled={stripeNotConnected}
                  >
                    <Heart className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Mes favoris ({stripeReadyFavorites.length})</p>
                      <p className="text-xs text-muted-foreground">
                        Envoyer uniquement à vos chauffeurs privilégiés
                      </p>
                    </div>
                  </Button>
                )}
                
                {favorites.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setShareMode('specific')}
                    disabled={stripeNotConnected}
                  >
                    <UserCheck className="w-5 h-5 mr-3 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Chauffeur spécifique</p>
                      <p className="text-xs text-muted-foreground">
                        Choisir un chauffeur en particulier
                      </p>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Network confirmation */}
          {shareMode === 'network' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Publier sur le réseau</Label>
                <Button variant="ghost" size="sm" onClick={() => setShareMode('choose')}>Retour</Button>
              </div>
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Réseau ouvert SoloCab
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tous les chauffeurs avec Stripe Connect actif pourront voir et accepter cette course.
                  Les chauffeurs proches de la zone de prise en charge seront prioritaires.
                </p>
              </div>
            </div>
          )}

          {/* Favorites confirmation */}
          {shareMode === 'favorites' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Envoyer aux favoris</Label>
                <Button variant="ghost" size="sm" onClick={() => setShareMode('choose')}>Retour</Button>
              </div>
              {stripeReadyFavorites.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Aucun favori avec Stripe Connect actif.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {stripeReadyFavorites.map((fav) => (
                    <div key={fav.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={fav.driver_photo || undefined} />
                        <AvatarFallback className="text-xs">{fav.driver_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{fav.driver_name}</span>
                      <span className="text-xs text-primary font-mono">{formatSharingNumber(fav.driver_sharing_number)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Specific driver selection */}
          {shareMode === 'specific' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Choisir un chauffeur</Label>
                <Button variant="ghost" size="sm" onClick={() => { setShareMode('choose'); setSelectedFavorite(null); }}>Retour</Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    onClick={() => fav.has_stripe_connect && fav.is_premium && setSelectedFavorite(fav)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedFavorite?.id === fav.id
                        ? 'border-primary bg-primary/10'
                        : (!fav.has_stripe_connect || !fav.is_premium)
                        ? 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={fav.driver_photo || undefined} />
                        <AvatarFallback>{fav.driver_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{fav.driver_name}</p>
                        {fav.driver_company && (
                          <p className="text-xs text-muted-foreground truncate">{fav.driver_company}</p>
                        )}
                        <div className="flex items-center gap-1 text-primary font-mono text-xs">
                          <Hash className="w-3 h-3" />
                          {formatSharingNumber(fav.driver_sharing_number)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {fav.show_rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" />{fav.driver_rating.toFixed(1)}</span>}
                          {fav.show_rides && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{fav.driver_rides}</span>}
                          {fav.show_phone && fav.driver_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{fav.driver_phone}</span>}
                        </div>
                      </div>
                      {!fav.has_stripe_connect && (
                        <Badge variant="destructive" className="text-xs">Pas Stripe</Badge>
                      )}
                      {fav.has_stripe_connect && !fav.is_premium && (
                        <Badge variant="secondary" className="text-xs">Non Premium</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client notification */}
          {shareMode !== 'choose' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-client">Notifier le client</Label>
                <Switch id="notify-client" checked={notifyClient} onCheckedChange={setNotifyClient} />
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
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          {shareMode !== 'choose' && (
            <Button
              onClick={handleSendCourse}
              disabled={
                (shareMode === 'specific' && !selectedFavorite) || 
                (shareMode === 'favorites' && stripeReadyFavorites.length === 0) ||
                sending || stripeNotConnected
              }
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {sending ? 'Envoi...' : shareMode === 'network' ? 'Publier' : shareMode === 'favorites' ? 'Envoyer aux favoris' : 'Envoyer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
