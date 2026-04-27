import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Zap,
  Euro,
  Shield,
  RefreshCw,
  Info,
  Calculator
} from "lucide-react";
import { useStripeConnectStatus } from "@/hooks/useStripeConnectStatus";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/openExternalUrl";

interface StripeConnectInfoProps {
  driverId: string;
  billingType: string;
  onStatusChange?: () => void;
}

export function StripeConnectInfo({ driverId, billingType, onStatusChange }: StripeConnectInfoProps) {
  const { status, loading, isReady, isPending, isNotConnected, refresh } = useStripeConnectStatus(driverId);
  const [connecting, setConnecting] = useState(false);

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");
      
      if (error) throw error;
      
      if (data?.url) {
        await openExternalUrl(data.url, {
          onClose: () => {
            toast.info("Vérification de votre compte Stripe...");
            refresh();
            onStatusChange?.();
          },
        });
        toast.success("Redirection vers Stripe...");
      }
    } catch (err: any) {
      console.error("Stripe Connect error:", err);
      toast.error(err.message || "Erreur lors de la connexion Stripe");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    await refresh();
    onStatusChange?.();
    toast.success("Statut mis à jour");
  };

  // Stripe is now mandatory for all drivers - no billing type check needed

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          SoloCab Stripe Connect
        </CardTitle>
        <CardDescription>
          Encaissez vos clients en ligne directement sur votre compte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isReady ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : isPending ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">
              {loading ? "Vérification..." : 
               isReady ? "Compte actif" : 
               isPending ? "En cours de vérification" : 
               "Non connecté"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Fee Information */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <Calculator className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Frais de transaction</AlertTitle>
          <AlertDescription className="text-amber-600 text-sm space-y-1">
             <p>Frais estimés : <strong>~1,10€</strong> pour une course de 15€</p>
             <p className="text-xs">Incluant traitement du paiement sécurisé et services SoloCab</p>
            <p className="text-xs mt-2">Ces frais sont déduits automatiquement du montant versé sur votre compte.</p>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        {isNotConnected && (
          <Button 
            onClick={handleConnectStripe}
            disabled={connecting}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connecter mon compte Stripe
              </>
            )}
          </Button>
        )}

        {isPending && (
          <Button 
            onClick={handleConnectStripe}
            disabled={connecting}
            variant="outline"
            className="w-full"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Compléter mon inscription Stripe
              </>
            )}
          </Button>
        )}

        {isReady && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Paiements activés
              </Badge>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">
                <Euro className="h-3 w-3 mr-1" />
                Virements activés
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Vos clients peuvent payer en ligne. Les fonds sont versés directement sur votre compte bancaire.
            </p>
          </div>
        )}

        <Separator />

        {/* Benefits */}
        <div className="grid gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <span className="text-muted-foreground">Paiements sécurisés et conformes</span>
          </div>
          <div className="flex items-start gap-2">
            <Euro className="h-4 w-4 text-primary mt-0.5" />
            <span className="text-muted-foreground">Empreinte bancaire à la réservation</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-primary mt-0.5" />
            <span className="text-muted-foreground">Encaissement automatique fin de course</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StripeConnectInfo;
