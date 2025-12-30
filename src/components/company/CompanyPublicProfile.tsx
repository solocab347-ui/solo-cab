import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PUBLIC_COMPANIES_QUERY_KEY, PUBLIC_COMPANY_PROFILE_KEY } from "@/hooks/usePublicCompanyProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Building2, Upload, Save, Loader2, Eye, EyeOff, 
  Users, MapPin, Globe, Star, Briefcase, X, Plus, Phone
} from "lucide-react";

interface CompanyPublicProfileProps {
  companyId: string;
}

const DEFAULT_SERVICES = [
  "Navettes aéroport",
  "Déplacements professionnels",
  "Événements d'entreprise",
  "Mise à disposition",
  "Longue distance",
  "VIP & Luxe",
  "Transport dirigeants",
  "Séminaires",
];

export function CompanyPublicProfile({ companyId }: CompanyPublicProfileProps) {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newService, setNewService] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [publicDescription, setPublicDescription] = useState("");
  const [servicesNeeded, setServicesNeeded] = useState<string[]>([]);
  const [visibleToDrivers, setVisibleToDrivers] = useState(false);
  const [acceptingProposals, setAcceptingProposals] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [showPhone, setShowPhone] = useState(false);

  // Fetch company data
  const { data: company, isLoading } = useQuery({
    queryKey: ["company-profile", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Load initial data
  useEffect(() => {
    if (company) {
      setPublicDescription(company.notes || "");
      setServicesNeeded(company.preferred_vehicle_types || []);
      setVisibleToDrivers(company.visible_to_drivers || false);
      setAcceptingProposals(company.accepting_proposals || false);
      setContactPhone(company.contact_phone || "");
      setShowPhone((company as any).show_phone || false);
      if (company.logo_url) {
        setLogoPreview(company.logo_url);
      }
    }
  }, [company]);

  // Upload logo function
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return company?.logo_url || null;

    try {
      setIsUploading(true);
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `company-logos/${companyId}-${Date.now()}.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(fileName, logoFile, { 
          upsert: true,
          contentType: logoFile.type 
        });

      if (uploadError) {
        console.error('Erreur upload:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('company-documents')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Erreur upload logo:', error);
      toast.error("Erreur lors de l'upload du logo: " + error.message);
      return company?.logo_url || null;
    } finally {
      setIsUploading(false);
    }
  };

  // Update mutation
  const updateProfile = useMutation({
    mutationFn: async () => {
      // Upload logo if new one selected
      const logoUrl = await uploadLogo();

      const { error } = await supabase
        .from("companies")
        .update({
          notes: publicDescription,
          preferred_vehicle_types: servicesNeeded,
          visible_to_drivers: visibleToDrivers,
          accepting_proposals: acceptingProposals,
          logo_url: logoUrl,
          contact_phone: contactPhone || null,
          show_phone: showPhone,
        })
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil public mis à jour avec succès");
      setLogoFile(null); // Reset file after successful upload
      // Invalider toutes les requêtes liées au profil entreprise pour synchronisation instantanée
      queryClient.invalidateQueries({ queryKey: ["company-profile", companyId] });
      queryClient.invalidateQueries({ queryKey: PUBLIC_COMPANIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_COMPANY_PROFILE_KEY });
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddService = () => {
    if (newService.trim() && !servicesNeeded.includes(newService.trim())) {
      setServicesNeeded([...servicesNeeded, newService.trim()]);
      setNewService("");
    }
  };

  const handleRemoveService = (service: string) => {
    setServicesNeeded(servicesNeeded.filter(s => s !== service));
  };

  const handleToggleDefaultService = (service: string) => {
    if (servicesNeeded.includes(service)) {
      setServicesNeeded(servicesNeeded.filter(s => s !== service));
    } else {
      setServicesNeeded([...servicesNeeded, service]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render public profile preview (same as what drivers see)
  const renderPublicProfilePreview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl">{company?.company_name}</h3>
          {company?.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{company.address}</span>
            </p>
          )}
          {company?.employee_count && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Users className="w-4 h-4" />
              {company.employee_count} collaborateurs
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {publicDescription && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm leading-relaxed">{publicDescription}</p>
        </div>
      )}

      {/* Services */}
      {servicesNeeded.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Services recherchés
          </h4>
          <div className="flex flex-wrap gap-2">
            {servicesNeeded.map((service) => (
              <Badge key={service} variant="secondary">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Contact - Téléphone */}
      {showPhone && contactPhone && (
        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700">
            <Phone className="w-4 h-4" />
            Contact direct
          </h4>
          <a href={`tel:${contactPhone}`} className="text-green-700 font-semibold hover:underline">
            {contactPhone}
          </a>
        </div>
      )}

      {/* Coordonnées */}
      <div className="space-y-2">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Coordonnées
        </h4>
        {company?.address && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{company.address}</span>
          </p>
        )}
        {company?.contact_email && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="text-primary">{company.contact_email}</span>
          </p>
        )}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {acceptingProposals && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <Star className="w-3 h-3 mr-1" />
            Accepte les propositions
          </Badge>
        )}
        {visibleToDrivers && (
          <Badge variant="outline" className="text-muted-foreground">
            <Eye className="w-3 h-3 mr-1" />
            Profil visible
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Profil public de l'entreprise
          </h2>
          <p className="text-sm text-muted-foreground">
            Présentez votre entreprise aux chauffeurs VTC
          </p>
        </div>
        
        {/* Preview button */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              Voir mon profil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Aperçu du profil public
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {renderPublicProfilePreview()}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {visibleToDrivers ? (
              <Eye className="w-5 h-5 text-green-500" />
            ) : (
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            )}
            Visibilité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Profil visible par les chauffeurs</Label>
              <p className="text-sm text-muted-foreground">
                Les chauffeurs peuvent voir et vous contacter
              </p>
            </div>
            <Switch
              checked={visibleToDrivers}
              onCheckedChange={setVisibleToDrivers}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Accepter les propositions</Label>
              <p className="text-sm text-muted-foreground">
                Les chauffeurs peuvent vous envoyer des propositions de partenariat
              </p>
            </div>
            <Switch
              checked={acceptingProposals}
              onCheckedChange={setAcceptingProposals}
              disabled={!visibleToDrivers}
            />
          </div>

          {/* Phone visibility */}
          <div className="pt-4 border-t space-y-3">
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Numéro de téléphone
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Afficher le téléphone aux chauffeurs</Label>
                <p className="text-sm text-muted-foreground">
                  Les chauffeurs pourront vous appeler directement
                </p>
              </div>
              <Switch
                checked={showPhone}
                onCheckedChange={setShowPhone}
                disabled={!contactPhone || !visibleToDrivers}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Identité de l'entreprise
          </CardTitle>
          <CardDescription>
            Informations visibles sur votre profil public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="logo" className="cursor-pointer">
                <div className="flex items-center gap-2 text-primary hover:underline">
                  <Upload className="w-4 h-4" />
                  Ajouter un logo
                </div>
              </Label>
              <input
                type="file"
                id="logo"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: JPG, PNG. Max: 2 Mo
              </p>
            </div>
          </div>

          {/* Company Name (read-only) */}
          <div className="space-y-2">
            <Label>Nom de l'entreprise</Label>
            <Input value={company?.company_name || ""} disabled />
            <p className="text-xs text-muted-foreground">
              Le nom de l'entreprise ne peut pas être modifié ici
            </p>
          </div>

          {/* Public Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description publique</Label>
            <Textarea
              id="description"
              placeholder="Présentez votre entreprise, vos besoins de transport, votre secteur d'activité..."
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Cette description sera visible par les chauffeurs
            </p>
          </div>

          {/* Employee count (read-only) */}
          {company?.employee_count && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{company.employee_count} collaborateurs</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Needed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Services recherchés
          </CardTitle>
          <CardDescription>
            Indiquez les types de prestations dont vous avez besoin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default services */}
          <div>
            <Label className="mb-3 block">Services courants</Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SERVICES.map((service) => (
                <Badge
                  key={service}
                  variant={servicesNeeded.includes(service) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleToggleDefaultService(service)}
                >
                  {servicesNeeded.includes(service) && (
                    <Star className="w-3 h-3 mr-1 fill-current" />
                  )}
                  {service}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom services */}
          <div className="space-y-2">
            <Label>Services personnalisés</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un service..."
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddService()}
              />
              <Button type="button" size="icon" onClick={handleAddService}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {servicesNeeded.filter(s => !DEFAULT_SERVICES.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {servicesNeeded
                  .filter(s => !DEFAULT_SERVICES.includes(s))
                  .map((service) => (
                    <Badge key={service} variant="secondary" className="gap-1">
                      {service}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveService(service)}
                      />
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending || isUploading}
          size="lg"
        >
          {updateProfile.isPending || isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isUploading ? "Upload en cours..." : "Enregistrer le profil"}
        </Button>
      </div>
    </div>
  );
}