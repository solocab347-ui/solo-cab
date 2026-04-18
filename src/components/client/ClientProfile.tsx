import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { getCachedUser } from "@/lib/cachedAuth";
import { toast } from "sonner";
import { User, MapPin, Phone, Mail, Camera } from "lucide-react";
import { SavedAddressesManager } from "./SavedAddressesManager";

const ClientProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await getCachedUser();
      if (!user) throw new Error("Non authentifié");

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch driver info if exclusive client
      if (clientData.is_exclusive && clientData.driver_id) {
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select(`
            *,
            profiles:profiles!inner(full_name, phone, email, profile_photo_url)
          `)
          .eq("id", clientData.driver_id)
          .single();

        if (driverError) throw driverError;
        setDriver(driverData);
      }

      setFormData({
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        address: profileData.address || "",
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image");
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image doit faire moins de 5MB");
        return;
      }
      
      setPhotoFile(file);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;

    const { data: { user } } = await getCachedUser();
    if (!user) throw new Error("Non authentifié");

    setUploading(true);
    try {
      // Delete old photo if exists
      if (profile.profile_photo_url) {
        const oldPath = profile.profile_photo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-photos')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new photo
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erreur lors du téléchargement de la photo");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await getCachedUser();
      if (!user) throw new Error("Non authentifié");

      // Upload photo if selected
      let photoUrl = profile.profile_photo_url;
      if (photoFile) {
        const uploadedUrl = await uploadPhoto();
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          profile_photo_url: photoUrl,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil mis à jour avec succès");
      setPhotoFile(null);
      fetchProfileData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Client Type Info */}
      <Card className="p-6 bg-gradient-premium">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">
              {client?.is_exclusive ? "Client Exclusif" : "Client Libre"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {client?.is_exclusive
                ? "Vous êtes associé à un chauffeur exclusif"
                : "Vous pouvez réserver avec plusieurs chauffeurs"}
            </p>
          </div>
        </div>
      </Card>

      {/* Driver Info (if exclusive) */}
      {client?.is_exclusive && driver && (
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Votre Chauffeur</h3>
          <div className="flex items-center gap-4">
            {driver.profiles.profile_photo_url ? (
              <img
                src={driver.profiles.profile_photo_url}
                alt={driver.profiles.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-dark rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-bold">{driver.profiles.full_name}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {driver.profiles.phone}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {driver.profiles.email}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Personal Information */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-6">Informations Personnelles</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Adresse</span>
              <span className="text-xs text-muted-foreground">(Recommandé pour créer vos courses rapidement)</span>
            </Label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address) =>
                setFormData({ ...formData, address })
              }
              placeholder="Commencez à taper votre adresse..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              En enregistrant votre adresse, vous pourrez la sélectionner automatiquement lors de la création de courses
            </p>
          </div>

          <div>
            <Label htmlFor="photo" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Photo de profil</span>
            </Label>
            <div className="space-y-3">
              {(profile?.profile_photo_url || photoFile) && (
                <div className="flex items-center gap-4">
                  <img
                    src={photoFile ? URL.createObjectURL(photoFile) : profile?.profile_photo_url}
                    alt="Photo de profil"
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                  {photoFile && (
                    <div className="text-sm text-muted-foreground">
                      Nouvelle photo sélectionnée
                    </div>
                  )}
                </div>
              )}
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Formats acceptés : JPG, PNG, WEBP. Taille max : 5MB
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || uploading} className="w-full">
            {uploading ? "Téléchargement de la photo..." : saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </Card>

      {/* Saved (favorite) addresses */}
      <SavedAddressesManager />
    </div>
  );
};

export default ClientProfile;
