import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  ExternalLink, 
  Loader2,
  Share2,
  CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface StripeConnectRequiredAlertProps {
  context: "sharing" | "online_payment";
  onComplete?: () => void;
}

export function StripeConnectRequiredAlert({ context, onComplete }: StripeConnectRequiredAlertProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Redirection vers Stripe...");
        onComplete?.();
      }
    } catch (err: any) {
      console.error("Stripe Connect error:", err);
      toast.error(err.message || "Erreur lors de la connexion Stripe");
    } finally {
      setConnecting(false);
    }
  };

  const getContent = () => {
    switch (context) {
      case "sharing":
        return {
          icon: Share2,
          title: "Stripe Connect requis pour le partage",
          description: "Pour partager des courses avec vos partenaires et recevoir des frais de transaction automatiques, vous devez connecter votre compte Stripe.",
          buttonText: "Configurer Stripe Connect",
        };
      case "online_payment":
        return {
          icon: CreditCard,
          title: "Stripe Connect requis pour les paiements en ligne",
          description: "Pour encaisser vos clients en ligne via SoloCab, vous devez connecter votre compte Stripe Express.",
          buttonText: "Activer les paiements en ligne",
        };
      default:
        return {
          icon: AlertTriangle,
          title: "Configuration Stripe requise",
          description: "Veuillez configurer votre compte Stripe pour continuer.",
          buttonText: "Configurer Stripe",
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <Alert className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
      <Icon className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-700 font-semibold">{content.title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-amber-600/90 text-sm">{content.description}</p>
        
        <div className="bg-white/50 rounded-lg p-3 text-xs text-amber-700 space-y-1">
          <p>✓ Inscription gratuite et rapide (2 min)</p>
          <p>✓ Vérification d'identité sécurisée par Stripe</p>
          <p>✓ Virements directs sur votre compte bancaire</p>
          {context === "sharing" && (
            <p>✓ Frais de transaction automatiques entre partenaires</p>
          )}
        </div>

        <Button 
          onClick={handleConnect}
          disabled={connecting}
          className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              {content.buttonText}
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default StripeConnectRequiredAlert;
