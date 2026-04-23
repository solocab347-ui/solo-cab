import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { checkDriverStripeStatus } from '@/hooks/useDriverStripeStatus';
import { 
  CheckCircle, 
  Handshake, 
  Building2, 
  Truck, 
  Euro,
  ArrowRight,
  Info,
  CreditCard,
  Banknote,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CommissionInfo {
  type: 'partner' | 'company' | 'fleet';
  partnerName: string;
  commissionPercentage: number;
  commissionAmount: number;
  courseAmount: number;
  netAmount: number;
}

interface StripePaymentInfo {
  isStripePayment: boolean;
  paymentStatus: string | null;
  hasCardHold: boolean;
  depositPaid: number;
  remainingAmount: number;
  paymentMethod: string;
  driverHasStripe: boolean;
}

interface CourseCompletionCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  driverId: string;
  courseAmount: number;
  pickupAddress: string;
  destinationAddress: string;
  scheduledDate: string;
  onConfirm: () => void;
}

export function CourseCompletionCommissionDialog({
  open,
  onOpenChange,
  courseId,
  driverId,
  courseAmount,
  pickupAddress,
  destinationAddress,
  scheduledDate,
  onConfirm,
}: CourseCompletionCommissionDialogProps) {
  const [loading, setLoading] = useState(true);
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null);
  const [stripeInfo, setStripeInfo] = useState<StripePaymentInfo>({
    isStripePayment: false,
    paymentStatus: null,
    hasCardHold: false,
    depositPaid: 0,
    remainingAmount: courseAmount,
    paymentMethod: 'cash',
    driverHasStripe: false,
  });

  useEffect(() => {
    if (open && courseId && driverId) {
      loadCommissionInfo();
      loadStripePaymentInfo();
    }
  }, [open, courseId, driverId]);

  const loadStripePaymentInfo = async () => {
    try {
      const { data: course } = await supabase
        .from('courses')
        .select('payment_method, payment_status, card_hold_status, deposit_amount, deposit_status, stripe_payment_method_id, final_payment_amount, guest_estimated_price')
        .eq('id', courseId)
        .single();

      if (course) {
        // Vérifier si le chauffeur a Stripe Connect
        const driverHasStripe = await checkDriverStripeStatus(driverId);

        const isStripe = driverHasStripe && (
          course.payment_method === 'stripe' || 
          (course.payment_method === 'card' && !!course.stripe_payment_method_id)
        );

        const depositPaid = course.deposit_status === 'paid' ? (course.deposit_amount || 0) : 0;
        const totalAmount = course.final_payment_amount || course.guest_estimated_price || courseAmount;

        setStripeInfo({
          isStripePayment: isStripe,
          paymentStatus: course.payment_status,
          hasCardHold: course.card_hold_status === 'confirmed',
          depositPaid,
          remainingAmount: totalAmount - depositPaid,
          paymentMethod: course.payment_method || 'cash',
          driverHasStripe,
        });
      }
    } catch (error) {
      console.error('Error loading stripe payment info:', error);
    }
  };

  const loadCommissionInfo = async () => {
    setLoading(true);
    try {
      // Vérifier si c'est une course partagée (reçue d'un partenaire)
      const { data: sharedCourse } = await supabase
        .from('shared_courses')
        .select(`
          *,
          partnership:driver_partnerships(
            driver_a_id,
            driver_b_id,
            commission_percentage
          )
        `)
        .eq('course_id', courseId)
        .eq('receiver_driver_id', driverId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (sharedCourse) {
        const { data: senderDriver } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', sharedCourse.sender_driver_id)
          .single();

        let partnerName = 'Partenaire';
        if (senderDriver) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', senderDriver.user_id)
            .single();
          partnerName = profile?.full_name || 'Partenaire';
        }

        const commission = sharedCourse.commission_amount || (courseAmount * (sharedCourse.commission_percentage || 0)) / 100;
        setCommissionInfo({
          type: 'partner',
          partnerName,
          commissionPercentage: sharedCourse.commission_percentage || 0,
          commissionAmount: commission,
          courseAmount,
          netAmount: courseAmount - commission,
        });
        setLoading(false);
        return;
      }

      // Vérifier si c'est une course entreprise
      const { data: companyCourse } = await supabase
        .from('company_courses')
        .select(`*, company:companies(company_name)`)
        .eq('course_id', courseId)
        .maybeSingle();

      if (companyCourse) {
        const { data: agreement } = await supabase
          .from('company_driver_agreements')
          .select('*')
          .eq('company_id', companyCourse.company_id)
          .eq('driver_id', driverId)
          .eq('status', 'active')
          .maybeSingle();

        if (agreement) {
          setCommissionInfo({
            type: 'company',
            partnerName: companyCourse.company?.company_name || 'Entreprise',
            commissionPercentage: agreement.discount_percentage || 0,
            commissionAmount: 0,
            courseAmount,
            netAmount: courseAmount,
          });
          setLoading(false);
          return;
        }
      }

      // Vérifier si c'est une course gestionnaire de flotte
      const { data: driver } = await supabase
        .from('drivers')
        .select('fleet_manager_id')
        .eq('id', driverId)
        .single();

      if (driver?.fleet_manager_id) {
        const { data: fleetManager } = await supabase
          .from('fleet_managers')
          .select('company_name')
          .eq('id', driver.fleet_manager_id)
          .single();

        const { data: fleetDriver } = await supabase
          .from('fleet_manager_drivers')
          .select('commission_percentage')
          .eq('fleet_manager_id', driver.fleet_manager_id)
          .eq('driver_id', driverId)
          .eq('status', 'active')
          .maybeSingle();

        if (fleetDriver) {
          const commissionPct = fleetDriver.commission_percentage || 0;
          const commission = (courseAmount * commissionPct) / 100;
          setCommissionInfo({
            type: 'fleet',
            partnerName: fleetManager?.company_name || 'Gestionnaire de flotte',
            commissionPercentage: commissionPct,
            commissionAmount: commission,
            courseAmount,
            netAmount: courseAmount - commission,
          });
          setLoading(false);
          return;
        }
      }

      setCommissionInfo(null);
    } catch (error) {
      console.error('Error loading frais de transaction info:', error);
      setCommissionInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (!commissionInfo) return <CheckCircle className="w-6 h-6 text-green-500" />;
    switch (commissionInfo.type) {
      case 'partner': return <Handshake className="w-6 h-6 text-blue-500" />;
      case 'company': return <Building2 className="w-6 h-6 text-purple-500" />;
      case 'fleet': return <Truck className="w-6 h-6 text-orange-500" />;
    }
  };

  const getTypeLabel = () => {
    if (!commissionInfo) return 'Course personnelle';
    switch (commissionInfo.type) {
      case 'partner': return 'Course partenaire';
      case 'company': return 'Course entreprise';
      case 'fleet': return 'Course gestionnaire';
    }
  };

  const getTypeBadgeVariant = () => {
    if (!commissionInfo) return 'secondary' as const;
    switch (commissionInfo.type) {
      case 'partner': return 'default' as const;
      case 'company': return 'secondary' as const;
      case 'fleet': return 'outline' as const;
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            Course terminée !
          </DialogTitle>
          <DialogDescription>
            Récapitulatif de votre course
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type de course */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Type de course</span>
            <Badge variant={getTypeBadgeVariant()}>
              {getTypeLabel()}
            </Badge>
          </div>

          {/* Résumé trajet */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              {format(new Date(scheduledDate), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs truncate">{pickupAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-xs truncate">{destinationAddress}</span>
            </div>
          </div>

          {/* ============================================ */}
          {/* STRIPE PAYMENT INFO - Key driver messaging   */}
          {/* ============================================ */}
          {/* CAS 1: Stripe Connect → paiement auto */}
          {stripeInfo.isStripePayment && (
            <Alert className="bg-primary/5 border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs space-y-1.5">
                <p className="font-semibold text-primary">💳 Paiement par carte en ligne (Stripe)</p>
                <p>
                  Le montant de <strong>{stripeInfo.remainingAmount.toFixed(2)}€</strong> sera 
                  prélevé automatiquement sur la carte du client lors de la clôture.
                </p>
                <p className="text-destructive font-semibold">
                  ⚠️ Ne demandez PAS de paiement au client — il sera débité automatiquement.
                </p>
                {stripeInfo.depositPaid > 0 && (
                  <p className="text-muted-foreground">
                    Acompte déjà payé : {stripeInfo.depositPaid.toFixed(2)}€
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* CAS 2: Carte bancaire SANS Stripe → TPE physique */}
          {!stripeInfo.isStripePayment && stripeInfo.paymentMethod === 'card' && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs space-y-1.5">
                <p className="font-semibold text-amber-700">💳 Paiement par carte bancaire (TPE)</p>
                <p>
                  Vous devez encaisser <strong>{stripeInfo.remainingAmount.toFixed(2)}€</strong> directement 
                  avec votre terminal de paiement (TPE).
                </p>
                <p className="text-amber-600 font-semibold">
                  ⚠️ Encaissez le client avec votre propre terminal avant de le laisser partir.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* CAS 3: Espèces - chauffeur SANS Stripe */}
          {!stripeInfo.isStripePayment && stripeInfo.paymentMethod !== 'card' && !stripeInfo.driverHasStripe && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <Banknote className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs space-y-1.5">
                <p className="font-semibold text-green-700">💵 Paiement en espèces</p>
                <p>
                  Vous devez encaisser <strong>{stripeInfo.remainingAmount.toFixed(2)}€</strong> en espèces 
                  directement auprès du client.
                </p>
                <p className="text-green-600 font-semibold">
                  ⚠️ Encaissez le client avant de le laisser partir.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* CAS 4: Espèces - chauffeur AVEC Stripe (le client a choisi espèces) */}
          {!stripeInfo.isStripePayment && stripeInfo.paymentMethod === 'cash' && stripeInfo.driverHasStripe && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <Banknote className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs space-y-1.5">
                <p className="font-semibold text-green-700">💵 Paiement en espèces</p>
                <p>
                  Malgré votre compte Stripe, ce client a choisi le paiement en <strong>espèces</strong>.
                  Encaissez <strong>{stripeInfo.remainingAmount.toFixed(2)}€</strong> directement.
                </p>
                <p className="text-green-600 font-semibold">
                  ⚠️ Encaissez le client avant de le laisser partir.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Détails financiers */}
          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <span className="font-medium">Montant total</span>
              <span className="text-lg font-bold text-foreground flex items-center gap-1">
                <Euro className="w-4 h-4" />
                {courseAmount.toFixed(2)} €
              </span>
            </div>

            {stripeInfo.isStripePayment && stripeInfo.depositPaid > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Acompte payé</span>
                <span className="text-green-600">-{stripeInfo.depositPaid.toFixed(2)} €</span>
              </div>
            )}

            {stripeInfo.isStripePayment && (
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Sera prélevé automatiquement
                </span>
                <span className="font-semibold text-primary">{stripeInfo.remainingAmount.toFixed(2)} €</span>
              </div>
            )}

            {commissionInfo && commissionInfo.commissionAmount > 0 && (
              <>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Commission à reverser
                    </span>
                    <span className="text-orange-500 font-medium">
                      -{commissionInfo.commissionAmount.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Partenaire</span>
                    <span className="font-medium">{commissionInfo.partnerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taux</span>
                    <span className="font-medium">{commissionInfo.commissionPercentage}%</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-green-600">Votre net</span>
                    <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      {commissionInfo.netAmount.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </>
            )}

            {commissionInfo && commissionInfo.type === 'company' && (
              <Alert className="bg-purple-50 border-purple-200">
                <Info className="w-4 h-4 text-purple-500" />
                <AlertDescription className="text-xs text-purple-700">
                  Course effectuée pour <strong>{commissionInfo.partnerName}</strong>. 
                  Le paiement sera géré selon votre accord de partenariat.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {commissionInfo && commissionInfo.commissionAmount > 0 && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Cette commission sera automatiquement ajoutée à votre solde partenariat. 
                Consultez l'onglet "Partage et Partenariat" pour voir les détails et gérer les règlements.
              </AlertDescription>
            </Alert>
          )}

          {!loading && !commissionInfo && !stripeInfo.isStripePayment && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <AlertDescription className="text-xs text-green-700">
                C'est votre course personnelle - vous conservez 100% du montant.
              </AlertDescription>
            </Alert>
          )}

          {!loading && !commissionInfo && stripeInfo.isStripePayment && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <AlertDescription className="text-xs text-green-700">
                Le paiement sera automatiquement crédité sur votre compte (frais de transaction déduits).
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            {stripeInfo.isStripePayment 
              ? 'Clôturer et encaisser automatiquement' 
              : stripeInfo.paymentMethod === 'card' 
                ? '\'Jai encaissé avec mon TPE' 
                : stripeInfo.paymentMethod === 'cash' 
                  ? '\'Jai encaissé en espèces' 
                  : 'Confirmer la clôture'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
