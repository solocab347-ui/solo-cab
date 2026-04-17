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
import { MapPin, Plus, Home, Briefcase, Star, Trash2, Loader2, GripVertical } from 'lucide-react';
import { useClientAddresses, type SavedAddress } from '@/hooks/useClientAddresses';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TYPE_ICON = { home: Home, work: Briefcase, other: Star } as const;
const TYPE_LABEL = { home: 'Maison', work: 'Travail', other: 'Autre' } as const;

interface SortableRowProps {
  addr: SavedAddress;
  onDelete: (a: SavedAddress) => void;
}

function SortableRow({ addr, onDelete }: SortableRowProps) {
  const Icon = TYPE_ICON[addr.address_type] || Star;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: addr.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 rounded-lg border border-border/60 bg-muted/30"
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1"
        aria-label="Réordonner"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{addr.label}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {TYPE_LABEL[addr.address_type]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{addr.address}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(addr)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </li>
  );
}

export function SavedAddressesManager() {
  const { saved, loading, addSaved, removeSaved, reorderSaved } = useClientAddresses();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState<'home' | 'work' | 'other'>('home');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reset = () => {
    setLabel('');
    setAddress('');
    setCoords(null);
    setType('home');
  };

  const handleAddressSelect = (addr: string, coordinates?: { latitude: number; longitude: number }) => {
    setAddress(addr);
    if (coordinates) setCoords({ lat: coordinates.latitude, lng: coordinates.longitude });
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = saved.findIndex((a) => a.id === active.id);
    const newIndex = saved.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(saved, oldIndex, newIndex);
    try {
      await reorderSaved(newOrder.map((a) => a.id));
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de réordonner');
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
            Glissez pour réorganiser — la première sera utilisée par défaut
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={saved.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {saved.map((a) => (
                <SortableRow key={a.id} addr={a} onDelete={handleDelete} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
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
                onChange={handleAddressSelect}
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
