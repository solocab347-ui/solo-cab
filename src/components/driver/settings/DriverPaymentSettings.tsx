import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Banknote, 
  Building2, 
  Wallet, 
  CheckCircle2, 
  Settings2,
  Smartphone,
  Globe,
  Save,
  Loader2,
  Info,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  { 
    value: "transfer", 
    label: "Virement", 
    icon: Building2, 
    description: "Virement bancaire",
    color: "text-purple-600 bg-purple-500/10 border-purple-500/30"
  },
  { 
    value: "check", 
    label: "Chèque", 
    icon: Wallet, 
    description: "Paiement par chèque",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/30"
  },
  { 
    value: "other", 
    label: "Autre", 
    icon: Settings2, 
    description: "Autre moyen de paiement",
    color: "text-gray-600 bg-gray-500/10 border-gray-500/30"
  },
];

const BILLING_TYPES = [
  {
    value: "own_equipment",
    label: "Mon propre matériel",
    description: "Vous disposez de votre propre TPE, terminal de paiement ou solution d'encaissement",
    icon: Smartphone,
    features: ["TPE personnel", "Facturation autonome", "Gestion indépendante"]
  },
  {
    value: "solocab_stripe",
    label: "SoloCab Stripe Connect",
    description: "Encaissements en ligne via la plateforme SoloCab avec Stripe",
    icon: Zap,
    features: ["Paiement en ligne CB", "Gestion automatisée", "Commission optimisée"]
  }
];

interface DriverPaymentSettingsProps {
  driverId: string;
  onUpdate?: () => void;
}

export function DriverPaymentSettings({ driverId, onUpdate }: DriverPaymentSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptedMethods, setAcceptedMethods] = useState<string[]>(["cash", "card", "transfer"]);
  const [billingType, setBillingType] = useState<string>("own_equipment");
  const [showPublicly, setShowPublicly] = useState(true);
  const [defaultMethod, setDefaultMethod] = useState<string>("not_specified");
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [driverId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load driver payment settings - use any to bypass strict typing for new columns
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      if (driver) {
        const driverData = driver as any;
        setAcceptedMethods(driverData.accepted_payment_methods || ["cash", "card", "transfer"]);
        setBillingType(driverData.billing_type || "own_equipment");
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
        // Ensure at least one method remains
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

      // Validate: if solocab_stripe, must have card method and stripe connected
      if (billingType === "solocab_stripe" && !acceptedMethods.includes("card")) {
        toast.error("Le mode SoloCab Stripe nécessite d'accepter la carte bancaire");
        return;
      }

      const { error } = await supabase
        .from("drivers")
        .update({
          accepted_payment_methods: acceptedMethods,
          billing_type: billingType,
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
    <div className="space-y-6">
      {/* Billing Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Type de facturation
          </CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez gérer vos encaissements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={billingType} onValueChange={setBillingType} className="space-y-4">
            {BILLING_TYPES.map((type) => {
              const IconComponent = type.icon;
              const isSelected = billingType === type.value;
              const isStripeDisabled = type.value === "solocab_stripe" && !stripeConnected;
              
              return (
                <div key={type.value} className="relative">
                  <RadioGroupItem
                    value={type.value}
                    id={`billing-${type.value}`}
                    className="peer sr-only"
                    disabled={isStripeDisabled}
                  />
                  <Label
                    htmlFor={`billing-${type.value}`}
                    className={cn(
                      "flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/30",
                      isStripeDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "rounded-lg p-3",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{type.label}</span>
                        {isSelected && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {type.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Label>
                  
                  {isStripeDisabled && (
                    <Alert className="mt-2 border-amber-500/30 bg-amber-500/10">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-600 text-sm">
                        Connectez votre compte Stripe Connect pour activer cette option
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Accepted Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Moyens de paiement acceptés
          </CardTitle>
          <CardDescription>
            Sélectionnez les moyens de paiement que vous acceptez
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const IconComponent = method.icon;
              const isChecked = acceptedMethods.includes(method.value);
              const isCardRequired = billingType === "solocab_stripe" && method.value === "card";
              
              return (
                <div
                  key={method.value}
                  onClick={() => !isCardRequired && handleMethodToggle(method.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all",
                    isChecked 
                      ? `${method.color} border-current` 
                      : "border-muted hover:border-muted-foreground/30",
                    isCardRequired && "cursor-not-allowed"
                  )}
                >
                  <Checkbox 
                    checked={isChecked}
                    disabled={isCardRequired}
                    className="pointer-events-none"
                  />
                  <IconComponent className="h-5 w-5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                  {isCardRequired && (
                    <Badge variant="secondary" className="text-xs">Requis</Badge>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Default Payment Method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Méthode par défaut suggérée</Label>
            <RadioGroup 
              value={defaultMethod} 
              onValueChange={setDefaultMethod}
              className="flex flex-wrap gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_specified" id="default-none" />
                <Label htmlFor="default-none" className="text-sm cursor-pointer">
                  Non précisé
                </Label>
              </div>
              {acceptedMethods.map((method) => {
                const methodInfo = PAYMENT_METHODS.find(m => m.value === method);
                if (!methodInfo) return null;
                return (
                  <div key={method} className="flex items-center space-x-2">
                    <RadioGroupItem value={method} id={`default-${method}`} />
                    <Label htmlFor={`default-${method}`} className="text-sm cursor-pointer">
                      {methodInfo.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Visibilité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-publicly">Afficher sur mon profil public</Label>
              <p className="text-sm text-muted-foreground">
                Les clients verront les moyens de paiement acceptés sur votre vitrine
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

      {/* Preview */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Aperçu client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {acceptedMethods.map((method) => {
              const methodInfo = PAYMENT_METHODS.find(m => m.value === method);
              if (!methodInfo) return null;
              const IconComponent = methodInfo.icon;
              return (
                <Badge 
                  key={method} 
                  variant="outline" 
                  className={cn("gap-1.5", methodInfo.color)}
                >
                  <IconComponent className="h-3 w-3" />
                  {methodInfo.label}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
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
