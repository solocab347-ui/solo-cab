import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Globe, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  Save,
  Loader2,
  ExternalLink,
  Upload,
  User,
  Camera,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FleetPublicProfileSettingsProps {
  fleetManagerId: string;
  companyName: string;
  showDriversInPublic: boolean;
  logoUrl?: string | null;
  description?: string | null;
  showContactName?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  onUpdate: () => void;
}

export const FleetPublicProfileSettings = ({
  fleetManagerId,
  companyName,
  showDriversInPublic,
  logoUrl: initialLogoUrl,
  description: initialDescription,
  showContactName: initialShowContactName = true,
  showAddress: initialShowAddress = true,
  showPhone: initialShowPhone = true,
  showEmail: initialShowEmail = true,
  onUpdate
}: FleetPublicProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDrivers, setShowDrivers] = useState(showDriversInPublic);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [showContactName, setShowContactName] = useState(initialShowContactName);
  const [showAddress, setShowAddress] = useState(initialShowAddress);
  const [showPhone, setShowPhone] = useState(initialShowPhone);
  const [showEmail, setShowEmail] = useState(initialShowEmail);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${fleetManagerId}-logo.${fileExt}`;
      const filePath = `fleet-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo téléchargé avec succès");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors du téléchargement du logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          show_drivers_in_public_storefront: showDrivers,
          logo_url: logoUrl || null,
          description: description || null,
          show_contact_name: showContactName,
          show_address: showAddress,
          show_phone: showPhone,
          show_email: showEmail,
        })
        .eq("id", fleetManagerId);

      if (error) throw error;

      toast.success("Paramètres mis à jour");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Profil Public</h2>
                <p className="text-sm text-muted-foreground">
                  Personnalisez votre vitrine pour attirer des clients
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`/flotte/${fleetManagerId}`, '_blank')}
            >
              <Eye className="w-4 h-4" />
              Aperçu
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logo & Presentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Logo & Présentation
          </CardTitle>
          <CardDescription>
            Personnalisez l'apparence de votre page publique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-border">
                <AvatarImage src={logoUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                  {companyName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="logo-upload"
                className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            <div className="flex-1">
              <Label className="text-base font-medium">Logo de l'entreprise</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Téléchargez votre logo (formats: JPG, PNG, max 2MB)
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Présentation de votre entreprise
            </Label>
            <Textarea
              placeholder="Décrivez vos services, votre expérience, vos spécialités..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Cette présentation apparaîtra sur votre page publique
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Informations visibles
          </CardTitle>
          <CardDescription>
            Choisissez les informations à afficher sur votre profil public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Nom du contact</Label>
                  <p className="text-sm text-muted-foreground">Afficher votre nom</p>
                </div>
              </div>
              <Switch checked={showContactName} onCheckedChange={setShowContactName} />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Adresse</Label>
                  <p className="text-sm text-muted-foreground">Afficher l'adresse de l'entreprise</p>
                </div>
              </div>
              <Switch checked={showAddress} onCheckedChange={setShowAddress} />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Téléphone</Label>
                  <p className="text-sm text-muted-foreground">Afficher le numéro de téléphone</p>
                </div>
              </div>
              <Switch checked={showPhone} onCheckedChange={setShowPhone} />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">Afficher l'adresse email</p>
                </div>
              </div>
              <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Visibilité des chauffeurs</CardTitle>
          <CardDescription>
            Décidez si vos chauffeurs apparaissent sur votre vitrine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex-1">
              <Label className="text-base font-medium">Afficher les chauffeurs</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Vos chauffeurs seront visibles sur votre page publique
              </p>
            </div>
            <Switch checked={showDrivers} onCheckedChange={setShowDrivers} />
          </div>

          {showDrivers && (
            <div className="p-4 bg-success/10 rounded-xl border border-success/20">
              <p className="text-sm text-success flex items-center gap-2">
                <span className="text-lg">✓</span>
                Vos chauffeurs apparaissent sur votre profil public
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg" className="gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
};
