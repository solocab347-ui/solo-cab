import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, MapPin, Phone, Mail, Camera } from "lucide-react";

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
    profile_photo_url: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        address: "",
        profile_photo_url: profileData.profile_photo_url || "",
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          profile_photo_url: formData.profile_photo_url,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil mis à jour avec succès");
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
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="profile_photo_url">URL Photo de profil</Label>
            <Input
              id="profile_photo_url"
              type="url"
              value={formData.profile_photo_url}
              onChange={(e) =>
                setFormData({ ...formData, profile_photo_url: e.target.value })
              }
              placeholder="https://..."
            />
            {formData.profile_photo_url && (
              <div className="mt-2">
                <img
                  src={formData.profile_photo_url}
                  alt="Aperçu"
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ClientProfile;
