import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calculator, Crown, Hand, QrCode, UserPlus, Euro } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedDriverProfile } from '@/hooks/useOptimizedDriverProfile';
import { useDriverObjectives } from '@/hooks/useDriverObjectives';
import { AcquisitionCoach } from '@/components/driver/objectives/coaching/AcquisitionCoach';
import { cn } from '@/lib/utils';
import type { DriverObjective } from '@/components/driver/objectives/types';

/**
 * Page de diagnostic — /driver/objectives-debug
 *
 * Affiche en clair :
 *  1. La table des cibles (mensuel, hebdo, journalier, annuel) telles que stockées
 *  2. La décomposition / proratisation (mensuel ↔ daily ÷22, weekly ÷4, yearly ×12)
 *  3. Les écarts entre périodes (cohérence)
 *  4. Le coach d'acquisition en mode debug (toutes les règles évaluées)
 */
export default function DriverObjectivesDebug() {
  const { user } = useAuth();
  const { driverProfile, isLoading: profileLoading } = useOptimizedDriverProfile(user?.id);
  const driverId = driverProfile?.driver?.id ?? '';
  const driverName = (driverProfile?.driver as { first_name?: string } | undefined)?.first_name;

  const hook = useDriverObjectives(driverId || null);

  if (profileLoading || hook.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Profil chauffeur introuvable.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <Link
            to="/driver-dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Debug — Calcul des cibles
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vérifie comment tes cibles d'objectifs sont stockées et proratisées par période.
          </p>
        </div>
      </header>

      {/* Section 1 — Table brute des cibles par période */}
      <RawTargetsTable objectives={hook.objectives} />

      {/* Section 2 — Décomposition mensuel → autres périodes */}
      <DerivationTable objectives={hook.objectives} />

      {/* Section 3 — Cohérence */}
      <ConsistencyCheck objectives={hook.objectives} />

      {/* Section 4 — Coach en mode debug */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Diagnostic AcquisitionCoach</CardTitle>
        </CardHeader>
        <CardContent>
          <AcquisitionCoach
            entries={hook.dailyEntries}
            totalDirectClients={hook.driverStats.totalClients}
            loyalClientsCount={Math.floor(hook.driverStats.totalClients * 0.3)}
            driverName={driverName}
            debug
            fullWidth
          />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Section 1 : table brute ---
const PERIOD_LABEL: Record<string, string> = {
  daily: 'Journalier',
  weekly: 'Hebdo',
  monthly: 'Mensuel',
  yearly: 'Annuel',
};

const PERIOD_ORDER = ['daily', 'weekly', 'monthly', 'yearly'] as const;

const TARGET_FIELDS: Array<{
  key: keyof DriverObjective;
  label: string;
  icon: typeof Calculator;
  family: 'revenue' | 'acquisition';
  unit?: string;
}> = [
  { key: 'revenue_target', label: 'CA', icon: Euro, family: 'revenue', unit: '€' },
  { key: 'courses_target', label: 'Courses', icon: Calculator, family: 'revenue' },
  { key: 'hours_target', label: 'Heures', icon: Calculator, family: 'revenue', unit: 'h' },
  { key: 'km_target', label: 'KM', icon: Calculator, family: 'revenue', unit: 'km' },
  { key: 'cards_proposed_target', label: 'Cartes proposées', icon: Hand, family: 'acquisition' },
  { key: 'qr_scans_target', label: 'Scans QR', icon: QrCode, family: 'acquisition' },
  { key: 'direct_clients_target', label: 'Clients directs', icon: UserPlus, family: 'acquisition' },
  { key: 'independence_percentage_target', label: '% Indépendance', icon: Crown, family: 'acquisition', unit: '%' },
];

function RawTargetsTable({ objectives }: { objectives: DriverObjective[] }) {
  const byPeriod = useMemo(() => {
    const map = new Map<string, DriverObjective>();
    objectives.forEach((o) => map.set(o.period_type, o));
    return map;
  }, [objectives]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">1. Cibles stockées (table driver_objectives)</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Une ligne par période — valeurs brutes telles qu'enregistrées en base.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3 font-semibold">Métrique</th>
              {PERIOD_ORDER.map((p) => (
                <th key={p} className="py-2 px-2 font-semibold text-right">
                  {PERIOD_LABEL[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TARGET_FIELDS.map((f) => {
              const Icon = f.icon;
              return (
                <tr
                  key={f.key as string}
                  className={cn(
                    'border-b border-border/50',
                    f.family === 'acquisition' && 'bg-primary/5',
                  )}
                >
                  <td className="py-2 pr-3 flex items-center gap-1.5">
                    <Icon className={cn('w-3.5 h-3.5', f.family === 'acquisition' ? 'text-primary' : 'text-muted-foreground')} />
                    <span>{f.label}</span>
                    {f.family === 'acquisition' && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-primary/40 text-primary">
                        ACQ
                      </Badge>
                    )}
                  </td>
                  {PERIOD_ORDER.map((p) => {
                    const obj = byPeriod.get(p);
                    const v = obj ? Number(obj[f.key]) : null;
                    return (
                      <td key={p} className="py-2 px-2 text-right font-mono">
                        {v === null ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          <>
                            {v.toLocaleString('fr-FR')}
                            {f.unit && <span className="text-muted-foreground ml-0.5">{f.unit}</span>}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// --- Section 2 : décomposition à partir du mensuel ---
function DerivationTable({ objectives }: { objectives: DriverObjective[] }) {
  const monthly = objectives.find((o) => o.period_type === 'monthly');

  if (!monthly) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">2. Proratisation depuis le mensuel</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Aucune cible mensuelle définie — impossible de calculer la décomposition.
        </CardContent>
      </Card>
    );
  }

  const multipliers = {
    daily: { value: 1 / 22, label: '÷ 22 jours travaillés' },
    weekly: { value: 1 / 4, label: '÷ 4 semaines' },
    monthly: { value: 1, label: '= référence' },
    yearly: { value: 12, label: '× 12 mois' },
  } as const;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">2. Décomposition depuis le mensuel (référence)</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Formule appliquée par AcquisitionTargetsQuickEdit pour proratiser automatiquement.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3 font-semibold">Métrique</th>
              <th className="py-2 px-2 font-semibold text-right">Mensuel</th>
              {PERIOD_ORDER.filter((p) => p !== 'monthly').map((p) => (
                <th key={p} className="py-2 px-2 font-semibold text-right">
                  {PERIOD_LABEL[p]}
                  <div className="text-[9px] font-normal text-muted-foreground">
                    {multipliers[p].label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TARGET_FIELDS.map((f) => {
              if (f.key === 'independence_percentage_target') {
                // % constant sur toutes les périodes
                const v = Number(monthly[f.key]);
                return (
                  <tr key={f.key as string} className="border-b border-border/50 bg-primary/5">
                    <td className="py-2 pr-3 font-medium">% Indépendance</td>
                    <td className="py-2 px-2 text-right font-mono">{v}%</td>
                    <td colSpan={3} className="py-2 px-2 text-center text-muted-foreground italic">
                      Constant — pas de proratisation
                    </td>
                  </tr>
                );
              }
              const base = Number(monthly[f.key]);
              return (
                <tr
                  key={f.key as string}
                  className={cn(
                    'border-b border-border/50',
                    f.family === 'acquisition' && 'bg-primary/5',
                  )}
                >
                  <td className="py-2 pr-3">{f.label}</td>
                  <td className="py-2 px-2 text-right font-mono font-semibold">
                    {base.toLocaleString('fr-FR')}
                    {f.unit && <span className="text-muted-foreground ml-0.5">{f.unit}</span>}
                  </td>
                  {PERIOD_ORDER.filter((p) => p !== 'monthly').map((p) => {
                    const computed = Math.round(base * multipliers[p].value);
                    return (
                      <td key={p} className="py-2 px-2 text-right font-mono">
                        {computed.toLocaleString('fr-FR')}
                        {f.unit && <span className="text-muted-foreground ml-0.5">{f.unit}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// --- Section 3 : check de cohérence ---
function ConsistencyCheck({ objectives }: { objectives: DriverObjective[] }) {
  const monthly = objectives.find((o) => o.period_type === 'monthly');
  const checks = useMemo(() => {
    if (!monthly) return [];
    const results: { label: string; expected: number; actual: number; ok: boolean; period: string; field: string }[] = [];

    const formulas: Array<{ p: 'daily' | 'weekly' | 'yearly'; mult: number }> = [
      { p: 'daily', mult: 1 / 22 },
      { p: 'weekly', mult: 1 / 4 },
      { p: 'yearly', mult: 12 },
    ];

    TARGET_FIELDS.forEach((f) => {
      if (f.key === 'independence_percentage_target') return;
      const base = Number(monthly[f.key]);
      formulas.forEach(({ p, mult }) => {
        const obj = objectives.find((o) => o.period_type === p);
        if (!obj) return;
        const expected = Math.round(base * mult);
        const actual = Number(obj[f.key]);
        const tolerance = Math.max(1, Math.round(expected * 0.05)); // 5%
        results.push({
          label: f.label,
          expected,
          actual,
          ok: Math.abs(expected - actual) <= tolerance,
          period: PERIOD_LABEL[p],
          field: f.key as string,
        });
      });
    });

    return results;
  }, [objectives, monthly]);

  if (!monthly) return null;

  const okCount = checks.filter((c) => c.ok).length;
  const koCount = checks.length - okCount;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          3. Cohérence (mensuel ↔ autres périodes)
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              koCount === 0
                ? 'border-emerald-500/40 text-emerald-600'
                : 'border-orange-500/40 text-orange-600',
            )}
          >
            {okCount}/{checks.length} ok
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Tolérance 5%. Un écart signale que le mensuel et la période ont été modifiés
          séparément (ex : à la main en base sans proratisation).
        </p>
      </CardHeader>
      <CardContent>
        {koCount === 0 ? (
          <div className="text-xs text-emerald-600">
            ✓ Toutes les périodes sont cohérentes avec le mensuel.
          </div>
        ) : (
          <div className="space-y-1.5">
            {checks
              .filter((c) => !c.ok)
              .map((c, i) => (
                <div
                  key={`${c.field}-${c.period}-${i}`}
                  className="flex items-center justify-between text-xs border border-orange-500/30 bg-orange-500/5 rounded p-2"
                >
                  <div>
                    <span className="font-medium">{c.label}</span>{' '}
                    <span className="text-muted-foreground">({c.period})</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    attendu <span className="text-emerald-600">{c.expected}</span>
                    {' / '}
                    en base <span className="text-orange-600">{c.actual}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
