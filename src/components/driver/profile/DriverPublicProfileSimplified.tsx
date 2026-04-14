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
import { SingleProfilePhotoUpload } from "../onboarding/SingleProfilePhotoUpload";
import { SectorSelector } from "../SectorSelector";
import { EquipmentSelector } from "../vehicles/EquipmentSelector";
import { ServicesSelector } from "../ServicesSelector";
import { VehicleCategorySelector } from "../vehicles/VehicleCategorySelector";
import { DriverVehiclesManager } from "../vehicles/DriverVehiclesManager";
import { toast } from "sonner";

interface DriverPublicProfileSimplifiedProps {
  driverProfile: any;
  userId: string;
  // Visibilité partenariats uniquement (profil public toujours actif)
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
  
  // Contact
  showPhone: boolean;
  showEmail: boolean;
  contactPhone?: string;
  contactEmail?: string;
  showRatingPublic?: boolean;
  // Callbacks
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
  
  showPhone,
  showEmail,
  contactPhone = "",
  contactEmail = "",
  showRatingPublic = false,
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
  
  onShowPhoneChange,
  onShowEmailChange,
  onContactPhoneChange,
  onContactEmailChange,
  onShowRatingPublicChange,
  onSave,
  loading = false,
}: DriverPublicProfileSimplifiedProps) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");

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

  const isIdentityComplete = (displayDriverName || displayCompanyName) && (profilePhotoUrl || cardPhotoUrl);
  const isServicesComplete = workingSectors.length > 0 && servicesOffered.length > 0;
  const isContactComplete = (contactPhone && showPhone) || (contactEmail && showEmail);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header compact avec bouton Enregistrer sticky */}
      <Card className="p-3 sm:p-4 bg-card/50 backdrop-blur border-border/50 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">Profil SoloCab</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {driverId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/chauffeur/${driverId}`, '_blank')}
                className="gap-1 h-8 px-2 sm:px-3"
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Voir</span>
              </Button>
            )}
            <Button 
              onClick={onSave} 
              disabled={loading}
              size="sm"
              className="gap-1 h-8 px-2 sm:px-3"
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

      {/* Tabs de navigation - Compact */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="identity" 
            className="flex flex-col items-center gap-0.5 py-1.5 sm:py-2 px-0.5 text-[10px] sm:text-xs data-[state=active]:bg-background"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Identité</span>
          </TabsTrigger>
          <TabsTrigger 
            value="vehicle" 
            className="flex flex-col items-center gap-0.5 py-1.5 sm:py-2 px-0.5 text-[10px] sm:text-xs data-[state=active]:bg-background"
          >
            <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Véhicule</span>
          </TabsTrigger>
          <TabsTrigger 
            value="services" 
            className="flex flex-col items-center gap-0.5 py-1.5 sm:py-2 px-0.5 text-[10px] sm:text-xs data-[state=active]:bg-background"
          >
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Services</span>
          </TabsTrigger>
          <TabsTrigger 
            value="contact" 
            className="flex flex-col items-center gap-0.5 py-1.5 sm:py-2 px-0.5 text-[10px] sm:text-xs data-[state=active]:bg-background"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Contact</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Identité - includes public profile link */}
        <TabsContent value="identity" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          {/* Lien profil public */}
          {driverId && (
            <Card className="p-3 sm:p-4 bg-primary/10 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">Profil public actif</span>
              </div>
              <div className="flex items-center gap-2">
                <Input value={publicProfileUrl} readOnly className="flex-1 text-xs h-8 bg-background/50" />
                <Button variant="secondary" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0 h-8">
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          )}
          {/* Photo unique - utilisée partout (profil et carte) */}
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <SingleProfilePhotoUpload
              currentPhotoUrl={profilePhotoUrl}
              userId={userId}
              driverName={driverName}
              onPhotoUpdate={(url) => {
                // Mettre à jour les deux URLs en même temps
                onPhotoUpdate(url);
                onCardPhotoUpdate(url);
              }}
            />
          </Card>

          {/* Affichage nom/entreprise */}
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Identité affichée</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  id="displayName"
                  checked={displayDriverName}
                  onCheckedChange={(checked) => onDisplayDriverNameChange(checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="displayName" className="font-medium cursor-pointer flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 shrink-0" />
                    Mon nom
                  </Label>
                  <p className="text-xs text-muted-foreground truncate">
                    {driverName}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                <Checkbox
                  id="displayCompany"
                  checked={displayCompanyName}
                  onCheckedChange={(checked) => onDisplayCompanyNameChange(checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor="displayCompany" className="font-medium cursor-pointer flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 shrink-0" />
                    Entreprise
                  </Label>
                  <p className="text-xs text-muted-foreground truncate">
                    {companyName || "Non défini"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Présentation</h3>
            <Textarea
              value={serviceDescription || ""}
              onChange={(e) => onServiceDescriptionChange(e.target.value)}
              placeholder="Décrivez votre service, vos spécialités..."
              rows={3}
              className="resize-none text-sm"
            />
          </Card>
        </TabsContent>

        {/* Tab Véhicule */}
        <TabsContent value="vehicle" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          {/* Gestionnaire véhicules */}
          {driverId && (
            <DriverVehiclesManager driverId={driverId} />
          )}

          {/* Catégories véhicule */}
          <VehicleCategorySelector
            selectedCategories={vehicleCategories || []}
            onChange={onVehicleCategoriesChange}
          />

          {/* Équipements */}
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <EquipmentSelector
              selectedEquipment={vehicleEquipment || []}
              onChange={onVehicleEquipmentChange}
            />
          </Card>
        </TabsContent>

        {/* Tab Services */}
        <TabsContent value="services" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          {/* Secteurs */}
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <SectorSelector
              selectedSectors={workingSectors || []}
              onChange={onWorkingSectorsChange}
            />
          </Card>


          {/* Services */}
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <ServicesSelector
              selectedServices={servicesOffered || []}
              onChange={onServicesOfferedChange}
            />
          </Card>
        </TabsContent>

        {/* Tab Contact */}
        <TabsContent value="contact" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <Card className="p-3 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Coordonnées publiques</h3>
            <div className="space-y-3 sm:space-y-4">
              {/* Téléphone */}
              <div className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50 space-y-2 sm:space-y-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-2 font-medium text-sm">
                    <Phone className="w-4 h-4" />
                    Téléphone
                  </Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={contactPhone}
                    onChange={(e) => onContactPhoneChange?.(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Label className="text-xs sm:text-sm">Afficher publiquement</Label>
                  <Switch
                    checked={showPhone}
                    onCheckedChange={onShowPhoneChange}
                    disabled={!contactPhone}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50 space-y-2 sm:space-y-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-2 font-medium text-sm">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={contactEmail}
                    onChange={(e) => onContactEmailChange?.(e.target.value)}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Label className="text-xs sm:text-sm">Afficher publiquement</Label>
                  <Switch
                    checked={showEmail}
                    onCheckedChange={onShowEmailChange}
                    disabled={!contactEmail}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Note toujours visible - plus de toggle */}

        </TabsContent>
      </Tabs>
    </div>
  );
});

DriverPublicProfileSimplified.displayName = "DriverPublicProfileSimplified";
