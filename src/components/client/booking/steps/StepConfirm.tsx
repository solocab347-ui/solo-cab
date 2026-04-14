import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, CreditCard, Banknote, UserPlus, Eye, EyeOff,
  Loader2, Send, ShieldCheck, CheckCircle2, MapPin, Navigation, Clock, Users
} from 'lucide-react';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { BookingCardStep } from '../BookingCardStep';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

interface StepConfirmProps {
  user: User | null;
  filteredDrivers: NearbyDriver[];
  selectedDriverIds: Set<string>;
  pickupAddress: string;
  destinationAddress: string;
  routeDistanceKm: number | null;
  routeDurationMin: number | null;
  clientPaymentMethod: 'card' | 'cash' | null;
  setClientPaymentMethod: (v: 'card' | 'cash') => void;
  cardVerifiedForBooking: boolean;
  setCardVerifiedForBooking: (v: boolean) => void;
  setSavedCardInfo: (v: { customerId: string; paymentMethodId?: string } | null) => void;
  priceRange: { min: number; max: number } | null;
  guestName: string; setGuestName: (v: string) => void;
  guestPhone: string; setGuestPhone: (v: string) => void;
  guestEmail: string; setGuestEmail: (v: string) => void;
  regName: string; setRegName: (v: string) => void;
  regPhone: string; setRegPhone: (v: string) => void;
  regEmail: string; setRegEmail: (v: string) => void;
  regPassword: string; setRegPassword: (v: string) => void;
  registrationDone: boolean;
  setRegistrationDone: (v: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

// Sub-steps: payment → identity → card → review
type SubStep = 'payment' | 'identity' | 'card' | 'review';

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export function StepConfirm({
  user, filteredDrivers, selectedDriverIds,
  pickupAddress, destinationAddress,
  routeDistanceKm, routeDurationMin,
  clientPaymentMethod, setClientPaymentMethod,
  cardVerifiedForBooking, setCardVerifiedForBooking, setSavedCardInfo,
  priceRange,
  guestName, setGuestName, guestPhone, setGuestPhone,
  guestEmail, setGuestEmail,
  regName, setRegName, regPhone, setRegPhone,
  regEmail, setRegEmail, regPassword, setRegPassword,
  registrationDone, setRegistrationDone,
  onBack, onSubmit, isSubmitting,
}: StepConfirmProps) {
  const [subStep, setSubStep] = useState<SubStep>('payment');
  const [authTab, setAuthTab] = useState<'register' | 'guest'>('guest');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const selectedDrivers = filteredDrivers.filter(d => selectedDriverIds.has(d.driver_id));
  const hasStripeDriver = selectedDrivers.some(d => d.stripe_connect_charges_enabled);
  const isIdentified = !!user || registrationDone || (guestName.trim() && guestEmail.trim() && guestPhone.trim());

  // Determine which sub-steps are needed
  const getNextSubStep = (current: SubStep): SubStep | null => {
    if (current === 'payment') {
      if (!user && !isIdentified) return 'identity';
      if (clientPaymentMethod === 'card' && !cardVerifiedForBooking) return 'card';
      return 'review';
    }
    if (current === 'identity') {
      if (clientPaymentMethod === 'card' && !cardVerifiedForBooking) return 'card';
      return 'review';
    }
    if (current === 'card') return 'review';
    return null;
  };

  const getPrevSubStep = (current: SubStep): SubStep | null => {
    if (current === 'review') {
      if (clientPaymentMethod === 'card' && !cardVerifiedForBooking) return 'card';
      if (!user && !registrationDone) return 'identity';
      return 'payment';
    }
    if (current === 'card') {
      if (!user && !registrationDone) return 'identity';
      return 'payment';
    }
    if (current === 'identity') return 'payment';
    return null;
  };

  // Auto-skip identity step if user is logged in
  useEffect(() => {
    if (subStep === 'identity' && (user || registrationDone)) {
      const next = getNextSubStep('identity');
      if (next) setSubStep(next);
    }
  }, [user, registrationDone, subStep]);

  const handlePaymentSelect = (method: 'card' | 'cash') => {
    setClientPaymentMethod(method);
  };

  const handlePaymentNext = () => {
    if (!clientPaymentMethod) {
      toast.error('Choisissez un mode de paiement');
      return;
    }
    const next = getNextSubStep('payment');
    if (next) setSubStep(next);
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: { full_name: regName.trim(), phone: regPhone.trim(), user_type: 'client' },
        },
      });
      if (signUpError) throw signUpError;
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id, full_name: regName.trim(), phone: regPhone.trim(),
          user_type: 'client', email: regEmail.trim(),
        } as any);
        await supabase.from('clients').upsert({ user_id: data.user.id, is_exclusive: false }, { onConflict: 'user_id' });
        await supabase.from('user_roles').upsert({ user_id: data.user.id, role: 'client' as any }, { onConflict: 'user_id,role' });
      }
      setRegistrationDone(true);
      setGuestName(regName);
      setGuestPhone(regPhone);
      setGuestEmail(regEmail);
      toast.success('Compte créé !');
      // Move to next step
      const next = getNextSubStep('identity');
      if (next) setSubStep(next);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGuestContinue = () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      toast.error('Remplissez tous les champs');
      return;
    }
    const next = getNextSubStep('identity');
    if (next) setSubStep(next);
  };

  const handleBackFromSub = () => {
    const prev = getPrevSubStep(subStep);
    if (prev) setSubStep(prev);
    else onBack();
  };

  // Sub-step progress
  const subStepLabels: { key: SubStep; label: string }[] = [
    { key: 'payment', label: 'Paiement' },
    ...(!user && !registrationDone ? [{ key: 'identity' as SubStep, label: 'Identité' }] : []),
    ...(clientPaymentMethod === 'card' && !cardVerifiedForBooking ? [{ key: 'card' as SubStep, label: 'Carte' }] : []),
    { key: 'review', label: 'Envoi' },
  ];

  const currentSubIdx = subStepLabels.findIndex(s => s.key === subStep);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={handleBackFromSub}>
        <ArrowLeft className="h-4 w-4" />
        {subStep === 'payment' ? 'Retour aux chauffeurs' : 'Étape précédente'}
      </Button>

      {/* Mini progress dots */}
      <div className="flex items-center justify-center gap-2">
        {subStepLabels.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              i < currentSubIdx ? "bg-primary scale-100" :
              i === currentSubIdx ? "bg-primary scale-125 ring-2 ring-primary/30" :
              "bg-muted-foreground/30"
            )} />
            {i < subStepLabels.length - 1 && (
              <div className={cn("w-6 h-0.5 transition-colors duration-300",
                i < currentSubIdx ? "bg-primary" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Trip summary — compact, always visible */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-xl text-xs text-muted-foreground">
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-primary" />
          <span className="truncate">{pickupAddress.split(',')[0]}</span>
          <Navigation className="h-3 w-3 shrink-0" />
          <span className="truncate">{destinationAddress.split(',')[0]}</span>
        </div>
        {routeDistanceKm && (
          <span className="shrink-0 font-medium">{routeDistanceKm.toFixed(0)}km</span>
        )}
      </div>

      {/* Animated sub-step content */}
      <AnimatePresence mode="wait">
        {/* ── PAYMENT ── */}
        {subStep === 'payment' && (
          <motion.div key="payment" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="text-center space-y-1">
                  <CreditCard className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">Comment souhaitez-vous payer ?</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePaymentSelect('card')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      clientPaymentMethod === 'card'
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="text-sm font-semibold">Carte</span>
                  </button>
                  <button
                    onClick={() => handlePaymentSelect('cash')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      clientPaymentMethod === 'cash'
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    <Banknote className="h-6 w-6" />
                    <span className="text-sm font-semibold">Espèces</span>
                  </button>
                </div>

                {clientPaymentMethod === 'card' && hasStripeDriver && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-2.5 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>Montant bloqué, prélèvement uniquement en fin de course.</span>
                  </div>
                )}

                <Button className="w-full h-12 text-base font-bold" onClick={handlePaymentNext} disabled={!clientPaymentMethod}>
                  Continuer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── IDENTITY ── */}
        {subStep === 'identity' && (
          <motion.div key="identity" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="text-center space-y-1">
                  <Users className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">Vos coordonnées</h3>
                  <p className="text-xs text-muted-foreground">Pour le suivi de votre course</p>
                </div>

                {/* Tabs */}
                <div className="flex rounded-xl bg-muted/50 p-0.5">
                  <button
                    onClick={() => setAuthTab('guest')}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                      authTab === 'guest'
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Rapide
                  </button>
                  <button
                    onClick={() => setAuthTab('register')}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                      authTab === 'register'
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Créer un compte
                  </button>
                </div>

                {authTab === 'guest' ? (
                  <div className="space-y-3">
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Votre nom *" className="h-11" />
                    <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Téléphone *" type="tel" className="h-11" />
                    <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email *" type="email" className="h-11" />
                    <Button
                      className="w-full h-12 text-base font-bold gap-2"
                      onClick={handleGuestContinue}
                      disabled={!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()}
                    >
                      Continuer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input value={regName} onChange={(e) => { setRegName(e.target.value); setGuestName(e.target.value); }} placeholder="Nom complet *" className="h-11" />
                    <Input value={regPhone} onChange={(e) => { setRegPhone(e.target.value); setGuestPhone(e.target.value); }} placeholder="Téléphone *" type="tel" className="h-11" />
                    <Input value={regEmail} onChange={(e) => { setRegEmail(e.target.value); setGuestEmail(e.target.value); }} placeholder="Email *" type="email" className="h-11" />
                    <div className="relative">
                      <Input
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mot de passe *"
                        type={showRegPassword ? "text" : "password"}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      className="w-full h-12 text-base font-bold gap-2"
                      disabled={isRegistering || !regName.trim() || !regPhone.trim() || !regEmail.trim() || regPassword.length < 6}
                      onClick={handleRegister}
                    >
                      {isRegistering ? <><Loader2 className="h-4 w-4 animate-spin" />Création...</> : <><UserPlus className="h-4 w-4" />Créer mon compte</>}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">100% gratuit</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── CARD VERIFICATION ── */}
        {subStep === 'card' && (
          <motion.div key="card" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="text-center space-y-1">
                  <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">Vérification carte</h3>
                  <p className="text-xs text-muted-foreground">Aucun prélèvement, simple vérification</p>
                </div>

                <BookingCardStep
                  isAuthenticated={!!user}
                  guestName={guestName}
                  guestEmail={guestEmail}
                  guestPhone={guestPhone}
                  estimatedPrice={priceRange ? priceRange.max : undefined}
                  onCardReady={(info) => {
                    setCardVerifiedForBooking(true);
                    setSavedCardInfo(info);
                    setSubStep('review');
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── REVIEW & SEND ── */}
        {subStep === 'review' && (
          <motion.div key="review" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
            <Card className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="text-center space-y-1">
                  <Send className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">Tout est prêt !</h3>
                </div>

                {/* Summary items */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Trajet</p>
                      <p className="text-sm font-medium text-foreground truncate">{pickupAddress.split(',')[0]} → {destinationAddress.split(',')[0]}</p>
                    </div>
                    {routeDistanceKm && <span className="text-xs font-bold text-foreground">{routeDistanceKm.toFixed(1)}km</span>}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Chauffeurs contactés</p>
                      <p className="text-sm font-medium text-foreground">{selectedDrivers.length} chauffeur{selectedDrivers.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    {clientPaymentMethod === 'card' ? <CreditCard className="h-4 w-4 text-primary shrink-0" /> : <Banknote className="h-4 w-4 text-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Paiement</p>
                      <p className="text-sm font-medium text-foreground">{clientPaymentMethod === 'card' ? 'Carte bancaire' : 'Espèces'}</p>
                    </div>
                    {clientPaymentMethod === 'card' && cardVerifiedForBooking && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Identifié</p>
                      <p className="text-sm font-medium text-foreground">
                        {user ? (user.user_metadata?.full_name || user.email || 'Connecté') :
                         registrationDone ? regName || guestName :
                         guestName}
                      </p>
                    </div>
                  </div>

                  {priceRange && (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <span className="text-lg">💰</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Estimation</p>
                        <p className="text-sm font-bold text-primary">
                          {priceRange.min === priceRange.max
                            ? `${priceRange.min.toFixed(0)} €`
                            : `${priceRange.min.toFixed(0)} – ${priceRange.max.toFixed(0)} €`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-12 text-base font-bold gap-2"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  Envoyer la demande
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
