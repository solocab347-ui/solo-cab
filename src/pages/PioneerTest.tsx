import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, AlertTriangle, CheckCircle } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const PioneerTest = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="container max-w-2xl">
        <Card className="p-8 md:p-12 text-center bg-card border-border shadow-elegant">
          <div className="mb-8">
            <img src={logo} alt="SoloCab" className="w-20 h-20 mx-auto mb-4 object-contain" />
          </div>

          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border-2 border-green-500/30">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Phase de Test Terminée
          </h1>

          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800 dark:text-green-400">Application disponible</span>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm leading-relaxed">
              SoloCab est maintenant accessible à tous ! Merci à nos pionniers pour leur 
              participation à la phase de test.
            </p>
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            L'application est désormais ouverte au public. Vous pouvez vous inscrire 
            en tant que chauffeur ou client.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/devenir-chauffeur">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-trust text-trust-foreground shadow-trust">
                Devenir Chauffeur
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PioneerTest;
