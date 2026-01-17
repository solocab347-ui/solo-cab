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
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1e35] to-[#1a2942] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 bg-white/5 border-white/10 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Commande confirmée !
        </h1>

        <p className="text-gray-400 mb-6">
          Merci pour votre commande. Votre plaque NFC Coutras sera expédiée 
          dans les plus brefs délais.
        </p>

        {orderNumber && (
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Numéro de commande</p>
            <p className="text-xl font-mono font-bold text-white">{orderNumber}</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-left p-3 bg-white/5 rounded-lg">
            <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-white">Email de confirmation</p>
              <p className="text-sm text-gray-400">
                Vous allez recevoir un email avec les détails de votre commande
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left p-3 bg-white/5 rounded-lg">
            <Package className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-white">Livraison en 5-7 jours</p>
              <p className="text-sm text-gray-400">
                Vous recevrez un email avec le numéro de suivi
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {trackingToken && (
            <Link to={`/track-nfc-order?token=${trackingToken}`} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                <Package className="w-4 h-4 mr-2" />
                Suivre ma commande
              </Button>
            </Link>
          )}
          
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-sm text-gray-400 mb-3">
            Vous n'êtes pas encore chauffeur SoloCab ?
          </p>
          <Link to="/devenir-chauffeur">
            <Button variant="link" className="text-orange-400 hover:text-orange-300">
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
