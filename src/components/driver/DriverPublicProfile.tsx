import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Globe, MapPin, AlertCircle, Building2, User, Phone, Mail, Car, Package } from "lucide-react";
import { DualProfilePhotoUpload } from "./DualProfilePhotoUpload";
import { SectorSelector } from "./SectorSelector";
import { EquipmentSelector } from "./EquipmentSelector";
import { ServicesSelector } from "./ServicesSelector";
import { VehiclePhotosManager } from "./VehiclePhotosManager";
import { VehicleCategorySelector } from "./VehicleCategorySelector";
import { DriverVehiclesManager } from "./DriverVehiclesManager";

interface DriverPublicProfileProps {
  driverProfile: any;
  userId: string;
  publicProfileEnabled: boolean;
  showPhone: boolean;
  showEmail: boolean;
  workingSectors: string[];
  serviceDescription: string;
  homeAddress: string;
  displayDriverName: boolean;
  displayCompanyName: boolean;
  companyName: string;
  profilePhotoUrl: string | null;
  cardPhotoUrl: string | null;
  vehicleEquipment: string[];
  servicesOffered: string[];
  vehicleBrand: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleYear: string;
  vehiclePhotos: string[];
  galleryPhotos: string[];
  vehicleCategories: string[];
  visibleToFleetManagers?: boolean;
  onTogglePublicProfile: (enabled: boolean) => void;
  onPhotoUpdate: (url: string) => void;
  onCardPhotoUpdate: (url: string) => void;
  onShowPhoneChange: (checked: boolean) => void;
  onShowEmailChange: (checked: boolean) => void;
  onWorkingSectorsChange: (sectors: string[]) => void;
  onServiceDescriptionChange: (description: string) => void;
  onHomeAddressChange: (address: string, coords?: { latitude: number; longitude: number }) => void;
  onDisplayDriverNameChange: (checked: boolean) => void;
  onDisplayCompanyNameChange: (checked: boolean) => void;
  onVehicleEquipmentChange: (equipment: string[]) => void;
  onServicesOfferedChange: (services: string[]) => void;
  onVehicleBrandChange: (brand: string) => void;
  onVehicleColorChange: (color: string) => void;
  onVehiclePlateChange: (plate: string) => void;
  onVehicleYearChange: (year: string) => void;
  onVehiclePhotosUpdate: (vehiclePhotos: string[], galleryPhotos: string[]) => void;
  onVehicleCategoriesChange: (categories: string[]) => void;
  onVisibleToFleetManagersChange?: (visible: boolean) => void;
}

export const DriverPublicProfile = memo(({
  driverProfile,
  userId,
  publicProfileEnabled,
  showPhone,
  showEmail,
  workingSectors,
  serviceDescription,
  homeAddress,
  displayDriverName,
  displayCompanyName,
  companyName,
  profilePhotoUrl,
  cardPhotoUrl,
  vehicleEquipment,
  servicesOffered,
  vehicleBrand,
  vehicleColor,
  vehiclePlate,
  vehicleYear,
  vehiclePhotos,
  galleryPhotos,
  vehicleCategories,
  visibleToFleetManagers = false,
  onTogglePublicProfile,
  onPhotoUpdate,
  onCardPhotoUpdate,
  onShowPhoneChange,
  onShowEmailChange,
  onWorkingSectorsChange,
  onServiceDescriptionChange,
  onHomeAddressChange,
  onDisplayDriverNameChange,
  onDisplayCompanyNameChange,
  onVehicleEquipmentChange,
  onServicesOfferedChange,
  onVehicleBrandChange,
  onVehicleColorChange,
  onVehiclePlateChange,
  onVehicleYearChange,
  onVehiclePhotosUpdate,
  onVehicleCategoriesChange,
  onVisibleToFleetManagersChange,
}: DriverPublicProfileProps) => {
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

  return (
    <div className="space-y-6">
      {/* En-tête et activation */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Profil Public</h2>
              <p className="text-sm text-muted-foreground">
                Gérez votre visibilité sur la vitrine publique
              </p>
            </div>
          </div>
          {driverId && publicProfileEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/chauffeur/${driverId}`, '_blank')}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              Voir mon profil
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
          <div>
            <Label className="text-base font-medium">Activer le profil public</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Apparaître dans la vitrine pour les clients libres
            </p>
          </div>
          <Switch
            checked={publicProfileEnabled}
            onCheckedChange={onTogglePublicProfile}
          />
        </div>

        {publicProfileEnabled && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary font-medium">
              ✓ Votre profil est visible dans la vitrine publique
            </p>
          </div>
        )}

        {/* Visibilité pour gestionnaires de flotte */}
        {onVisibleToFleetManagersChange && (
          <div className="mt-4 flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
            <div>
              <Label className="text-base font-medium">Visible par les gestionnaires de flotte</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Permettre aux gestionnaires de vous trouver et voir votre profil
              </p>
            </div>
            <Switch
              checked={visibleToFleetManagers}
              onCheckedChange={onVisibleToFleetManagersChange}
            />
          </div>
        )}

        {visibleToFleetManagers && onVisibleToFleetManagersChange && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-600 font-medium">
              ✓ Les gestionnaires de flotte peuvent voir votre profil
            </p>
          </div>
        )}
      </Card>

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
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Affichage dans le profil</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayName"
              checked={displayDriverName}
              onCheckedChange={(checked) => onDisplayDriverNameChange(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="displayName" className="font-medium cursor-pointer flex items-center gap-2">
                <User className="w-4 h-4" />
                Afficher mon nom
              </Label>
              <p className="text-sm text-muted-foreground">
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
            <div className="flex-1">
              <Label htmlFor="displayCompany" className="font-medium cursor-pointer flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Afficher le nom de l'entreprise
              </Label>
              <p className="text-sm text-muted-foreground">
                {companyName || "Non défini"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Coordonnées */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Informations de contact</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <Label className="font-medium">Afficher mon téléphone</Label>
              <p className="text-sm text-muted-foreground">
                {driverProfile?.phone || "Non renseigné"}
              </p>
            </div>
            <Switch
              checked={showPhone}
              onCheckedChange={onShowPhoneChange}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <Label className="font-medium">Afficher mon email</Label>
              <p className="text-sm text-muted-foreground">
                {driverProfile?.email || "Non renseigné"}
              </p>
            </div>
            <Switch
              checked={showEmail}
              onCheckedChange={onShowEmailChange}
            />
          </div>
        </div>
      </Card>

      {/* Secteurs */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <SectorSelector
          selectedSectors={workingSectors || []}
          onChange={onWorkingSectorsChange}
        />
      </Card>

      {/* Description du service - DÉPLACÉ plus haut */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <h3 className="text-lg font-semibold mb-4">Description du service</h3>
        <Textarea
          value={serviceDescription || ""}
          onChange={(e) => onServiceDescriptionChange(e.target.value)}
          placeholder="Décrivez votre service, vos spécialités, votre expérience..."
          rows={5}
          className="resize-none"
        />
      </Card>

      {/* Adresse - DÉPLACÉ plus haut */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Adresse de localisation</h3>
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
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Pourquoi cette adresse est importante ?</p>
              <p className="text-muted-foreground">
                Cette adresse permet de vous géolocaliser quand un client cherche des chauffeurs à proximité.
                Renseignez l'adresse de départ d'où vous décollez quotidiennement.
              </p>
              <p className="text-muted-foreground">
                💡 <span className="font-medium">Important :</span> Cette adresse est uniquement pour la recherche 
                de proximité et ne sera jamais affichée publiquement.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Gestionnaire Multi-Véhicules - NOUVEAU SYSTÈME */}
      {driverId && (
        <DriverVehiclesManager driverId={driverId} />
      )}

      {/* Ancien système véhicule unique (conservé pour rétrocompatibilité) */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Car className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Véhicule principal (ancien système)</h3>
          <span className="text-xs text-muted-foreground">(sera migré vers multi-véhicules)</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehicleBrand">Marque</Label>
            <Input
              id="vehicleBrand"
              value={vehicleBrand || ""}
              onChange={(e) => onVehicleBrandChange(e.target.value)}
              placeholder="Mercedes, BMW, Tesla..."
            />
          </div>

          <div>
            <Label htmlFor="vehicleColor">Couleur</Label>
            <Input
              id="vehicleColor"
              value={vehicleColor || ""}
              onChange={(e) => onVehicleColorChange(e.target.value)}
              placeholder="Noir, Blanc, Gris..."
            />
          </div>

          <div>
            <Label htmlFor="vehiclePlate">Immatriculation</Label>
            <Input
              id="vehiclePlate"
              value={vehiclePlate || ""}
              onChange={(e) => onVehiclePlateChange(e.target.value)}
              placeholder="AB-123-CD"
            />
          </div>

          <div>
            <Label htmlFor="vehicleYear">Année</Label>
            <Input
              id="vehicleYear"
              type="number"
              value={vehicleYear || ""}
              onChange={(e) => onVehicleYearChange(e.target.value)}
              placeholder="2023"
              min="1990"
              max="2030"
            />
          </div>
        </div>
      </Card>

      {/* Photos véhicule - ancien système */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Photos du véhicule (ancien système)</h3>
        </div>
        {driverId && (
          <VehiclePhotosManager
            driverId={driverId}
            currentVehiclePhotos={vehiclePhotos || []}
            currentGalleryPhotos={galleryPhotos || []}
            onPhotosUpdate={onVehiclePhotosUpdate}
          />
        )}
      </Card>

      {/* Services */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <ServicesSelector
          selectedServices={servicesOffered || []}
          onChange={onServicesOfferedChange}
        />
      </Card>

      {/* Catégories de véhicule */}
      <VehicleCategorySelector
        selectedCategories={vehicleCategories || []}
        onChange={onVehicleCategoriesChange}
      />

      {/* Équipements */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
        <EquipmentSelector
          selectedEquipment={vehicleEquipment || []}
          onChange={onVehicleEquipmentChange}
        />
      </Card>
    </div>
  );
});

DriverPublicProfile.displayName = "DriverPublicProfile";
