import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { useClientAddresses } from '@/hooks/useClientAddresses';
import { toast } from 'sonner';

const DISMISS_KEY = 'solocab_freq_addr_dismissed';

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}
function addDismissed(addr: string) {
  const list = getDismissed();
  if (!list.includes(addr)) {
    list.push(addr);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(list.slice(-50)));
  }
}

/**
 * Banner suggesting to save a frequently-used address (3+ rides) as favorite.
 * Surfaces the most-used non-favorite address; respects per-address dismissal.
 */
export function FrequentAddressBanner() {
  const { frequent, clientId, addSaved } = useClientAddresses();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'home' | 'work' | 'other'>('home');
  const [submitting, setSubmitting] = useState(false);
  const [localDismissed, setLocalDismissed] = useState<string[]>(getDismissed());

  const candidate = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    return frequent.find((f) => !localDismissed.includes(norm(f.address))) || null;
  }, [frequent, localDismissed]);

  if (!clientId || !candidate) return null;

  const handleDismiss = () => {
    const norm = candidate.address.trim().toLowerCase();
    addDismissed(norm);
    setLocalDismissed((prev) => [...prev, norm]);
  };

  const handleOpen = () => {
    // Suggest a sensible default label (first part of the address)
    const guess = candidate.address.split(',')[0].trim().slice(0, 30);
    setLabel(guess);
    setType('home');
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error('Donnez un libellé à cette adresse');
      return;
    }
    setSubmitting(true);
    try {
      await addSaved({
        label: label.trim(),
        address: candidate.address,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        address_type: type,
      });
      toast.success('Adresse ajoutée à vos favoris');
      setOpen(false);
      // Mark dismissed so banner disappears even if RPC cache lags
      handleDismiss();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-3 pr-9 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Adresse fréquente détectée
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            <span className="font-medium text-foreground">{candidate.usage_count}×</span>{' '}
            {candidate.address}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Voulez-vous l'enregistrer comme favori ?
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpen}>
              <Sparkles className="h-3 w-3" />
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={handleDismiss}>
              Plus tard
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
          aria-label="Ignorer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLabel(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enregistrer comme favori</DialogTitle>
            <DialogDescription className="text-xs">
              Vous avez utilisé cette adresse {candidate.usage_count} fois. Donnez-lui un nom.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground border border-border/50 line-clamp-2">
              {candidate.address}
            </div>
            <div>
              <Label htmlFor="freq-addr-label" className="text-xs">Libellé</Label>
              <Input
                id="freq-addr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex : Maison, Bureau…"
                maxLength={40}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">🏠 Maison</SelectItem>
                  <SelectItem value="work">💼 Travail</SelectItem>
                  <SelectItem value="other">⭐ Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
