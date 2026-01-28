import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  ArrowRight,
  CheckCircle,
  Star,
  Truck,
  TreeDeciduous,
  Crown,
  QrCode,
  Zap,
} from "lucide-react";
import nfcPlateLarge from "@/assets/nfc-plate-large-clean.png";
import nfcPlateSmall from "@/assets/nfc-plate-small-clean.png";

export const NfcHeroSection = () => {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="mb-8 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/20 max-w-5xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
          <Truck className="w-3 h-3 mr-1" />
          Livraison gratuite en 5-7 jours
        </Badge>
        
        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight text-white">
          Plaques <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">NFC</span> professionnelles
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Vos clients scannent, accèdent à votre profil et vous recontactent. Simple et efficace.
        </p>

        {/* Two Plates Side by Side */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
          {/* Premium Plate */}
          <Card className="p-5 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border-orange-500/30 relative overflow-hidden group hover:border-orange-500/60 transition-all">
            <Badge className="absolute top-3 right-3 bg-orange-500 text-white text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
            
            <div className="bg-zinc-900/50 rounded-xl p-4 mb-4">
              <img 
                src={nfcPlateLarge} 
                alt="Plaque NFC Premium" 
                className="w-full h-28 object-contain transition-transform group-hover:scale-105"
              />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">Plastique noir</h3>
            <p className="text-xs text-muted-foreground mb-3">Format carte • Ultra résistant</p>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xl font-bold text-orange-500">29,99€</p>
                <p className="text-xs text-primary">23,99€ avec abo</p>
              </div>
              <Badge variant="outline" className="border-orange-500/50 text-orange-400 text-xs">
                -20%
              </Badge>
            </div>

            <Link to="/plaque-nfc">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" size="sm">
                Commander
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>

          {/* Standard Plate */}
          <Card className="p-5 bg-gradient-to-br from-amber-900/20 to-amber-800/10 border-green-500/30 relative overflow-hidden group hover:border-green-500/60 transition-all">
            <Badge className="absolute top-3 right-3 bg-green-500 text-white text-xs">
              <TreeDeciduous className="w-3 h-3 mr-1" />
              Éco
            </Badge>
            
            <div className="bg-amber-900/20 rounded-xl p-4 mb-4">
              <img 
                src={nfcPlateSmall} 
                alt="Plaque NFC Bois" 
                className="w-full h-28 object-contain transition-transform group-hover:scale-105"
              />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">Bois naturel</h3>
            <p className="text-xs text-muted-foreground mb-3">Format ovale • Écologique</p>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xl font-bold text-green-500">14,99€</p>
                <p className="text-xs text-primary">11,99€ avec abo</p>
              </div>
              <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                -20%
              </Badge>
            </div>

            <Link to="/plaque-nfc">
              <Button variant="outline" className="w-full border-green-500/50 text-white hover:bg-green-500/10" size="sm">
                Commander
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Key Features */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Compatible tous smartphones
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500" />
            QR code + NFC
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Scan instantané
          </div>
        </div>

        {/* Subscription Advantage */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 max-w-xl mx-auto">
          <p className="text-muted-foreground text-sm">
            <Star className="w-4 h-4 inline mr-2 text-primary" />
            <strong className="text-primary">-20% avec l'abonnement</strong> : 
            Profil pro, réservations, avis clients et CRM inclus !
          </p>
        </div>
      </div>

      {/* How it Works - Simplified */}
      <div className="mb-10 max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-white mb-6">Comment ça marche ?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold mb-2 mx-auto text-sm">1</div>
            <p className="text-sm text-muted-foreground">Commandez en ligne</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold mb-2 mx-auto text-sm">2</div>
            <p className="text-sm text-muted-foreground">Réception en 5-7j</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold mb-2 mx-auto text-sm">3</div>
            <p className="text-sm text-muted-foreground">Placez dans véhicule</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold mb-2 mx-auto text-sm">4</div>
            <p className="text-sm text-muted-foreground">Clients scannent !</p>
          </Card>
        </div>
      </div>

      {/* Track Order + CTA */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
        <Link to="/plaque-nfc">
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg">
            Voir toutes les plaques
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
        <Link to="/suivi-plaque-nfc">
          <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent">
            <Truck className="w-4 h-4 mr-2" />
            Suivre ma commande
          </Button>
        </Link>
      </div>
    </div>
  );
};
