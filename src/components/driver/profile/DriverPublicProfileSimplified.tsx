import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, MapPin, User, Phone, Mail, Car, 
  Eye, Copy, Check, ExternalLink, Camera, 
  Briefcase, CheckCircle2, Save, Loader2
} from "lucide-react";
import { DualProfilePhotoUpload } from "../DualProfilePhotoUpload";
import { SectorSelector } from "../SectorSelector";
import { EquipmentSelector } from "../EquipmentSelector";
import { ServicesSelector } from "../ServicesSelector";
import { VehicleCategorySelector } from "../VehicleCategorySelector";
import { DriverVehiclesManager } from "../DriverVehiclesManager";
import { toast } from "sonner";

interface DriverPublicProfileSimplifiedProps {
  driverProfile: any;
  userId: string;
  // Visibilité
  publicProfileEnabled: boolean;
  visibleToDrivers: boolean;
  // Identité
  displayDriverName: boolean;
  displayCompanyName: boolean;
  companyName: string;
  profilePhotoUrl: string | null;
  cardPhotoUrl: string | null;
  serviceDescription: string;
  // Services
  workingSectors: string[];
  vehicleEquipment: string[];
  servicesOffered: string[];
  vehicleCategories: string[];
  homeAddress: string;
  // Contact
  showPhone: boolean;
  showEmail: boolean;
  contactPhone?: string;
  contactEmail?: string;
  showRatingPublic?: boolean;
  // Callbacks
  onTogglePublicProfile: (enabled: boolean) => void;
  onVisibleToDriversChange: (visible: boolean) => void;
  onDisplayDriverNameChange: (checked: boolean) => void;
  onDisplayCompanyNameChange: (checked: boolean) => void;
  onPhotoUpdate: (url: string) => void;
  onCardPhotoUpdate: (url: string) => void;
  onServiceDescriptionChange: (description: string) => void;
  onWorkingSectorsChange: (sectors: string[]) => void;
  onVehicleEquipmentChange: (equipment: string[]) => void;
  onServicesOfferedChange: (services: string[]) => void;
  onVehicleCategoriesChange: (categories: string[]) => void;
  onHomeAddressChange: (address: string, coords?: { latitude: number; longitude: number }) => void;
  onShowPhoneChange: (checked: boolean) => void;
  onShowEmailChange: (checked: boolean) => void;
  onContactPhoneChange?: (phone: string) => void;
  onContactEmailChange?: (email: string) => void;
  onShowRatingPublicChange?: (visible: boolean) => void;
  // Save
  onSave: () => void;
  loading?: boolean;
}

export const DriverPublicProfileSimplified = memo(({
  driverProfile,
  userId,
  publicProfileEnabled,
  visibleToDrivers,
  displayDriverName,
  displayCompanyName,
  companyName,
  profilePhotoUrl,
  cardPhotoUrl,
  serviceDescription,
  workingSectors,
  vehicleEquipment,
  servicesOffered,
  vehicleCategories,
  homeAddress,
  showPhone,
  showEmail,
  contactPhone = "",
  contactEmail = "",
  showRatingPublic = false,
  onTogglePublicProfile,
  onVisibleToDriversChange,
  onDisplayDriverNameChange,
  onDisplayCompanyNameChange,
  onPhotoUpdate,
  onCardPhotoUpdate,
  onServiceDescriptionChange,
  onWorkingSectorsChange,
  onVehicleEquipmentChange,
  onServicesOfferedChange,
  onVehicleCategoriesChange,
  onHomeAddressChange,
  onShowPhoneChange,
  onShowEmailChange,
  onContactPhoneChange,
  onContactEmailChange,
  onShowRatingPublicChange,
  onSave,
  loading = false,
}: DriverPublicProfileSimplifiedProps) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("visibility");

  // Guard contre les données manquantes
  if (!driverProfile || !userId) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Chargement du profil...</p>
      </Card>
    );
  }

  const driverName = driverProfile?.full_name || "Chauffeur";
  const driverId = driverProfile?.driver?.id;
  const isPioneer = driverProfile?.driver?.is_pioneer;
  
  // Générer le lien du profil public
  const publicProfileUrl = driverId ? `${window.location.origin}/chauffeur/${driverId}` : "";
  
  const handleCopyLink = () => {
    if (!publicProfileUrl) return;
    navigator.clipboard.writeText(publicProfileUrl);
    setLinkCopied(true);
    toast.success("Lien copié dans le presse-papier !");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Indicateurs de complétion
  const isVisibilityComplete = publicProfileEnabled;
  const isIdentityComplete = (displayDriverName || displayCompanyName) && (profilePhotoUrl || cardPhotoUrl);
  const isServicesComplete = workingSectors.length > 0 && servicesOffered.length > 0;
  const isContactComplete = (contactPhone && showPhone) || (contactEmail && showEmail);

  return (
    <div className="space-y-4">
      {/* Header avec bouton Enregistrer sticky */}
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50 sticky top-16 z-40">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">Profil SoloCab</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Votre vitrine pour les clients
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {driverId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/chauffeur/${driverId}`, '_blank')}
                className="gap-1 hidden sm:flex"
              >
                <ExternalLink className="w-4 h-4" />
                Voir
              </Button>
            )}
            <Button 
              onClick={onSave} 
              disabled={loading}
              size="sm"
              className="gap-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Enregistrer</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs de navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="visibility" 
            className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 text-xs sm:text-sm data-[state=active]:bg-background"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Visibilité</span>
            <span className="sm:hidden">Visib.</span>
            {isVisibilityComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger 
            value="identity" 
            className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 text-xs sm:text-sm data-[state=active]:bg-background"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Identité</span>
            <span className="sm:hidden">Ident.</span>
            {isIdentityComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger 
            value="services" 
            className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 text-xs sm:text-sm data-[state=active]:bg-background"
          >
            <Briefcase className="w-4 h-4" />
            <span>Services</span>
            {isServicesComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger 
            value="contact" 
            className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 text-xs sm:text-sm data-[state=active]:bg-background"
          >
            <Phone className="w-4 h-4" />
            <span>Contact</span>
            {isContactComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab Visibilité */}
        <TabsContent value="visibility" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-base font-semibold mb-4">Activation du profil</h3>
            
            {/* Toggle principal */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex-1 min-w-0 pr-4">
                <Label className="text-base font-medium">Profil public actif</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Apparaître dans la vitrine SoloCab pour les clients
                </p>
              </div>
              <Switch
                checked={publicProfileEnabled}
                onCheckedChange={onTogglePublicProfile}
              />
            </div>

            {/* Lien du profil */}
            {driverId && (publicProfileEnabled || isPioneer) && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    {isPioneer ? "Profil pionnier actif" : "Profil visible"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={publicProfileUrl}
                    readOnly
                    className="flex-1 text-xs bg-background/50"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-1 shrink-0"
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Partagez ce lien avec vos clients potentiels
                </p>
              </div>
            )}
          </Card>

          {/* Visibilité partenaires */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-base font-semibold mb-4">Partenariats chauffeurs</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Permettre aux autres chauffeurs de vous proposer des partenariats
            </p>
            
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <Label className="font-medium">Visible aux chauffeurs</Label>
                  <p className="text-sm text-muted-foreground truncate">
                    Recevoir des propositions de partenariat
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {visibleToDrivers && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
                    Actif
                  </Badge>
                )}
                <Switch
                  checked={visibleToDrivers}
                  onCheckedChange={onVisibleToDriversChange}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab Identité */}
        <TabsContent value="identity" className="space-y-4 mt-4">
          {/* Photos */}
          <DualProfilePhotoUpload
            currentProfilePhotoUrl={profilePhotoUrl}
            currentCardPhotoUrl={cardPhotoUrl}
            userId={userId}
            driverName={driverName}
            onProfilePhotoUpdate={onPhotoUpdate}
            onCardPhotoUpdate={onCardPhotoUpdate}
          />

          {/* Affichage nom/entreprise */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-base font-semibold mb-4">Identité affichée</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  id="displayName"
                  checked={displayDriverName}
                  onCheckedChange={(checked) => onDisplayDriverNameChange(checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="displayName" className="font-medium cursor-pointer flex items-center gap-2">
                    <User className="w-4 h-4 shrink-0" />
                    Mon nom
                  </Label>
                  <p className="text-sm text-muted-foreground truncate">
                    {driverName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  id="displayCompany"
                  checked={displayCompanyName}
                  onCheckedChange={(checked) => onDisplayCompanyNameChange(checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="displayCompany" className="font-medium cursor-pointer flex items-center gap-2">
                    <Briefcase className="w-4 h-4 shrink-0" />
                    Nom de l'entreprise
                  </Label>
                  <p className="text-sm text-muted-foreground truncate">
                    {companyName || "Non défini"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-base font-semibold mb-4">Présentation</h3>
            <Textarea
              value={serviceDescription || ""}
              onChange={(e) => onServiceDescriptionChange(e.target.value)}
              placeholder="Décrivez votre service, vos spécialités, votre expérience..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Cette description sera visible sur votre profil public
            </p>
          </Card>
        </TabsContent>

        {/* Tab Services */}
        <TabsContent value="services" className="space-y-4 mt-4">
          {/* Secteurs */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <SectorSelector
              selectedSectors={workingSectors || []}
              onChange={onWorkingSectorsChange}
            />
          </Card>

          {/* Adresse de localisation */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <h3 className="text-base font-semibold">Zone de départ</h3>
            </div>
            <AddressAutocomplete
              value={homeAddress || ""}
              onChange={(address, coords) => {
                if (coords) {
                  onHomeAddressChange(address, coords);
                } else {
                  onHomeAddressChange(address);
                }
              }}
              placeholder="Votre adresse de départ habituelle"
            />
            <p className="text-xs text-muted-foreground mt-2">
              📍 Utilisé pour la recherche de proximité (non visible publiquement)
            </p>
          </Card>

          {/* Gestionnaire véhicules */}
          {driverId && (
            <DriverVehiclesManager driverId={driverId} />
          )}

          {/* Catégories véhicule */}
          <VehicleCategorySelector
            selectedCategories={vehicleCategories || []}
            onChange={onVehicleCategoriesChange}
          />

          {/* Services */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <ServicesSelector
              selectedServices={servicesOffered || []}
              onChange={onServicesOfferedChange}
            />
          </Card>

          {/* Équipements */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <EquipmentSelector
              selectedEquipment={vehicleEquipment || []}
              onChange={onVehicleEquipmentChange}
            />
          </Card>
        </TabsContent>

        {/* Tab Contact */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-base font-semibold mb-4">Coordonnées publiques</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choisissez quelles informations afficher sur votre profil
            </p>
            
            <div className="space-y-4">
              {/* Téléphone */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-2 font-medium">
                    <Phone className="w-4 h-4" />
                    Téléphone
                  </Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={contactPhone}
                    onChange={(e) => onContactPhoneChange?.(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Label className="text-sm">Afficher sur le profil</Label>
                  <Switch
                    checked={showPhone}
                    onCheckedChange={onShowPhoneChange}
                    disabled={!contactPhone}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-2 font-medium">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={contactEmail}
                    onChange={(e) => onContactEmailChange?.(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Label className="text-sm">Afficher sur le profil</Label>
                  <Switch
                    checked={showEmail}
                    onCheckedChange={onShowEmailChange}
                    disabled={!contactEmail}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Note publique */}
          {onShowRatingPublicChange && (
            <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
              <h3 className="text-base font-semibold mb-4">Affichage de la note</h3>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex-1 min-w-0 pr-4">
                  <Label className="font-medium">Montrer ma note aux clients</Label>
                  <p className="text-sm text-muted-foreground">
                    Votre note moyenne sera visible sur votre profil
                  </p>
                </div>
                <Switch
                  checked={showRatingPublic}
                  onCheckedChange={onShowRatingPublicChange}
                />
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

DriverPublicProfileSimplified.displayName = "DriverPublicProfileSimplified";
