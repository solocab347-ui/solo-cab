import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, AlertTriangle } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const RegisterCongressDriver = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="container max-w-2xl">
        <Card className="p-8 md:p-12 text-center bg-card border-border shadow-elegant">
          <div className="mb-8">
            <img src={logo} alt="SoloCab" className="w-20 h-20 mx-auto mb-4 object-contain" />
          </div>

          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500/30">
            <Lock className="w-10 h-10 text-amber-500" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Inscriptions Pionniers Terminées
          </h1>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800 dark:text-amber-400">Programme clôturé</span>
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed">
              Le programme d'inscription Pionniers est maintenant terminé. 
              Merci à tous les participants qui ont rejoint SoloCab en tant que pionniers !
            </p>
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Si vous souhaitez devenir chauffeur SoloCab, veuillez utiliser notre formulaire 
            d'inscription standard ou contacter notre équipe pour plus d'informations.
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

export default RegisterCongressDriver;
