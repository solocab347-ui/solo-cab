import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Calculator, TrendingUp, TrendingDown, Minus, Euro, Fuel, Wrench, FileText } from "lucide-react";

export const ProfitabilityCalculator = () => {
  const [inputs, setInputs] = useState({
    monthlyRevenue: '',
    fuelCost: '',
    maintenanceCost: '',
    insuranceCost: '',
    otherCosts: '',
  });

  const calculateProfitability = () => {
    const revenue = parseFloat(inputs.monthlyRevenue) || 0;
    const fuel = parseFloat(inputs.fuelCost) || 0;
    const maintenance = parseFloat(inputs.maintenanceCost) || 0;
    const insurance = parseFloat(inputs.insuranceCost) || 0;
    const other = parseFloat(inputs.otherCosts) || 0;

    const totalCosts = fuel + maintenance + insurance + other;
    const netProfit = revenue - totalCosts;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      totalCosts,
      netProfit,
      profitMargin,
    };
  };

  const results = calculateProfitability();

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">📊 Calcul de Rentabilité</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculez votre rentabilité mensuelle en saisissant vos revenus et dépenses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Données mensuelles
          </h3>

          <div>
            <Label htmlFor="revenue" className="flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Chiffre d'affaires mensuel (€)
            </Label>
            <Input
              id="revenue"
              type="number"
              placeholder="Ex: 3500"
              value={inputs.monthlyRevenue}
              onChange={(e) => setInputs({ ...inputs, monthlyRevenue: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fuel" className="flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Carburant (€)
            </Label>
            <Input
              id="fuel"
              type="number"
              placeholder="Ex: 400"
              value={inputs.fuelCost}
              onChange={(e) => setInputs({ ...inputs, fuelCost: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Entretien véhicule (€)
            </Label>
            <Input
              id="maintenance"
              type="number"
              placeholder="Ex: 150"
              value={inputs.maintenanceCost}
              onChange={(e) => setInputs({ ...inputs, maintenanceCost: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="insurance" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Assurance (€)
            </Label>
            <Input
              id="insurance"
              type="number"
              placeholder="Ex: 200"
              value={inputs.insuranceCost}
              onChange={(e) => setInputs({ ...inputs, insuranceCost: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="other" className="flex items-center gap-2">
              <Minus className="w-4 h-4" />
              Autres frais (€)
            </Label>
            <Input
              id="other"
              type="number"
              placeholder="Ex: 100"
              value={inputs.otherCosts}
              onChange={(e) => setInputs({ ...inputs, otherCosts: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Parking, péages, téléphone, etc.
            </p>
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Chiffre d'affaires */}
          <Card className="p-6 bg-gradient-trust border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80">Chiffre d'affaires</p>
                <h3 className="text-3xl font-bold text-trust-foreground">
                  {results.revenue.toFixed(2)}€
                </h3>
              </div>
            </div>
          </Card>

          {/* Total dépenses */}
          <Card className="p-6 bg-gradient-brown border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brown-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-brown-foreground" />
              </div>
              <div>
                <p className="text-sm text-brown-foreground/80">Total dépenses</p>
                <h3 className="text-3xl font-bold text-brown-foreground">
                  {results.totalCosts.toFixed(2)}€
                </h3>
              </div>
            </div>
          </Card>

          {/* Bénéfice net */}
          <Card className={`p-6 border-0 ${results.netProfit >= 0 ? 'bg-gradient-success' : 'bg-gradient-brown'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${results.netProfit >= 0 ? 'bg-success-foreground/10' : 'bg-brown-foreground/10'}`}>
                <TrendingUp className={`w-6 h-6 ${results.netProfit >= 0 ? 'text-success-foreground' : 'text-brown-foreground'}`} />
              </div>
              <div>
                <p className={`text-sm ${results.netProfit >= 0 ? 'text-success-foreground/80' : 'text-brown-foreground/80'}`}>
                  Bénéfice net
                </p>
                <h3 className={`text-3xl font-bold ${results.netProfit >= 0 ? 'text-success-foreground' : 'text-brown-foreground'}`}>
                  {results.netProfit.toFixed(2)}€
                </h3>
              </div>
            </div>
          </Card>

          {/* Marge bénéficiaire */}
          <Card className={`p-6 border-0 ${results.profitMargin >= 0 ? 'bg-gradient-magenta' : 'bg-gradient-warning'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${results.profitMargin >= 0 ? 'bg-magenta-foreground/10' : 'bg-warning-foreground/10'}`}>
                <Calculator className={`w-6 h-6 ${results.profitMargin >= 0 ? 'text-magenta-foreground' : 'text-warning-foreground'}`} />
              </div>
              <div>
                <p className={`text-sm ${results.profitMargin >= 0 ? 'text-magenta-foreground/80' : 'text-warning-foreground/80'}`}>
                  Marge bénéficiaire
                </p>
                <h3 className={`text-3xl font-bold ${results.profitMargin >= 0 ? 'text-magenta-foreground' : 'text-warning-foreground'}`}>
                  {results.profitMargin.toFixed(1)}%
                </h3>
              </div>
            </div>
          </Card>

          {/* Info */}
          <Card className="p-4 bg-muted">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Conseil:</strong> Une marge bénéficiaire saine se situe entre 20% et 40% pour une activité VTC.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};