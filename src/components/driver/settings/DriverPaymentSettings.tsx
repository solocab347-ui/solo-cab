import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  CreditCard, 
  Banknote, 
  Globe,
  Save,
  Loader2,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StripeConnectCard } from "./StripeConnectCard";
import { DepositSettings } from "./DepositSettings";

const PAYMENT_METHODS = [
  { 
    value: "cash", 
    label: "Espèces", 
    icon: Banknote, 
    description: "Paiement en liquide",
    color: "text-green-600 bg-green-500/10 border-green-500/30"
  },
  { 
    value: "card", 
    label: "Carte bancaire", 
    icon: CreditCard, 
    description: "CB, Visa, Mastercard",
    color: "text-blue-600 bg-blue-500/10 border-blue-500/30"
  },
];

interface DriverPaymentSettingsProps {
  driverId: string;
  onUpdate?: () => void;
}

export function DriverPaymentSettings({ driverId, onUpdate }: DriverPaymentSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptedMethods, setAcceptedMethods] = useState<string[]>(["cash", "card"]);
  const [showPublicly, setShowPublicly] = useState(true);
  const [defaultMethod, setDefaultMethod] = useState<string>("not_specified");
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [driverId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      if (driver) {
        const driverData = driver as any;
        setAcceptedMethods(driverData.accepted_payment_methods || ["cash", "card"]);
        setShowPublicly(driverData.show_payment_methods_publicly ?? true);
        setDefaultMethod(driverData.default_payment_method || "not_specified");
        setStripeConnected(!!driverData.stripe_account_id);
      }
    } catch (error) {
      console.error("Error loading payment settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleMethodToggle = (method: string) => {
    setAcceptedMethods(prev => {
      if (prev.includes(method)) {
        if (prev.length === 1) {
          toast.error("Vous devez conserver au moins un moyen de paiement");
          return prev;
        }
        return prev.filter(m => m !== method);
      }
      return [...prev, method];
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("drivers")
        .update({
          accepted_payment_methods: acceptedMethods,
          billing_type: "solocab_stripe",
          show_payment_methods_publicly: showPublicly,
          default_payment_method: defaultMethod,
          payment_config_updated_at: new Date().toISOString()
        })
        .eq("id", driverId);

      if (error) throw error;

      toast.success("Paramètres de paiement enregistrés !");
      onUpdate?.();
    } catch (error) {
      console.error("Error saving payment settings:", error);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stripe Connect - Section principale */}
      <StripeConnectCard 
        driverId={driverId} 
        onStatusChange={() => {
          loadSettings();
          onUpdate?.();
        }}
      />

      {/* Moyens de paiement acceptés */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Moyens de paiement acceptés
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Sélectionnez les moyens de paiement que vous acceptez
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {PAYMENT_METHODS.map((method) => {
              const IconComponent = method.icon;
              const isChecked = acceptedMethods.includes(method.value);
              
              return (
                <div
                  key={method.value}
                  onClick={() => handleMethodToggle(method.value)}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg border-2 p-2.5 sm:p-3 cursor-pointer transition-all",
                    isChecked 
                      ? `${method.color} border-current` 
                      : "border-muted hover:border-muted-foreground/30",
                  )}
                >
                  <Checkbox 
                    checked={isChecked}
                    className="pointer-events-none"
                  />
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm">{method.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{method.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Méthode par défaut */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-medium">Méthode par défaut</Label>
            <RadioGroup 
              value={defaultMethod} 
              onValueChange={setDefaultMethod}
              className="flex flex-wrap gap-3"
            >
              {acceptedMethods.map((method) => {
                const methodInfo = PAYMENT_METHODS.find(m => m.value === method);
                if (!methodInfo) return null;
                return (
                  <div key={method} className="flex items-center space-x-2">
                    <RadioGroupItem value={method} id={`default-${method}`} />
                    <Label htmlFor={`default-${method}`} className="text-xs sm:text-sm cursor-pointer">
                      {methodInfo.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Visibilité */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <Label htmlFor="show-publicly" className="text-sm font-medium">Afficher sur mon profil</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Les clients verront les moyens de paiement acceptés
              </p>
            </div>
            <Switch
              id="show-publicly"
              checked={showPublicly}
              onCheckedChange={setShowPublicly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Aperçu client */}
      <Card className="border-dashed">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium">Aperçu client</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {acceptedMethods.map((method) => {
              const methodInfo = PAYMENT_METHODS.find(m => m.value === method);
              if (!methodInfo) return null;
              const IconComponent = methodInfo.icon;
              return (
                <Badge 
                  key={method} 
                  variant="outline" 
                  className={cn("gap-1.5 text-xs", methodInfo.color)}
                >
                  <IconComponent className="h-3 w-3" />
                  {methodInfo.label}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deposit Settings */}
      <DepositSettings
        driverId={driverId}
        stripeConnected={stripeConnected}
        onUpdate={onUpdate}
      />

      {/* Bouton Enregistrer */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enregistrement...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer les paramètres
          </>
        )}
      </Button>
    </div>
  );
}

export default DriverPaymentSettings;
