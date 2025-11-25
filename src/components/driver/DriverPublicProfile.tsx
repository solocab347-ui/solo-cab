import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Globe, MapPin, AlertCircle } from "lucide-react";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { DualProfilePhotoUpload } from "./DualProfilePhotoUpload";
import { SectorSelector } from "./SectorSelector";
import { EquipmentSelector } from "./EquipmentSelector";
import { ServicesSelector } from "./ServicesSelector";
import { VehiclePhotosManager } from "./VehiclePhotosManager";

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
  onTogglePublicProfile: (enabled: boolean) => void;
  onPhotoUpdate: (url: string) => void;
  onCardPhotoUpdate: (url: string) => void;
  onShowPhoneChange: (checked: boolean) => void;
  onShowEmailChange: (checked: boolean) => void;
  onWorkingSectorsChange: (sectors: string[]) => void;
  onServiceDescriptionChange: (description: string) => void;
  onHomeAddressChange: (address: string, coords: { latitude: number; longitude: number } | null) => void;
  onDisplayDriverNameChange: (checked: boolean) => void;
  onDisplayCompanyNameChange: (checked: boolean) => void;
  onVehicleEquipmentChange: (equipment: string[]) => void;
  onServicesOfferedChange: (services: string[]) => void;
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
}: DriverPublicProfileProps) => {
  return (
    <Card className="p-6 bg-white/5 backdrop-blur border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Profil Public</h2>
        {driverProfile?.driver?.id && publicProfileEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/chauffeur/${driverProfile.driver.id}`, '_blank')}
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            <Globe className="w-4 h-4" />
            Voir mon profil public
          </Button>
        )}
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base text-white">Activer le profil public</Label>
            <p className="text-sm text-gray-400">
              Apparaître sur /chauffeurs pour les clients libres
            </p>
          </div>
          <Switch
            checked={publicProfileEnabled}
            onCheckedChange={onTogglePublicProfile}
          />
        </div>

        <DualProfilePhotoUpload
          currentProfilePhotoUrl={profilePhotoUrl}
          currentCardPhotoUrl={cardPhotoUrl}
          userId={userId}
          driverName={driverProfile?.full_name || ""}
          onProfilePhotoUpdate={onPhotoUpdate}
          onCardPhotoUpdate={onCardPhotoUpdate}
        />

        <div className="border-t border-white/10 pt-6">
          <Label className="text-base mb-4 block text-white">Affichage dans le profil public</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="displayName"
                checked={displayDriverName}
                onCheckedChange={(checked) => onDisplayDriverNameChange(checked as boolean)}
              />
              <Label htmlFor="displayName" className="font-normal cursor-pointer text-gray-300">
                Afficher mon nom ({driverProfile?.full_name || "Non défini"})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="displayCompany"
                checked={displayCompanyName}
                onCheckedChange={(checked) => onDisplayCompanyNameChange(checked as boolean)}
              />
              <Label htmlFor="displayCompany" className="font-normal cursor-pointer text-gray-300">
                Afficher le nom de mon entreprise ({companyName || "Non défini"})
              </Label>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Vous pouvez afficher votre nom, celui de votre entreprise, ou les deux
          </p>
        </div>

        <div className="border-t border-white/10 pt-6">
          <Label className="text-base mb-4 block text-white">Informations de contact visibles</Label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base text-white">Afficher mon téléphone</Label>
                <p className="text-sm text-gray-400">
                  {driverProfile?.phone || "Non renseigné"}
                </p>
              </div>
              <Switch
                checked={showPhone}
                onCheckedChange={onShowPhoneChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base text-white">Afficher mon email</Label>
                <p className="text-sm text-gray-400">
                  {driverProfile?.email || "Non renseigné"}
                </p>
              </div>
              <Switch
                checked={showEmail}
                onCheckedChange={onShowEmailChange}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Choisissez les informations de contact à afficher sur votre profil public
          </p>
        </div>

        <SectorSelector
          selectedSectors={workingSectors}
          onChange={onWorkingSectorsChange}
        />

        <div className="space-y-2">
          <Label htmlFor="description" className="text-white">Description du service</Label>
          <Textarea
            id="description"
            value={serviceDescription}
            onChange={(e) => onServiceDescriptionChange(e.target.value)}
            placeholder="Décrivez votre service, vos spécialités..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="homeAddress" className="flex items-center gap-2 text-white">
            <MapPin className="w-4 h-4" />
            📍 Adresse de Localisation
          </Label>
          <AddressAutocomplete
            value={homeAddress}
            onChange={onHomeAddressChange}
            placeholder="Tapez votre adresse de départ habituelle..."
          />
          <div className="text-xs text-gray-300 space-y-1 bg-white/5 p-3 rounded-lg border border-white/10">
            <p className="font-medium text-white">Pourquoi cette adresse est importante ?</p>
            <p>
              Cette adresse servira à vous géolocaliser quand un client cherche des chauffeurs à proximité. 
              C'est dans votre intérêt de renseigner l'adresse de départ d'où vous décollez tous les jours.
            </p>
            <p className="pt-1">
              💡 <span className="font-medium">Conseil :</span> Cela peut être soit votre lieu d'habitation, 
              soit le lieu où vous récupérez votre véhicule chaque jour. Plus votre localisation est précise, 
              plus vous avez de chances de trouver des clients à proximité !
            </p>
            <div className="flex items-start gap-2 pt-2 border-t border-white/10">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-400" />
              <p className="text-cyan-400">
                <span className="font-medium">Important :</span> Cette adresse est uniquement utilisée pour le système de recherche 
                de proximité. Elle ne sera jamais affichée publiquement aux clients.
              </p>
            </div>
          </div>
        </div>

        <ServicesSelector
          selectedServices={servicesOffered}
          onChange={onServicesOfferedChange}
        />

        <EquipmentSelector
          selectedEquipment={vehicleEquipment}
          onChange={onVehicleEquipmentChange}
        />
      </div>
    </Card>
  );
});

DriverPublicProfile.displayName = "DriverPublicProfile";
