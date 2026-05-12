import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, CreditCard, Banknote, UserPlus, Eye, EyeOff,
  Loader2, Send, ShieldCheck, CheckCircle2, MapPin, Users, Sparkles
} from 'lucide-react';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { BookingCardStep } from '../BookingCardStep';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkEmailExists, buildExistingAccountMessage } from '@/lib/checkEmailExists';
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

type SubStep = 'payment' | 'identity' | 'card' | 'review';

// Direction-aware 3D flip + slide
const getVariants = (direction: 1 | -1) => ({
  enter: {
    x: direction * 120,
    opacity: 0,
    scale: 0.92,
    rotateY: direction * 8,
    filter: 'blur(4px)',
  },
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    filter: 'blur(0px)',
  },
  exit: {
    x: direction * -120,
    opacity: 0,
    scale: 0.92,
    rotateY: direction * -8,
    filter: 'blur(4px)',
  },
});

const springTransition = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 30,
  mass: 0.8,
};

// Success checkmark animation
function SuccessBadge({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
      className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mx-auto w-fit"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.25 }}
      >
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </motion.div>
      <span className="text-sm font-semibold text-primary">{label}</span>
    </motion.div>
  );
}

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
  const [direction, setDirection] = useState<1 | -1>(1);
  const [authTab, setAuthTab] = useState<'register' | 'guest'>('guest');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const pendingNavRef = useRef<SubStep | null>(null);

  const selectedDrivers = filteredDrivers.filter(d => selectedDriverIds.has(d.driver_id));
  const hasStripeDriver = selectedDrivers.some(d => d.stripe_connect_charges_enabled);
  const isIdentified = !!user || registrationDone || (guestName.trim() !== '' && guestEmail.trim() !== '' && guestPhone.trim() !== '');

  // Compute next sub-step from a given step
  const computeNext = useCallback((from: SubStep, identified: boolean, payMethod: typeof clientPaymentMethod, cardOk: boolean): SubStep | null => {
    if (from === 'payment') {
      if (!user && !identified) return 'identity';
      if (payMethod === 'card' && !cardOk) return 'card';
      return 'review';
    }
    if (from === 'identity') {
      if (payMethod === 'card' && !cardOk) return 'card';
      return 'review';
    }
    if (from === 'card') return 'review';
    return null;
  }, [user]);

  const computePrev = useCallback((from: SubStep, identified: boolean): SubStep | null => {
    if (from === 'review') {
      if (clientPaymentMethod === 'card' && !cardVerifiedForBooking) return 'card';
      if (!user && !identified) return 'identity';
      return 'payment';
    }
    if (from === 'card') {
      if (!user && !registrationDone) return 'identity';
      return 'payment';
    }
    if (from === 'identity') return 'payment';
    return null;
  }, [user, clientPaymentMethod, cardVerifiedForBooking, registrationDone]);

  const goForward = useCallback((target: SubStep) => {
    setDirection(1);
    setSubStep(target);
  }, []);

  const goBack = useCallback((target: SubStep) => {
    setDirection(-1);
    setSubStep(target);
  }, []);

  // Handle pending navigation after registration state settles
  useEffect(() => {
    if (pendingNavRef.current && (registrationDone || user)) {
      const target = pendingNavRef.current;
      pendingNavRef.current = null;
      // Brief delay for the success badge to show
      const timer = setTimeout(() => goForward(target), 1200);
      return () => clearTimeout(timer);
    }
  }, [registrationDone, user, goForward]);

  // Auto-skip identity if user logs in externally
  useEffect(() => {
    if (subStep === 'identity' && user && !pendingNavRef.current) {
      const next = computeNext('identity', true, clientPaymentMethod, cardVerifiedForBooking);
      if (next) goForward(next);
    }
  }, [user, subStep, computeNext, clientPaymentMethod, cardVerifiedForBooking, goForward]);

  const handlePaymentNext = () => {
    if (!clientPaymentMethod) { toast.error('Choisissez un mode de paiement'); return; }
    const next = computeNext('payment', isIdentified, clientPaymentMethod, cardVerifiedForBooking);
    if (next) goForward(next);
  };

  const handleRegister = async () => {
    if (regPassword !== regConfirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setIsRegistering(true);
    try {
      // Vérification préalable email déjà utilisé
      const cleanEmail = regEmail.trim().toLowerCase();
      const existing = await checkEmailExists(cleanEmail);
      if (existing.exists) {
        const { message, loginPath } = buildExistingAccountMessage(existing.role);
        toast.error('Email déjà utilisé', {
          description: message,
          duration: 8000,
          action: {
            label: 'Se connecter',
            onClick: () => { window.location.href = loginPath; },
          },
        });
        setIsRegistering(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: regPassword,
        options: { data: { full_name: regName.trim(), phone: regPhone.trim(), user_type: 'client' } },
      });
      if (signUpError) throw signUpError;
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id, full_name: regName.trim(), phone: regPhone.trim(),
          user_type: 'client', email: cleanEmail,
        } as any);
        await supabase.from('clients').upsert({ user_id: data.user.id, is_exclusive: false }, { onConflict: 'user_id' });
        await supabase.from('user_roles').upsert({ user_id: data.user.id, role: 'client' as any }, { onConflict: 'user_id,role' });
      }
      // Set guest fields so isIdentified becomes true
      setGuestName(regName);
      setGuestPhone(regPhone);
      setGuestEmail(regEmail);
      setRegistrationDone(true);
      setJustRegistered(true);
      toast.success('Compte créé avec succès !');

      // Schedule navigation after state settles
      const next = computeNext('identity', true, clientPaymentMethod, cardVerifiedForBooking);
      if (next) pendingNavRef.current = next;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGuestContinue = () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      toast.error('Remplissez tous les champs'); return;
    }
    const next = computeNext('identity', true, clientPaymentMethod, cardVerifiedForBooking);
    if (next) goForward(next);
  };

  const handleBackFromSub = () => {
    const prev = computePrev(subStep, isIdentified);
    if (prev) goBack(prev);
    else onBack();
  };

  // Sub-step labels for progress
  const subStepLabels: { key: SubStep; label: string; icon: typeof CreditCard }[] = [
    { key: 'payment', label: 'Paiement', icon: CreditCard },
    ...(!user && !registrationDone ? [{ key: 'identity' as SubStep, label: 'Identité', icon: Users }] : []),
    ...(clientPaymentMethod === 'card' && !cardVerifiedForBooking ? [{ key: 'card' as SubStep, label: 'Carte', icon: ShieldCheck }] : []),
    { key: 'review', label: 'Envoi', icon: Send },
  ];
  const currentSubIdx = subStepLabels.findIndex(s => s.key === subStep);
  const variants = getVariants(direction);

  return (
    <div className="space-y-4">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleBackFromSub}>
          <ArrowLeft className="h-4 w-4" />
          {subStep === 'payment' ? 'Retour aux chauffeurs' : 'Précédent'}
        </Button>
      </motion.div>

      {/* Progress bar with labels */}
      <div className="flex items-center justify-between px-2">
        {subStepLabels.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentSubIdx;
          const isDone = i < currentSubIdx;
          return (
            <div key={s.key} className="flex items-center gap-0 flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isDone || isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-shadow",
                    isActive && "ring-4 ring-primary/20 shadow-lg shadow-primary/20",
                  )}
                >
                  {isDone ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  ) : (
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  )}
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : isDone ? "text-primary/70" : "text-muted-foreground/60"
                )}>{s.label}</span>
              </div>
              {i < subStepLabels.length - 1 && (
                <div className="flex-1 mx-1 mb-5">
                  <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: isDone ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trip summary — compact */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 px-3 py-2 bg-muted/40 rounded-xl text-xs text-muted-foreground"
      >
        <MapPin className="h-3 w-3 shrink-0 text-primary" />
        <span className="truncate flex-1">{pickupAddress.split(',')[0]}</span>
        <span className="text-primary">→</span>
        <span className="truncate flex-1">{destinationAddress.split(',')[0]}</span>
        {routeDistanceKm && <span className="shrink-0 font-bold text-foreground">{routeDistanceKm.toFixed(0)}km</span>}
      </motion.div>

      {/* Animated sub-step content */}
      <div style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" custom={direction}>
          {/* ── PAYMENT ── */}
          {subStep === 'payment' && (
            <motion.div key="payment" variants={variants} initial="enter" animate="center" exit="exit" transition={springTransition} style={{ transformStyle: 'preserve-3d' }}>
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-5 space-y-5">
                  <motion.div className="text-center space-y-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                      <CreditCard className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Mode de paiement</h3>
                    <p className="text-xs text-muted-foreground">Comment souhaitez-vous régler ?</p>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { method: 'card' as const, icon: CreditCard, label: 'Carte bancaire', sub: 'Visa, MC, Apple Pay' },
                      { method: 'cash' as const, icon: Banknote, label: 'Espèces', sub: 'Paiement au chauffeur' },
                    ].map((opt, i) => (
                      <motion.button
                        key={opt.method}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                        onClick={() => setClientPaymentMethod(opt.method)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200",
                          clientPaymentMethod === opt.method
                            ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/10 scale-[1.02]"
                            : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <opt.icon className="h-6 w-6" />
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-[10px] opacity-70">{opt.sub}</span>
                      </motion.button>
                    ))}
                  </div>

                  {clientPaymentMethod === 'card' && hasStripeDriver && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-2.5 rounded-lg">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>Montant bloqué, prélèvement uniquement en fin de course.</span>
                    </motion.div>
                  )}

                  <Button className="w-full h-12 text-base font-bold gap-2" onClick={handlePaymentNext} disabled={!clientPaymentMethod}>
                    Continuer
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── IDENTITY ── */}
          {subStep === 'identity' && (
            <motion.div key="identity" variants={variants} initial="enter" animate="center" exit="exit" transition={springTransition} style={{ transformStyle: 'preserve-3d' }}>
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  {/* Success state after registration */}
                  {justRegistered && registrationDone ? (
                    <motion.div className="text-center space-y-4 py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
                      >
                        <Sparkles className="h-8 w-8 text-primary" />
                      </motion.div>
                      <SuccessBadge label={`Bienvenue ${regName || guestName} !`} />
                      <p className="text-xs text-muted-foreground">Passage à l'étape suivante...</p>
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                    </motion.div>
                  ) : (
                    <>
                      <motion.div className="text-center space-y-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                          <Users className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Vos coordonnées</h3>
                        <p className="text-xs text-muted-foreground">Pour le suivi de votre course</p>
                      </motion.div>

                      {/* Tabs */}
                      <div className="flex rounded-xl bg-muted/50 p-0.5">
                        {[
                          { key: 'guest' as const, icon: Send, label: 'Réservation rapide' },
                          { key: 'register' as const, icon: UserPlus, label: 'Créer un compte' },
                        ].map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setAuthTab(tab.key)}
                            className={cn(
                              "flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                              authTab === tab.key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        {authTab === 'guest' ? (
                          <motion.div key="guest-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-3">
                            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Votre nom *" className="h-11" />
                            <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Téléphone *" type="tel" className="h-11" />
                            <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email *" type="email" className="h-11" />
                            <Button className="w-full h-12 text-base font-bold gap-2" onClick={handleGuestContinue} disabled={!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()}>
                              Continuer <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div key="register-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
                            <Input value={regName} onChange={(e) => { setRegName(e.target.value); setGuestName(e.target.value); }} placeholder="Nom complet *" className="h-11" />
                            <Input value={regPhone} onChange={(e) => { setRegPhone(e.target.value); setGuestPhone(e.target.value); }} placeholder="Téléphone *" type="tel" className="h-11" />
                            <Input value={regEmail} onChange={(e) => { setRegEmail(e.target.value); setGuestEmail(e.target.value); }} placeholder="Email *" type="email" className="h-11" />
                            <div className="relative">
                              <Input
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                placeholder="Mot de passe (6 car. min) *"
                                type={showRegPassword ? "text" : "password"}
                                className="h-11 pr-10"
                              />
                              <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <div className="relative">
                              <Input
                                value={regConfirmPassword}
                                onChange={(e) => setRegConfirmPassword(e.target.value)}
                                placeholder="Confirmer le mot de passe *"
                                type={showRegConfirmPassword ? "text" : "password"}
                                className="h-11 pr-10"
                              />
                              <button type="button" onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {regConfirmPassword && regPassword !== regConfirmPassword && (
                              <p className="text-[11px] text-destructive">Les mots de passe ne correspondent pas</p>
                            )}
                            <Button
                              className="w-full h-12 text-base font-bold gap-2"
                              disabled={isRegistering || !regName.trim() || !regPhone.trim() || !regEmail.trim() || regPassword.length < 6 || regPassword !== regConfirmPassword}
                              onClick={handleRegister}
                            >
                              {isRegistering ? <><Loader2 className="h-4 w-4 animate-spin" />Création...</> : <><UserPlus className="h-4 w-4" />Créer mon compte</>}
                            </Button>
                            <p className="text-[10px] text-muted-foreground text-center">100% gratuit · Suivi inclus</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── CARD VERIFICATION ── */}
          {subStep === 'card' && (
            <motion.div key="card" variants={variants} initial="enter" animate="center" exit="exit" transition={springTransition} style={{ transformStyle: 'preserve-3d' }}>
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <motion.div className="text-center space-y-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                      <ShieldCheck className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Vérification sécurisée</h3>
                    <p className="text-xs text-muted-foreground">Aucun prélèvement, simple vérification</p>
                  </motion.div>

                  {isIdentified && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <SuccessBadge label={user ? 'Connecté' : registrationDone ? `${regName || guestName} ✓` : guestName} />
                    </motion.div>
                  )}

                  <BookingCardStep
                    isAuthenticated={!!user}
                    guestName={guestName}
                    guestEmail={guestEmail}
                    guestPhone={guestPhone}
                    estimatedPrice={priceRange ? priceRange.max : undefined}
                    onCardReady={(info) => {
                      setCardVerifiedForBooking(true);
                      setSavedCardInfo(info);
                      goForward('review');
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── REVIEW & SEND ── */}
          {subStep === 'review' && (
            <motion.div key="review" variants={variants} initial="enter" animate="center" exit="exit" transition={springTransition} style={{ transformStyle: 'preserve-3d' }}>
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Compact header */}
                  <motion.div className="text-center space-y-1" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                    <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
                      <Send className="h-4 w-4 text-primary" />
                      Tout est prêt !
                    </h3>
                    <p className="text-[11px] text-muted-foreground">Vérifiez et envoyez votre demande</p>
                  </motion.div>

                  {/* 2-column grid layout for compact display */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Trajet - full width */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="col-span-2 flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl"
                    >
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trajet</p>
                        <p className="text-xs font-medium text-foreground truncate">
                          {pickupAddress.split(',')[0]} → {destinationAddress.split(',')[0]}
                        </p>
                      </div>
                      {routeDistanceKm && <span className="text-xs font-bold text-foreground shrink-0">{routeDistanceKm.toFixed(1)}km</span>}
                    </motion.div>

                    {/* Chauffeurs */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl"
                    >
                      <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Chauffeurs</p>
                        <p className="text-xs font-medium text-foreground">{selectedDrivers.length} chauffeur{selectedDrivers.length > 1 ? 's' : ''}</p>
                      </div>
                    </motion.div>

                    {/* Paiement */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl"
                    >
                      {clientPaymentMethod === 'card' ? <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" /> : <Banknote className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Paiement</p>
                        <p className="text-xs font-medium text-foreground">{clientPaymentMethod === 'card' ? 'Carte' : 'Espèces'}</p>
                      </div>
                      {clientPaymentMethod === 'card' && cardVerifiedForBooking && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
                    </motion.div>

                    {/* Contact */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Contact</p>
                        <p className="text-xs font-medium text-foreground truncate">{user ? (user.user_metadata?.full_name || user.email || 'Connecté') : registrationDone ? regName || guestName : guestName}</p>
                      </div>
                    </motion.div>

                    {/* Estimation */}
                    {priceRange && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.35 }}
                        className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-xl border border-primary/20"
                      >
                        <span className="text-sm">💰</span>
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Estimation</p>
                          <p className="text-xs font-bold text-primary">
                            {priceRange.min === priceRange.max
                              ? `${priceRange.min.toFixed(0)} €`
                              : `${priceRange.min.toFixed(0)} – ${priceRange.max.toFixed(0)} €`}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Big prominent CTA button */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Button
                      className="w-full h-16 text-lg font-extrabold gap-3 shadow-xl shadow-primary/30 rounded-2xl"
                      onClick={onSubmit}
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <Send className="h-6 w-6" />
                        </motion.div>
                      )}
                      {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
