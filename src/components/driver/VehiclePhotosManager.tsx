import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Loader2, X, Plus, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VTC_VEHICLES, getCategoryLabel, getCategoryColor, VTCVehicle } from "@/lib/vtcVehicles";

interface VehiclePhotosManagerProps {
  driverId: string;
  currentVehiclePhotos: string[];
  currentGalleryPhotos: string[];
  onPhotosUpdate: (vehiclePhotos: string[], galleryPhotos: string[]) => void;
}

export const VehiclePhotosManager = ({
  driverId,
  currentVehiclePhotos,
  currentGalleryPhotos,
  onPhotosUpdate,
}: VehiclePhotosManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>(currentVehiclePhotos || []);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(currentGalleryPhotos || []);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

  useEffect(() => {
    setVehiclePhotos(currentVehiclePhotos || []);
    setGalleryPhotos(currentGalleryPhotos || []);
  }, [currentVehiclePhotos, currentGalleryPhotos]);

  const handleVehicleSelection = async (vehicle: VTCVehicle) => {
    if (!vehicle.localImage) {
      toast.error("Cette image de véhicule n'est pas encore disponible");
      return;
    }

    setUploading(true);
    try {
      const newVehiclePhotos = [...vehiclePhotos, vehicle.localImage];
      
      const { error } = await supabase
        .from("drivers")
        .update({ vehicle_photos: newVehiclePhotos })
        .eq("id", driverId);

      if (error) throw error;

      setVehiclePhotos(newVehiclePhotos);
      onPhotosUpdate(newVehiclePhotos, galleryPhotos);
      toast.success("Photo de véhicule ajoutée !");
      setShowVehicleSelector(false);
    } catch (error: any) {
      console.error("Error adding vehicle photo:", error);
      toast.error("Erreur lors de l'ajout de la photo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vehicle' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        
        const newPhotos = type === 'vehicle' 
          ? [...vehiclePhotos, base64String]
          : [...galleryPhotos, base64String];

        const updateField = type === 'vehicle' ? 'vehicle_photos' : 'gallery_photos';
        
        const { error } = await supabase
          .from("drivers")
          .update({ [updateField]: newPhotos })
          .eq("id", driverId);

        if (error) throw error;

        if (type === 'vehicle') {
          setVehiclePhotos(newPhotos);
          onPhotosUpdate(newPhotos, galleryPhotos);
        } else {
          setGalleryPhotos(newPhotos);
          onPhotosUpdate(vehiclePhotos, newPhotos);
        }

        toast.success("Photo ajoutée avec succès !");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string, type: 'vehicle' | 'gallery') => {
    setUploading(true);
    try {
      const photos = type === 'vehicle' ? vehiclePhotos : galleryPhotos;
      const newPhotos = photos.filter(p => p !== photoUrl);
      
      const updateField = type === 'vehicle' ? 'vehicle_photos' : 'gallery_photos';
      
      const { error } = await supabase
        .from("drivers")
        .update({ [updateField]: newPhotos })
        .eq("id", driverId);

      if (error) throw error;

      if (type === 'vehicle') {
        setVehiclePhotos(newPhotos);
        onPhotosUpdate(newPhotos, galleryPhotos);
      } else {
        setGalleryPhotos(newPhotos);
        onPhotosUpdate(vehiclePhotos, newPhotos);
      }

      toast.success("Photo supprimée !");
    } catch (error: any) {
      console.error("Error removing photo:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Vehicle Photos Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold">Photos du véhicule</Label>
          <div className="flex gap-2">
            <Dialog open={showVehicleSelector} onOpenChange={setShowVehicleSelector}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={uploading}>
                  <Car className="w-4 h-4 mr-2" />
                  Sélectionner modèle VTC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Sélectionnez un modèle de véhicule VTC</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {VTC_VEHICLES.filter(v => v.localImage).map((vehicle) => (
                    <Card
                      key={vehicle.id}
                      className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                      onClick={() => handleVehicleSelection(vehicle)}
                    >
                      <img
                        src={vehicle.localImage}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3">
                        <p className="font-semibold text-sm">{vehicle.brand} {vehicle.model}</p>
                        <Badge className={`${getCategoryColor(vehicle.category)} mt-2 text-xs`}>
                          {getCategoryLabel(vehicle.category)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <input
              type="file"
              id="vehicle-photo-upload"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'vehicle')}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("vehicle-photo-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Ajouter moi-même l'image de mon véhicule
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehiclePhotos.map((photo, index) => (
            <div key={index} className="relative aspect-video rounded-lg overflow-hidden group">
              <img src={photo} alt={`Véhicule ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemovePhoto(photo, 'vehicle')}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {vehiclePhotos.length === 0 && (
            <div className="col-span-2 md:col-span-4 text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Aucune photo de véhicule</p>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Photos Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold">Galerie photos</Label>
          <div>
            <input
              type="file"
              id="gallery-photo-upload"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'gallery')}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("gallery-photo-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Ajouter photo
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryPhotos.map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
              <img src={photo} alt={`Galerie ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemovePhoto(photo, 'gallery')}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {galleryPhotos.length === 0 && (
            <div className="col-span-2 md:col-span-4 text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Aucune photo dans la galerie</p>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Ajoutez des photos de votre intérieur, équipements, ou autres images professionnelles
        </p>
      </div>
    </div>
  );
};
