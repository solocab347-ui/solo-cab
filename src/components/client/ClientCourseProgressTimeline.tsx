import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader2, CreditCard, MapPin, Flag, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'paid' | 'checkin' | 'finished' | 'confirmed';

interface Props {
  courseId: string;
  /** Données déjà connues, évite un fetch inutile */
  initial?: {
    status?: string | null;
    payment_status?: string | null;
    payment_method?: string | null;
    completed_at?: string | null;
    client_rating?: number | null;
  };
  className?: string;
}

const STEPS: { key: Step; label: string; icon: any; help: string }[] = [
  { key: 'paid',      label: 'Paiement validé',     icon: CreditCard, help: 'Votre moyen de paiement est confirmé' },
  { key: 'checkin',   label: 'Check-in chauffeur',  icon: MapPin,     help: 'Le chauffeur est arrivé / la course démarre' },
  { key: 'finished',  label: 'Course terminée',     icon: Flag,       help: 'Votre trajet est clôturé par le chauffeur' },
  { key: 'confirmed', label: 'Confirmation finale', icon: Sparkles,   help: 'Reçu, facture et notation disponibles' },
];

export function ClientCourseProgressTimeline({ courseId, initial, className }: Props) {
  const [data, setData] = useState<{
    status: string | null;
    payment_status: string | null;
    payment_method: string | null;
    completed_at: string | null;
    client_rating: number | null;
  }>({
    status: initial?.status ?? null,
    payment_status: initial?.payment_status ?? null,
    payment_method: initial?.payment_method ?? null,
    completed_at: initial?.completed_at ?? null,
    client_rating: initial?.client_rating ?? null,
  });

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      const { data: row } = await supabase
        .from('courses')
        .select('status, payment_status, payment_method, completed_at, client_rating')
        .eq('id', courseId)
        .maybeSingle();
      if (!cancelled && row) {
        setData({
          status: (row as any).status ?? null,
          payment_status: (row as any).payment_status ?? null,
          payment_method: (row as any).payment_method ?? null,
          completed_at: (row as any).completed_at ?? null,
          client_rating: (row as any).client_rating ?? null,
        });
      }
    };
    fetchOnce();

    const cleanup = subscriptionManager.subscribe(
      `client-course-progress-${courseId}`,
      { table: 'courses', event: 'UPDATE', filter: `id=eq.${courseId}` },
      (payload: any) => {
        const n = payload.new ?? {};
        setData((prev) => ({
          status: n.status ?? prev.status,
          payment_status: n.payment_status ?? prev.payment_status,
          payment_method: n.payment_method ?? prev.payment_method,
          completed_at: n.completed_at ?? prev.completed_at,
          client_rating: n.client_rating ?? prev.client_rating,
        }));
      },
    );
    return () => { cancelled = true; cleanup?.(); };
  }, [courseId]);

  const isCash = data.payment_method === 'cash';
  // Pour cash : "paiement validé" = course terminée (chauffeur encaisse à l'arrivée).
  // Pour carte/Stripe : payment_status === 'paid' OU 'authorized' (préautorisation OK).
  const isPaid = isCash
    ? data.status === 'completed' || !!data.completed_at
    : ['paid', 'authorized', 'captured'].some((s) => String(data.payment_status || '').startsWith(s));

  const isCheckin = ['driver_arrived', 'in_progress', 'completed'].includes(String(data.status || ''));
  const isFinished = data.status === 'completed' || !!data.completed_at;
  // Confirmation finale = course terminée + paiement validé (et idéalement notée)
  const isConfirmed = isFinished && isPaid;

  const stepState = (key: Step): 'done' | 'current' | 'todo' => {
    const order: Step[] = ['paid', 'checkin', 'finished', 'confirmed'];
    const reached: Record<Step, boolean> = {
      paid: isPaid,
      checkin: isCheckin,
      finished: isFinished,
      confirmed: isConfirmed,
    };
    if (reached[key]) {
      const idx = order.indexOf(key);
      const nextKey = order[idx + 1];
      if (!nextKey || !reached[nextKey]) return 'current';
      return 'done';
    }
    return 'todo';
  };

  return (
    <Card className={cn('overflow-hidden border-primary/20', className)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Suivi de votre course
          </p>
          <span className="text-[10px] text-muted-foreground">Vue client</span>
        </div>

        {!isPaid && !isCash && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-700">
            <Lock className="h-3 w-3 shrink-0" />
            <span>
              En attente de la confirmation de votre paiement par notre partenaire bancaire.
            </span>
          </div>
        )}
        {isCash && !isFinished && (
          <div className="flex items-center gap-2 rounded-md bg-blue-500/10 border border-blue-500/30 p-2 text-[11px] text-blue-700">
            <CreditCard className="h-3 w-3 shrink-0" />
            <span>Paiement en espèces : à régler directement au chauffeur à l’arrivée.</span>
          </div>
        )}

        <ol className="relative ml-2 border-l border-border space-y-2.5 pt-1">
          {STEPS.map(({ key, label, icon: Icon, help }) => {
            const state = stepState(key);
            return (
              <li key={key} className="pl-4 relative">
                <span
                  className={cn(
                    'absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border',
                    state === 'done' && 'bg-green-500 border-green-500 text-white',
                    state === 'current' && 'bg-primary border-primary text-primary-foreground animate-pulse',
                    state === 'todo' && 'bg-background border-border text-muted-foreground',
                  )}
                >
                  {state === 'done' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : state === 'current' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Circle className="h-2.5 w-2.5" />
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <Icon className={cn(
                    'h-3.5 w-3.5',
                    state === 'done' && 'text-green-600',
                    state === 'current' && 'text-primary',
                    state === 'todo' && 'text-muted-foreground',
                  )} />
                  <span className={cn('text-xs font-medium', state === 'todo' && 'text-muted-foreground')}>
                    {label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{help}</p>
              </li>
            );
          })}
        </ol>

        {isConfirmed && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-500/10 border border-green-500/30 p-2 text-[11px] text-green-700">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>
              Course confirmée — votre reçu et votre facture sont disponibles ci-dessous.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
