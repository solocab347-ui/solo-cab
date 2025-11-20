import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <div className="space-y-4">
      <Label>Photo de profil</Label>
      <div className="flex items-center gap-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={currentPhotoUrl || undefined} />
          <AvatarFallback className="bg-gradient-trust text-trust-foreground text-2xl">
            {driverName?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Utilisée dans votre profil public et la messagerie
          </p>
          <div className="flex gap-2">
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
      </div>
    </div>
  );
};
