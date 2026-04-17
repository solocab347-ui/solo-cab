import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { MapPin, Plus, Home, Briefcase, Star, Trash2, Loader2 } from 'lucide-react';
import { useClientAddresses, type SavedAddress } from '@/hooks/useClientAddresses';
import { toast } from 'sonner';

const TYPE_ICON = { home: Home, work: Briefcase, other: Star } as const;
const TYPE_LABEL = { home: 'Maison', work: 'Travail', other: 'Autre' } as const;

export function SavedAddressesManager() {
  const { saved, loading, addSaved, removeSaved } = useClientAddresses();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState<'home' | 'work' | 'other'>('home');

  const reset = () => {
    setLabel('');
    setAddress('');
    setCoords(null);
    setType('home');
  };

  const handleAddressSelect = (addr: string, lat?: number, lng?: number) => {
    setAddress(addr);
    if (lat != null && lng != null) setCoords({ lat, lng });
  };

  const handleSubmit = async () => {
    if (!label.trim() || !address.trim()) {
      toast.error('Renseignez un libellé et une adresse');
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
      toast.success('Adresse ajoutée');
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (a: SavedAddress) => {
    try {
      await removeSaved(a.id);
      toast.success('Adresse supprimée');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Mes adresses favorites
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pré-remplissez vos courses en un clic
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : saved.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Aucune adresse enregistrée. Ajoutez votre maison ou votre bureau pour gagner du temps.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {saved.map((a) => {
            const Icon = TYPE_ICON[a.address_type] || Star;
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{a.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABEL[a.address_type]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{a.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(a)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle adresse favorite</DialogTitle>
            <DialogDescription>
              Donnez-lui un nom court et choisissez son type pour la retrouver rapidement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="addr-label">Libellé</Label>
              <Input
                id="addr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex : Maison, Bureau, Maman…"
                maxLength={40}
              />
            </div>
            <div>
              <Label>Adresse complète</Label>
              <AddressAutocomplete
                value={address}
                onChange={(addr, lat, lng) => handleAddressSelect(addr, lat as any, lng as any)}
                placeholder="Tapez l'adresse…"
              />
            </div>
            <div>
              <Label>Type</Label>
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
    </Card>
  );
}
