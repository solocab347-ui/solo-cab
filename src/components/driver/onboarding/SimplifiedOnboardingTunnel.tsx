import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, ArrowLeft, Car, FileText, CheckCircle2, Loader2,
  Shield, Zap, Euro, Lock, ExternalLink, RefreshCw, Clock, Rocket,
  LogOut, Play, ChevronRight, Wallet, Info, CreditCard, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { ProfileStep } from './steps/ProfileStep';
import { PricingStep } from './steps/PricingStep';
import { VehicleStep, VEHICLE_COLORS } from './steps/VehicleStep';
import logo from '@/assets/logo-solocab.png';

interface SimplifiedOnboardingProps {
  driverId: string;
  userId: string;
  driverProfile: any;
  onComplete: () => void;
}

const STEPS = [
  { id: 'profile', title: 'Profil', icon: Building2 },
  { id: 'vehicle', title: 'Véhicule', icon: Car },
  { id: 'pricing', title: 'Tarifs', icon: Euro },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'stripe', title: 'Paiements', icon: Wallet },
  { id: 'validation', title: 'Lancement', icon: Rocket },
];

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
};

export function SimplifiedOnboardingTunnel({
  driverId, userId, driverProfile, onComplete,
}: SimplifiedOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // Profile state
  // Profile state
  const profileName = driverProfile?.profile?.full_name || '';
  const nameParts = profileName.split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [companyName, setCompanyName] = useState(driverProfile?.driver?.company_name || '');
  const [siret, setSiret] = useState(driverProfile?.driver?.siret || '');
  const [companyAddress, setCompanyAddress] = useState(driverProfile?.driver?.company_address || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Vehicle state
  const [vehicleBrand, setVehicleBrand] = useState(driverProfile?.driver?.vehicle_brand || '');
  const [vehicleModel, setVehicleModel] = useState(driverProfile?.driver?.vehicle_model || '');
  const [vehicleYear, setVehicleYear] = useState(String(driverProfile?.driver?.vehicle_year || new Date().getFullYear()));
  const [vehicleColor, setVehicleColor] = useState(driverProfile?.driver?.vehicle_color || '');
  const [vehicleSeats, setVehicleSeats] = useState(String(driverProfile?.driver?.vehicle_seats || 4));
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Pricing state
  const [baseFare, setBaseFare] = useState(String(driverProfile?.driver?.base_fare || ''));
  const [perKmRate, setPerKmRate] = useState(String(driverProfile?.driver?.per_km_rate || ''));
  const [minimumPrice, setMinimumPrice] = useState(String(driverProfile?.driver?.minimum_price || ''));
  const [hourlyRate, setHourlyRate] = useState(String(driverProfile?.driver?.hourly_rate || ''));
  const [approachEnabled, setApproachEnabled] = useState<boolean>(!!(driverProfile?.driver as any)?.approach_enabled);
  const [approachPerKmRate, setApproachPerKmRate] = useState(String((driverProfile?.driver as any)?.approach_per_km_rate || '0'));
  const [savingPricing, setSavingPricing] = useState(false);

  // Stripe state
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<any>(null);

  // Documents state
  const [documentsStatus, setDocumentsStatus] = useState(driverProfile?.driver?.documents_status || 'pending');

  // Validation state
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-detect starting step
  useEffect(() => {
    const d = driverProfile?.driver;
    if (!d) return;

    const hasProfile = d.company_name && d.siret && d.company_address;
    const hasVehicle = d.vehicle_brand && d.vehicle_model && d.vehicle_color;
    const hasPricing = d.base_fare && d.per_km_rate;
    const hasDocs = d.documents_status === 'submitted' || d.documents_status === 'validated';
    const hasStripe = d.stripe_connect_account_id && d.stripe_connect_status !== 'not_connected';

    if (hasProfile && hasVehicle && hasPricing && hasDocs && hasStripe) setCurrentStep(5);
    else if (hasProfile && hasVehicle && hasPricing && hasDocs) setCurrentStep(4);
    else if (hasProfile && hasVehicle && hasPricing) setCurrentStep(3);
    else if (hasProfile && hasVehicle) setCurrentStep(2);
    else if (hasProfile) setCurrentStep(1);
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

  useEffect(() => { checkStripeStatus(); }, [checkStripeStatus]);

  // Poll for document validation on validation step
  useEffect(() => {
    if (currentStep !== 5) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('drivers').select('documents_status').eq('id', driverId).single();
      if (data?.documents_status && data.documents_status !== documentsStatus) {
        setDocumentsStatus(data.documents_status);
        if (data.documents_status === 'validated') toast.success('🎉 Vos documents ont été validés !');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentStep, driverId, documentsStatus]);

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  // Save handlers
  const saveProfile = async () => {
    if (!firstName || !lastName || !companyName || !siret || siret.length !== 14 || !companyAddress) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }
    setSavingProfile(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      // Update profile name
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
      // Update driver info
      const { error } = await supabase.from('drivers').update({
        company_name: companyName, siret, company_address: companyAddress,
      }).eq('id', driverId);
      if (error) throw error;
      toast.success('Profil enregistré !');
      goToStep(1);
    } catch (error: any) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveVehicle = async () => {
    if (!vehicleBrand || !vehicleModel || !vehicleColor) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSavingVehicle(true);
    try {
      const { error } = await supabase.from('drivers').update({
        vehicle_brand: vehicleBrand, vehicle_model: vehicleModel,
        vehicle_year: parseInt(vehicleYear), vehicle_color: vehicleColor,
        vehicle_seats: parseInt(vehicleSeats),
      }).eq('id', driverId);
      if (error) throw error;
      toast.success('Véhicule enregistré !');
      goToStep(2);
    } catch (error: any) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setSavingVehicle(false);
    }
  };

  const savePricing = async () => {
    if (!baseFare || !perKmRate) {
      toast.error('Veuillez renseigner au moins la prise en charge et le prix/km');
      return;
    }
    setSavingPricing(true);
    try {
      const { error } = await supabase.from('drivers').update({
        base_fare: parseFloat(baseFare),
        per_km_rate: parseFloat(perKmRate),
        minimum_price: minimumPrice ? parseFloat(minimumPrice) : null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        approach_enabled: approachEnabled,
        approach_per_km_rate: approachEnabled ? Math.min(Math.max(parseFloat(approachPerKmRate) || 0, 0), 1) : 0,
      } as any).eq('id', driverId);
      if (error) throw error;
      toast.success('Tarifs enregistrés !');
      goToStep(3);
    } catch (error: any) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setSavingPricing(false);
    }
  };

  const startStripeOnboarding = async () => {
    setStripeLoading(true);
    try {
      const { openExternalUrl } = await import('@/lib/openExternalUrl');
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      if (error) throw error;
      if (data?.url) {
        toast.info('Vous allez être redirigé vers Stripe. Revenez ici après inscription.');
        setTimeout(() => {
          openExternalUrl(data.url, {
            onClose: () => {
              toast.info('Vérification de votre compte Stripe...');
            },
          });
        }, 800);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setStripeLoading(false);
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
        await supabase.from('drivers').update({ onboarding_completed: true }).eq('id', driverId);
        onComplete();
      }
    } catch {
      toast.error("Erreur lors de l'activation");
    } finally {
      setActivating(false);
    }
  };

  const refreshDocStatus = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase.from('drivers').select('documents_status').eq('id', driverId).single();
      if (data) setDocumentsStatus(data.documents_status);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-save with debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save profile
  useEffect(() => {
    if (!firstName || !lastName || !companyName || siret.length !== 14 || !companyAddress) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
      await supabase.from('drivers').update({
        company_name: companyName, siret, company_address: companyAddress,
      }).eq('id', driverId);
      console.log('Auto-saved profile');
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [firstName, lastName, companyName, siret, companyAddress, userId, driverId]);

  // Auto-save vehicle
  useEffect(() => {
    if (!vehicleBrand || !vehicleModel || !vehicleColor) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await supabase.from('drivers').update({
        vehicle_brand: vehicleBrand, vehicle_model: vehicleModel,
        vehicle_year: parseInt(vehicleYear), vehicle_color: vehicleColor,
        vehicle_seats: parseInt(vehicleSeats),
      }).eq('id', driverId);
      console.log('Auto-saved vehicle');
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleSeats, driverId]);

  // Auto-save pricing
  useEffect(() => {
    if (!baseFare || !perKmRate) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await supabase.from('drivers').update({
        base_fare: parseFloat(baseFare),
        per_km_rate: parseFloat(perKmRate),
        minimum_price: minimumPrice ? parseFloat(minimumPrice) : null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        approach_enabled: approachEnabled,
        approach_per_km_rate: approachEnabled ? Math.min(Math.max(parseFloat(approachPerKmRate) || 0, 0), 1) : 0,
      } as any).eq('id', driverId);
      console.log('Auto-saved pricing');
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [baseFare, perKmRate, minimumPrice, hourlyRate, approachEnabled, approachPerKmRate, driverId]);

  // Computed
  const isProfileComplete = firstName && lastName && companyName && siret.length === 14 && companyAddress;
  const isVehicleComplete = vehicleBrand && vehicleModel && vehicleColor;
  const isPricingComplete = baseFare && perKmRate;
  const isDocsSubmitted = documentsStatus === 'submitted' || documentsStatus === 'validated';
  const isDocsValidated = documentsStatus === 'validated';
  const isStripeReady = stripeStatus?.details_submitted || stripeStatus?.charges_enabled;
  const canActivate = isDocsValidated && (stripeStatus?.charges_enabled || stripeStatus?.details_submitted);

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return !!isProfileComplete;
      case 1: return !!isVehicleComplete;
      case 2: return !!isPricingComplete;
      case 3: return isDocsSubmitted;
      case 4: return isStripeReady;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 0) { saveProfile(); return; }
    if (currentStep === 1) { saveVehicle(); return; }
    if (currentStep === 2) { savePricing(); return; }
    if (currentStep < STEPS.length - 1 && canGoNext()) goToStep(currentStep + 1);
  };

  const isSaving = savingProfile || savingVehicle || savingPricing;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const stepComplete = (i: number) => {
    switch (i) {
      case 0: return !!isProfileComplete;
      case 1: return !!isVehicleComplete;
      case 2: return !!isPricingComplete;
      case 3: return isDocsSubmitted;
      case 4: return !!isStripeReady;
      case 5: return isDocsValidated;
      default: return false;
    }
  };

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
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>

        <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>

        <div className="flex items-center gap-0.5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isComplete = stepComplete(i);
            return (
              <button
                key={step.id}
                onClick={() => { if (i < currentStep || isComplete) goToStep(i); }}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition-all',
                  isActive && 'bg-primary/10',
                  !isActive && i > currentStep && 'opacity-40'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                  isComplete ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
                </div>
                <span className={cn('text-[8px] font-medium leading-tight', isActive ? 'text-primary' : 'text-muted-foreground')}>
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
            {currentStep === 0 && (
              <ProfileStep
                firstName={firstName} lastName={lastName}
                companyName={companyName} siret={siret} companyAddress={companyAddress}
                onFirstNameChange={setFirstName} onLastNameChange={setLastName}
                onCompanyNameChange={setCompanyName} onSiretChange={setSiret} onCompanyAddressChange={setCompanyAddress}
              />
            )}
            {currentStep === 1 && (
              <VehicleStep
                vehicleBrand={vehicleBrand} vehicleModel={vehicleModel} vehicleYear={vehicleYear}
                vehicleColor={vehicleColor} vehicleSeats={vehicleSeats}
                onBrandChange={setVehicleBrand} onModelChange={setVehicleModel}
                onYearChange={setVehicleYear} onColorChange={setVehicleColor} onSeatsChange={setVehicleSeats}
              />
            )}
            {currentStep === 2 && (
              <PricingStep
                baseFare={baseFare} perKmRate={perKmRate} minimumPrice={minimumPrice} hourlyRate={hourlyRate}
                approachEnabled={approachEnabled}
                approachPerKmRate={approachPerKmRate}
                onBaseFareChange={setBaseFare} onPerKmRateChange={setPerKmRate}
                onMinimumPriceChange={setMinimumPrice} onHourlyRateChange={setHourlyRate}
                onApproachEnabledChange={setApproachEnabled}
                onApproachPerKmRateChange={setApproachPerKmRate}
              />
            )}
            {currentStep === 3 && (
              <div className="max-w-md mx-auto">
                <OnboardingDocumentsStep driverId={driverId} userId={userId} onStatusChange={setDocumentsStatus} />
              </div>
            )}
            {currentStep === 4 && (
              <StripeStep
                stripeStatus={stripeStatus} stripeLoading={stripeLoading} stripeStatusLoading={stripeStatusLoading}
                onStartStripe={startStripeOnboarding} onCheckStatus={checkStripeStatus}
              />
            )}
            {currentStep === 5 && (
              <ValidationStep
                isDocsValidated={isDocsValidated} isDocsSubmitted={isDocsSubmitted}
                isProfileComplete={!!isProfileComplete} isVehicleComplete={!!isVehicleComplete}
                isPricingComplete={!!isPricingComplete} stripeStatus={stripeStatus}
                canActivate={canActivate} activating={activating} refreshing={refreshing}
                onActivate={handleActivate} onRefreshDocs={refreshDocStatus}
                onGoToDocuments={() => goToStep(3)} onGoToStripe={() => goToStep(4)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      {currentStep < 5 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => goToStep(currentStep - 1)} className="h-12 px-4">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {currentStep !== 4 ? (
              <Button onClick={handleNext} disabled={!canGoNext() || isSaving} className="flex-1 h-12 text-base font-semibold">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuer <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>
            ) : (
              <Button
                onClick={() => goToStep(5)}
                disabled={!isStripeReady}
                className="flex-1 h-12 text-base font-semibold"
              >
                {isStripeReady ? <>Continuer <ArrowRight className="w-5 h-5 ml-2" /></> : <>Stripe requis pour continuer</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stripe Step ──────────────────────────────────────────────────────────────

function StripeStep({
  stripeStatus, stripeLoading, stripeStatusLoading,
  onStartStripe, onCheckStatus,
}: {
  stripeStatus: any; stripeLoading: boolean; stripeStatusLoading: boolean;
  onStartStripe: () => void; onCheckStatus: () => void;
}) {
  if (stripeStatus?.charges_enabled) {
    return (
      <div className="max-w-md mx-auto space-y-5 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">Paiements configurés !</h2>
        <p className="text-sm text-muted-foreground">Les paiements par carte seront versés directement sur votre compte.</p>
      </div>
    );
  }

  if (stripeStatus?.details_submitted) {
    return (
      <div className="max-w-md mx-auto space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Vérification en cours</h2>
        <p className="text-sm text-muted-foreground">Stripe vérifie vos informations. Cela prend généralement quelques minutes.</p>
        <Button variant="outline" size="sm" onClick={onCheckStatus} disabled={stripeStatusLoading}>
          {stripeStatusLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Actualiser le statut
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Encaissez vos clients vous-même</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          SoloCab ne touche jamais à votre argent. Vos clients vous paient directement via Stripe, un service sécurisé utilisé par des millions d'entreprises.
        </p>
      </div>

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

      <div className="bg-muted/50 rounded-xl p-3 text-center">
        <p className="text-xs text-muted-foreground">
          💡 <span className="font-medium">Frais transparents</span> : 0,50 €/course SoloCab + frais bancaires Stripe (~1,5%)
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={onStartStripe} disabled={stripeLoading} className="w-full h-13 text-base font-semibold" size="lg">
          {stripeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <><Zap className="w-5 h-5 mr-2" />Créer mon compte Stripe<ExternalLink className="w-4 h-4 ml-2 opacity-60" /></>
          )}
        </Button>
        {stripeStatus?.connected && !stripeStatus.details_submitted && (
          <Button onClick={onStartStripe} disabled={stripeLoading} variant="outline" className="w-full h-11">
            <RefreshCw className="w-4 h-4 mr-2" />Reprendre ma configuration Stripe
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Shield className="w-3 h-3" />Vos données bancaires ne transitent jamais par SoloCab
      </p>
    </div>
  );
}

// ─── Validation Step ──────────────────────────────────────────────────────────

function ValidationStep({
  isDocsValidated, isDocsSubmitted, isProfileComplete, isVehicleComplete, isPricingComplete,
  stripeStatus, canActivate, activating, refreshing,
  onActivate, onRefreshDocs, onGoToDocuments, onGoToStripe,
}: {
  isDocsValidated: boolean; isDocsSubmitted: boolean; isProfileComplete: boolean;
  isVehicleComplete: boolean; isPricingComplete: boolean;
  stripeStatus: any; canActivate: boolean; activating: boolean; refreshing: boolean;
  onActivate: () => void; onRefreshDocs: () => void;
  onGoToDocuments: () => void; onGoToStripe: () => void;
}) {
  const isStripeReady = stripeStatus?.details_submitted || stripeStatus?.charges_enabled;

  const checklist = [
    { label: 'Profil entreprise', done: isProfileComplete },
    { label: 'Informations véhicule', done: isVehicleComplete },
    { label: 'Grille tarifaire', done: isPricingComplete },
    { label: 'Documents soumis', done: isDocsSubmitted },
    { label: 'Validation admin', done: isDocsValidated, pending: isDocsSubmitted && !isDocsValidated },
    { label: 'Compte paiement', done: isStripeReady, optional: true },
  ];

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
          isDocsValidated ? 'bg-emerald-500/15' : 'bg-amber-500/10'
        )}>
          {isDocsValidated ? <Rocket className="w-8 h-8 text-emerald-500" /> : <Clock className="w-8 h-8 text-amber-500" />}
        </div>
        {isDocsValidated ? (
          <>
            <h2 className="text-xl font-bold text-foreground">Tout est prêt !</h2>
            <p className="text-sm text-muted-foreground mt-1">Vos documents sont validés. Lancez votre activité !</p>
          </>
        ) : isDocsSubmitted ? (
          <>
            <h2 className="text-xl font-bold text-foreground">En cours de validation</h2>
            <p className="text-sm text-muted-foreground mt-1">Notre équipe vérifie vos documents. Vous serez notifié dès validation.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground">Presque terminé</h2>
            <p className="text-sm text-muted-foreground mt-1">Finalisez les étapes restantes pour activer votre compte.</p>
          </>
        )}
      </div>

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
            <span className={cn('text-sm flex-1', item.done ? 'text-foreground' : 'text-muted-foreground')}>{item.label}</span>
            {item.optional && !item.done && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">Optionnel</Badge>
            )}
            {item.pending && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">En attente</Badge>
            )}
          </div>
        ))}
      </div>

      {!isDocsSubmitted && (
        <Button variant="outline" className="w-full h-11" onClick={onGoToDocuments}>
          <FileText className="w-4 h-4 mr-2" />Soumettre mes documents
        </Button>
      )}
      {!isStripeReady && (
        <Button variant="outline" className="w-full h-11" onClick={onGoToStripe}>
          <Wallet className="w-4 h-4 mr-2" />Configurer mes paiements
        </Button>
      )}
      {isDocsSubmitted && !isDocsValidated && (
        <Button variant="outline" className="w-full h-11" onClick={onRefreshDocs} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Actualiser le statut
        </Button>
      )}

      {canActivate && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Button onClick={onActivate} disabled={activating} className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            {activating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Play className="w-6 h-6 mr-2" />Lancer mon activité</>}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
