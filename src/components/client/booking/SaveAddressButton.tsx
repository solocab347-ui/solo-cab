import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookmarkPlus, Loader2, Check } from 'lucide-react';
import { useClientAddresses } from '@/hooks/useClientAddresses';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SaveAddressButtonProps {
  address: string;
  coords?: { lat: number; lng: number } | null;
  /** Pre-selected type when opening the dialog */
  defaultType?: 'home' | 'work' | 'other';
  className?: string;
}

/**
 * Compact button that lets a logged-in client save the current pickup/destination
 * address as a new favorite without leaving the booking flow.
 * Renders nothing for guests or when the address is empty / already saved.
 */
export function SaveAddressButton({
  address,
  coords,
  defaultType = 'other',
  className,
}: SaveAddressButtonProps) {
  const { saved, clientId, addSaved } = useClientAddresses();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'home' | 'work' | 'other'>(defaultType);

  // Hide for guests
  if (!clientId) return null;
  // Hide if no address typed
  if (!address.trim()) return null;

  const norm = (s: string) => s.trim().toLowerCase();
  const isAlreadySaved = saved.some((a) => norm(a.address) === norm(address));

  if (isAlreadySaved) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-medium text-primary',
          className
        )}
        title="Adresse déjà enregistrée dans vos favoris"
      >
        <Check className="h-3 w-3" />
        Favori
      </span>
    );
  }

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error('Donnez un libellé à cette adresse');
      return;
    }
    setSubmitting(true);
    try {
      await addSaved({
        label: label.trim(),
        address: address.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        address_type: type,
      });
      toast.success('Adresse ajoutée à vos favoris');
      setOpen(false);
      setLabel('');
      setType(defaultType);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 px-2 gap-1 text-[11px] text-primary hover:bg-primary/10',
          className
        )}
        onClick={() => setOpen(true)}
        title="Sauvegarder cette adresse comme favori"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Sauvegarder
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setLabel(''); setType(defaultType); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sauvegarder cette adresse</DialogTitle>
            <DialogDescription className="text-xs">
              Retrouvez-la en un clic lors de vos prochaines courses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground border border-border/50 line-clamp-2">
              {address}
            </div>
            <div>
              <Label htmlFor="save-addr-label" className="text-xs">Libellé</Label>
              <Input
                id="save-addr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex : Maison, Bureau, Maman…"
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
