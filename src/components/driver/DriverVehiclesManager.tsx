import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Car, 
  Plus, 
  Star, 
  Trash2, 
  Edit2, 
  Loader2,
  Camera,
  X
} from 'lucide-react';
import { compressImage, validateImageType, validateImageSize } from '@/lib/imageCompression';
import { EquipmentSelector } from './EquipmentSelector';

interface DriverVehicle {
  id: string;
  driver_id: string;
  brand: string;
  model: string;
  color: string | null;
  plate: string | null;
  year: number | null;
  category: string;
  max_passengers: number;
  is_favorite: boolean;
  is_active: boolean;
  photos: string[];
  equipment: string[];
  custom_base_fare: number | null;
  custom_per_km_rate: number | null;
  custom_hourly_rate: number | null;
  custom_minimum_price: number | null;
}

const VEHICLE_CATEGORIES = [
  { value: 'berline', label: 'Berline' },
  { value: 'break', label: 'Break' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'luxe', label: 'Luxe / Prestige' },
  { value: 'electrique', label: 'Électrique' },
];

interface DriverVehiclesManagerProps {
  driverId: string;
}

export const DriverVehiclesManager = ({ driverId }: DriverVehiclesManagerProps) => {
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<DriverVehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form state
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formCategory, setFormCategory] = useState('berline');
  const [formMaxPassengers, setFormMaxPassengers] = useState('4');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formEquipment, setFormEquipment] = useState<string[]>([]);
  const [formCustomBaseFare, setFormCustomBaseFare] = useState('');
  const [formCustomPerKmRate, setFormCustomPerKmRate] = useState('');
  const [formCustomHourlyRate, setFormCustomHourlyRate] = useState('');
  const [formCustomMinimumPrice, setFormCustomMinimumPrice] = useState('');

  useEffect(() => {
    if (driverId) {
      loadVehicles();
    }
  }, [driverId]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_vehicles')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormBrand('');
    setFormModel('');
    setFormColor('');
    setFormPlate('');
    setFormYear('');
    setFormCategory('berline');
    setFormMaxPassengers('4');
    setFormPhotos([]);
    setFormEquipment([]);
    setFormCustomBaseFare('');
    setFormCustomPerKmRate('');
    setFormCustomHourlyRate('');
    setFormCustomMinimumPrice('');
    setEditingVehicle(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (vehicle: DriverVehicle) => {
    setEditingVehicle(vehicle);
    setFormBrand(vehicle.brand);
    setFormModel(vehicle.model);
    setFormColor(vehicle.color || '');
    setFormPlate(vehicle.plate || '');
    setFormYear(vehicle.year?.toString() || '');
    setFormCategory(vehicle.category);
    setFormMaxPassengers(vehicle.max_passengers?.toString() || '4');
    setFormPhotos(vehicle.photos || []);
    setFormEquipment(vehicle.equipment || []);
    setFormCustomBaseFare(vehicle.custom_base_fare?.toString() || '');
    setFormCustomPerKmRate(vehicle.custom_per_km_rate?.toString() || '');
    setFormCustomHourlyRate(vehicle.custom_hourly_rate?.toString() || '');
    setFormCustomMinimumPrice(vehicle.custom_minimum_price?.toString() || '');
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImageType(file)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP");
      return;
    }

    if (!validateImageSize(file, 5)) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setFormPhotos(prev => [...prev, base64String]);
        toast.success('Photo ajoutée !');
      };
      reader.readAsDataURL(compressedBlob);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formBrand.trim() || !formModel.trim()) {
      toast.error('Marque et modèle sont obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const vehicleData = {
        driver_id: driverId,
        brand: formBrand.trim(),
        model: formModel.trim(),
        color: formColor.trim() || null,
        plate: formPlate.trim() || null,
        year: formYear ? parseInt(formYear) : null,
        category: formCategory,
        max_passengers: parseInt(formMaxPassengers) || 4,
        photos: formPhotos,
        equipment: formEquipment,
        custom_base_fare: formCustomBaseFare ? parseFloat(formCustomBaseFare) : null,
        custom_per_km_rate: formCustomPerKmRate ? parseFloat(formCustomPerKmRate) : null,
        custom_hourly_rate: formCustomHourlyRate ? parseFloat(formCustomHourlyRate) : null,
        custom_minimum_price: formCustomMinimumPrice ? parseFloat(formCustomMinimumPrice) : null,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('driver_vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        toast.success('Véhicule mis à jour !');
      } else {
        // Premier véhicule = favori par défaut
        const isFirstVehicle = vehicles.length === 0;
        const { error } = await supabase
          .from('driver_vehicles')
          .insert({ ...vehicleData, is_favorite: isFirstVehicle });

        if (error) throw error;
        toast.success('Véhicule ajouté !');
      }

      setDialogOpen(false);
      resetForm();
      loadVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const setFavorite = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase.rpc('set_favorite_vehicle', {
        _vehicle_id: vehicleId,
        _driver_id: driverId,
      });

      if (error) throw error;
      if (data) {
        toast.success('Véhicule favori défini !');
        loadVehicles();
      }
    } catch (error) {
      console.error('Error setting favorite:', error);
      toast.error('Erreur lors de la définition du favori');
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return;

    try {
      const { error } = await supabase
        .from('driver_vehicles')
        .update({ is_active: false })
        .eq('id', vehicleId);

      if (error) throw error;
      toast.success('Véhicule supprimé !');
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Mes Véhicules</CardTitle>
                <CardDescription>
                  Gérez votre flotte de véhicules et définissez un favori
                </CardDescription>
              </div>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun véhicule enregistré</p>
              <p className="text-sm mt-1">Ajoutez votre premier véhicule</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className={`relative overflow-hidden ${vehicle.is_favorite ? 'ring-2 ring-primary' : ''}`}>
                  {vehicle.is_favorite && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Favori
                      </Badge>
                    </div>
                  )}
                  
                  {vehicle.photos && vehicle.photos.length > 0 && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={vehicle.photos[0]} 
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{VEHICLE_CATEGORIES.find(c => c.value === vehicle.category)?.label || vehicle.category}</Badge>
                      {vehicle.color && <Badge variant="secondary">{vehicle.color}</Badge>}
                      {vehicle.year && <Badge variant="secondary">{vehicle.year}</Badge>}
                      <Badge variant="secondary">{vehicle.max_passengers} places</Badge>
                    </div>
                    
                    {vehicle.plate && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Immatriculation: {vehicle.plate}
                      </p>
                    )}

                    <div className="flex gap-2 mt-4">
                      {!vehicle.is_favorite && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setFavorite(vehicle.id)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Favori
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(vehicle)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => deleteVehicle(vehicle.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'ajout/modification */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de votre véhicule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Infos de base */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand">Marque *</Label>
                <Input
                  id="brand"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="Mercedes, BMW, Tesla..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modèle *</Label>
                <Input
                  id="model"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="Classe E, Serie 5..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Couleur</Label>
                <Input
                  id="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="Noir, Blanc..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Immatriculation</Label>
                <Input
                  id="plate"
                  value={formPlate}
                  onChange={(e) => setFormPlate(e.target.value)}
                  placeholder="AB-123-CD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Année</Label>
                <Input
                  id="year"
                  type="number"
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  placeholder="2023"
                  min="1990"
                  max="2030"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPassengers">Nombre de places</Label>
                <Input
                  id="maxPassengers"
                  type="number"
                  value={formMaxPassengers}
                  onChange={(e) => setFormMaxPassengers(e.target.value)}
                  min="1"
                  max="20"
                />
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-4">
              <Label>Photos du véhicule</Label>
              <div className="grid grid-cols-3 gap-2">
                {formPhotos.map((photo, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden group">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <label className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  {uploadingPhoto ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  )}
                </label>
              </div>
            </div>

            {/* Équipements */}
            <div className="space-y-4">
              <EquipmentSelector
                selectedEquipment={formEquipment}
                onChange={setFormEquipment}
              />
            </div>

            {/* Tarification personnalisée */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Tarification personnalisée (optionnel)</Label>
              <p className="text-sm text-muted-foreground">
                Laissez vide pour utiliser vos tarifs par défaut
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customBaseFare">Forfait de base (€)</Label>
                  <Input
                    id="customBaseFare"
                    type="number"
                    step="0.01"
                    value={formCustomBaseFare}
                    onChange={(e) => setFormCustomBaseFare(e.target.value)}
                    placeholder="10.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customPerKmRate">Prix par km (€)</Label>
                  <Input
                    id="customPerKmRate"
                    type="number"
                    step="0.01"
                    value={formCustomPerKmRate}
                    onChange={(e) => setFormCustomPerKmRate(e.target.value)}
                    placeholder="1.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customHourlyRate">Tarif horaire (€)</Label>
                  <Input
                    id="customHourlyRate"
                    type="number"
                    step="0.01"
                    value={formCustomHourlyRate}
                    onChange={(e) => setFormCustomHourlyRate(e.target.value)}
                    placeholder="45.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customMinimumPrice">Prix minimum (€)</Label>
                  <Input
                    id="customMinimumPrice"
                    type="number"
                    step="0.01"
                    value={formCustomMinimumPrice}
                    onChange={(e) => setFormCustomMinimumPrice(e.target.value)}
                    placeholder="15.00"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingVehicle ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
