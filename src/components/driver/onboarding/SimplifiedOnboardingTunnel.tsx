import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertCircle,
  LogOut,
  Play,
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

const STEPS = [
  { id: 'stripe', title: 'Paiements', icon: CreditCard },
  { id: 'vehicle', title: 'Véhicule', icon: Car },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'validation', title: 'Validation', icon: Shield },
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

  // Auto-detect starting step based on existing data
  useEffect(() => {
    const driver = driverProfile?.driver;
    if (!driver) return;

    // If Stripe is done, start at vehicle
    if (driver.stripe_connect_account_id && driver.stripe_connect_status !== 'not_connected') {
      if (driver.vehicle_brand && driver.vehicle_model) {
        if (driver.documents_status === 'submitted' || driver.documents_status === 'validated') {
          setCurrentStep(3); // Validation
        } else {
          setCurrentStep(2); // Documents
        }
      } else {
        setCurrentStep(1); // Vehicle
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

  // Poll for document validation
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
        window.open(data.url, '_blank');
        toast.info('Complétez votre inscription Stripe puis revenez ici.');
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
      goToStep(2);
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
        // Mark onboarding as completed
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
        toast.info(
          data.documents_status === 'validated'
            ? 'Documents validés !'
            : data.documents_status === 'submitted'
              ? 'En attente de validation'
              : 'Documents incomplets'
        );
      }
    } catch (e) {
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
      case 0: return isStripeReady;
      case 1: return !!isVehicleComplete;
      case 2: return isDocsSubmitted;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
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

  // Animation variants
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
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

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isComplete =
              (i === 0 && isStripeReady) ||
              (i === 1 && !!isVehicleComplete) ||
              (i === 2 && isDocsSubmitted) ||
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
                  !isActive && i < currentStep && 'opacity-60'
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

        <Progress value={((currentStep + 1) / STEPS.length) * 100} className="mt-2 h-1" />
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
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-0 overflow-y-auto px-4 py-6"
          >
            {/* STEP 0: Stripe */}
            {currentStep === 0 && (
              <div className="max-w-md mx-auto space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Banknote className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Recevez vos paiements</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configurez votre compte pour recevoir les paiements directement.
                  </p>
                </div>

                {stripeStatus?.charges_enabled ? (
                  <Card className="border-emerald-500/40 bg-emerald-500/5">
                    <CardContent className="p-5 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <h3 className="font-bold text-lg text-emerald-600">Paiements configurés !</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vous pouvez recevoir les paiements de vos clients.
                      </p>
                    </CardContent>
                  </Card>
                ) : stripeStatus?.details_submitted ? (
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardContent className="p-5 text-center space-y-3">
                      <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-bold text-amber-600">Vérification en cours</h3>
                      <p className="text-sm text-muted-foreground">
                        Stripe vérifie vos informations. Vous pouvez continuer en attendant.
                      </p>
                      <Button variant="outline" size="sm" onClick={checkStripeStatus} disabled={stripeStatusLoading}>
                        {stripeStatusLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Actualiser
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-5 space-y-4">
                      <div className="space-y-2.5">
                        {[
                          { icon: CreditCard, text: 'Paiement par carte automatisé' },
                          { icon: Lock, text: 'Acomptes et empreintes bancaires' },
                          { icon: Euro, text: 'Virements directs sur votre compte' },
                          { icon: Users, text: 'Partage de courses entre chauffeurs' },
                          { icon: Shield, text: 'Fiscalité simplifiée' },
                        ].map(({ icon: Icon, text }, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-sm text-foreground">{text}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-1">
                        <p className="text-xs text-muted-foreground text-center mb-3">
                          Frais : 0,50 €/course + frais bancaires (~1,5%)
                        </p>
                        <Button onClick={startStripeOnboarding} disabled={stripeLoading} className="w-full h-12 text-base font-semibold">
                          {stripeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                              <Zap className="w-5 h-5 mr-2" />
                              Configurer mes paiements
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {stripeStatus?.connected && !stripeStatus.charges_enabled && !stripeStatus.details_submitted && (
                  <Card className="border-border">
                    <CardContent className="p-4 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Configuration incomplète. Reprenez là où vous en étiez.
                      </p>
                      <Button onClick={startStripeOnboarding} disabled={stripeLoading} variant="outline" className="w-full">
                        {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                        Reprendre la configuration
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Paiements sécurisés • Vos données bancaires ne transitent jamais par SoloCab
                </p>
              </div>
            )}

            {/* STEP 1: Vehicle */}
            {currentStep === 1 && (
              <div className="max-w-md mx-auto space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Car className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Votre véhicule</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Décrivez votre véhicule pour vos futurs clients.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Marque *</Label>
                      <Input
                        placeholder="Mercedes, BMW..."
                        value={vehicleBrand}
                        onChange={(e) => setVehicleBrand(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Modèle *</Label>
                      <Input
                        placeholder="Classe E, Série 5..."
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Année</Label>
                      <Select value={vehicleYear} onValueChange={setVehicleYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Places passagers</Label>
                      <Select value={vehicleSeats} onValueChange={setVehicleSeats}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} place{n > 1 ? 's' : ''}
                            </SelectItem>
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
                          onClick={() => setVehicleColor(c.value)}
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
            )}

            {/* STEP 2: Documents */}
            {currentStep === 2 && (
              <div className="max-w-md mx-auto">
                <OnboardingDocumentsStep
                  driverId={driverId}
                  userId={userId}
                  onStatusChange={(status) => setDocumentsStatus(status)}
                />
              </div>
            )}

            {/* STEP 3: Validation / Activation */}
            {currentStep === 3 && (
              <div className="max-w-md mx-auto space-y-5">
                <div className="text-center">
                  <div
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
                      isDocsValidated ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                  >
                    {isDocsValidated ? (
                      <Rocket className="w-8 h-8 text-white" />
                    ) : (
                      <Clock className="w-8 h-8 text-white" />
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
                      <h2 className="text-xl font-bold text-foreground">Documents requis</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Veuillez d'abord soumettre tous vos documents obligatoires.
                      </p>
                    </>
                  )}
                </div>

                {/* Status checklist */}
                <Card className="border-border">
                  <CardContent className="p-4 space-y-3">
                    {[
                      {
                        label: 'Compte Stripe',
                        done: stripeStatus?.details_submitted || stripeStatus?.charges_enabled,
                        pending: stripeStatus?.connected && !stripeStatus.details_submitted,
                      },
                      {
                        label: 'Informations véhicule',
                        done: !!isVehicleComplete,
                      },
                      {
                        label: 'Documents soumis',
                        done: isDocsSubmitted,
                      },
                      {
                        label: 'Validation admin',
                        done: isDocsValidated,
                        pending: documentsStatus === 'submitted',
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {item.done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : item.pending ? (
                          <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-sm',
                            item.done ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {item.label}
                        </span>
                        {item.pending && (
                          <Badge variant="outline" className="ml-auto text-[10px] text-amber-600 border-amber-300">
                            En attente
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {!isDocsSubmitted && (
                  <Button variant="outline" className="w-full" onClick={() => goToStep(2)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Soumettre mes documents
                  </Button>
                )}

                {isDocsSubmitted && !isDocsValidated && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={refreshDocStatus}
                    disabled={refreshing}
                  >
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
                      onClick={handleActivate}
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
            <Button
              onClick={handleNext}
              disabled={!canGoNext() || savingVehicle}
              className={cn('flex-1 h-12 text-base font-semibold', canGoNext() && 'animate-pulse-subtle')}
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
          </div>
        </div>
      )}
    </div>
  );
}
