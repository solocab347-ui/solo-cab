import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Building2, Upload, Save, Loader2, Eye, EyeOff, 
  Users, Car, MapPin, Globe, Star, Briefcase, X, Plus
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
  
  // Form state
  const [publicDescription, setPublicDescription] = useState("");
  const [servicesNeeded, setServicesNeeded] = useState<string[]>([]);
  const [preferredVehicleTypes, setPreferredVehicleTypes] = useState<string[]>([]);
  const [visibleToDrivers, setVisibleToDrivers] = useState(false);
  const [acceptingProposals, setAcceptingProposals] = useState(false);
  const [siretNumber, setSiretNumber] = useState("");
  const [sirenNumber, setSirenNumber] = useState("");
  const [tvaNumber, setTvaNumber] = useState("");

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
      setPreferredVehicleTypes(company.preferred_vehicle_types || []);
      setVisibleToDrivers(company.visible_to_drivers || false);
      setAcceptingProposals(company.accepting_proposals || false);
      setSiretNumber(company.siret || "");
      setSirenNumber(company.siren || "");
      setTvaNumber(company.tva_number || "");
    }
  }, [company]);

  // Update mutation
  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companies")
        .update({
          notes: publicDescription,
          preferred_vehicle_types: servicesNeeded,
          visible_to_drivers: visibleToDrivers,
          accepting_proposals: acceptingProposals,
          siret: siretNumber,
          siren: sirenNumber,
          tva_number: tvaNumber,
        })
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil public mis à jour");
      queryClient.invalidateQueries({ queryKey: ["company-profile", companyId] });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Profil public de l'entreprise
        </h2>
        <p className="text-sm text-muted-foreground">
          Présentez votre entreprise aux chauffeurs VTC
        </p>
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

          {/* SIRET, SIREN & TVA */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siret">Numéro SIRET</Label>
              <Input
                id="siret"
                placeholder="123 456 789 00012"
                value={siretNumber}
                onChange={(e) => setSiretNumber(e.target.value)}
                maxLength={17}
              />
              <p className="text-xs text-muted-foreground">
                14 chiffres identifiant votre établissement
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siren">Numéro SIREN</Label>
              <Input
                id="siren"
                placeholder="123 456 789"
                value={sirenNumber}
                onChange={(e) => setSirenNumber(e.target.value)}
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">
                9 chiffres identifiant votre entreprise
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tva">Numéro de TVA intracommunautaire</Label>
            <Input
              id="tva"
              placeholder="FR12 345678901"
              value={tvaNumber}
              onChange={(e) => setTvaNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Utilisé pour la facturation
            </p>
          </div>
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

      {/* Preview */}
      {visibleToDrivers && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Aperçu du profil
            </CardTitle>
            <CardDescription>
              Voici comment les chauffeurs verront votre profil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-background rounded-lg space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{company?.company_name}</h3>
                  {company?.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {company.address}
                    </p>
                  )}
                  {company?.employee_count && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {company.employee_count} collaborateurs
                    </p>
                  )}
                </div>
              </div>

              {/* Legal info preview */}
              {(siretNumber || sirenNumber || tvaNumber) && (
                <div className="flex flex-wrap gap-4 text-sm border-t pt-3">
                  {siretNumber && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="font-medium">SIRET:</span>
                      <span>{siretNumber}</span>
                    </div>
                  )}
                  {sirenNumber && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="font-medium">SIREN:</span>
                      <span>{sirenNumber}</span>
                    </div>
                  )}
                  {tvaNumber && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="font-medium">TVA:</span>
                      <span>{tvaNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {publicDescription && (
                <p className="text-sm text-muted-foreground">{publicDescription}</p>
              )}

              {servicesNeeded.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {servicesNeeded.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              )}

              {acceptingProposals && (
                <Badge className="bg-green-500">
                  <Star className="w-3 h-3 mr-1" />
                  Accepte les propositions
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
          size="lg"
        >
          {updateProfile.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer le profil
        </Button>
      </div>
    </div>
  );
}
