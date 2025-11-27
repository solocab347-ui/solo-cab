import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Linkedin, Instagram, Save } from "lucide-react";

interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  display_order: number;
  is_active: boolean;
}

const AdminSocialLinks = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("social_links")
        .select("*")
        .order("display_order");

      if (error) throw error;

      setSocialLinks(data || []);
    } catch (error) {
      console.error("Error fetching social links:", error);
      toast.error("Erreur lors du chargement des liens");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlChange = (id: string, url: string) => {
    setSocialLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, url: url || null } : link))
    );
  };

  const handleActiveToggle = (id: string, isActive: boolean) => {
    setSocialLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, is_active: isActive } : link))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const link of socialLinks) {
        const { error } = await supabase
          .from("social_links")
          .update({
            url: link.url,
            is_active: link.is_active && link.url !== null && link.url !== "",
          })
          .eq("id", link.id);

        if (error) throw error;
      }

      toast.success("Liens des réseaux sociaux mis à jour avec succès");
      fetchSocialLinks(); // Recharger pour synchroniser
    } catch (error: any) {
      console.error("Error saving social links:", error);
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook":
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case "linkedin":
        return <Linkedin className="w-5 h-5 text-blue-700" />;
      case "instagram":
        return <Instagram className="w-5 h-5 text-pink-600" />;
      default:
        return null;
    }
  };

  const getPlatformLabel = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Gestion des Réseaux Sociaux</CardTitle>
          <CardDescription>
            Gérez les liens vers vos réseaux sociaux affichés sur les pages de présentation.
            Les icônes n'apparaissent que si un lien est configuré et activé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {socialLinks.map((link) => (
            <div
              key={link.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-border rounded-lg"
            >
              {/* Icône et nom */}
              <div className="flex items-center gap-3 sm:w-32">
                {getIcon(link.platform)}
                <span className="font-medium">{getPlatformLabel(link.platform)}</span>
              </div>

              {/* URL */}
              <div className="flex-1">
                <Label htmlFor={`url-${link.id}`} className="sr-only">
                  URL {getPlatformLabel(link.platform)}
                </Label>
                <Input
                  id={`url-${link.id}`}
                  type="url"
                  placeholder={`https://www.${link.platform}.com/votre-page`}
                  value={link.url || ""}
                  onChange={(e) => handleUrlChange(link.id, e.target.value)}
                  disabled={isSaving}
                />
              </div>

              {/* Switch d'activation */}
              <div className="flex items-center gap-2">
                <Switch
                  id={`active-${link.id}`}
                  checked={link.is_active}
                  onCheckedChange={(checked) => handleActiveToggle(link.id, checked)}
                  disabled={isSaving || !link.url}
                />
                <Label htmlFor={`active-${link.id}`} className="text-sm text-muted-foreground">
                  {link.is_active ? "Actif" : "Inactif"}
                </Label>
              </div>
            </div>
          ))}

          {/* Bouton de sauvegarde */}
          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations supplémentaires */}
      <Card className="max-w-3xl bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Où apparaissent ces liens ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Page d'accueil de présentation (en haut et en bas)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Page de présentation pour les chauffeurs (en haut et en bas)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Page de présentation pour les clients (en haut et en bas)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSocialLinks;
