import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Hand,
  Sparkles,
  AlertTriangle,
  Trophy,
  Heart,
  Lightbulb,
  X,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriverDailyEntry } from '../types';

/**
 * AcquisitionCoach — mentor non intrusif orienté acquisition de clients directs.
 *
 * Philosophie : on ne pousse JAMAIS le chauffeur sur le CA.
 * On le pousse sur les leviers qui rendent indépendant :
 *  1. Proposer sa carte SoloCab après chaque course externe
 *  2. Faire scanner le QR code
 *  3. Convertir les scans en inscriptions
 *  4. Fidéliser les clients existants
 *
 * Règles d'apparition :
 *  - 1 seul nudge à la fois
 *  - cooldown 4h entre 2 nudges
 *  - cap global 8 nudges dismissés / 7j glissants
 *  - milestones (célébrations) toujours autorisés
 */

const COACH_DISMISSED_KEY = 'solocab_acq_coach_dismissed';
const COACH_LAST_SHOWN_KEY = 'solocab_acq_coach_last';
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h
const MAX_NUDGES_7D = 8;

type NudgeType = 'celebration' | 'opportunity' | 'tip' | 'alert';

interface Nudge {
  id: string;
  type: NudgeType;
  title: string;
  body: string;
  cta?: { label: string; action: 'open-qr' | 'open-funnel' | 'dismiss' };
  /** Une fois dismissé, on ne le remontre pas (sauf milestones répétables) */
  oneShot?: boolean;
}

interface AcquisitionCoachProps {
  entries: DriverDailyEntry[];
  totalDirectClients: number;
  loyalClientsCount: number;
  driverName?: string;
  onOpenQR?: () => void;
}

// --- Helpers d'analyse ---
function computeSignals(entries: DriverDailyEntry[]) {
  const last7 = entries.slice(0, 7);
  const last3 = entries.slice(0, 3);

  const sum = (arr: DriverDailyEntry[], key: keyof DriverDailyEntry) =>
    arr.reduce((s, e) => s + (Number(e[key]) || 0), 0);

  const courses7 = sum(last7, 'courses_count');
  const proposed7 = sum(last7, 'cards_proposed_count' as keyof DriverDailyEntry);
  const scans7 = sum(last7, 'qr_scans_count' as keyof DriverDailyEntry);
  const signups7 = sum(last7, 'direct_signups_count' as keyof DriverDailyEntry);

  const courses3 = sum(last3, 'courses_count');
  const proposed3 = sum(last3, 'cards_proposed_count' as keyof DriverDailyEntry);

  const proposalRate7 = courses7 > 0 ? proposed7 / courses7 : 0;
  const conversionRate7 = scans7 > 0 ? signups7 / scans7 : 0;
  const scanRate7 = proposed7 > 0 ? scans7 / proposed7 : 0;

  return {
    courses7,
    proposed7,
    scans7,
    signups7,
    courses3,
    proposed3,
    proposalRate7,
    conversionRate7,
    scanRate7,
  };
}

function pickNudge(
  signals: ReturnType<typeof computeSignals>,
  totalDirectClients: number,
  loyalClientsCount: number,
  alreadyDismissed: Set<string>,
): Nudge | null {
  // 1. CÉLÉBRATIONS (priorité haute, jamais dismissés en oneShot pour milestones répétables)
  if (totalDirectClients === 1 && !alreadyDismissed.has('celeb-first-client')) {
    return {
      id: 'celeb-first-client',
      type: 'celebration',
      title: '🎉 Ton premier client direct !',
      body: "Bravo, tu viens de signer ta première vraie victoire. Chaque client direct = 0% de commission plateforme. C'est ça, l'indépendance.",
      oneShot: true,
    };
  }
  if (totalDirectClients >= 10 && totalDirectClients < 11 && !alreadyDismissed.has('celeb-10-clients')) {
    return {
      id: 'celeb-10-clients',
      type: 'celebration',
      title: '🏆 10 clients directs !',
      body: 'Tu construis ta vraie clientèle. Continue : à 50, tu commences à pouvoir te passer des plateformes les jours creux.',
      oneShot: true,
    };
  }
  if (totalDirectClients >= 50 && totalDirectClients < 51 && !alreadyDismissed.has('celeb-50-clients')) {
    return {
      id: 'celeb-50-clients',
      type: 'celebration',
      title: '👑 50 clients directs — Tu es indépendant',
      body: 'À ce stade, tu as une base solide. Concentre-toi sur la fidélisation : un client qui revient = bien plus rentable qu\'un nouveau.',
      oneShot: true,
    };
  }
  if (loyalClientsCount >= 5 && !alreadyDismissed.has('celeb-first-loyals')) {
    return {
      id: 'celeb-first-loyals',
      type: 'celebration',
      title: '❤️ 5 clients fidèles',
      body: "Ces clients reviennent. C'est le vrai indicateur d'indépendance — bien plus que le CA brut.",
      oneShot: true,
    };
  }

  // 2. ALERTES contextuelles (basées sur les signaux récents)
  if (
    signals.courses3 >= 10 &&
    signals.proposed3 === 0 &&
    !alreadyDismissed.has('alert-no-proposal-3d')
  ) {
    return {
      id: 'alert-no-proposal-3d',
      type: 'alert',
      title: '10 courses, 0 carte proposée',
      body: "Tu travailles dur sur les plateformes mais tu ne captes aucun client pour toi. Une simple phrase à la fin de la course peut tout changer : « Si vous voulez me reprendre directement, scannez ce QR ».",
      cta: { label: 'Voir mon QR code', action: 'open-qr' },
      oneShot: true,
    };
  }

  if (
    signals.courses7 >= 20 &&
    signals.proposalRate7 < 0.2 &&
    signals.proposed7 > 0 &&
    !alreadyDismissed.has('alert-low-proposal-rate')
  ) {
    return {
      id: 'alert-low-proposal-rate',
      type: 'alert',
      title: `Seulement ${Math.round(signals.proposalRate7 * 100)}% de propositions`,
      body: 'Tu proposes ta carte à moins d\'1 client sur 5. Vise 80% : la majorité accepte au moins de scanner par curiosité, et c\'est gratuit pour toi.',
      oneShot: true,
    };
  }

  if (
    signals.proposed7 >= 10 &&
    signals.scans7 === 0 &&
    !alreadyDismissed.has('alert-no-scans-after-proposals')
  ) {
    return {
      id: 'alert-no-scans-after-proposals',
      type: 'alert',
      title: 'Tu proposes mais personne ne scanne',
      body: 'Soit ta carte/QR n\'est pas accessible (pas affiché dans la voiture ?), soit ta phrase est trop floue. Astuce : pose la carte sur le siège passager, pas dans la boîte à gants.',
      cta: { label: 'Voir mon QR code', action: 'open-qr' },
      oneShot: true,
    };
  }

  if (
    signals.scans7 >= 5 &&
    signals.signups7 === 0 &&
    !alreadyDismissed.has('alert-low-conversion')
  ) {
    return {
      id: 'alert-low-conversion',
      type: 'alert',
      title: 'Des scans, mais pas d\'inscrits',
      body: 'Les clients scannent mais ne finalisent pas. Vérifie que ton profil public est bien rempli (photo, véhicule, présentation). Un profil vide = méfiance.',
      oneShot: true,
    };
  }

  // 3. OPPORTUNITÉS / TIPS (rotation douce)
  if (
    signals.scanRate7 >= 0.3 &&
    signals.conversionRate7 < 0.3 &&
    signals.scans7 >= 3 &&
    !alreadyDismissed.has('tip-improve-profile')
  ) {
    return {
      id: 'tip-improve-profile',
      type: 'tip',
      title: 'Ton profil mérite mieux',
      body: 'Tes clients scannent (bon signe !) mais hésitent à s\'inscrire. Une bio courte + une vraie photo = +60% de conversion en moyenne.',
      oneShot: true,
    };
  }

  if (totalDirectClients >= 3 && loyalClientsCount === 0 && !alreadyDismissed.has('tip-fidelisation')) {
    return {
      id: 'tip-fidelisation',
      type: 'tip',
      title: 'Pense à recontacter',
      body: 'Tu as des clients directs mais aucun ne revient. Un SMS « disponible ce week-end ? » 1x par mois suffit à créer le réflexe.',
      oneShot: true,
    };
  }

  if (signals.courses7 === 0 && totalDirectClients < 3 && !alreadyDismissed.has('tip-getting-started')) {
    return {
      id: 'tip-getting-started',
      type: 'tip',
      title: 'Démarre ta base clients',
      body: 'Aucune saisie cette semaine. Même si tu roules sur Uber/Bolt, note tes courses ici : ça te permet de tracker combien de clients tu pourrais convertir en direct.',
      cta: { label: 'Comprendre l\'acquisition', action: 'open-funnel' },
      oneShot: true,
    };
  }

  if (
    signals.proposalRate7 >= 0.5 &&
    signals.scanRate7 >= 0.4 &&
    signals.conversionRate7 >= 0.3 &&
    !alreadyDismissed.has('tip-pro-mode')
  ) {
    return {
      id: 'tip-pro-mode',
      type: 'celebration',
      title: '🚀 Tu maîtrises l\'acquisition',
      body: 'Tes ratios sont excellents : tu proposes, on scanne, on s\'inscrit. À ce rythme tu deviendras indépendant beaucoup plus vite que la moyenne.',
      oneShot: true,
    };
  }

  return null;
}

// --- Composant ---
export function AcquisitionCoach({
  entries,
  totalDirectClients,
  loyalClientsCount,
  driverName,
  onOpenQR,
}: AcquisitionCoachProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState(false);

  // Charger l'état persisté
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COACH_DISMISSED_KEY);
      if (raw) {
        const parsed: { id: string; ts: number }[] = JSON.parse(raw);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = parsed.filter((d) => d.ts > cutoff);
        setDismissed(new Set(recent.map((d) => d.id)));
        // Re-persist sans les anciens
        if (recent.length !== parsed.length) {
          localStorage.setItem(COACH_DISMISSED_KEY, JSON.stringify(recent));
        }
      }
    } catch {}
  }, []);

  const signals = useMemo(() => computeSignals(entries), [entries]);

  const nudge = useMemo(() => {
    // Vérifier cap 7j
    if (dismissed.size >= MAX_NUDGES_7D) return null;
    // Vérifier cooldown
    try {
      const last = localStorage.getItem(COACH_LAST_SHOWN_KEY);
      if (last && Date.now() - parseInt(last, 10) < COOLDOWN_MS) return null;
    } catch {}
    return pickNudge(signals, totalDirectClients, loyalClientsCount, dismissed);
  }, [signals, totalDirectClients, loyalClientsCount, dismissed]);

  // Marquer le timestamp d'affichage la première fois qu'un nudge s'affiche
  useEffect(() => {
    if (nudge && !hidden) {
      try {
        localStorage.setItem(COACH_LAST_SHOWN_KEY, Date.now().toString());
      } catch {}
    }
  }, [nudge?.id, hidden]);

  const handleDismiss = () => {
    if (!nudge) return;
    setHidden(true);
    setTimeout(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(nudge.id);
        try {
          const raw = localStorage.getItem(COACH_DISMISSED_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          arr.push({ id: nudge.id, ts: Date.now() });
          localStorage.setItem(COACH_DISMISSED_KEY, JSON.stringify(arr));
        } catch {}
        return next;
      });
      setHidden(false);
    }, 250);
  };

  const handleCTA = () => {
    if (!nudge?.cta) return;
    if (nudge.cta.action === 'open-qr' && onOpenQR) onOpenQR();
    if (nudge.cta.action === 'open-funnel') {
      // Scroll vers le funnel (id côté IndependenceFunnel)
      document.getElementById('independence-funnel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    handleDismiss();
  };

  if (!nudge || hidden) return null;

  const styles = TYPE_STYLES[nudge.type];
  const Icon = styles.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={nudge.id}
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Card
          className={cn(
            'overflow-hidden border-2 relative',
            styles.border,
            styles.bg,
          )}
        >
          <CardContent className="p-3.5">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                  styles.iconBg,
                )}
              >
                <Icon className={cn('w-4.5 h-4.5', styles.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold leading-tight">
                    {nudge.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn('text-[9px] px-1.5 h-4 font-medium', styles.badge)}
                  >
                    {styles.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {nudge.body}
                </p>
                {nudge.cta && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCTA}
                    className="mt-2.5 h-7 text-xs gap-1.5"
                  >
                    {nudge.cta.label}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Fermer"
                className="flex-shrink-0 -mr-1 -mt-1 p-1 rounded-md hover:bg-muted/60 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

const TYPE_STYLES: Record<
  NudgeType,
  {
    icon: typeof Sparkles;
    iconBg: string;
    iconColor: string;
    border: string;
    bg: string;
    badge: string;
    label: string;
  }
> = {
  celebration: {
    icon: Trophy,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
    border: 'border-amber-500/40',
    bg: 'bg-gradient-to-br from-amber-500/5 to-transparent',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
    label: 'Bravo',
  },
  alert: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-500',
    border: 'border-orange-500/40',
    bg: 'bg-gradient-to-br from-orange-500/5 to-transparent',
    badge: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
    label: 'À surveiller',
  },
  opportunity: {
    icon: Sparkles,
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    border: 'border-primary/40',
    bg: 'bg-gradient-to-br from-primary/5 to-transparent',
    badge: 'border-primary/40 text-primary',
    label: 'Opportunité',
  },
  tip: {
    icon: Lightbulb,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-500',
    border: 'border-cyan-500/40',
    bg: 'bg-gradient-to-br from-cyan-500/5 to-transparent',
    badge: 'border-cyan-500/40 text-cyan-600 dark:text-cyan-400',
    label: 'Astuce',
  },
};
