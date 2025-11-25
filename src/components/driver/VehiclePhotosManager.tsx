import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, X, Plus } from "lucide-react";

interface VehiclePhotosManagerProps {
  driverId: string;
  currentVehiclePhotos: string[];
  currentGalleryPhotos: string[];
  onPhotosUpdate: (vehiclePhotos: string[], galleryPhotos: string[]) => void;
}

const VehiclePhotosManagerComponent = ({
  driverId,
  currentVehiclePhotos,
  currentGalleryPhotos,
  onPhotosUpdate,
}: VehiclePhotosManagerProps) => {
  const [uploading, setUploading] = useState(false);

  // Utiliser directement les props au lieu de créer des états locaux
  const vehiclePhotos = currentVehiclePhotos || [];
  const galleryPhotos = currentGalleryPhotos || [];


  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'vehicle' | 'gallery') => {
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

        // Notifier le parent immédiatement
        if (type === 'vehicle') {
          onPhotosUpdate(newPhotos, galleryPhotos);
        } else {
          onPhotosUpdate(vehiclePhotos, newPhotos);
        }

        toast.success("Photo ajoutée !");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  }, [driverId, vehiclePhotos, galleryPhotos, onPhotosUpdate]);

  const handleRemovePhoto = useCallback(async (photoUrl: string, type: 'vehicle' | 'gallery') => {
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

      // Notifier le parent immédiatement
      if (type === 'vehicle') {
        onPhotosUpdate(newPhotos, galleryPhotos);
      } else {
        onPhotosUpdate(vehiclePhotos, newPhotos);
      }

      toast.success("Photo supprimée !");
    } catch (error: any) {
      console.error("Error removing photo:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setUploading(false);
    }
  }, [driverId, vehiclePhotos, galleryPhotos, onPhotosUpdate]);

  return (
    <div className="space-y-8">
      {/* Vehicle Photos Section */}
      <div>
        <div className="mb-4">
          <Label className="text-lg font-semibold">Photos du véhicule</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Aperçu dans la vitrine publique et page de profil chauffeur
          </p>
        </div>
        <div className="flex justify-end mb-4">
          <div>
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
              Ajouter une photo
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehiclePhotos.map((photo, index) => (
            <div key={`vehicle-${index}`} className="relative aspect-video rounded-lg overflow-hidden group">
              <img 
                src={photo} 
                alt={`Véhicule ${index + 1}`} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
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
        <div className="mb-4">
          <Label className="text-lg font-semibold">Galerie photos</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Aperçu dans le carousel de la page de profil chauffeur
          </p>
        </div>
        <div className="flex justify-end mb-4">
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
            <div key={`gallery-${index}`} className="relative aspect-square rounded-lg overflow-hidden group">
              <img 
                src={photo} 
                alt={`Galerie ${index + 1}`} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
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

// Mémoriser le composant pour éviter les re-renders
export const VehiclePhotosManager = memo(VehiclePhotosManagerComponent);
