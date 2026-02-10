import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Mail, ArrowRight, Home } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const NfcPlateOrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");
  const trackingToken = searchParams.get("token");

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 bg-muted/30 border-border/50 text-center">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">
          Commande confirmée !
        </h1>

        <p className="text-muted-foreground mb-6">
          Merci pour votre commande. Votre plaque NFC Coutras sera expédiée 
          dans les plus brefs délais.
        </p>

        {orderNumber && (
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Numéro de commande</p>
            <p className="text-xl font-mono font-bold text-foreground">{orderNumber}</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-left p-3 bg-muted/30 rounded-lg">
            <Mail className="w-5 h-5 text-info flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Email de confirmation</p>
              <p className="text-sm text-muted-foreground">
                Vous allez recevoir un email avec les détails de votre commande
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left p-3 bg-muted/30 rounded-lg">
            <Package className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Livraison en 5-7 jours</p>
              <p className="text-sm text-muted-foreground">
                Vous recevrez un email avec le numéro de suivi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {trackingToken && (
            <Link to={`/track-nfc-order?token=${trackingToken}`} className="flex-1">
              <Button className="w-full bg-gradient-warning text-warning-foreground">
                <Package className="w-4 h-4 mr-2" />
                Suivre ma commande
              </Button>
            </Link>
          )}
          
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted/50">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Vous n'êtes pas encore chauffeur SoloCab ?
          </p>
          <Link to="/devenir-chauffeur">
            <Button variant="link" className="text-warning hover:text-warning/80">
              Découvrir les avantages
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default NfcPlateOrderSuccess;
