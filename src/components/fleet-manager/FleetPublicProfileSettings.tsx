import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Briefcase,
  Check,
  Plus,
  X,
  Handshake,
  Car,
  Euro
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DRIVER_SERVICES } from "@/lib/vehicleEquipment";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLIC_FLEETS_QUERY_KEY, PUBLIC_FLEET_PROFILE_KEY } from "@/hooks/usePublicFleetProfile";

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
  servicesOffered?: string[] | null;
  visibleToDrivers?: boolean;
  visibleToCompanies?: boolean;
  driverProfileDescription?: string | null;
  defaultPartnershipCommission?: number | null;
  partnershipTerms?: string | null;
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
  servicesOffered: initialServicesOffered = [],
  visibleToDrivers: initialVisibleToDrivers = false,
  visibleToCompanies: initialVisibleToCompanies = false,
  driverProfileDescription: initialDriverProfileDescription = "",
  defaultPartnershipCommission: initialDefaultCommission = 10,
  partnershipTerms: initialPartnershipTerms = "",
  onUpdate
}: FleetPublicProfileSettingsProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDrivers, setShowDrivers] = useState(showDriversInPublic);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [showContactName, setShowContactName] = useState(initialShowContactName);
  const [showAddress, setShowAddress] = useState(initialShowAddress);
  const [showPhone, setShowPhone] = useState(initialShowPhone);
  const [showEmail, setShowEmail] = useState(initialShowEmail);
  const [selectedServices, setSelectedServices] = useState<string[]>(initialServicesOffered || []);
  const [customService, setCustomService] = useState("");
  const [customServices, setCustomServices] = useState<string[]>([]);
  
  // Champs visibilité partenaires
  const [visibleToDrivers, setVisibleToDrivers] = useState(initialVisibleToDrivers);
  const [visibleToCompanies, setVisibleToCompanies] = useState(initialVisibleToCompanies);
  const [defaultCommission, setDefaultCommission] = useState(initialDefaultCommission || 10);
  const [partnershipTerms, setPartnershipTerms] = useState(initialPartnershipTerms || "");
  
  // Champs visibilité compteurs
  const [showDriverCountPublic, setShowDriverCountPublic] = useState(false);
  const [showClientCountPublic, setShowClientCountPublic] = useState(false);
  
  // Champs d'entreprise
  const [siret, setSiret] = useState("");
  const [siren, setSiren] = useState("");
  const [tvaNumber, setTvaNumber] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Charger les données d'entreprise au montage
  useEffect(() => {
    const loadFleetData = async () => {
      const { data } = await supabase
        .from("fleet_managers")
        .select("siret, siren, tva_number, address, contact_phone, visible_to_drivers, visible_to_companies, driver_profile_description, default_partnership_commission, partnership_terms, logo_url, description, services_offered, show_contact_name, show_address, show_phone, show_email, show_drivers_in_public_storefront, show_driver_count_public, show_client_count_public")
        .eq("id", fleetManagerId)
        .single();
      
      if (data) {
        setSiret(data.siret || "");
        setSiren(data.siren || "");
        setTvaNumber((data as any).tva_number || "");
        setAddress(data.address || "");
        setContactPhone(data.contact_phone || "");
        setVisibleToDrivers(data.visible_to_drivers || false);
        setVisibleToCompanies(data.visible_to_companies || false);
        setDefaultCommission(data.default_partnership_commission || 10);
        setPartnershipTerms(data.partnership_terms || "");
        // Charger logo et description depuis la DB
        setLogoUrl(data.logo_url || "");
        setDescription(data.description || "");
        setShowContactName(data.show_contact_name ?? true);
        setShowAddress(data.show_address ?? true);
        setShowPhone(data.show_phone ?? true);
        setShowEmail(data.show_email ?? true);
        setShowDrivers(data.show_drivers_in_public_storefront ?? false);
        setShowDriverCountPublic((data as any).show_driver_count_public ?? false);
        setShowClientCountPublic((data as any).show_client_count_public ?? false);
        
        // Charger les services et les dédoublonner
        const predefinedIds = DRIVER_SERVICES.map(s => s.id);
        const servicesFromDb = data.services_offered || [];
        // Utiliser un Set pour éliminer les doublons
        const uniqueServices = [...new Set(servicesFromDb)] as string[];
        const predefined = uniqueServices.filter(s => predefinedIds.includes(s));
        const custom = uniqueServices.filter(s => !predefinedIds.includes(s));
        setSelectedServices(predefined);
        setCustomServices(custom);
      }
    };
    loadFleetData();
  }, [fleetManagerId]);

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
      const fileName = `${fleetManagerId}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("fleet-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("fleet-documents")
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

  // Ce useEffect est remplacé par le chargement dans loadFleetData

  const handleServiceToggle = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceId));
    } else if (!customServices.includes(serviceId)) {
      // Éviter les doublons entre services prédéfinis et personnalisés
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    const predefinedLabels = DRIVER_SERVICES.map(s => s.label.toLowerCase());
    const predefinedIds = DRIVER_SERVICES.map(s => s.id.toLowerCase());
    
    // Éviter les doublons avec les services prédéfinis ou déjà ajoutés
    if (trimmed && 
        !customServices.map(s => s.toLowerCase()).includes(trimmed.toLowerCase()) &&
        !predefinedLabels.includes(trimmed.toLowerCase()) &&
        !predefinedIds.includes(trimmed.toLowerCase()) &&
        !selectedServices.includes(trimmed)) {
      setCustomServices([...customServices, trimmed]);
      setCustomService("");
    } else if (trimmed) {
      toast.error("Ce service existe déjà");
    }
  };

  const removeCustomService = (service: string) => {
    setCustomServices(customServices.filter(s => s !== service));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Combine predefined and custom services et dédoublonner
      const allServices = [...new Set([...selectedServices, ...customServices])];
      
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
          services_offered: allServices.length > 0 ? allServices : null,
          siret: siret || null,
          siren: siren || null,
          tva_number: tvaNumber || null,
          address: address || null,
          contact_phone: contactPhone || null,
          visible_to_drivers: visibleToDrivers,
          visible_to_companies: visibleToCompanies,
          driver_profile_description: description || null,
          default_partnership_commission: defaultCommission,
          partnership_terms: partnershipTerms || null,
          show_driver_count_public: showDriverCountPublic,
          show_client_count_public: showClientCountPublic,
        } as any)
        .eq("id", fleetManagerId);

      if (error) throw error;

      toast.success("Paramètres mis à jour");
      // Invalider les caches pour synchronisation instantanée
      queryClient.invalidateQueries({ queryKey: PUBLIC_FLEETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_FLEET_PROFILE_KEY });
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
                <h2 className="text-xl font-semibold">Profil Public Partageable</h2>
                <p className="text-sm text-muted-foreground">
                  Personnalisez votre profil pour attirer des clients via votre lien/QR code
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

      {/* Informations Entreprise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informations Entreprise
          </CardTitle>
          <CardDescription>
            Ces informations apparaîtront sur vos devis et factures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SIRET (14 chiffres)</Label>
              <Input
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="123 456 789 00012"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label>SIREN (9 chiffres)</Label>
              <Input
                value={siren}
                onChange={(e) => setSiren(e.target.value)}
                placeholder="123 456 789"
                maxLength={9}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>N° TVA Intracommunautaire</Label>
            <Input
              value={tvaNumber}
              onChange={(e) => setTvaNumber(e.target.value)}
              placeholder="FR12345678901"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">Ce numéro apparaîtra sur vos devis et factures</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adresse de l'entreprise</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Rue de la République, 75001 Paris"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
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

      {/* Services Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Services proposés
          </CardTitle>
          <CardDescription>
            Sélectionnez les services que vous proposez à vos clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Predefined Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DRIVER_SERVICES.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => handleServiceToggle(service.id)}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md relative",
                    isSelected 
                      ? "border-primary border-2 bg-primary/5" 
                      : "border-border/50 bg-muted/30 hover:border-primary/30"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{service.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{service.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {service.description}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Services */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un service personnalisé
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Service médical, Transport d'enfants..."
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomService()}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={addCustomService}
                disabled={!customService.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {customServices.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customServices.map((service, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="px-3 py-1.5 gap-2"
                  >
                    {service}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeCustomService(service)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedServices.length + customServices.length} service(s) sélectionné(s)
          </p>
        </CardContent>
      </Card>

      {/* Drivers Visibility on Public Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Visibilité des chauffeurs</CardTitle>
          <CardDescription>
            Décidez si vos chauffeurs apparaissent sur votre profil partageable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex-1">
              <Label className="text-base font-medium">Afficher les chauffeurs</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Vos chauffeurs seront visibles sur votre profil public (accessible via votre lien/QR code)
              </p>
            </div>
            <Switch checked={showDrivers} onCheckedChange={setShowDrivers} />
          </div>

          {showDrivers && (
            <div className="p-4 bg-success/10 rounded-xl border border-success/20">
              <p className="text-sm text-success flex items-center gap-2">
                <span className="text-lg">✓</span>
                Vos chauffeurs apparaissent sur votre profil partageable
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* B2B Visibility - Drivers & Companies */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            Visibilité Partenaires B2B
          </CardTitle>
          <CardDescription>
            Permettez aux chauffeurs indépendants et entreprises de vous trouver pour des collaborations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visible to Drivers */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-medium">Visible par les chauffeurs</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Les chauffeurs indépendants pourront vous trouver et proposer des partenariats
                </p>
              </div>
            </div>
            <Switch checked={visibleToDrivers} onCheckedChange={setVisibleToDrivers} />
          </div>

          {/* Visible to Companies */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/5 to-transparent rounded-xl border border-accent/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-medium">Visible par les entreprises</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Les entreprises pourront vous trouver et proposer des contrats de transport
                </p>
              </div>
            </div>
            <Switch checked={visibleToCompanies} onCheckedChange={setVisibleToCompanies} />
          </div>

          {(visibleToDrivers || visibleToCompanies) && (
            <>
              <div className="p-4 bg-success/10 rounded-xl border border-success/20">
                <p className="text-sm text-success flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  Votre flotte est visible pour les partenariats B2B
                </p>
              </div>
              
              {/* Privacy settings for counters */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label className="text-sm font-medium text-muted-foreground">Informations visibles</Label>
                
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Afficher le nombre de chauffeurs</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les partenaires verront combien de chauffeurs vous avez
                    </p>
                  </div>
                  <Switch checked={showDriverCountPublic} onCheckedChange={setShowDriverCountPublic} />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Afficher le nombre de clients</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les partenaires verront combien de clients vous avez
                    </p>
                  </div>
                  <Switch checked={showClientCountPublic} onCheckedChange={setShowClientCountPublic} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Partnership Settings */}
      {(visibleToDrivers || visibleToCompanies) && (
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Paramètres de partenariat
            </CardTitle>
            <CardDescription>
              Configurez les conditions par défaut pour vos partenariats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info about shared description */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                La présentation de votre entreprise (section "Logo & Présentation") sera également utilisée pour les partenariats B2B.
              </p>
            </div>

            {/* Default Commission */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Commission par défaut (%)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(Number(e.target.value))}
                  className="w-24"
                />
                <p className="text-sm text-muted-foreground">
                  Entre 5% et 30% - applicable aux partenariats chauffeurs
                </p>
              </div>
            </div>

            {/* Partnership Terms */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Conditions de partenariat
              </Label>
              <Textarea
                placeholder="Décrivez vos conditions de collaboration : délais de paiement, exigences qualité, règles de commission..."
                value={partnershipTerms}
                onChange={(e) => setPartnershipTerms(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Ces conditions seront présentées lors des propositions de partenariat
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
