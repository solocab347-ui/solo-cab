import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, CreditCard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DualProfilePhotoUploadProps {
  currentProfilePhotoUrl: string | null;
  currentCardPhotoUrl: string | null;
  userId: string;
  driverName: string;
  onProfilePhotoUpdate: (url: string) => void;
  onCardPhotoUpdate: (url: string) => void;
}

export const DualProfilePhotoUpload = ({
  currentProfilePhotoUrl,
  currentCardPhotoUrl,
  userId,
  driverName,
  onProfilePhotoUpdate,
  onCardPhotoUpdate,
}: DualProfilePhotoUploadProps) => {
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  
  // Initialiser useSamePhoto en fonction des URLs actuelles
  const [useSamePhoto, setUseSamePhoto] = useState(() => {
    return currentProfilePhotoUrl === currentCardPhotoUrl && currentProfilePhotoUrl !== null;
  });

  // Synchroniser useSamePhoto quand les URLs changent
  useEffect(() => {
    const shouldSync = currentProfilePhotoUrl === currentCardPhotoUrl && currentProfilePhotoUrl !== null;
    setUseSamePhoto(shouldSync);
  }, [currentProfilePhotoUrl, currentCardPhotoUrl]);

  const handlePhotoUpload = async (
    file: File,
    type: 'profile' | 'card'
  ) => {
    try {
      const setUploading = type === 'profile' ? setUploadingProfile : setUploadingCard;
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      if (type === 'profile') {
        onProfilePhotoUpdate(publicUrl);
        // Si "utiliser la même photo" est coché, mettre à jour aussi la photo de carte
        if (useSamePhoto) {
          onCardPhotoUpdate(publicUrl);
          await supabase
            .from('drivers')
            .update({ card_photo_url: publicUrl })
            .eq('user_id', userId);
        }
      } else {
        onCardPhotoUpdate(publicUrl);
      }

      // Sauvegarder dans la BDD immédiatement
      if (type === 'profile') {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: publicUrl })
          .eq('id', userId);
      } else {
        await supabase
          .from('drivers')
          .update({ card_photo_url: publicUrl })
          .eq('user_id', userId);
      }

      toast.success(`Photo ${type === 'profile' ? 'de profil' : 'de carte'} mise à jour !`);
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      const setUploading = type === 'profile' ? setUploadingProfile : setUploadingCard;
      setUploading(false);
    }
  };

  const handleFilePick = (type: 'profile' | 'card') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        await handlePhotoUpload(file, type);
      }
    };
    input.click();
  };

  const toggleUseSamePhoto = async () => {
    const newValue = !useSamePhoto;
    setUseSamePhoto(newValue);
    
    if (newValue && currentProfilePhotoUrl) {
      // Synchroniser immédiatement la photo de carte avec la photo de profil
      onCardPhotoUpdate(currentProfilePhotoUrl);
      
      try {
        const { error } = await supabase
          .from('drivers')
          .update({ card_photo_url: currentProfilePhotoUrl })
          .eq('user_id', userId);
        
        if (error) throw error;
        toast.success("✅ Les deux photos sont maintenant synchronisées");
      } catch (error) {
        console.error("Erreur synchronisation photos:", error);
        toast.error("Erreur lors de la synchronisation");
        setUseSamePhoto(false); // Revenir à l'état précédent en cas d'erreur
      }
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold mb-2 block">Photos de profil</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Gérez vos photos : une pour votre profil détaillé et une pour vos cartes
          </p>
          
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <Button
              type="button"
              variant={useSamePhoto ? "default" : "outline"}
              size="sm"
              onClick={toggleUseSamePhoto}
              className="gap-2"
            >
              {useSamePhoto && <CheckCircle2 className="w-4 h-4" />}
              Utiliser la même photo pour tout
            </Button>
            <p className="text-xs text-muted-foreground flex-1">
              {useSamePhoto 
                ? "Les deux photos sont synchronisées" 
                : "Vous pouvez définir des photos différentes"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Photo de profil principale */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <Label className="font-medium">Photo de profil</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisée dans votre profil public détaillé
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32 border-4 border-border shadow-xl">
                <AvatarImage src={currentProfilePhotoUrl || undefined} alt={driverName} />
                <AvatarFallback className="bg-gradient-premium text-premium-foreground text-3xl">
                  {driverName?.charAt(0)?.toUpperCase() || 'C'}
                </AvatarFallback>
              </Avatar>
              
              <Button
                type="button"
                onClick={() => handleFilePick('profile')}
                disabled={uploadingProfile}
                variant="outline"
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploadingProfile ? "Upload..." : "Changer la photo de profil"}
              </Button>
            </div>
          </div>

          {/* Photo de carte */}
          {!useSamePhoto && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                <Label className="font-medium">Photo de carte</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisée sur vos cartes de chauffeur dans les listes
              </p>
              
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-32 h-32 border-4 border-border shadow-xl">
                  <AvatarImage src={currentCardPhotoUrl || undefined} alt={`${driverName} - Carte`} />
                  <AvatarFallback className="bg-gradient-trust text-white text-3xl">
                    {driverName?.charAt(0)?.toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                
                <Button
                  type="button"
                  onClick={() => handleFilePick('card')}
                  disabled={uploadingCard}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingCard ? "Upload..." : "Changer la photo de carte"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 <strong>Astuce :</strong> Si vous cochez "Utiliser la même photo pour tout", 
            la photo de profil sera automatiquement utilisée partout. Sinon, vous pouvez 
            personnaliser chaque photo selon son usage.
          </p>
        </div>
      </div>
    </Card>
  );
};
