import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Euro, 
  Building2, 
  Car,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';

interface OnboardingSettingsStepProps {
  data: {
    baseFare: string;
    perKmRate: string;
    hourlyRate: string;
    minimumPrice: string;
    maxPassengers: string;
    tvaIncluded: boolean;
    companyName: string;
    companyAddress: string;
    siret: string;
    siren: string;
    tvaNumber: string;
    vehicleBrand: string;
    vehicleYear: string;
    vehicleColor: string;
    vehiclePlate: string;
  };
  onUpdate: (updates: Partial<OnboardingSettingsStepProps['data']>) => void;
}

export function OnboardingSettingsStep({ data, onUpdate }: OnboardingSettingsStepProps) {
  const isPricingComplete = !!(data.baseFare && data.perKmRate && data.hourlyRate);
  const isCompanyComplete = !!(data.companyName && (data.siret || data.siren) && data.companyAddress);
  const isVehicleComplete = !!(data.vehicleBrand && data.vehiclePlate);

  return (
    <div className="space-y-3">
      {/* Message d'introduction sur la philosophie SoloCab */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Vous fixez vos tarifs</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Sur SoloCab, <strong>c'est vous qui décidez</strong> de vos prix en fonction 
              de votre service et de votre zone. Des tarifs justes = des clients fidèles.
            </p>
          </div>
        </div>
      </div>

      {/* Tarifs */}
      <Card className={isPricingComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Euro className="w-4 h-4 text-primary" />
            Vos tarifs
            {isPricingComplete ? (
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
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prise en charge (€) *</Label>
              <NumericInput
                value={data.baseFare}
                onChange={(v) => onUpdate({ baseFare: v })}
                placeholder="10.00"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prix/km (€) *</Label>
              <NumericInput
                value={data.perKmRate}
                onChange={(v) => onUpdate({ perKmRate: v })}
                placeholder="1.50"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tarif horaire (€) *</Label>
              <NumericInput
                value={data.hourlyRate}
                onChange={(v) => onUpdate({ hourlyRate: v })}
                placeholder="45.00"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Minimum (€)</Label>
              <NumericInput
                value={data.minimumPrice}
                onChange={(v) => onUpdate({ minimumPrice: v })}
                placeholder="15.00"
                className="h-9"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Label className="text-sm">TVA incluse</Label>
            <Switch
              checked={data.tvaIncluded}
              onCheckedChange={(v) => onUpdate({ tvaIncluded: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Entreprise */}
      <Card className={isCompanyComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Votre entreprise
            {isCompanyComplete ? (
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
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Nom de l'entreprise *</Label>
            <Input
              value={data.companyName}
              onChange={(e) => onUpdate({ companyName: e.target.value })}
              placeholder="VTC Excellence"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">SIRET *</Label>
              <Input
                value={data.siret}
                onChange={(e) => onUpdate({ siret: e.target.value })}
                placeholder="14 chiffres"
                maxLength={14}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ou SIREN</Label>
              <Input
                value={data.siren}
                onChange={(e) => onUpdate({ siren: e.target.value })}
                placeholder="9 chiffres"
                maxLength={9}
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">N° TVA (optionnel)</Label>
            <Input
              value={data.tvaNumber}
              onChange={(e) => onUpdate({ tvaNumber: e.target.value })}
              placeholder="FR12345678901"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Adresse *</Label>
            <Input
              value={data.companyAddress}
              onChange={(e) => onUpdate({ companyAddress: e.target.value })}
              placeholder="123 Rue..., 75001 Paris"
              className="h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Véhicule */}
      <Card className={isVehicleComplete ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            Votre véhicule
            {isVehicleComplete ? (
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
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Marque *</Label>
              <Input
                value={data.vehicleBrand}
                onChange={(e) => onUpdate({ vehicleBrand: e.target.value })}
                placeholder="Mercedes"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Année</Label>
              <Input
                value={data.vehicleYear}
                onChange={(e) => onUpdate({ vehicleYear: e.target.value })}
                placeholder="2023"
                maxLength={4}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Couleur</Label>
              <Input
                value={data.vehicleColor}
                onChange={(e) => onUpdate({ vehicleColor: e.target.value })}
                placeholder="Noir"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Plaque *</Label>
              <Input
                value={data.vehiclePlate}
                onChange={(e) => onUpdate({ vehiclePlate: e.target.value })}
                placeholder="AA-123-BB"
                className="h-9 uppercase"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
