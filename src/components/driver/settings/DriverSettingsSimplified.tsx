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
  onSave,
  loading,
  onPaymentUpdate
}: DriverSettingsSimplifiedProps) {
  
  // Check completion status
  const isPricingComplete = !!(baseFare && perKmRate && hourlyRate);
  const isCompanyComplete = !!(companyName && (siret || siren) && companyAddress);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Warning Banner - Compact on mobile */}
      <Alert className="border-warning bg-warning/10 p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <AlertTitle className="text-warning font-semibold text-sm sm:text-base">Configuration obligatoire</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              Complétez les paramètres pour vos devis et factures.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Floating Save Button - Compact */}
      <div className="sticky top-0 z-20 p-2 sm:p-3 bg-primary rounded-lg sm:rounded-xl shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-semibold text-xs sm:text-sm">Enregistrer</span>
          </div>
          <Button 
            onClick={onSave} 
            disabled={loading} 
            variant="secondary"
            size="sm"
            className="font-bold shadow-md"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">OK</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Tabs - 3 columns now */}
      <Tabs defaultValue="pricing" className="space-y-3 sm:space-y-4">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/50">
          <TabsTrigger value="pricing" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-2 text-xs sm:text-sm data-[state=active]:bg-background">
            <Euro className="w-4 h-4" />
            <span>Tarifs</span>
            {isPricingComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger value="company" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-2 text-xs sm:text-sm data-[state=active]:bg-background">
            <Building2 className="w-4 h-4" />
            <span>Entreprise</span>
            {isCompanyComplete && <CheckCircle2 className="w-3 h-3 text-primary hidden sm:block" />}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-2 text-xs sm:text-sm data-[state=active]:bg-background">
            <CreditCard className="w-4 h-4" />
            <span>Paiement</span>
          </TabsTrigger>
        </TabsList>

        {/* PRICING TAB */}
        <TabsContent value="pricing" className="space-y-3 sm:space-y-4">
          {/* Base Pricing */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Euro className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Tarifs de base
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Appliqués à toutes vos courses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {/* Grid 2x2 sur mobile et desktop */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Prise en charge (€)</Label>
                  <NumericInput
                    value={baseFare}
                    onChange={onBaseFareChange}
                    placeholder="10.00"
                    className="font-semibold h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Prix/km (€)</Label>
                  <NumericInput
                    value={perKmRate}
                    onChange={onPerKmRateChange}
                    placeholder="1.50"
                    className="font-semibold h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Tarif horaire (€)</Label>
                  <NumericInput
                    value={hourlyRate}
                    onChange={onHourlyRateChange}
                    placeholder="45.00"
                    className="font-semibold h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Minimum (€)</Label>
                  <NumericInput
                    value={minimumPrice}
                    onChange={onMinimumPriceChange}
                    placeholder="15.00"
                    className="font-semibold h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>

              {/* Places max + TVA */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2 border-t border-border/30">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-medium">Places max</Label>
                  <NumericInput
                    value={maxPassengers}
                    onChange={onMaxPassengersChange}
                    placeholder="4"
                    min={1}
                    max={20}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="flex items-end">
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
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">Soir (%)</span>
                </Label>
                <NumericInput
                  value={eveningSurcharge}
                  onChange={onEveningSurchargeChange}
                  placeholder="0"
                  className="h-9 sm:h-10 text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">20h-6h</p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium truncate">Weekend (%)</Label>
                <NumericInput
                  value={weekendSurcharge}
                  onChange={onWeekendSurchargeChange}
                  placeholder="0"
                  className="h-9 sm:h-10 text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sam. & Dim.</p>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                  <Plane className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">Aéro. (€)</span>
                </Label>
                <NumericInput
                  value={airportSurcharge}
                  onChange={onAirportSurchargeChange}
                  placeholder="0"
                  className="h-9 sm:h-10 text-sm"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Forfait</p>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
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
        <TabsContent value="company" className="space-y-3 sm:space-y-4">
          <Card className="bg-gradient-to-br from-card to-card/80 border-primary/20">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Informations légales
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Apparaissent sur vos devis et factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div className="space-y-1 sm:space-y-2">
                <Label className="font-medium text-sm">Nom entreprise *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => onCompanyNameChange(e.target.value)}
                  placeholder="VTC Excellence"
                  className="h-9 sm:h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="font-medium text-xs sm:text-sm">SIRET</Label>
                  <Input
                    value={siret}
                    onChange={(e) => onSiretChange(e.target.value)}
                    placeholder="14 chiffres"
                    maxLength={14}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="font-medium text-xs sm:text-sm">ou SIREN</Label>
                  <Input
                    value={siren}
                    onChange={(e) => onSirenChange(e.target.value)}
                    placeholder="9 chiffres"
                    maxLength={9}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label className="font-medium text-sm">N° TVA Intracom.</Label>
                <Input
                  value={tvaNumber}
                  onChange={(e) => onTvaNumberChange(e.target.value)}
                  placeholder="FR12345678901"
                  maxLength={15}
                  className="h-9 sm:h-10"
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label className="font-medium text-sm">Adresse *</Label>
                <Textarea
                  value={companyAddress}
                  onChange={(e) => onCompanyAddressChange(e.target.value)}
                  placeholder="123 Rue de la République, 75001 Paris"
                  rows={2}
                  className="text-sm resize-none"
                />
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
