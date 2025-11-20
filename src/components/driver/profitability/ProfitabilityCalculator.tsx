import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Calculator, Car, Fuel, Euro, TrendingUp, AlertTriangle, FileText } from "lucide-react";

export const ProfitabilityCalculator = () => {
  const [formData, setFormData] = useState({
    // Forme juridique
    legalForm: 'micro-entreprise',
    
    // Véhicule
    vehicleType: 'thermique',
    vehicleValue: '35000',
    vehicleBrand: '',
    vehicleModel: '',
    vehiclePlate: '',
    
    // Paramètres généraux
    totalKmPerYear: '47200',
    billableKmPerYear: '35400',
    
    // Carburant/énergie
    consumption: '6', // l/100km ou kWh/100km
    fuelCost: '2', // €/l ou €/kWh
    
    // Chiffre d'affaires
    annualRevenue: '30000',
    
    // Assurances
    rcpMonthly: '30',
    rccMonthly: '5',
    
    // Entretien
    annualMaintenance: '6000',
    
    // Amortissement
    depreciationYears: '5',
    
    // Marge
    profitMargin: '0.10',
  });

  const [results, setResults] = useState<any>(null);

  const calculateProfitability = () => {
    // Conversions
    const totalKm = parseFloat(formData.totalKmPerYear) || 0;
    const billableKm = parseFloat(formData.billableKmPerYear) || 0;
    const consumption = parseFloat(formData.consumption) || 0;
    const fuelCost = parseFloat(formData.fuelCost) || 0;
    const vehicleValue = parseFloat(formData.vehicleValue) || 0;
    const depreciationYears = parseFloat(formData.depreciationYears) || 5;
    const annualRevenue = parseFloat(formData.annualRevenue) || 0;
    const rcpMonthly = parseFloat(formData.rcpMonthly) || 0;
    const rccMonthly = parseFloat(formData.rccMonthly) || 0;
    const annualMaintenance = parseFloat(formData.annualMaintenance) || 0;
    const profitMarginRate = parseFloat(formData.profitMargin) || 0;

    // 1. Coût carburant/énergie annuel
    const fuelCostPerYear = (totalKm / 100) * consumption * fuelCost;

    // 2. Coût variable par km (hors amortissement/fixes)
    const variableCostPerKm = fuelCostPerYear / totalKm;

    // 3. Assurances annuelles
    const rcpAnnual = rcpMonthly * 12;
    const rccAnnual = rccMonthly * 12;
    const totalInsuranceAnnual = rcpAnnual + rccAnnual;

    // 4. Amortissement annuel
    const annualDepreciation = vehicleValue / depreciationYears;

    // 5. Charges sociales micro-entreprise (~22% du CA)
    const socialCharges = annualRevenue * 0.22;

    // 6. Coûts fixes annuels
    const totalFixedCosts = totalInsuranceAnnual + annualMaintenance + annualDepreciation + socialCharges;

    // 7. Coût fixe par km
    const fixedCostPerKm = billableKm > 0 ? totalFixedCosts / billableKm : 0;

    // 8. Coût variable total par km (incluant amortissement distribué)
    const variableCostPerKmWithDepreciation = variableCostPerKm + (annualDepreciation / totalKm);

    // 9. Coût global par km
    const totalCostPerKm = variableCostPerKm + fixedCostPerKm;

    // 10. Tarif minimal facturable (sans marge)
    const minPrice = totalCostPerKm;

    // 11. Tarif conseillé (avec marge)
    const recommendedPrice = minPrice * (1 + profitMarginRate);

    setResults({
      fuelCostPerYear: fuelCostPerYear.toFixed(2),
      variableCostPerKm: variableCostPerKm.toFixed(3),
      variableCostPerKmWithDepreciation: variableCostPerKmWithDepreciation.toFixed(3),
      fixedCostPerKm: fixedCostPerKm.toFixed(3),
      totalCostPerKm: totalCostPerKm.toFixed(3),
      minPrice: minPrice.toFixed(3),
      recommendedPrice: recommendedPrice.toFixed(3),
      rcpAnnual: rcpAnnual.toFixed(2),
      rccAnnual: rccAnnual.toFixed(2),
      annualDepreciation: annualDepreciation.toFixed(2),
      socialCharges: socialCharges.toFixed(2),
    });
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Calculateur de Rentabilité VTC
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Saisissez vos informations pour déterminer un tarif minimal et un tarif conseillé avec marge
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="space-y-6">
          {/* Forme juridique */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Forme juridique
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Choisissez votre forme juridique :</Label>
                <Select value={formData.legalForm} onValueChange={(value) => setFormData({ ...formData, legalForm: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro-entreprise">Micro-entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Avertissement micro-entreprise :</strong>
                  <ul className="list-disc ml-4 mt-2 text-sm space-y-1">
                    <li>Franchise de TVA possible sous un certain seuil (72 500 € pour VTC)</li>
                    <li>Charges sociales simplifiées (~22%), pas de fiche de paie mensuelle</li>
                    <li>Les charges sociales sont automatiquement prises en compte dans le calcul global</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </Card>

          {/* Informations véhicule */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Car className="w-5 h-5" />
              Informations véhicule
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Type de véhicule :</Label>
                <Select value={formData.vehicleType} onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermique">Thermique</SelectItem>
                    <SelectItem value="electrique">Électrique</SelectItem>
                    <SelectItem value="hybride">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valeur neuve du véhicule (€) :</Label>
                <Input
                  type="number"
                  value={formData.vehicleValue}
                  onChange={(e) => setFormData({ ...formData, vehicleValue: e.target.value })}
                  placeholder="35000"
                />
              </div>

              <div>
                <Label>Marque :</Label>
                <Input
                  value={formData.vehicleBrand}
                  onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
                  placeholder="exemplemarque"
                />
              </div>

              <div>
                <Label>Modèle :</Label>
                <Input
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  placeholder="exemplemodèle"
                />
              </div>

              <div>
                <Label>Plaque d'immatriculation :</Label>
                <Input
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                  placeholder="XX-123-YY"
                />
              </div>
            </div>
          </Card>

          {/* Paramètres généraux */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Paramètres généraux</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Kilométrage total annuel (incluant trajets à vide) :</Label>
                <Input
                  type="number"
                  value={formData.totalKmPerYear}
                  onChange={(e) => setFormData({ ...formData, totalKmPerYear: e.target.value })}
                  placeholder="47200"
                />
              </div>

              <div>
                <Label>Kilométrage facturable annuel (estimation) :</Label>
                <Input
                  type="number"
                  value={formData.billableKmPerYear}
                  onChange={(e) => setFormData({ ...formData, billableKmPerYear: e.target.value })}
                  placeholder="35400"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Estimation : en général, environ 60% du kilométrage total annuel, après déduction des trajets domicile–zone de travail aller-retour, kilomètres à vide, etc.
                </p>
              </div>
            </div>
          </Card>

          {/* Carburant/énergie */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Fuel className="w-5 h-5" />
              Carburant / énergie
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Consommation (L/100 km ou kWh/100 km) :</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.consumption}
                  onChange={(e) => setFormData({ ...formData, consumption: e.target.value })}
                  placeholder="6"
                />
              </div>

              <div>
                <Label>Coût du carburant/énergie (€/L ou €/kWh) :</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fuelCost}
                  onChange={(e) => setFormData({ ...formData, fuelCost: e.target.value })}
                  placeholder="2"
                />
              </div>
            </div>
          </Card>

          {/* CA et charges */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Micro-entreprise : chiffre d'affaires</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Chiffre d'affaires annuel estimé (en €) :</Label>
                <Input
                  type="number"
                  value={formData.annualRevenue}
                  onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                  placeholder="30000"
                />
              </div>
            </div>
          </Card>

          {/* Assurances */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Micro-entreprise : entretien & assurances</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Assurance RCP (mensuel) :</Label>
                <Input
                  type="number"
                  value={formData.rcpMonthly}
                  onChange={(e) => setFormData({ ...formData, rcpMonthly: e.target.value })}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ({(parseFloat(formData.rcpMonthly) * 12).toFixed(2)} €/an)
                </p>
              </div>

              <div>
                <Label>Assurance RCC (mensuel) :</Label>
                <Input
                  type="number"
                  value={formData.rccMonthly}
                  onChange={(e) => setFormData({ ...formData, rccMonthly: e.target.value })}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ({(parseFloat(formData.rccMonthly) * 12).toFixed(2)} €/an)
                </p>
              </div>

              <div>
                <Label>Entretien & réparations annuel :</Label>
                <Input
                  type="number"
                  value={formData.annualMaintenance}
                  onChange={(e) => setFormData({ ...formData, annualMaintenance: e.target.value })}
                  placeholder="6000"
                />
              </div>
            </div>
          </Card>

          {/* Amortissement */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Amortissement du véhicule</h3>
            
            <div>
              <Label>Nombre d'années d'amortissement :</Label>
              <Input
                type="number"
                value={formData.depreciationYears}
                onChange={(e) => setFormData({ ...formData, depreciationYears: e.target.value })}
                placeholder="5"
              />
            </div>
          </Card>

          {/* Marge */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Marge bénéficiaire</h3>
            
            <div>
              <Label>Taux de marge souhaité (ex. 0.10 pour 10%) :</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.profitMargin}
                onChange={(e) => setFormData({ ...formData, profitMargin: e.target.value })}
                placeholder="0.10"
              />
            </div>
          </Card>

          <Button onClick={calculateProfitability} className="w-full" size="lg">
            <Calculator className="w-4 h-4 mr-2" />
            Calculer
          </Button>
        </div>

        {/* Résultats */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Résultats
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Coût carburant/énergie :</span>
                <span className="font-bold">{results?.fuelCostPerYear || '--'} €/an</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Coût variables par km (hors amortissement/fixes) :</span>
                <span className="font-bold">{results?.variableCostPerKm || '--'} €/km</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Coût variable total par km :</span>
                <span className="font-bold">{results?.variableCostPerKmWithDepreciation || '--'} €/km</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-medium">Coût fixe par km :</span>
                <span className="font-bold">{results?.fixedCostPerKm || '--'} €/km</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 rounded">
                <span className="text-sm font-bold">Coût global par km :</span>
                <span className="font-bold text-lg">{results?.totalCostPerKm || '--'} €/km</span>
              </div>

              <div className="flex justify-between items-center py-3 bg-gradient-warning rounded-lg px-4 mt-4">
                <span className="text-sm font-bold text-warning-foreground">Tarif minimal facturable :</span>
                <span className="font-bold text-xl text-warning-foreground">{results?.minPrice || '--'} €/km</span>
              </div>

              <div className="flex justify-between items-center py-3 bg-gradient-success rounded-lg px-4">
                <span className="text-sm font-bold text-success-foreground">Tarif conseillé (avec marge) :</span>
                <span className="font-bold text-xl text-success-foreground">{results?.recommendedPrice || '--'} €/km</span>
              </div>
            </div>

            {results && (
              <div className="mt-6 pt-6 border-t space-y-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Détail des coûts fixes annuels :</strong>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  <li>• Assurance RCP : {results.rcpAnnual} €/an</li>
                  <li>• Assurance RCC : {results.rccAnnual} €/an</li>
                  <li>• Entretien & réparations : {formData.annualMaintenance} €/an</li>
                  <li>• Amortissement véhicule : {results.annualDepreciation} €/an</li>
                  <li>• Charges sociales (22%) : {results.socialCharges} €/an</li>
                </ul>
              </div>
            )}
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              💡 <strong>Conseil :</strong> Le tarif conseillé inclut votre marge bénéficiaire souhaitée. 
              Assurez-vous que ce tarif reste compétitif dans votre secteur tout en couvrant l'ensemble de vos coûts.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};
