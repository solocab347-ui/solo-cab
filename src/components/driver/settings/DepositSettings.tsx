import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Percent, 
  Shield, 
  Users, 
  UserPlus,
  Save,
  Loader2,
  Info,
  AlertTriangle,
  CheckCircle2,
  Banknote
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DepositSettingsProps {
  driverId: string;
  stripeConnected: boolean;
  onUpdate?: () => void;
}

const DEPOSIT_RULES = [
  {
    value: "none",
    label: "Aucun acompte",
    description: "Pas d'acompte requis pour les réservations",
    icon: Banknote,
  },
  {
    value: "new_clients",
    label: "Nouveaux clients uniquement",
    description: "Acompte requis seulement pour les clients qui n'ont jamais réservé",
    icon: UserPlus,
  },
  {
    value: "all",
    label: "Tous les clients",
    description: "Acompte requis pour toutes les réservations",
    icon: Users,
  },
];

export function DepositSettings({ driverId, stripeConnected, onUpdate }: DepositSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState(20);
  const [depositRequiredFor, setDepositRequiredFor] = useState<string>("none");

  useEffect(() => {
    loadSettings();
  }, [driverId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("deposit_enabled, deposit_percentage, deposit_required_for")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      if (driver) {
        const driverData = driver as any;
        setDepositEnabled(driverData.deposit_enabled || false);
        setDepositPercentage(driverData.deposit_percentage || 20);
        setDepositRequiredFor(driverData.deposit_required_for || "none");
      }
    } catch (error) {
      console.error("Error loading deposit settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!stripeConnected && depositEnabled) {
      toast.error("Vous devez configurer Stripe Connect pour activer les acomptes");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("drivers")
        .update({
          deposit_enabled: depositEnabled,
          deposit_percentage: depositPercentage,
          deposit_required_for: depositRequiredFor,
        })
        .eq("id", driverId);

      if (error) throw error;

      toast.success("Paramètres d'acompte enregistrés !");
      onUpdate?.();
    } catch (error) {
      console.error("Error saving deposit settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Example calculation
  const exampleCoursePrice = 50;
  const exampleDeposit = (exampleCoursePrice * depositPercentage) / 100;
  const exampleRemaining = exampleCoursePrice - exampleDeposit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Percent className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Acomptes clients</CardTitle>
            <CardDescription>
              Sécurisez vos réservations avec des acomptes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stripe Connect Warning */}
        {!stripeConnected && (
          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Stripe Connect requis</AlertTitle>
            <AlertDescription className="text-warning/80">
              Vous devez d'abord configurer Stripe Connect pour pouvoir encaisser des acomptes en ligne.
            </AlertDescription>
          </Alert>
        )}

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label htmlFor="deposit-enabled" className="text-base font-medium">
              Activer les acomptes
            </Label>
            <p className="text-sm text-muted-foreground">
              Demander un acompte au moment de la réservation
            </p>
          </div>
          <Switch
            id="deposit-enabled"
            checked={depositEnabled}
            onCheckedChange={setDepositEnabled}
            disabled={!stripeConnected}
          />
        </div>

        {depositEnabled && (
          <>
            <Separator />

            {/* Percentage Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Pourcentage de l'acompte</Label>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {depositPercentage}%
                </Badge>
              </div>
              
              <Slider
                value={[depositPercentage]}
                onValueChange={(value) => setDepositPercentage(value[0])}
                min={10}
                max={30}
                step={5}
                className="py-4"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10% minimum</span>
                <span>30% maximum</span>
              </div>

              {/* Example Calculation */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium mb-2">Exemple pour une course à {exampleCoursePrice}€ :</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acompte :</span>
                    <span className="font-medium text-primary">{exampleDeposit.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reste à payer :</span>
                    <span className="font-medium">{exampleRemaining.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Deposit Rules */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Quand demander l'acompte ?</Label>
              
              <RadioGroup 
                value={depositRequiredFor} 
                onValueChange={setDepositRequiredFor}
                className="space-y-3"
              >
                {DEPOSIT_RULES.map((rule) => {
                  const IconComponent = rule.icon;
                  const isSelected = depositRequiredFor === rule.value;
                  
                  return (
                    <div key={rule.value}>
                      <RadioGroupItem
                        value={rule.value}
                        id={`rule-${rule.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`rule-${rule.value}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-muted-foreground/30"
                        )}
                      >
                        <div className={cn(
                          "rounded-lg p-2",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{rule.label}</span>
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <Separator />

            {/* Policy Info */}
            <Alert className="border-primary/30 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Politique de remboursement</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>Si vous annulez</strong> : l'acompte est remboursé intégralement au client</p>
                <p>• <strong>Si le client annule</strong> : l'acompte vous est acquis (protection no-show)</p>
                <p>• <strong>Course réalisée</strong> : l'acompte est déduit du solde à percevoir</p>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || (!stripeConnected && depositEnabled)}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default DepositSettings;
