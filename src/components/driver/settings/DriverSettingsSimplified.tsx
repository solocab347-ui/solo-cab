import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Euro, 
  Building2, 
  Car, 
  CreditCard, 
  Save, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  Percent,
  Plane
} from "lucide-react";
import { TvaToggle } from "@/components/pricing/TvaToggle";
import { CityPricingManager } from "@/components/shared/CityPricingManager";
import { DriverPaymentSettings } from "./DriverPaymentSettings";
import { cn } from "@/lib/utils";

interface DriverSettingsSimplifiedProps {
  driverId: string;
  // Pricing
  baseFare: string;
  perKmRate: string;
  hourlyRate: string;
  minimumPrice: string;
  maxPassengers: string;
  tvaIncluded: boolean;
  eveningSurcharge: string;
  weekendSurcharge: string;
  airportSurcharge: string;
  // Company
  companyName: string;
  companyAddress: string;
  siret: string;
  siren: string;
  tvaNumber: string;
  // Vehicle
  vehicleBrand: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
  // Callbacks
  onBaseFareChange: (v: string) => void;
  onPerKmRateChange: (v: string) => void;
  onHourlyRateChange: (v: string) => void;
  onMinimumPriceChange: (v: string) => void;
  onMaxPassengersChange: (v: string) => void;
  onTvaIncludedChange: (v: boolean) => void;
  onEveningSurchargeChange: (v: string) => void;
  onWeekendSurchargeChange: (v: string) => void;
  onAirportSurchargeChange: (v: string) => void;
  onCompanyNameChange: (v: string) => void;
  onCompanyAddressChange: (v: string) => void;
  onSiretChange: (v: string) => void;
  onSirenChange: (v: string) => void;
  onTvaNumberChange: (v: string) => void;
  onVehicleBrandChange: (v: string) => void;
  onVehicleYearChange: (v: string) => void;
  onVehicleColorChange: (v: string) => void;
  onVehiclePlateChange: (v: string) => void;
  onSave: () => void;
  loading: boolean;
  onPaymentUpdate?: () => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  isComplete?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, description, isComplete, defaultOpen = false, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-all",
        isComplete && "border-primary/30 bg-primary/5"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isComplete ? "bg-primary/20" : "bg-primary/10"
                )}>
                  {icon}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {title}
                    {isComplete && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complet
                      </Badge>
                    )}
                  </CardTitle>
                  {description && (
                    <CardDescription className="mt-1">{description}</CardDescription>
                  )}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function DriverSettingsSimplified({
  driverId,
  baseFare,
  perKmRate,
  hourlyRate,
  minimumPrice,
  maxPassengers,
  tvaIncluded,
  eveningSurcharge,
  weekendSurcharge,
  airportSurcharge,
  companyName,
  companyAddress,
  siret,
  siren,
  tvaNumber,
  vehicleBrand,
  vehicleYear,
  vehicleColor,
  vehiclePlate,
  onBaseFareChange,
  onPerKmRateChange,
  onHourlyRateChange,
  onMinimumPriceChange,
  onMaxPassengersChange,
  onTvaIncludedChange,
  onEveningSurchargeChange,
  onWeekendSurchargeChange,
  onAirportSurchargeChange,
  onCompanyNameChange,
  onCompanyAddressChange,
  onSiretChange,
  onSirenChange,
  onTvaNumberChange,
  onVehicleBrandChange,
  onVehicleYearChange,
  onVehicleColorChange,
  onVehiclePlateChange,
  onSave,
  loading,
  onPaymentUpdate
}: DriverSettingsSimplifiedProps) {
  
  // Check completion status
  const isPricingComplete = !!(baseFare && perKmRate && hourlyRate);
  const isCompanyComplete = !!(companyName && (siret || siren) && companyAddress);
  const isVehicleComplete = !!(vehicleBrand && vehiclePlate);

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <Alert className="border-warning bg-warning/10">
        <AlertCircle className="h-5 w-5 text-warning" />
        <AlertTitle className="text-warning font-semibold">Configuration obligatoire</AlertTitle>
        <AlertDescription className="text-sm">
          Complétez tous les paramètres pour générer vos devis et factures automatiquement.
          <span className="block mt-1 text-warning font-medium">
            ⚠️ Des informations manquantes peuvent bloquer vos documents.
          </span>
        </AlertDescription>
      </Alert>

      {/* Floating Save Button */}
      <div className="sticky top-0 z-20 p-3 bg-primary rounded-xl shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Save className="w-5 h-5" />
            <span className="font-semibold text-sm sm:text-base">Enregistrer les modifications</span>
          </div>
          <Button 
            onClick={onSave} 
            disabled={loading} 
            variant="secondary"
            className="font-bold shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Enregistrer</span>
                <span className="sm:hidden">OK</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="pricing" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
            <Euro className="w-4 h-4" />
            <span>Tarifs</span>
            {isPricingComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger value="company" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            <span>Entreprise</span>
            {isCompanyComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
            <Car className="w-4 h-4" />
            <span>Véhicule</span>
            {isVehicleComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
            <CreditCard className="w-4 h-4" />
            <span>Paiement</span>
          </TabsTrigger>
        </TabsList>

        {/* PRICING TAB */}
        <TabsContent value="pricing" className="space-y-4">
          {/* Base Pricing */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Euro className="w-5 h-5 text-primary" />
                Tarifs de base
              </CardTitle>
              <CardDescription>
                Ces tarifs s'appliquent à toutes vos courses par défaut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prise en charge (€)</Label>
                  <NumericInput
                    value={baseFare}
                    onChange={onBaseFareChange}
                    placeholder="10.00"
                    className="font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prix/km (€)</Label>
                  <NumericInput
                    value={perKmRate}
                    onChange={onPerKmRateChange}
                    placeholder="1.50"
                    className="font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tarif horaire (€)</Label>
                  <NumericInput
                    value={hourlyRate}
                    onChange={onHourlyRateChange}
                    placeholder="45.00"
                    className="font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Minimum/course (€)</Label>
                  <NumericInput
                    value={minimumPrice}
                    onChange={onMinimumPriceChange}
                    placeholder="15.00"
                    className="font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Places max</Label>
                  <NumericInput
                    value={maxPassengers}
                    onChange={onMaxPassengersChange}
                    placeholder="4"
                    min={1}
                    max={20}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <TvaToggle
                    checked={tvaIncluded}
                    onCheckedChange={onTvaIncludedChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Surcharges */}
          <CollapsibleSection
            title="Majorations"
            icon={<Percent className="w-5 h-5 text-primary" />}
            description="Soir, weekend, aéroport"
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Soir (%)
                </Label>
                <NumericInput
                  value={eveningSurcharge}
                  onChange={onEveningSurchargeChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">20h-6h</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Weekend (%)</Label>
                <NumericInput
                  value={weekendSurcharge}
                  onChange={onWeekendSurchargeChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">Sam. & Dim.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Aéroport (€)
                </Label>
                <NumericInput
                  value={airportSurcharge}
                  onChange={onAirportSurchargeChange}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">Forfait fixe</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
              💡 Mettez 0 si vous ne souhaitez pas de majoration
            </p>
          </CollapsibleSection>

          {/* City Pricing */}
          <CollapsibleSection
            title="Tarification par ville"
            icon={<MapPin className="w-5 h-5 text-primary" />}
            description="Optionnel - Tarifs spécifiques par ville"
            defaultOpen={false}
          >
            <CityPricingManager 
              driverId={driverId} 
              onSave={onSave}
            />
          </CollapsibleSection>
        </TabsContent>

        {/* COMPANY TAB */}
        <TabsContent value="company" className="space-y-4">
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-primary" />
                Informations légales
              </CardTitle>
              <CardDescription>
                Ces informations apparaissent sur vos devis et factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Nom de l'entreprise *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => onCompanyNameChange(e.target.value)}
                  placeholder="VTC Excellence"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">SIRET (14 chiffres)</Label>
                  <Input
                    value={siret}
                    onChange={(e) => onSiretChange(e.target.value)}
                    placeholder="12345678900012"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">ou SIREN (9 chiffres)</Label>
                  <Input
                    value={siren}
                    onChange={(e) => onSirenChange(e.target.value)}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">N° TVA Intracommunautaire</Label>
                <Input
                  value={tvaNumber}
                  onChange={(e) => onTvaNumberChange(e.target.value)}
                  placeholder="FR12345678901"
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Adresse complète *</Label>
                <Textarea
                  value={companyAddress}
                  onChange={(e) => onCompanyAddressChange(e.target.value)}
                  placeholder="123 Rue de la République, 75001 Paris"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VEHICLE TAB */}
        <TabsContent value="vehicle" className="space-y-4">
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5 text-primary" />
                Informations véhicule
              </CardTitle>
              <CardDescription>
                Visible par vos clients sur votre profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Marque / Modèle *</Label>
                  <Input
                    value={vehicleBrand}
                    onChange={(e) => onVehicleBrandChange(e.target.value)}
                    placeholder="Mercedes Classe E"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Année</Label>
                  <Input
                    value={vehicleYear}
                    onChange={(e) => onVehicleYearChange(e.target.value)}
                    placeholder="2023"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Couleur</Label>
                  <Input
                    value={vehicleColor}
                    onChange={(e) => onVehicleColorChange(e.target.value)}
                    placeholder="Noir"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Immatriculation *</Label>
                  <Input
                    value={vehiclePlate}
                    onChange={(e) => onVehiclePlateChange(e.target.value)}
                    placeholder="AB-123-CD"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT TAB */}
        <TabsContent value="payment" className="space-y-4">
          <DriverPaymentSettings 
            driverId={driverId}
            onUpdate={onPaymentUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DriverSettingsSimplified;
