import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp, FlaskConical, RotateCcw, CheckCircle2, XCircle, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeAlertsFromSignals,
  evaluateAllRules,
  ALERT_TO_NUDGE_MAP,
  type AlertSignals,
} from './acquisitionAlertsLogic';

interface Props {
  /** Signaux réels (calculés depuis les vraies entrées) — base de départ du simulateur */
  realSignals: AlertSignals;
}

/**
 * Mode "test alertes" : simule des valeurs de cartes/scans/signups/courses
 * et affiche en direct quelles alertes se déclenchent et quels nudges du
 * coach seront supprimés à cause de la dédup.
 *
 * AUCUN appel DB — purement client-side, sans effet sur les vraies données.
 */
export function AcquisitionAlertsTester({ realSignals }: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const [courses7, setCourses7] = useState(realSignals.courses7);
  const [proposed7, setProposed7] = useState(realSignals.proposed7);
  const [scans7, setScans7] = useState(realSignals.scans7);
  const [signups7, setSignups7] = useState(realSignals.signups7);
  const [totalDirectClients, setTotalDirectClients] = useState(realSignals.totalDirectClients);
  const [loyalClientsCount, setLoyalClientsCount] = useState(realSignals.loyalClientsCount);

  const reset = () => {
    setCourses7(realSignals.courses7);
    setProposed7(realSignals.proposed7);
    setScans7(realSignals.scans7);
    setSignups7(realSignals.signups7);
    setTotalDirectClients(realSignals.totalDirectClients);
    setLoyalClientsCount(realSignals.loyalClientsCount);
  };

  const simulatedSignals = useMemo<AlertSignals>(() => ({
    ...realSignals,
    courses7,
    proposed7,
    scans7,
    signups7,
    totalDirectClients,
    loyalClientsCount,
    proposalRate: courses7 > 0 ? proposed7 / courses7 : 0,
    scanRate: proposed7 > 0 ? scans7 / proposed7 : 0,
    conversionRate: scans7 > 0 ? signups7 / scans7 : 0,
  }), [realSignals, courses7, proposed7, scans7, signups7, totalDirectClients, loyalClientsCount]);

  const activeSignals = enabled ? simulatedSignals : realSignals;
  const activeAlerts = computeAlertsFromSignals(activeSignals);
  const allRules = evaluateAllRules(activeSignals);

  const suppressedNudgeIds = Array.from(
    new Set(activeAlerts.flatMap(a => ALERT_TO_NUDGE_MAP[a.id] || [])),
  );

  return (
    <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
      <CardContent className="p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 touch-manipulation"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">Test alertes (simulation)</span>
            {enabled && (
              <Badge className="h-5 px-1.5 text-[10px] bg-primary/15 text-primary border-primary/20">
                ACTIF
              </Badge>
            )}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="min-w-0">
                <Label className="text-xs font-semibold">Activer la simulation</Label>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  N'écrit rien en base. Affiche juste l'effet sur les alertes & nudges.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Sliders */}
            <div className={cn('space-y-4 transition-opacity', !enabled && 'opacity-50 pointer-events-none')}>
              <SliderRow label="Courses (7j)" value={courses7} onChange={setCourses7} max={100} />
              <SliderRow label="Cartes proposées (7j)" value={proposed7} onChange={setProposed7} max={100} />
              <SliderRow label="Scans QR (7j)" value={scans7} onChange={setScans7} max={50} />
              <SliderRow label="Inscriptions (7j)" value={signups7} onChange={setSignups7} max={20} />
              <SliderRow label="Total clients directs" value={totalDirectClients} onChange={setTotalDirectClients} max={200} />
              <SliderRow label="Clients fidèles (≥2 courses)" value={loyalClientsCount} onChange={setLoyalClientsCount} max={Math.max(1, totalDirectClients)} />

              <Button
                size="sm"
                variant="outline"
                onClick={reset}
                className="h-9 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Réinitialiser aux vraies valeurs
              </Button>
            </div>

            {/* Signaux dérivés */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
              <Stat label="Proposition" value={`${(activeSignals.proposalRate * 100).toFixed(0)}%`} />
              <Stat label="Scan rate" value={`${(activeSignals.scanRate * 100).toFixed(0)}%`} />
              <Stat label="Conversion" value={`${(activeSignals.conversionRate * 100).toFixed(0)}%`} />
            </div>

            {/* Évaluation des règles */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Règles évaluées ({allRules.filter(r => r.fired).length}/{allRules.length} actives)
              </h4>
              {allRules.map(rule => (
                <div
                  key={rule.id}
                  className={cn(
                    'p-2 rounded-md border text-xs',
                    rule.fired
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {rule.fired ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{rule.label}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4 px-1 text-[9px] font-mono',
                            rule.fired ? 'border-destructive/40 text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {rule.id}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 leading-tight break-all">
                        {rule.condition}
                      </p>
                      <p className="text-[11px] mt-1 leading-snug">{rule.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Nudges supprimés */}
            <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <EyeOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Nudges du coach supprimés ({suppressedNudgeIds.length})
                </span>
              </div>
              {suppressedNudgeIds.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Aucun nudge supprimé : le coach restera entièrement actif.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {suppressedNudgeIds.map(id => (
                    <li key={id} className="text-[11px] font-mono text-muted-foreground">
                      • {id}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SliderRow({
  label, value, onChange, max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={Math.max(max, value)}
        step={1}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
