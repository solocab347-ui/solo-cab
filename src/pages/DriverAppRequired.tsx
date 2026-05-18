import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Smartphone, Download, ShieldCheck, MapPin, Bell, Apple, ArrowLeft, LogOut, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { isMobileApp } from "@/lib/platform";
import logo from "@/assets/logo-solocab.png";

/**
 * Page de blocage chauffeur web.
 *
 * Règle produit : un chauffeur ne peut PAS utiliser SoloCab depuis le web.
 * L'app native est obligatoire (GPS continu, push fullscreen, état actif/dispatch).
 * Cette page :
 *  1. Déconnecte automatiquement la session web du chauffeur (sécurité + clarté).
 *  2. Présente les liens de téléchargement Android (à venir) et iOS (bientôt).
 *  3. Si on est déjà dans l'app native (cas improbable), redirige vers /driver-dashboard.
 */
const PLAY_STORE_URL = ""; // À renseigner quand l'APK sera publiée

const DriverAppRequired = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Si on est dans l'app native, rien à faire ici
    if (isMobileApp()) {
      navigate("/driver-dashboard", { replace: true });
      return;
    }
    // NOTE: on NE déconnecte PAS la session ici. Les chauffeurs doivent pouvoir
    // accéder à /driver-subscription pour souscrire ou gérer leur abonnement
    // depuis le web (l'app native n'est pas encore publiée sur les stores).
  }, [navigate]);

  const openPlayStore = () => {
    if (!PLAY_STORE_URL) return;
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Accueil
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut().catch(() => {});
            navigate("/login");
          }}
          className="text-muted-foreground"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Se déconnecter
        </Button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Hero */}
          <div className="text-center space-y-3">
            <img src={logo} alt="SoloCab" className="w-14 h-14 mx-auto" />
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Smartphone className="w-3 h-3 mr-1" />
              Espace chauffeur
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              L'app SoloCab est obligatoire
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L'espace chauffeur n'est plus accessible depuis un navigateur web.
              Pour recevoir les courses, partager votre position GPS et accepter
              les demandes en temps réel, vous devez utiliser l'application mobile.
            </p>
          </div>

          {/* Why */}
          <Card className="p-4 space-y-3 border-border/60">
            <h2 className="text-sm font-semibold text-foreground">
              Pourquoi l'app est indispensable
            </h2>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">GPS en continu</p>
                  <p className="text-xs text-muted-foreground">
                    Position transmise même écran éteint pour rester visible sur la carte.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Notifications de course</p>
                  <p className="text-xs text-muted-foreground">
                    Alertes plein écran avec son, même téléphone verrouillé.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sécurité & traçabilité</p>
                  <p className="text-xs text-muted-foreground">
                    Authentification renforcée et historique fiable de vos courses.
                  </p>
                </div>
              </li>
            </ul>
          </Card>

          {/* Download buttons */}
          <div className="space-y-3">
            <Button
              onClick={openPlayStore}
              disabled={!PLAY_STORE_URL}
              size="lg"
              className="w-full h-14 bg-success hover:bg-success/90 text-success-foreground disabled:opacity-70"
            >
              <Download className="w-5 h-5 mr-2" />
              {PLAY_STORE_URL ? "Télécharger sur Google Play" : "Android — bientôt disponible"}
            </Button>

            <Button
              disabled
              size="lg"
              variant="outline"
              className="w-full h-14 border-border text-muted-foreground"
            >
              <Apple className="w-5 h-5 mr-2" />
              iOS — bientôt disponible
            </Button>

            <p className="text-[11px] text-center text-muted-foreground px-4 leading-relaxed">
              L'application Android sera publiée très prochainement.
              Vous serez notifié par email dès qu'elle sera téléchargeable.
            </p>
          </div>

          {/* Footer note */}
          <Card className="p-3.5 bg-muted/40 border-border/40">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Bon à savoir :</span>{" "}
              vos clients et l'équipe administrative continuent d'accéder à
              SoloCab depuis n'importe quel navigateur. Cette restriction
              concerne uniquement les chauffeurs.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DriverAppRequired;
