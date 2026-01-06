import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, X, Upload } from "lucide-react";

interface EmployeePhotoUploadProps {
  employeeId: string;
  currentPhotoUrl: string | null;
  employeeName: string;
  onPhotoUpdated: (url: string | null) => void;
}

export function EmployeePhotoUpload({ 
  employeeId, 
  currentPhotoUrl, 
  employeeName,
  onPhotoUpdated 
}: EmployeePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `employee-${employeeId}-${Date.now()}.${fileExt}`;
      const filePath = `employee-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-documents")
        .getPublicUrl(filePath);

      // Update employee record
      const { error: updateError } = await supabase
        .from("company_employees")
        .update({ avatar_url: publicUrl })
        .eq("id", employeeId);

      if (updateError) throw updateError;

      onPhotoUpdated(publicUrl);
      toast.success("Photo de profil mise à jour !");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors de l'upload de la photo");
      setPreviewUrl(currentPhotoUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from("company_employees")
        .update({ avatar_url: null })
        .eq("id", employeeId);

      if (error) throw error;

      setPreviewUrl(null);
      onPhotoUpdated(null);
      toast.success("Photo supprimée");
    } catch (error) {
      console.error("Error removing photo:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 ring-4 ring-accent/20 ring-offset-4 ring-offset-background">
          <AvatarImage src={previewUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-success/20 text-2xl font-bold text-accent">
            {employeeName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {previewUrl && !uploading && (
          <button
            onClick={handleRemovePhoto}
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : previewUrl ? (
          <Camera className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {previewUrl ? "Changer la photo" : "Ajouter une photo"}
      </Button>

      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
        Cette photo sera visible par les chauffeurs pour vous identifier facilement
      </p>
    </div>
  );
}
