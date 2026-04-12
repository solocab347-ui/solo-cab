import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import { SingleProfilePhotoUpload } from './SingleProfilePhotoUpload';
import { SectorSelector } from '../SectorSelector';
import { ServicesSelector } from '../ServicesSelector';
import { EquipmentSelector } from '../vehicles/EquipmentSelector';
import { VehicleCategorySelector } from '../vehicles/VehicleCategorySelector';
import { 
  Camera, 
  MapPin, 
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  };
  driverProfile: any;
  userId: string;
  onUpdate: (updates: Partial<OnboardingProfileStepProps['data']>) => void;
}

function SectionHeader({ icon: Icon, title, complete }: { icon: any; title: string; complete?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {complete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
    </div>
  );
}

export function OnboardingProfileStep({ data, driverProfile, userId, onUpdate }: OnboardingProfileStepProps) {
  const isPhotoComplete = !!data.profilePhotoUrl;
  const isDescriptionComplete = !!data.serviceDescription && data.serviceDescription.length >= 20;
  const isSectorsComplete = data.workingSectors.length > 0;
  const isServicesComplete = data.servicesOffered.length > 0;

  return (
    <div className="space-y-5">
      {/* Photo */}
      <div>
        <SectionHeader icon={Camera} title="Photo de profil" complete={isPhotoComplete} />
        <p className="text-xs text-muted-foreground mb-3">Utilisée sur ton profil public et ta carte chauffeur</p>
        <SingleProfilePhotoUpload
          currentPhotoUrl={data.profilePhotoUrl}
          userId={userId}
          driverName={driverProfile?.full_name || 'Chauffeur'}
          onPhotoUpdate={(url) => onUpdate({ profilePhotoUrl: url, cardPhotoUrl: url })}
        />
      </div>

      {/* Identity display - minimal toggles */}
      <div>
        <SectionHeader icon={Briefcase} title="Identité affichée" />
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <Label htmlFor="displayName" className="text-xs cursor-pointer flex-1">
              Afficher mon nom ({driverProfile?.full_name || 'Non défini'})
            </Label>
            <Switch
              id="displayName"
              checked={data.displayDriverName}
              onCheckedChange={(checked) => onUpdate({ displayDriverName: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <Label htmlFor="displayCompany" className="text-xs cursor-pointer flex-1">
              Afficher le nom de mon entreprise
            </Label>
            <Switch
              id="displayCompany"
              checked={data.displayCompanyName}
              onCheckedChange={(checked) => onUpdate({ displayCompanyName: checked })}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <SectionHeader icon={Briefcase} title="Présentation" complete={isDescriptionComplete} />
        <Textarea
          value={data.serviceDescription}
          onChange={(e) => onUpdate({ serviceDescription: e.target.value })}
          placeholder="Chauffeur VTC professionnel, véhicule haut de gamme..."
          rows={2}
          className="resize-none text-sm"
        />
        <p className={cn(
          "text-[10px] mt-1",
          isDescriptionComplete ? "text-muted-foreground" : "text-amber-500"
        )}>
          {data.serviceDescription.length}/20 caractères min.
        </p>
      </div>

      {/* Sectors */}
      <div>
        <SectionHeader icon={MapPin} title="Zones d'activité" complete={isSectorsComplete} />
        <SectorSelector
          selectedSectors={data.workingSectors}
          onChange={(sectors) => onUpdate({ workingSectors: sectors })}
        />
      </div>


      {/* Services */}
      <div>
        <SectionHeader icon={Briefcase} title="Services proposés" complete={isServicesComplete} />
        <ServicesSelector
          selectedServices={data.servicesOffered}
          onChange={(services) => onUpdate({ servicesOffered: services })}
        />
      </div>

      {/* Vehicle categories */}
      <VehicleCategorySelector
        selectedCategories={data.vehicleCategories}
        onChange={(categories) => onUpdate({ vehicleCategories: categories })}
      />

      {/* Equipment - optional */}
      <div>
        <SectionHeader icon={Briefcase} title="Équipements (optionnel)" />
        <EquipmentSelector
          selectedEquipment={data.vehicleEquipment}
          onChange={(equipment) => onUpdate({ vehicleEquipment: equipment })}
        />
      </div>
    </div>
  );
}
