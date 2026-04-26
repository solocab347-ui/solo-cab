import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Hand, QrCode, UserPlus, Crown, Loader2, Save, Settings2,
  ChevronDown, ChevronUp, ArrowRight, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  driverId: string;
  onUpdate?: () => void;
  defaultOpen?: boolean;
}

interface Targets {
  cards_proposed_target: number;
  qr_scans_target: number;
  direct_clients_target: number;
  independence_percentage_target: number;
}

const DEFAULTS: Targets = {
  cards_proposed_target: 60,
  qr_scans_target: 30,
  direct_clients_target: 8,
  independence_percentage_target: 30,
};

/**
 * Quick-edit popover dédié aux cibles d'ACQUISITION (mensuelles).
 * Édite la ligne `driver_objectives` period_type='monthly' uniquement
 * sur les 4 colonnes acquisition. La modification déclenche le trigger
 * `snapshot_driver_objective_change` côté DB → snapshot historique.
 */
export function AcquisitionTargetsQuickEdit({ driverId, onUpdate, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<Targets>(DEFAULTS);
  const [initial, setInitial] = useState<Targets>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_objectives')
        .select('cards_proposed_target, qr_scans_target, direct_clients_target, independence_percentage_target')
        .eq('driver_id', driverId)
        .eq('period_type', 'monthly')
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        const t: Targets = {
          cards_proposed_target: Number(data.cards_proposed_target) || DEFAULTS.cards_proposed_target,
          qr_scans_target: Number(data.qr_scans_target) || DEFAULTS.qr_scans_target,
          direct_clients_target: Number(data.direct_clients_target) || DEFAULTS.direct_clients_target,
          independence_percentage_target: Number(data.independence_percentage_target) || DEFAULTS.independence_percentage_target,
        };
        setTargets(t);
        setInitial(t);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [driverId]);

  const dirty = JSON.stringify(targets) !== JSON.stringify(initial);

  const handleSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('driver_objectives')
        .update({
          cards_proposed_target: targets.cards_proposed_target,
          qr_scans_target: targets.qr_scans_target,
          direct_clients_target: targets.direct_clients_target,
          independence_percentage_target: targets.independence_percentage_target,
          updated_at: new Date().toISOString(),
        })
        .eq('driver_id', driverId)
        .eq('period_type', 'monthly');

      if (error) throw error;

      setInitial(targets);
      toast.success('Cibles d\'acquisition mises à jour', {
        description: 'Un snapshot mensuel a été archivé automatiquement.',
      });
      onUpdate?.();
    } catch (e: any) {
      console.error('[acq-quick-edit] save error', e);
      toast.error('Échec de la sauvegarde', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 touch-manipulation"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Settings2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">Cibles d'acquisition (mensuel)</span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="mt-4 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <NumberRow
                  icon={<Hand className="w-4 h-4 text-orange-500" />}
                  label="Cartes proposées"
                  unit="/ mois"
                  value={targets.cards_proposed_target}
                  onChange={(v) => setTargets(t => ({ ...t, cards_proposed_target: v }))}
                  min={0}
                  step={5}
                />
                <NumberRow
                  icon={<QrCode className="w-4 h-4 text-blue-500" />}
                  label="QR scannés"
                  unit="/ mois"
                  value={targets.qr_scans_target}
                  onChange={(v) => setTargets(t => ({ ...t, qr_scans_target: v }))}
                  min={0}
                  step={5}
                />
                <NumberRow
                  icon={<UserPlus className="w-4 h-4 text-green-500" />}
                  label="Clients directs"
                  unit="/ mois"
                  value={targets.direct_clients_target}
                  onChange={(v) => setTargets(t => ({ ...t, direct_clients_target: v }))}
                  min={0}
                  step={1}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                      <Label className="text-sm">Indépendance visée</Label>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {targets.independence_percentage_target}%
                    </span>
                  </div>
                  <Slider
                    value={[targets.independence_percentage_target]}
                    onValueChange={([v]) => setTargets(t => ({ ...t, independence_percentage_target: v }))}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Part du CA réalisé hors plateformes (clients directs + SoloCab).
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="h-10 flex-1"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Enregistrer
                  </Button>
                  {dirty && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTargets(initial)}
                      disabled={saving}
                      className="h-10"
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NumberRow({
  icon, label, unit, value, onChange, min = 0, step = 1,
}: {
  icon: React.ReactNode;
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon}
        <Label className="text-sm truncate">{label}</Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Diminuer ${label}`}
        >−</Button>
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(Number.isFinite(n) ? Math.max(min, n) : min);
          }}
          className={cn('h-9 w-16 text-center tabular-nums', 'px-1')}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(value + step)}
          aria-label={`Augmenter ${label}`}
        >+</Button>
        {unit && <span className="text-[11px] text-muted-foreground ml-1 hidden sm:inline">{unit}</span>}
      </div>
    </div>
  );
}
