import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  userId: string;
  driverName: string;
  onPhotoUpdate: (url: string) => void;
}

export const ProfilePhotoUpload = ({
  currentPhotoUrl,
  userId,
  driverName,
  onPhotoUpdate,
}: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploading(true);
    try {
      // Convertir l'image en base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        
        // Mettre à jour directement le profil avec l'URL base64
        const { error } = await supabase
          .from("profiles")
          .update({
            profile_photo_url: base64String,
          })
          .eq("id", userId);

        if (error) throw error;

        onPhotoUpdate(base64String);
        
        // Invalider tous les caches liés aux profiles et drivers pour mise à jour instantanée
        await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
        await queryClient.invalidateQueries({ queryKey: ['driver-profile-optimized'] });
        
        toast.success("Photo de profil mise à jour !");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors du téléchargement de la photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Photo de profil</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Utilisée dans votre profil public et la messagerie
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={currentPhotoUrl || undefined} />
          <AvatarFallback className="bg-gradient-trust text-trust-foreground text-2xl">
            {driverName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <input
            type="file"
            id="photo-upload"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("photo-upload")?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Changer la photo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Aperçus de rendu */}
      {currentPhotoUrl && (
        <Card className="p-6 bg-muted/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              <span>Aperçu dans votre profil public</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Aperçu carte vitrine */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">
                  Dans la liste des chauffeurs
                </p>
                <div className="bg-background rounded-lg overflow-hidden shadow-md">
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                    <img
                      src={currentPhotoUrl}
                      alt="Aperçu vitrine"
                      className="w-full h-full object-cover object-[center_20%]"
                    />
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-sm font-semibold truncate">{driverName}</p>
                    <p className="text-xs text-muted-foreground">Chauffeur VTC</p>
                  </div>
                </div>
              </div>

              {/* Aperçu profil détaillé */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">
                  Dans votre profil détaillé
                </p>
                <div className="bg-background rounded-lg p-6 shadow-md flex flex-col items-center gap-3">
                  <div className="w-40 h-40 bg-gradient-dark rounded-full flex items-center justify-center shadow-2xl ring-4 ring-primary/20">
                    <img
                      src={currentPhotoUrl}
                      alt="Aperçu profil"
                      className="w-full h-full rounded-full object-cover object-[center_20%]"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{driverName}</p>
                    <p className="text-xs text-muted-foreground">Chauffeur Professionnel</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Conseil :</strong> Pour un meilleur rendu, utilisez une photo portrait avec votre visage et le haut du corps bien cadrés au centre de l'image.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
