import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { DualProfilePhotoUpload } from '../DualProfilePhotoUpload';
import { SectorSelector } from '../SectorSelector';
import { ServicesSelector } from '../ServicesSelector';
import { EquipmentSelector } from '../EquipmentSelector';
import { VehicleCategorySelector } from '../VehicleCategorySelector';
import { 
  Camera, 
  MapPin, 
  Briefcase,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface OnboardingProfileStepProps {
  data: {
    profilePhotoUrl: string | null;
    cardPhotoUrl: string | null;
    serviceDescription: string;
    workingSectors: string[];
    vehicleEquipment: string[];
    servicesOffered: string[];
    vehicleCategories: string[];
    displayDriverName: boolean;
    displayCompanyName: boolean;
    homeAddress: string;
    homeCoordinates: { latitude: number; longitude: number } | null;
  };
  driverProfile: any;
  userId: string;
  onUpdate: (updates: Partial<OnboardingProfileStepProps['data']>) => void;
}

export function OnboardingProfileStep({ data, driverProfile, userId, onUpdate }: OnboardingProfileStepProps) {
  const isPhotoComplete = !!data.profilePhotoUrl;
  const isDescriptionComplete = !!data.serviceDescription && data.serviceDescription.length >= 20;
  const isSectorsComplete = data.workingSectors.length > 0;
  const isServicesComplete = data.servicesOffered.length > 0;

  return (
    <div className="space-y-3">
      {/* Photo */}
      <Card className={isPhotoComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Vos photos
            {isPhotoComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                OK
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 text-[10px] px-1.5 py-0">
                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                Requis
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <DualProfilePhotoUpload
            currentProfilePhotoUrl={data.profilePhotoUrl}
            currentCardPhotoUrl={data.cardPhotoUrl}
            userId={userId}
            driverName={driverProfile?.full_name || 'Chauffeur'}
            onProfilePhotoUpdate={(url) => onUpdate({ profilePhotoUrl: url })}
            onCardPhotoUpdate={(url) => onUpdate({ cardPhotoUrl: url })}
          />
        </CardContent>
      </Card>

      {/* Identité affichée */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Identité affichée
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayName"
              checked={data.displayDriverName}
              onCheckedChange={(checked) => onUpdate({ displayDriverName: checked as boolean })}
            />
            <Label htmlFor="displayName" className="text-xs cursor-pointer">
              Afficher mon nom ({driverProfile?.full_name || 'Non défini'})
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayCompany"
              checked={data.displayCompanyName}
              onCheckedChange={(checked) => onUpdate({ displayCompanyName: checked as boolean })}
            />
            <Label htmlFor="displayCompany" className="text-xs cursor-pointer">
              Afficher mon entreprise
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className={isDescriptionComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Présentation
            {isDescriptionComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                OK
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 text-[10px] px-1.5 py-0">
                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                Requis
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Textarea
            value={data.serviceDescription}
            onChange={(e) => onUpdate({ serviceDescription: e.target.value })}
            placeholder="Chauffeur VTC professionnel, véhicule haut de gamme..."
            rows={2}
            className="resize-none text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {data.serviceDescription.length}/20 caractères min.
          </p>
        </CardContent>
      </Card>

      {/* Secteurs */}
      <Card className={isSectorsComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Zones d'activité
            {isSectorsComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                OK
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 text-[10px] px-1.5 py-0">
                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                Requis
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <SectorSelector
            selectedSectors={data.workingSectors}
            onChange={(sectors) => onUpdate({ workingSectors: sectors })}
          />
        </CardContent>
      </Card>

      {/* Adresse de localisation */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Adresse de départ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <AddressAutocomplete
            value={data.homeAddress}
            onChange={(address, coords) => {
              onUpdate({ 
                homeAddress: address,
                homeCoordinates: coords || null
              });
            }}
            placeholder="Votre adresse de départ"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Non visible publiquement
          </p>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className={isServicesComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Services proposés
            {isServicesComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                OK
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 text-[10px] px-1.5 py-0">
                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                Requis
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ServicesSelector
            selectedServices={data.servicesOffered}
            onChange={(services) => onUpdate({ servicesOffered: services })}
          />
        </CardContent>
      </Card>

      {/* Catégories véhicule */}
      <VehicleCategorySelector
        selectedCategories={data.vehicleCategories}
        onChange={(categories) => onUpdate({ vehicleCategories: categories })}
      />

      {/* Équipements */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Équipements (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <EquipmentSelector
            selectedEquipment={data.vehicleEquipment}
            onChange={(equipment) => onUpdate({ vehicleEquipment: equipment })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
