import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { compressImage, validateImageType, validateImageSize } from "@/lib/imageCompression";

interface SingleProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  userId: string;
  driverName: string;
  onPhotoUpdate: (url: string) => void;
}

export const SingleProfilePhotoUpload = ({
  currentPhotoUrl,
  userId,
  driverName,
  onPhotoUpdate,
}: SingleProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handlePhotoUpload = async (file: File) => {
    try {
      setUploading(true);

      if (!validateImageType(file)) {
        toast.error("Format non supporté. Utilisez JPG, PNG ou WebP");
        return;
      }

      if (!validateImageSize(file, 5)) {
        toast.error("L'image ne doit pas dépasser 5MB");
        return;
      }

      // Compresser l'image
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, compressedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Mettre à jour partout : profile ET driver.card_photo_url
      await Promise.all([
        supabase
          .from('profiles')
          .update({ profile_photo_url: publicUrl })
          .eq('id', userId),
        supabase
          .from('drivers')
          .update({ card_photo_url: publicUrl })
          .eq('user_id', userId)
      ]);

      onPhotoUpdate(publicUrl);
      await queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast.success("Photo mise à jour !");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        await handlePhotoUpload(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Photo de profil</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Utilisée partout : profil public et cartes de chauffeur
        </p>
      </div>
      
      <div className="flex flex-col items-center gap-3">
        <Avatar className="w-28 h-28 border-4 border-border shadow-lg">
          <AvatarImage src={currentPhotoUrl || undefined} alt={driverName} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl">
            {driverName?.charAt(0)?.toUpperCase() || 'C'}
          </AvatarFallback>
        </Avatar>
        
        <Button
          type="button"
          onClick={handleFilePick}
          disabled={uploading}
          variant="outline"
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? "Upload..." : "Changer la photo de profil"}
        </Button>
      </div>
    </div>
  );
};
