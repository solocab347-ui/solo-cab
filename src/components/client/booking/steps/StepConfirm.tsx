import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, CreditCard, Banknote, UserPlus, UserX, Eye, EyeOff,
  Loader2, Send, ShieldCheck, Info, AlertTriangle, CheckCircle2, MapPin
} from 'lucide-react';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { BookingCardStep } from '../BookingCardStep';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

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
  // Guest
  guestName: string;
  setGuestName: (v: string) => void;
  guestPhone: string;
  setGuestPhone: (v: string) => void;
  guestEmail: string;
  setGuestEmail: (v: string) => void;
  // Registration
  regName: string; setRegName: (v: string) => void;
  regPhone: string; setRegPhone: (v: string) => void;
  regEmail: string; setRegEmail: (v: string) => void;
  regPassword: string; setRegPassword: (v: string) => void;
  registrationDone: boolean;
  setRegistrationDone: (v: boolean) => void;
  // Actions
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
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
  const [inlineAuthTab, setInlineAuthTab] = useState<'register' | 'guest'>('register');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const selectedDrivers = filteredDrivers.filter(d => selectedDriverIds.has(d.driver_id));
  const hasStripeDriver = selectedDrivers.some(d => d.stripe_connect_charges_enabled);

  const canSubmit = (() => {
    if (!clientPaymentMethod) return false;
    if (clientPaymentMethod === 'card' && !cardVerifiedForBooking) return false;
    if (!user && !registrationDone) {
      if (!guestName.trim()) return false;
      if (!guestEmail.trim()) return false;
      if (!guestPhone.trim()) return false;
    }
    return true;
  })();

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
      toast.success('Compte créé avec succès !');
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Retour aux chauffeurs
      </Button>

      {/* Trip summary */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1" />
              <p className="text-sm text-foreground line-clamp-1">{pickupAddress}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-sm bg-destructive shrink-0 mt-1" style={{ transform: 'rotate(45deg)' }} />
              <p className="text-sm text-foreground line-clamp-1">{destinationAddress}</p>
            </div>
          </div>
          {routeDistanceKm && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1 border-t border-border/30">
              <span>{routeDistanceKm.toFixed(1)} km</span>
              {routeDurationMin && <span>~{Math.round(routeDurationMin)} min</span>}
              <span>{selectedDrivers.length} chauffeur{selectedDrivers.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Mode de paiement
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setClientPaymentMethod('card')}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                clientPaymentMethod === 'card'
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              )}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              Carte bancaire
            </button>
            <button
              onClick={() => setClientPaymentMethod('cash')}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                clientPaymentMethod === 'cash'
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              )}
            >
              <Banknote className="h-4 w-4 shrink-0" />
              Espèces
            </button>
          </div>

          {/* Payment info */}
          {clientPaymentMethod === 'card' && hasStripeDriver && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Le montant sera bloqué sur votre carte. Prélèvement uniquement en fin de course.</span>
            </div>
          )}
          {clientPaymentMethod === 'cash' && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
              <Banknote className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Paiement en espèces directement au chauffeur en fin de course.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth / Guest section */}
      {!user && !registrationDone && clientPaymentMethod && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex rounded-lg bg-muted/50 p-0.5">
              <button
                onClick={() => setInlineAuthTab('register')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                  inlineAuthTab === 'register'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Créer un compte
              </button>
              <button
                onClick={() => setInlineAuthTab('guest')}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                  inlineAuthTab === 'guest'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserX className="h-3.5 w-3.5" />
                Sans compte
              </button>
            </div>

            {inlineAuthTab === 'register' ? (
              <div className="space-y-2">
                <Input value={regName} onChange={(e) => { setRegName(e.target.value); setGuestName(e.target.value); }} placeholder="Nom complet *" className="h-10" />
                <Input value={regPhone} onChange={(e) => { setRegPhone(e.target.value); setGuestPhone(e.target.value); }} placeholder="Téléphone *" type="tel" className="h-10" />
                <Input value={regEmail} onChange={(e) => { setRegEmail(e.target.value); setGuestEmail(e.target.value); }} placeholder="Email *" type="email" className="h-10" />
                <div className="relative">
                  <Input
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mot de passe *"
                    type={showRegPassword ? "text" : "password"}
                    className="h-10 pr-10"
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
                  className="w-full h-10 gap-2 text-sm font-semibold"
                  disabled={isRegistering || !regName.trim() || !regPhone.trim() || !regEmail.trim() || regPassword.length < 6}
                  onClick={handleRegister}
                >
                  {isRegistering ? <><Loader2 className="h-4 w-4 animate-spin" />Création...</> : <><UserPlus className="h-4 w-4" />Créer mon compte</>}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">100% gratuit</p>
              </div>
            ) : (
            <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Coordonnées pour recevoir votre lien de suivi.</p>
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Votre nom *" className="h-10" />
                <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email * (pour le suivi de course)" type="email" className="h-10" />
                <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Téléphone *" type="tel" className="h-10" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {registrationDone && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">Compte créé avec succès !</span>
        </div>
      )}

      {/* Card verification */}
      {clientPaymentMethod === 'card' && !cardVerifiedForBooking && (user || registrationDone || (guestName.trim() && guestPhone.trim() && guestEmail?.trim())) && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <BookingCardStep
              isAuthenticated={!!user}
              guestName={guestName}
              guestEmail={guestEmail}
              guestPhone={guestPhone}
              estimatedPrice={priceRange ? priceRange.max : undefined}
              onCardReady={(info) => {
                setCardVerifiedForBooking(true);
                setSavedCardInfo(info);
              }}
            />
          </CardContent>
        </Card>
      )}

      {cardVerifiedForBooking && clientPaymentMethod === 'card' && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">Carte vérifiée ✓</span>
        </div>
      )}

      {/* Submit button */}
      <Button
        className="w-full h-12 text-base font-bold gap-2"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        Confirmer la demande
      </Button>
    </div>
  );
}
