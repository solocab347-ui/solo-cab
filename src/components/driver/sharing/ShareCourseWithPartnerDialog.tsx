import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, Send, Star, Car, Heart, Globe, AlertTriangle,
  CreditCard, ExternalLink, Loader2, Euro, Crown, Clock,
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

const SOLOCAB_FEE_PER_DRIVER = 0.25; // shared course fee, per driver

export function ShareCourseWithPartnerDialog({
  open,
  onOpenChange,
  course,
  driverId,
  onSuccess,
}: ShareCourseWithPartnerDialogProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Publication settings
  const [commission, setCommission] = useState<number>(22); // 20-25%
  const [alsoBroadcastNetwork, setAlsoBroadcastNetwork] = useState<boolean>(true);
  const [favoritesWindow, setFavoritesWindow] = useState<number>(5); // minutes
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientMessage, setClientMessage] = useState('');

  const { isPremium } = useDriverPremium();
  const { isNotConnected: stripeNotConnected } = useStripeConnectStatus(driverId);

  useEffect(() => {
    if (open && driverId && isPremium) {
      loadFavorites();
      setSelectedFavoriteIds(new Set());
      setCommission(22);
      setAlsoBroadcastNetwork(true);
      setFavoritesWindow(5);
    }
  }, [open, driverId, isPremium]);

  useEffect(() => {
    setClientMessage(
      `Je ne peux pas effectuer cette course mais je vous confie à l'un de mes partenaires de confiance qui prendra soin de vous.`,
    );
  }, [open]);

  // ---- Premium gating ----
  if (open && !isPremium) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Fonctionnalité Premium
            </DialogTitle>
            <DialogDescription>
              Le partage de courses est réservé aux abonnés Premium.
            </DialogDescription>
          </DialogHeader>
          <PremiumGate
            isPremium={false}
            featureName="Partage de courses"
            featureDescription="Partagez vos courses avec d'autres chauffeurs et touchez une commission de 20 à 25%."
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
          .select(`
            id, user_id, company_name, sharing_number,
            rating, total_rides,
            stripe_connect_account_id, stripe_connect_charges_enabled,
            show_rating_for_sharing, show_rides_for_sharing
          `)
          .eq('id', fav.favorite_driver_id)
          .maybeSingle();

        if (!driverData) continue;

        // Profile (name + photo)
        const { data: profileData } = (await (supabase as any)
          .from('profiles')
          .select('full_name, profile_photo_url, avatar_url')
          .eq('user_id', (driverData as any).user_id)
          .maybeSingle()) as { data: { full_name?: string; profile_photo_url?: string; avatar_url?: string } | null };

        // Premium status via active subscription
        const { data: sub } = await supabase
          .from('driver_subscriptions')
          .select('status')
          .eq('driver_id', fav.favorite_driver_id)
          .maybeSingle();

        enriched.push({
          id: fav.id,
          favorite_driver_id: fav.favorite_driver_id,
          driver_name: profileData?.full_name || 'Chauffeur',
          driver_photo:
            profileData?.profile_photo_url || profileData?.avatar_url || null,
          driver_company: (driverData as any).company_name,
          driver_sharing_number: (driverData as any).sharing_number,
          driver_rating: Number((driverData as any).rating) || 0,
          driver_rides: (driverData as any).total_rides || 0,
          show_rating: (driverData as any).show_rating_for_sharing ?? true,
          show_rides: (driverData as any).show_rides_for_sharing ?? true,
          has_stripe_connect: !!(
            (driverData as any).stripe_connect_account_id &&
            (driverData as any).stripe_connect_charges_enabled
          ),
          is_premium: sub?.status === 'active' || sub?.status === 'trialing',
        });
      }
      setFavorites(enriched);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatSharingNumber = (num: number | null) =>
    num ? `SOLO-${String(num).padStart(6, '0')}` : 'N/A';

  // ---- Course amount + financial breakdown ----
  // Order of precedence: accepted devis > devis_amount fallback > guest_estimated_price
  // (guest courses created via the chained "Créer + partager" flow expose the price as guest_estimated_price)
  const courseAmount = useMemo(() => {
    const accepted = course?.devis?.find?.((d: any) => d.status === 'accepted');
    return Number(
      accepted?.amount ||
      course?.devis_amount ||
      course?.guest_estimated_price ||
      course?.estimated_price ||
      0,
    );
  }, [course]);

  const breakdown = useMemo(() => {
    const commissionAmount = (courseAmount * commission) / 100;
    const senderNet = commissionAmount - SOLOCAB_FEE_PER_DRIVER;
    const receiverGross = courseAmount - commissionAmount;
    const receiverNet = receiverGross - SOLOCAB_FEE_PER_DRIVER;
    return { commissionAmount, senderNet, receiverGross, receiverNet };
  }, [courseAmount, commission]);

  const eligibleFavorites = useMemo(
    () => favorites.filter((f) => f.has_stripe_connect),
    [favorites],
  );

  const toggleFavorite = (id: string) => {
    setSelectedFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFavorites = () =>
    setSelectedFavoriteIds(new Set(eligibleFavorites.map((f) => f.favorite_driver_id)));

  const clearFavoriteSelection = () => setSelectedFavoriteIds(new Set());

  // ---- Validation ----
  // 🚫 Le paiement en espèces est INTERDIT sur les courses partagées :
  // tout règlement doit transiter par Stripe pour garantir la traçabilité,
  // le déclenchement automatique de la commission et la clôture sécurisée.
  const isCashRequested = (course?.payment_method ?? course?.payment_method_requested) === 'cash';

  const canPublish =
    !stripeNotConnected &&
    !isCashRequested &&
    courseAmount > 0 &&
    (selectedFavoriteIds.size > 0 || alsoBroadcastNetwork);

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

  const handlePublish = async () => {
    if (!course || !canPublish) return;
    if (isCashRequested) {
      toast.error("Une course en espèces ne peut jamais être partagée. Passez la course en Carte bancaire.");
      return;
    }
    setSending(true);
    try {
      const targetIds =
        selectedFavoriteIds.size > 0 ? Array.from(selectedFavoriteIds) : null;

      const { data, error } = await supabase.rpc('publish_course_to_pool', {
        p_course_id: course.id,
        p_sender_driver_id: driverId,
        p_commission_percentage: commission,
        p_target_favorite_ids: targetIds,
        p_also_broadcast_network: alsoBroadcastNetwork,
        p_favorites_window_minutes: favoritesWindow,
        p_message: null,
      });

      if (error) throw error;
      const result = (data as any)?.[0] || data;
      if (result && result.success === false) {
        throw new Error(result.message || "Échec de la publication");
      }

      // Notify client (optional)
      if (notifyClient && course.client_id) {
        await notifyClientAboutShare(course.client_id, clientMessage);
      }

      // Notify selected favorites immediately (best effort)
      if (targetIds && targetIds.length > 0) {
        for (const fid of targetIds) {
          const { data: rec } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', fid)
            .maybeSingle();
          if (rec?.user_id) {
            await supabase.from('notifications').insert({
              user_id: rec.user_id,
              title: '🤝 Nouvelle course partagée',
              message: `Une course est disponible pour le ${format(
                new Date(course.scheduled_date),
                "d MMMM yyyy 'à' HH:mm",
                { locale: fr },
              )} (commission ${commission}%)`,
              type: 'info',
              link: '/driver-dashboard',
            });
          }
        }
      }

      const scopeLabel =
        targetIds && alsoBroadcastNetwork
          ? `${targetIds.length} favori(s), puis réseau dans ${favoritesWindow} min`
          : targetIds
            ? `${targetIds.length} favori(s) uniquement`
            : 'Réseau ouvert';
      toast.success(`Course publiée • ${scopeLabel}`);

      onOpenChange(false);
      setSelectedFavoriteIds(new Set());
      onSuccess();
    } catch (err: any) {
      console.error('Publish error:', err);
      if (err?.code === '23505') {
        toast.error('Cette course est déjà publiée dans le pool.');
      } else {
        toast.error(err?.message || 'Erreur lors de la publication.');
      }
    } finally {
      setSending(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Publier la course
          </DialogTitle>
          <DialogDescription>
            Choisissez vos favoris, votre commission et la diffusion réseau.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stripe Connect Required */}
          {stripeNotConnected && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 font-semibold">Stripe Connect requis</AlertTitle>
              <AlertDescription className="text-amber-600 text-sm space-y-2">
                <p>Pour partager des courses, configurez Stripe Connect.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/driver-dashboard?tab=settings';
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configurer Stripe
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isCashRequested && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive font-semibold">
                Paiement en espèces non autorisé
              </AlertTitle>
              <AlertDescription className="text-destructive/90 text-sm">
                Une course en espèces ne peut <strong>jamais</strong> être partagée. Tout règlement
                doit transiter par Stripe (lien / QR code) afin de garantir la traçabilité,
                le déclenchement automatique de la commission et la clôture sécurisée.
                Modifiez le moyen de paiement de la course en <strong>Carte bancaire</strong> avant de la partager.
              </AlertDescription>
            </Alert>
          )}

          {/* Course summary */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium truncate">
                {course.clients?.profiles?.full_name ||
                  course.guest_name ||
                  'Client'}
              </p>
              {course.is_guest_booking && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  Client privé
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              📍 {course.pickup_address}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              🏁 {course.destination_address}
            </p>
            {(course.distance_km || course.duration_minutes) && (
              <p className="text-[11px] text-muted-foreground">
                {course.distance_km ? `${Number(course.distance_km).toFixed(1)} km` : ''}
                {course.distance_km && course.duration_minutes ? ' • ' : ''}
                {course.duration_minutes ? `${Math.round(Number(course.duration_minutes))} min` : ''}
              </p>
            )}
            {courseAmount > 0 && (
              <p className="text-primary font-semibold mt-2">{courseAmount.toFixed(2)}€</p>
            )}
          </div>

          {/* Commission slider 20-25% */}
          <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5" />
                Votre commission
              </Label>
              <Badge variant="secondary" className="font-mono">{commission}%</Badge>
            </div>
            <Slider
              value={[commission]}
              min={20}
              max={25}
              step={1}
              onValueChange={(v) => setCommission(v[0])}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>20%</span><span>21%</span><span>22%</span><span>23%</span><span>24%</span><span>25%</span>
            </div>
          </div>

          {/* Financial breakdown */}
          {courseAmount > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1 text-xs">
              <p className="font-medium text-sm flex items-center gap-1">
                <Euro className="h-3.5 w-3.5" />
                Répartition automatique
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course (carte)</span>
                <span className="font-medium">{courseAmount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Commission ({commission}%)
                </span>
                <span className="font-medium">{breakdown.commissionAmount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Vous (net après frais 0.25€)</span>
                <span className="font-semibold">{breakdown.senderNet.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Chauffeur partenaire (net après frais 0.25€)
                </span>
                <span className="font-medium">{breakdown.receiverNet.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frais SoloCab total</span>
                <span>0.50€</span>
              </div>
            </div>
          )}

          {/* Favorites selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-primary" />
                Favoris prioritaires
                {eligibleFavorites.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedFavoriteIds.size}/{eligibleFavorites.length})
                  </span>
                )}
              </Label>
              {eligibleFavorites.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={selectAllFavorites}
                  >
                    Tous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={clearFavoriteSelection}
                  >
                    Aucun
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : eligibleFavorites.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Aucun favori avec Stripe Connect actif. La course sera diffusée au réseau.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-1">
                {eligibleFavorites.map((fav) => {
                  const checked = selectedFavoriteIds.has(fav.favorite_driver_id);
                  return (
                    <div
                      key={fav.id}
                      onClick={() => toggleFavorite(fav.favorite_driver_id)}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        checked ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={fav.driver_photo || undefined} />
                        <AvatarFallback className="text-xs">
                          {fav.driver_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fav.driver_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">{formatSharingNumber(fav.driver_sharing_number)}</span>
                          {fav.show_rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 text-yellow-500" />
                              {fav.driver_rating.toFixed(1)}
                            </span>
                          )}
                          {fav.show_rides && (
                            <span className="flex items-center gap-0.5">
                              <Car className="w-2.5 h-2.5" />
                              {fav.driver_rides}
                            </span>
                          )}
                        </div>
                      </div>
                      {!fav.is_premium && (
                        <Badge variant="outline" className="text-[10px]">Non Premium</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Network broadcast toggle */}
          <div className="space-y-3 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="broadcast-network" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Diffuser au réseau
              </Label>
              <Switch
                id="broadcast-network"
                checked={alsoBroadcastNetwork}
                onCheckedChange={setAlsoBroadcastNetwork}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {selectedFavoriteIds.size > 0 && alsoBroadcastNetwork
                ? `Vos favoris ont la priorité pendant ${favoritesWindow} min, puis la course sera ouverte au réseau Premium.`
                : alsoBroadcastNetwork
                  ? 'La course sera immédiatement visible par tous les chauffeurs Premium.'
                  : selectedFavoriteIds.size > 0
                    ? 'La course sera réservée à vos favoris uniquement.'
                    : 'Sélectionnez au moins un favori ou activez la diffusion réseau.'}
            </p>

            {selectedFavoriteIds.size > 0 && alsoBroadcastNetwork && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Délai d'exclusivité favoris
                  </Label>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {favoritesWindow} min
                  </Badge>
                </div>
                <Slider
                  value={[favoritesWindow]}
                  min={2}
                  max={30}
                  step={1}
                  onValueChange={(v) => setFavoritesWindow(v[0])}
                />
              </div>
            )}
          </div>

          {/* Client notification */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-client" className="text-sm">Notifier le client</Label>
              <Switch
                id="notify-client"
                checked={notifyClient}
                onCheckedChange={setNotifyClient}
              />
            </div>
            {notifyClient && (
              <Textarea
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                placeholder="Message envoyé au client..."
                rows={2}
                className="text-xs"
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handlePublish} disabled={!canPublish || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {sending ? 'Publication…' : 'Publier la course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
