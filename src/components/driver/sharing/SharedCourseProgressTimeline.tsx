import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Loader2, CreditCard, Play, Flag, Sparkles, Lock, Link2, Webhook, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'created' | 'paid' | 'in_progress' | 'completed' | 'settled';

interface Props {
  sharedCourseId: string;
  /** "sender" = chauffeur émetteur (A) ; "receiver" = chauffeur receveur (B) */
  perspective: 'sender' | 'receiver';
  /** Données déjà connues, évite un fetch inutile */
  initial?: {
    status?: string | null;
    payment_status?: string | null;
    completed_at?: string | null;
    stripe_checkout_session_id?: string | null;
    payment_link_created_at?: string | null;
    payment_settled?: boolean | null;
    payment_settled_at?: string | null;
    client_payment_method?: string | null;
  };
  className?: string;
}

const STEPS: { key: Step; label: string; icon: any; help: string }[] = [
  { key: 'created',     label: 'Course créée',           icon: Sparkles,    help: 'La course partagée est enregistrée' },
  { key: 'paid',        label: 'Paiement Stripe validé', icon: CreditCard,  help: 'Le client a réglé le montant TTC' },
  { key: 'in_progress', label: 'Course démarrée',        icon: Play,        help: 'Le chauffeur receveur a démarré la course' },
  { key: 'completed',   label: 'Course terminée',        icon: Flag,        help: 'Le chauffeur receveur a clôturé la course' },
  { key: 'settled',     label: 'Portefeuilles crédités', icon: CheckCircle2,help: 'Commission émetteur + revenus receveur synchronisés' },
];

type RowData = {
  status: string | null;
  payment_status: string | null;
  completed_at: string | null;
  stripe_checkout_session_id: string | null;
  payment_link_created_at: string | null;
  payment_settled: boolean | null;
  payment_settled_at: string | null;
  client_payment_method: string | null;
};

export function SharedCourseProgressTimeline({ sharedCourseId, perspective, initial, className }: Props) {
  const [data, setData] = useState<RowData>({
    status: initial?.status ?? null,
    payment_status: initial?.payment_status ?? null,
    completed_at: initial?.completed_at ?? null,
    stripe_checkout_session_id: initial?.stripe_checkout_session_id ?? null,
    payment_link_created_at: initial?.payment_link_created_at ?? null,
    payment_settled: initial?.payment_settled ?? null,
    payment_settled_at: initial?.payment_settled_at ?? null,
    client_payment_method: initial?.client_payment_method ?? null,
  });

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      const { data: row } = await supabase
        .from('shared_courses')
        .select('status, payment_status, completed_at, stripe_checkout_session_id, payment_link_created_at, payment_settled, payment_settled_at, client_payment_method')
        .eq('id', sharedCourseId)
        .maybeSingle();
      if (!cancelled && row) {
        setData({
          status: (row as any).status ?? null,
          payment_status: (row as any).payment_status ?? null,
          completed_at: (row as any).completed_at ?? null,
          stripe_checkout_session_id: (row as any).stripe_checkout_session_id ?? null,
          payment_link_created_at: (row as any).payment_link_created_at ?? null,
          payment_settled: (row as any).payment_settled ?? null,
          payment_settled_at: (row as any).payment_settled_at ?? null,
          client_payment_method: (row as any).client_payment_method ?? null,
        });
      }
    };
    fetchOnce();

    const ch = supabase
      .channel(`shared-course-progress-${sharedCourseId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shared_courses', filter: `id=eq.${sharedCourseId}` },
        (payload) => {
          const n = payload.new as any;
          setData({
            status: n.status ?? null,
            payment_status: n.payment_status ?? null,
            completed_at: n.completed_at ?? null,
            stripe_checkout_session_id: n.stripe_checkout_session_id ?? null,
            payment_link_created_at: n.payment_link_created_at ?? null,
            payment_settled: n.payment_settled ?? null,
            payment_settled_at: n.payment_settled_at ?? null,
            client_payment_method: n.client_payment_method ?? null,
          });
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [sharedCourseId]);

  const isPaid = String(data.payment_status || '').startsWith('paid');
  const isInProgress = data.status === 'in_progress' || data.status === 'completed';
  const isCompleted = data.status === 'completed' || !!data.completed_at;
  const isSettled = (data.payment_settled === true) || (isCompleted && isPaid);

  // ===== Stripe lifecycle (créé → checkout → payé webhook → prêt check-in) =====
  const checkoutCreated = !!data.stripe_checkout_session_id || !!data.payment_link_created_at;
  const webhookConfirmed = isPaid; // payment_status passe à "paid" via le webhook stripe-webhook
  const readyForCheckin = webhookConfirmed; // garde-fou : check-in autorisé seulement après confirmation webhook

  type StripePhase = {
    key: 'created' | 'checkout' | 'webhook' | 'ready';
    label: string;
    icon: any;
    reached: boolean;
    timestamp?: string | null;
  };
  const stripePhases: StripePhase[] = [
    { key: 'created',  label: 'Course créée',          icon: Sparkles,    reached: true },
    { key: 'checkout', label: 'Lien Stripe généré',    icon: Link2,       reached: checkoutCreated, timestamp: data.payment_link_created_at },
    { key: 'webhook',  label: 'Paiement confirmé',     icon: Webhook,     reached: webhookConfirmed },
    { key: 'ready',    label: 'Prêt pour check-in',    icon: ShieldCheck, reached: readyForCheckin },
  ];
  const currentStripePhaseIdx = (() => {
    let last = 0;
    stripePhases.forEach((p, i) => { if (p.reached) last = i; });
    return last;
  })();



  const stepState = (key: Step): 'done' | 'current' | 'todo' => {
    const order: Step[] = ['created', 'paid', 'in_progress', 'completed', 'settled'];
    const reached: Record<Step, boolean> = {
      created: true,
      paid: isPaid,
      in_progress: isInProgress,
      completed: isCompleted,
      settled: isSettled,
    };
    if (reached[key]) {
      // current = dernière étape atteinte
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
            Progression de la course partagée
          </p>
          <span className="text-[10px] text-muted-foreground">
            {perspective === 'sender' ? 'Vue émetteur' : 'Vue receveur'}
          </span>
        </div>

        {/* Garde-fou visuel UI */}
        {!isPaid && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-700">
            <Lock className="h-3 w-3 shrink-0" />
            <span>
              Tant que Stripe n’a pas confirmé le paiement, la course ne peut pas être terminée ni déverrouillée.
            </span>
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
                  <span className={cn(
                    'text-xs font-medium',
                    state === 'todo' && 'text-muted-foreground',
                  )}>
                    {label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{help}</p>
              </li>
            );
          })}
        </ol>

        {isSettled && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-500/10 border border-green-500/30 p-2 text-[11px] text-green-700">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>
              {perspective === 'sender'
                ? 'Votre commission a été créditée sur votre portefeuille Stripe.'
                : 'Vos revenus nets sont en route vers votre portefeuille Stripe.'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
