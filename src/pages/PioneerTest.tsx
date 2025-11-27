import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Rocket, Lock, Users, Sparkles } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const PioneerTest = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="container max-w-2xl">
        <Card className="p-8 md:p-12 text-center bg-card border-border shadow-elegant">
          <div className="mb-8">
            <img src={logo} alt="SoloCab" className="w-20 h-20 mx-auto mb-4 object-contain" />
          </div>

          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-trust flex items-center justify-center">
            <Rocket className="w-10 h-10 text-trust-foreground" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Application en Phase de Test
          </h1>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            SoloCab est actuellement en phase de test avec nos <span className="text-premium font-semibold">pionniers exclusifs</span>. 
            Nous perfectionnons l'expérience avant de l'ouvrir à tous.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-premium flex items-center justify-center">
                <Lock className="w-6 h-6 text-premium-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium">Accès Limité</p>
              <p className="text-xs text-muted-foreground">Test privé en cours</p>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-success flex items-center justify-center">
                <Users className="w-6 h-6 text-success-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium">Pionniers Actifs</p>
              <p className="text-xs text-muted-foreground">Testeurs exclusifs</p>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="w-12 h-12 rounded-full bg-gradient-warning flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-warning-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium">Bientôt Disponible</p>
              <p className="text-xs text-muted-foreground">Ouverture prochaine</p>
            </div>
          </div>

          <div className="bg-gradient-trust/10 border border-trust/20 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Vous pourrez bientôt vous inscrire !
            </h3>
            <p className="text-sm text-muted-foreground">
              Nous finalisons les derniers détails pour vous offrir la meilleure expérience possible. 
              L'inscription publique sera ouverte très prochainement.
            </p>
          </div>

          <Link to="/">
            <Button size="lg" className="bg-gradient-trust text-trust-foreground shadow-trust">
              Retour à l'accueil
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default PioneerTest;
