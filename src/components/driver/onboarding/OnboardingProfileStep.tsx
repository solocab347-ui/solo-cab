import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    <div className="space-y-4">
      {/* Photo */}
      <Card className={isPhotoComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Vos photos
            {isPhotoComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complet
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Requis
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">Photo de profil visible par vos clients</CardDescription>
        </CardHeader>
        <CardContent>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Identité affichée
          </CardTitle>
          <CardDescription className="text-xs">Ce qui sera visible sur votre profil public</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayName"
              checked={data.displayDriverName}
              onCheckedChange={(checked) => onUpdate({ displayDriverName: checked as boolean })}
            />
            <Label htmlFor="displayName" className="text-sm cursor-pointer">
              Afficher mon nom ({driverProfile?.full_name || 'Non défini'})
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="displayCompany"
              checked={data.displayCompanyName}
              onCheckedChange={(checked) => onUpdate({ displayCompanyName: checked as boolean })}
            />
            <Label htmlFor="displayCompany" className="text-sm cursor-pointer">
              Afficher mon entreprise
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className={isDescriptionComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Présentation
            {isDescriptionComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complet
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Requis
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">Décrivez votre service (min. 20 caractères)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.serviceDescription}
            onChange={(e) => onUpdate({ serviceDescription: e.target.value })}
            placeholder="Chauffeur VTC professionnel, véhicule haut de gamme, service personnalisé..."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {data.serviceDescription.length}/20 caractères minimum
          </p>
        </CardContent>
      </Card>

      {/* Secteurs */}
      <Card className={isSectorsComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Zones d'activité
            {isSectorsComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complet
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Requis
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">Sélectionnez vos secteurs de travail</CardDescription>
        </CardHeader>
        <CardContent>
          <SectorSelector
            selectedSectors={data.workingSectors}
            onChange={(sectors) => onUpdate({ workingSectors: sectors })}
          />
        </CardContent>
      </Card>

      {/* Adresse de localisation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Adresse de départ
          </CardTitle>
          <CardDescription className="text-xs">Pour la recherche de proximité (non visible)</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Services */}
      <Card className={isServicesComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Services proposés
            {isServicesComplete ? (
              <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complet
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/10 text-warning text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Requis
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Équipements (optionnel)</CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentSelector
            selectedEquipment={data.vehicleEquipment}
            onChange={(equipment) => onUpdate({ vehicleEquipment: equipment })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
