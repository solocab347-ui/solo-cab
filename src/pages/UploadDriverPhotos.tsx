import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Import toutes les photos
import driver1 from "@/assets/test-drivers/driver-1.jpg";
import driver2 from "@/assets/test-drivers/driver-2.jpg";
import driver3 from "@/assets/test-drivers/driver-3.jpg";
import driver4 from "@/assets/test-drivers/driver-4.jpg";
import driver5 from "@/assets/test-drivers/driver-5.jpg";
import driver6 from "@/assets/test-drivers/driver-6.jpg";
import driver7 from "@/assets/test-drivers/driver-7.jpg";
import driver8 from "@/assets/test-drivers/driver-8.jpg";
import driver9 from "@/assets/test-drivers/driver-9.jpg";
import driver10 from "@/assets/test-drivers/driver-10.jpg";
import driver11 from "@/assets/test-drivers/driver-11.jpg";
import driver12 from "@/assets/test-drivers/driver-12.jpg";
import driver13 from "@/assets/test-drivers/driver-13.jpg";
import driver14 from "@/assets/test-drivers/driver-14.jpg";
import driver15 from "@/assets/test-drivers/driver-15.jpg";
import driver16 from "@/assets/test-drivers/driver-16.jpg";
import driver17 from "@/assets/test-drivers/driver-17.jpg";
import driver18 from "@/assets/test-drivers/driver-18.jpg";
import driver19 from "@/assets/test-drivers/driver-19.jpg";
import driver20 from "@/assets/test-drivers/driver-20.jpg";

const photos = [
  driver1, driver2, driver3, driver4, driver5,
  driver6, driver7, driver8, driver9, driver10,
  driver11, driver12, driver13, driver14, driver15,
  driver16, driver17, driver18, driver19, driver20
];

export default function UploadDriverPhotos() {
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(0);

  const handleUpload = async () => {
    setLoading(true);
    setUploaded(0);

    try {
      for (let i = 0; i < photos.length; i++) {
        const photoUrl = photos[i];
        const fileName = `paris-driver-${i + 1}.jpg`;

        console.log(`📤 Upload de ${fileName}...`);

        // Télécharger l'image depuis l'asset
        const response = await fetch(photoUrl);
        const blob = await response.blob();

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`❌ Erreur upload ${fileName}:`, uploadError);
          toast.error(`Erreur upload ${fileName}`);
        } else {
          console.log(`✅ ${fileName} uploadé`);
          setUploaded(i + 1);
        }
      }

      toast.success(`${photos.length} photos uploadées avec succès !`);
    } catch (error: any) {
      console.error("❌ Erreur:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Upload Photos Chauffeurs</h1>
        <p className="text-muted-foreground mb-8">
          Cette fonction va uploader les 20 photos professionnelles générées dans le storage Supabase.
        </p>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
              <img 
                src={photo} 
                alt={`Driver ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {uploaded > idx && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Upload en cours... ({uploaded}/{photos.length})
            </>
          ) : (
            'Uploader les 20 photos'
          )}
        </Button>

        {uploaded === photos.length && uploaded > 0 && (
          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
              ✅ Upload terminé
            </h3>
            <p className="text-green-700 dark:text-green-400">
              Les 20 photos ont été uploadées avec succès dans le storage Supabase !
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
