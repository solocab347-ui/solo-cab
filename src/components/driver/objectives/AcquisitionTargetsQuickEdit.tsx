import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil, Hand, QrCode, UserPlus, Crown, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AcquisitionTargetsQuickEditProps {
  driverId: string;
  /** Cible mensuelle (référence) */
  currentCardsTarget?: number;
  currentScansTarget?: number;
  currentDirectClientsTarget?: number;
  currentIndependencePct?: number;
  onSaved?: () => void;
  /** Variante du trigger : icône seule ou bouton avec label */
  variant?: 'icon' | 'button';
}

/**
 * Quick editor inline pour les cibles d'acquisition mensuelles.
 *
 * S'ouvre dans un popover sans quitter le dashboard. Sauvegarde les 4 cibles
 * sur les 4 périodes (daily/weekly/monthly/yearly) en proratisant.
 */
export function AcquisitionTargetsQuickEdit({
  driverId,
  currentCardsTarget = 60,
  currentScansTarget = 30,
  currentDirectClientsTarget = 15,
  currentIndependencePct = 20,
  onSaved,
  variant = 'icon',
}: AcquisitionTargetsQuickEditProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState(currentCardsTarget);
  const [scans, setScans] = useState(currentScansTarget);
  const [clients, setClients] = useState(currentDirectClientsTarget);
  const [independence, setIndependence] = useState(currentIndependencePct);

  // Resync quand les props changent (ex: après refetch du parent)
  useEffect(() => {
    if (!open) {
      setCards(currentCardsTarget);
      setScans(currentScansTarget);
      setClients(currentDirectClientsTarget);
      setIndependence(currentIndependencePct);
    }
  }, [currentCardsTarget, currentScansTarget, currentDirectClientsTarget, currentIndependencePct, open]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const mult = {
        daily: 1 / 22,
        weekly: 1 / 4,
        monthly: 1,
        yearly: 12,
      };

      const rows = (['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => ({
        driver_id: driverId,
        period_type: p,
        cards_proposed_target: Math.round(cards * mult[p]),
        qr_scans_target: Math.round(scans * mult[p]),
        direct_clients_target: Math.round(clients * mult[p]),
        independence_percentage_target: independence,
        is_active: true,
      }));

      // Upsert : ne touche que les colonnes acquisition (les autres restent inchangées)
      const { error } = await supabase
        .from('driver_objectives')
        .upsert(rows, { onConflict: 'driver_id,period_type' });

      if (error) throw error;

      // Mirror dans drivers.objectives_data
      const { data: driver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      const merged = {
        ...((driver?.objectives_data as Record<string, unknown>) || {}),
        target_cards_proposed: cards,
        target_qr_scans: scans,
        target_direct_clients: clients,
        target_independence_pct: independence,
      };

      await supabase
        .from('drivers')
        .update({ objectives_data: JSON.parse(JSON.stringify(merged)) })
        .eq('id', driverId);

      toast.success('Cibles d\'acquisition mises à jour');
      setOpen(false);
      onSaved?.();
    } catch (e) {
      console.error('Quick edit error:', e);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [driverId, cards, scans, clients, independence, onSaved]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            aria-label="Modifier les cibles d'acquisition"
          >
            <Pencil className="w-3.5 h-3.5 text-primary" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <Pencil className="w-3 h-3" />
            Modifier mes cibles
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              Cibles d'acquisition
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Valeurs mensuelles — proratisées sur jour/semaine/an automatiquement
          </p>
        </div>

        {/* Body */}
        <div className="p-3 space-y-4">
          <QuickField
            icon={<Hand className="w-3.5 h-3.5 text-amber-500" />}
            label="Cartes proposées"
            value={cards}
            onChange={setCards}
            min={0}
            max={1000}
            step={5}
            hint={`≈ ${Math.round(cards / 22)}/jour`}
          />

          <QuickField
            icon={<QrCode className="w-3.5 h-3.5 text-purple-500" />}
            label="Scans QR"
            value={scans}
            onChange={setScans}
            min={0}
            max={500}
            step={1}
            hint={cards > 0 ? `${Math.round((scans / cards) * 100)}% des cartes` : ''}
          />

          <QuickField
            icon={<UserPlus className="w-3.5 h-3.5 text-emerald-500" />}
            label="Clients directs"
            value={clients}
            onChange={setClients}
            min={0}
            max={200}
            step={1}
            hint={scans > 0 ? `${Math.round((clients / scans) * 100)}% des scans` : ''}
          />

          {/* Independence slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span>% CA en direct</span>
              </Label>
              <span className="text-sm font-bold text-primary tabular-nums">
                {independence}%
              </span>
            </div>
            <Slider
              value={[independence]}
              onValueChange={([v]) => setIndependence(v)}
              min={0}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Plateformes</span>
              <span>Indépendance totale</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-3 border-t border-border bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="flex-1 h-8 text-xs"
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className={cn('flex-1 h-8 text-xs gap-1.5', 'bg-primary')}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function QuickField({
  icon,
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label="Diminuer"
        >
          <span className="text-base leading-none">−</span>
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="h-8 text-center text-sm font-bold flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label="Augmenter"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>
    </div>
  );
}
