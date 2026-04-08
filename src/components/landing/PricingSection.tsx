import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const PricingSection = () => {
  return (
    <section className="py-20 bg-storefront">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-success text-white border-0">
            💰 Modèle transparent
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-foreground">
            100% gratuit,
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              sans engagement
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Inscrivez-vous gratuitement et accédez à tous les outils de base.
            <span className="text-success font-semibold"> Aucun frais caché, aucune surprise.</span>
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <Card className="p-8 bg-gradient-to-br from-success/10 to-success/5 border-success/30 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-success text-white px-4 py-1">
                <Zap className="w-4 h-4 mr-1 inline" />
                Accès gratuit
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-success" />
                <h3 className="text-2xl font-bold text-foreground">SoloCab</h3>
              </div>
              <div className="mb-2">
                <span className="text-5xl font-bold text-foreground">0€</span>
              </div>
              <p className="text-muted-foreground">Aucun frais d'inscription</p>
            </div>

            <div className="space-y-4 mb-8">
              {[
                "Gestion complète des courses",
                "Suivi et fidélisation clients",
                "Facturation automatique",
                "QR Code personnel",
                "Calcul d'itinéraires",
                "Statistiques détaillées",
                "Support dédié",
                "Mises à jour gratuites"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Link to="/register-driver-promo">
              <Button className="w-full bg-gradient-success text-white h-12 text-lg">
                S'inscrire gratuitement
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
