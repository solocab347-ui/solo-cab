import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Car,
  FileText,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Euro,
  Lock,
  Users,
  ExternalLink,
  RefreshCw,
  Banknote,
  Clock,
  Rocket,
  LogOut,
  Play,
  ChevronRight,
  Wallet,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import logo from '@/assets/logo-solocab.png';

interface SimplifiedOnboardingProps {
  driverId: string;
  userId: string;
  driverProfile: any;
  onComplete: () => void;
}

// New order: Vehicle → Documents → Stripe (soft) → Validation
const STEPS = [
  { id: 'vehicle', title: 'Véhicule', icon: Car },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'stripe', title: 'Paiements', icon: Wallet },
  { id: 'validation', title: 'Lancement', icon: Rocket },
];

const VEHICLE_COLORS = [
  { value: 'noir', label: 'Noir', hex: '#1a1a1a' },
  { value: 'blanc', label: 'Blanc', hex: '#f5f5f5' },
  { value: 'gris', label: 'Gris', hex: '#9ca3af' },
  { value: 'bleu', label: 'Bleu', hex: '#3b82f6' },
  { value: 'rouge', label: 'Rouge', hex: '#ef4444' },
  { value: 'vert', label: 'Vert', hex: '#22c55e' },
  { value: 'beige', label: 'Beige', hex: '#d4a76a' },
  { value: 'marron', label: 'Marron', hex: '#78350f' },
  { value: 'argent', label: 'Argent', hex: '#c0c0c0' },
  { value: 'or', label: 'Or', hex: '#d4af37' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'violet', label: 'Violet', hex: '#8b5cf6' },
];

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
};

export function SimplifiedOnboardingTunnel({
  driverId,
  userId,
  driverProfile,
  onComplete,
}: SimplifiedOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // Stripe state
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    status: string;
    charges_enabled: boolean;
    details_submitted: boolean;
  } | null>(null);

  // Vehicle state  
  const [vehicleBrand, setVehicleBrand] = useState(driverProfile?.driver?.vehicle_brand || '');
  const [vehicleModel, setVehicleModel] = useState(driverProfile?.driver?.vehicle_model || '');
  const [vehicleYear, setVehicleYear] = useState(String(driverProfile?.driver?.vehicle_year || new Date().getFullYear()));
  const [vehicleColor, setVehicleColor] = useState(driverProfile?.driver?.vehicle_color || '');
  const [vehicleSeats, setVehicleSeats] = useState(String(driverProfile?.driver?.vehicle_seats || 4));
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Documents state
  const [documentsStatus, setDocumentsStatus] = useState(driverProfile?.driver?.documents_status || 'pending');

  // Validation state
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Vehicle sub-step wizard (one field at a time)
  const [vehicleSubStep, setVehicleSubStep] = useState(0);

  // Auto-detect starting step based on existing data
  useEffect(() => {
    const driver = driverProfile?.driver;
    if (!driver) return;

    if (driver.vehicle_brand && driver.vehicle_model && driver.vehicle_color) {
      if (driver.documents_status === 'submitted' || driver.documents_status === 'validated') {
        if (driver.stripe_connect_account_id && driver.stripe_connect_status !== 'not_connected') {
          setCurrentStep(3); // Validation
        } else {
          setCurrentStep(2); // Stripe
        }
      } else {
        setCurrentStep(1); // Documents
      }
    }
  }, []);

  // Check Stripe status
  const checkStripeStatus = useCallback(async () => {
    setStripeStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-status');
      if (error) throw error;
      setStripeStatus(data);
    } catch (error) {
      console.error('Stripe status error:', error);
    } finally {
      setStripeStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStripeStatus();
  }, [checkStripeStatus]);

  // Poll for document validation on validation step
  useEffect(() => {
    if (currentStep !== 3) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('drivers')
        .select('documents_status')
        .eq('id', driverId)
        .single();
      if (data?.documents_status && data.documents_status !== documentsStatus) {
        setDocumentsStatus(data.documents_status);
        if (data.documents_status === 'validated') {
          toast.success('🎉 Vos documents ont été validés !');
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentStep, driverId, documentsStatus]);

  const startStripeOnboarding = async () => {
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      if (error) throw error;
      if (data?.url) {
        // Open in same tab for better UX flow
        toast.info('Vous allez être redirigé vers Stripe. Revenez ici après inscription.');
        setTimeout(() => {
          window.open(data.url, '_blank');
        }, 800);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setStripeLoading(false);
    }
  };

  const saveVehicle = async () => {
    if (!vehicleBrand || !vehicleModel || !vehicleColor) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSavingVehicle(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          vehicle_brand: vehicleBrand,
          vehicle_model: vehicleModel,
          vehicle_year: parseInt(vehicleYear),
          vehicle_color: vehicleColor,
          vehicle_seats: parseInt(vehicleSeats),
        })
        .eq('id', driverId);
      if (error) throw error;
      toast.success('Véhicule enregistré !');
      goToStep(1);
    } catch (error: any) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-driver-trial', {
        body: { driver_id: driverId },
      });
      if (error) throw error;
      if (data?.success || data?.already_active || data?.already_subscribed) {
        toast.success('🎉 Votre compte est activé ! Bienvenue sur SoloCab.');
        await supabase
          .from('drivers')
          .update({ onboarding_completed: true })
          .eq('id', driverId);
        onComplete();
      }
    } catch (error: any) {
      toast.error("Erreur lors de l'activation");
    } finally {
      setActivating(false);
    }
  };

  const refreshDocStatus = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase
        .from('drivers')
        .select('documents_status')
        .eq('id', driverId)
        .single();
      if (data) {
        setDocumentsStatus(data.documents_status);
      }
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  };

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const isStripeReady = stripeStatus?.details_submitted || stripeStatus?.charges_enabled;
  const isVehicleComplete = vehicleBrand && vehicleModel && vehicleColor;
  const isDocsSubmitted = documentsStatus === 'submitted' || documentsStatus === 'validated';
  const isDocsValidated = documentsStatus === 'validated';
  const canActivate = isDocsValidated && (stripeStatus?.charges_enabled || stripeStatus?.details_submitted);

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return !!isVehicleComplete;
      case 1: return isDocsSubmitted;
      case 2: return isStripeReady;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      saveVehicle();
      return;
    }
    if (currentStep < STEPS.length - 1 && canGoNext()) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SoloCab" className="w-7 h-7" />
            <span className="text-sm font-semibold text-foreground">Configuration</span>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/auth';
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isComplete =
              (i === 0 && !!isVehicleComplete) ||
              (i === 1 && isDocsSubmitted) ||
              (i === 2 && isStripeReady) ||
              (i === 3 && isDocsValidated);

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (i < currentStep || isComplete) goToStep(i);
                }}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all',
                  isActive && 'bg-primary/10',
                  !isActive && i > currentStep && 'opacity-40'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                    isComplete
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute inset-0 overflow-y-auto px-4 py-6"
          >
            {/* STEP 0: Vehicle */}
            {currentStep === 0 && (
              <VehicleStep
                vehicleBrand={vehicleBrand}
                vehicleModel={vehicleModel}
                vehicleYear={vehicleYear}
                vehicleColor={vehicleColor}
                vehicleSeats={vehicleSeats}
                onBrandChange={setVehicleBrand}
                onModelChange={setVehicleModel}
                onYearChange={setVehicleYear}
                onColorChange={setVehicleColor}
                onSeatsChange={setVehicleSeats}
              />
            )}

            {/* STEP 1: Documents */}
            {currentStep === 1 && (
              <div className="max-w-md mx-auto">
                <OnboardingDocumentsStep
                  driverId={driverId}
                  userId={userId}
                  onStatusChange={(status) => setDocumentsStatus(status)}
                />
              </div>
            )}

            {/* STEP 2: Stripe (Soft approach) */}
            {currentStep === 2 && (
              <StripeStep
                stripeStatus={stripeStatus}
                stripeLoading={stripeLoading}
                stripeStatusLoading={stripeStatusLoading}
                onStartStripe={startStripeOnboarding}
                onCheckStatus={checkStripeStatus}
                onSkipForNow={() => goToStep(3)}
              />
            )}

            {/* STEP 3: Validation / Activation */}
            {currentStep === 3 && (
              <ValidationStep
                isDocsValidated={isDocsValidated}
                isDocsSubmitted={isDocsSubmitted}
                isVehicleComplete={!!isVehicleComplete}
                stripeStatus={stripeStatus}
                canActivate={canActivate}
                activating={activating}
                refreshing={refreshing}
                onActivate={handleActivate}
                onRefreshDocs={refreshDocStatus}
                onGoToDocuments={() => goToStep(1)}
                onGoToStripe={() => goToStep(2)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      {currentStep < 3 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="h-12 px-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {currentStep !== 2 ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext() || savingVehicle}
                className="flex-1 h-12 text-base font-semibold"
              >
                {savingVehicle ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => goToStep(3)}
                variant={isStripeReady ? 'default' : 'outline'}
                className="flex-1 h-12 text-base font-semibold"
              >
                {isStripeReady ? (
                  <>
                    Continuer
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Passer pour l'instant
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vehicle Step ─────────────────────────────────────────────────────────────

function VehicleStep({
  vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleSeats,
  onBrandChange, onModelChange, onYearChange, onColorChange, onSeatsChange,
}: {
  vehicleBrand: string; vehicleModel: string; vehicleYear: string;
  vehicleColor: string; vehicleSeats: string;
  onBrandChange: (v: string) => void; onModelChange: (v: string) => void;
  onYearChange: (v: string) => void; onColorChange: (v: string) => void;
  onSeatsChange: (v: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Car className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Votre véhicule</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Décrivez votre véhicule pour vos futurs clients
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1.5 block">Marque *</Label>
            <Input
              placeholder="Mercedes, BMW..."
              value={vehicleBrand}
              onChange={(e) => onBrandChange(e.target.value)}
              className="h-12 bg-input"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Modèle *</Label>
            <Input
              placeholder="Classe E, Série 5..."
              value={vehicleModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="h-12 bg-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1.5 block">Année</Label>
            <Select value={vehicleYear} onValueChange={onYearChange}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Places passagers</Label>
            <Select value={vehicleSeats} onValueChange={onSeatsChange}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} place{n > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Color picker */}
        <div>
          <Label className="text-xs mb-2 block">Couleur *</Label>
          <div className="grid grid-cols-6 gap-2">
            {VEHICLE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onColorChange(c.value)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg transition-all border-2',
                  vehicleColor === c.value
                    ? 'border-primary bg-primary/5 scale-105'
                    : 'border-transparent hover:bg-muted/50'
                )}
              >
                <div
                  className="w-8 h-8 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[9px] text-muted-foreground">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stripe Step (Soft, educational approach) ─────────────────────────────────

function StripeStep({
  stripeStatus, stripeLoading, stripeStatusLoading,
  onStartStripe, onCheckStatus, onSkipForNow,
}: {
  stripeStatus: any; stripeLoading: boolean; stripeStatusLoading: boolean;
  onStartStripe: () => void; onCheckStatus: () => void; onSkipForNow: () => void;
}) {
  const isReady = stripeStatus?.details_submitted || stripeStatus?.charges_enabled;

  if (stripeStatus?.charges_enabled) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground">Paiements configurés !</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vous pouvez recevoir les paiements de vos clients par carte bancaire.
          </p>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            ✅ Tout est en ordre. Les paiements par carte seront versés directement sur votre compte.
          </p>
        </div>
      </div>
    );
  }

  if (stripeStatus?.details_submitted) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Vérification en cours</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stripe vérifie vos informations. Cela prend généralement quelques minutes.
          </p>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Vous pouvez continuer la configuration en attendant.
          </p>
          <Button variant="outline" size="sm" onClick={onCheckStatus} disabled={stripeStatusLoading}>
            {stripeStatusLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Actualiser le statut
          </Button>
        </div>
      </div>
    );
  }

  // Main Stripe onboarding screen — soft & educational
  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Encaissez vos clients vous-même
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          SoloCab ne touche jamais à votre argent. Vos clients vous paient directement via Stripe, un service de paiement sécurisé utilisé par des millions d'entreprises.
        </p>
      </div>

      {/* Educational info */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Comment ça fonctionne
        </h3>
        <div className="space-y-2.5">
          {[
            { num: '1', text: 'Vous créez un compte Stripe gratuit (2 min)' },
            { num: '2', text: 'Vos clients paient par carte lors de la réservation' },
            { num: '3', text: "L'argent arrive directement sur votre compte bancaire" },
          ].map((item) => (
            <div key={item.num} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">{item.num}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        {[
          { icon: CreditCard, text: 'Paiement par carte automatisé', sub: 'Apple Pay, Google Pay inclus' },
          { icon: Lock, text: 'Empreintes et acomptes sécurisés', sub: 'Protégez-vous des no-shows' },
          { icon: Euro, text: 'Virements chaque lundi', sub: 'Directement sur votre compte' },
        ].map(({ icon: Icon, text, sub }, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{text}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Fees transparency */}
      <div className="bg-muted/50 rounded-xl p-3 text-center">
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-medium">Frais transparents</span> : 0,50 €/course SoloCab + frais bancaires Stripe (~1,5%)
        </p>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Button
          onClick={onStartStripe}
          disabled={stripeLoading}
          className="w-full h-13 text-base font-semibold"
          size="lg"
        >
          {stripeLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Créer mon compte Stripe
              <ExternalLink className="w-4 h-4 ml-2 opacity-60" />
            </>
          )}
        </Button>

        {stripeStatus?.connected && !stripeStatus.details_submitted && (
          <Button onClick={onStartStripe} disabled={stripeLoading} variant="outline" className="w-full h-11">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reprendre ma configuration Stripe
          </Button>
        )}
      </div>

      {/* Security footer */}
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Shield className="w-3 h-3" />
        Vos données bancaires ne transitent jamais par SoloCab
      </p>
    </div>
  );
}

// ─── Validation Step ──────────────────────────────────────────────────────────

function ValidationStep({
  isDocsValidated, isDocsSubmitted, isVehicleComplete, stripeStatus,
  canActivate, activating, refreshing,
  onActivate, onRefreshDocs, onGoToDocuments, onGoToStripe,
}: {
  isDocsValidated: boolean; isDocsSubmitted: boolean; isVehicleComplete: boolean;
  stripeStatus: any; canActivate: boolean; activating: boolean; refreshing: boolean;
  onActivate: () => void; onRefreshDocs: () => void;
  onGoToDocuments: () => void; onGoToStripe: () => void;
}) {
  const isStripeReady = stripeStatus?.details_submitted || stripeStatus?.charges_enabled;

  const checklist = [
    { label: 'Informations véhicule', done: isVehicleComplete },
    { label: 'Documents soumis', done: isDocsSubmitted },
    { label: 'Validation admin', done: isDocsValidated, pending: isDocsSubmitted && !isDocsValidated },
    { label: 'Compte paiement', done: isStripeReady, optional: true },
  ];

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            isDocsValidated ? 'bg-emerald-500/15' : 'bg-amber-500/10'
          )}
        >
          {isDocsValidated ? (
            <Rocket className="w-8 h-8 text-emerald-500" />
          ) : (
            <Clock className="w-8 h-8 text-amber-500" />
          )}
        </div>

        {isDocsValidated ? (
          <>
            <h2 className="text-xl font-bold text-foreground">Tout est prêt !</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vos documents sont validés. Lancez votre activité !
            </p>
          </>
        ) : isDocsSubmitted ? (
          <>
            <h2 className="text-xl font-bold text-foreground">En cours de validation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Notre équipe vérifie vos documents. Vous serez notifié dès validation.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground">Presque terminé</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Finalisez les étapes restantes pour activer votre compte.
            </p>
          </>
        )}
      </div>

      {/* Status checklist */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {checklist.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            {item.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : item.pending ? (
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className={cn('text-sm flex-1', item.done ? 'text-foreground' : 'text-muted-foreground')}>
              {item.label}
            </span>
            {item.optional && !item.done && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
                Optionnel
              </Badge>
            )}
            {item.pending && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                En attente
              </Badge>
            )}
          </div>
        ))}
      </div>

      {!isDocsSubmitted && (
        <Button variant="outline" className="w-full h-11" onClick={onGoToDocuments}>
          <FileText className="w-4 h-4 mr-2" />
          Soumettre mes documents
        </Button>
      )}

      {!isStripeReady && (
        <Button variant="outline" className="w-full h-11" onClick={onGoToStripe}>
          <Wallet className="w-4 h-4 mr-2" />
          Configurer mes paiements
        </Button>
      )}

      {isDocsSubmitted && !isDocsValidated && (
        <Button variant="outline" className="w-full h-11" onClick={onRefreshDocs} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Actualiser le statut
        </Button>
      )}

      {canActivate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Button
            onClick={onActivate}
            disabled={activating}
            className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {activating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Play className="w-6 h-6 mr-2" />
                Lancer mon activité
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
