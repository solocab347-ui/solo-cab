import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, CheckCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const InstallPWA = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Détecte la plateforme
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Capture l'événement beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Vérifie si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-trust rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-trust">
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {isInstalled ? "Application Installée !" : "Installez SoloCab"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isInstalled 
              ? "L'application est installée sur votre appareil"
              : "Accédez rapidement à SoloCab depuis votre écran d'accueil"
            }
          </p>
        </div>

        {!isInstalled && (
          <>
            {/* Bouton d'installation pour Android/Desktop */}
            {platform !== 'ios' && deferredPrompt && (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full mb-6 bg-gradient-premium text-premium-foreground"
              >
                <Download className="w-5 h-5 mr-2" />
                Installer l'application
              </Button>
            )}

            {/* Instructions pour iOS */}
            {platform === 'ios' && (
              <Card className="p-6 bg-muted/50 mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Instructions pour iPhone/iPad
                </h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span>Appuyez sur le bouton <strong>Partager</strong> dans Safari (en bas de l'écran)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span>Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">3</span>
                    <span>Appuyez sur <strong>"Ajouter"</strong> pour terminer</span>
                  </li>
                </ol>
              </Card>
            )}

            {/* Instructions pour Android sans prompt */}
            {platform === 'android' && !deferredPrompt && (
              <Card className="p-6 bg-muted/50 mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Instructions pour Android
                </h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span>Appuyez sur le menu <strong>⋮</strong> dans Chrome (en haut à droite)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer l'application"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">3</span>
                    <span>Confirmez l'installation</span>
                  </li>
                </ol>
              </Card>
            )}

            {/* Avantages de l'installation */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 text-center">
                <div className="w-12 h-12 bg-success/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <h4 className="font-semibold mb-2">Accès rapide</h4>
                <p className="text-xs text-muted-foreground">
                  Lancez SoloCab en un clic depuis votre écran d'accueil
                </p>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Download className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Hors ligne</h4>
                <p className="text-xs text-muted-foreground">
                  Consultez vos données même sans connexion
                </p>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-accent" />
                </div>
                <h4 className="font-semibold mb-2">Expérience native</h4>
                <p className="text-xs text-muted-foreground">
                  Interface optimisée comme une vraie app mobile
                </p>
              </Card>
            </div>
          </>
        )}

        {isInstalled && (
          <div className="text-center">
            <div className="w-20 h-20 bg-success/10 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <p className="text-muted-foreground mb-6">
              Vous pouvez maintenant utiliser SoloCab comme une application native depuis votre écran d'accueil.
            </p>
          </div>
        )}

        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Retour à l'accueil
        </Button>
      </Card>
    </div>
  );
};

export default InstallPWA;
