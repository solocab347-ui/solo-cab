import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Download, 
  CheckCircle, 
  ArrowLeft, 
  Share, 
  MoreVertical,
  Plus,
  Wifi,
  Bell,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-solocab.png";

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
    <div 
      className="min-h-screen bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Installer SoloCab</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* App Icon & Info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-4 bg-gradient-to-br from-primary to-accent p-0.5 shadow-lg">
            <div className="w-full h-full rounded-3xl bg-background flex items-center justify-center">
              <img src={logo} alt="SoloCab" className="w-16 h-16 object-contain" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">
            {isInstalled ? "Installé !" : "SoloCab"}
          </h2>
          
          {!isInstalled && (
            <Badge variant="outline" className="text-xs">
              Application Web Progressive
            </Badge>
          )}
          
          <p className="text-muted-foreground mt-3 text-sm">
            {isInstalled 
              ? "L'application est installée sur votre appareil"
              : "Installez l'app pour un accès rapide"
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
                className="w-full mb-6 bg-gradient-to-r from-primary to-accent text-primary-foreground h-12"
              >
                <Download className="w-5 h-5 mr-2" />
                Installer l'application
              </Button>
            )}

            {/* Instructions pour iOS */}
            {platform === 'ios' && (
              <Card className="p-5 mb-6 bg-muted/30 border-primary/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                  <Smartphone className="w-5 h-5" />
                  Instructions iPhone / iPad
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Share className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">1. Appuyez sur Partager</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Le bouton carré avec une flèche vers le haut, en bas de Safari
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">2. Sur l'écran d'accueil</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Faites défiler et sélectionnez "Sur l'écran d'accueil"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">3. Ajouter</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Appuyez sur "Ajouter" en haut à droite
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Instructions pour Android sans prompt */}
            {platform === 'android' && !deferredPrompt && (
              <Card className="p-5 mb-6 bg-muted/30 border-primary/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                  <Smartphone className="w-5 h-5" />
                  Instructions Android
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MoreVertical className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">1. Menu Chrome</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Appuyez sur les 3 points ⋮ en haut à droite de Chrome
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">2. Installer l'application</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sélectionnez "Installer l'application" ou "Ajouter à l'écran d'accueil"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">3. Confirmer</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Confirmez l'installation
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Desktop instructions */}
            {platform === 'desktop' && !deferredPrompt && (
              <Card className="p-5 mb-6 bg-muted/30 border-primary/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                  <Smartphone className="w-5 h-5" />
                  Installation sur ordinateur
                </h3>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur, 
                  ou utilisez le menu du navigateur pour "Installer SoloCab".
                </p>
              </Card>
            )}

            {/* Avantages */}
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
              Avantages
            </h3>
            <div className="space-y-3 mb-6">
              <Card className="p-4 flex items-center gap-4 bg-muted/20">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm">Accès instantané</p>
                  <p className="text-xs text-muted-foreground">
                    Lancez SoloCab en un clic depuis votre écran d'accueil
                  </p>
                </div>
              </Card>
              
              <Card className="p-4 flex items-center gap-4 bg-muted/20">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Wifi className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Mode hors ligne</p>
                  <p className="text-xs text-muted-foreground">
                    Accédez à vos données même sans connexion
                  </p>
                </div>
              </Card>
              
              <Card className="p-4 flex items-center gap-4 bg-muted/20">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Recevez des alertes pour vos courses et messages
                  </p>
                </div>
              </Card>
            </div>
          </>
        )}

        {isInstalled && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-success/10 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <p className="text-muted-foreground mb-2">
              L'application est maintenant sur votre écran d'accueil.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous pouvez fermer cette page et utiliser l'icône SoloCab.
            </p>
          </div>
        )}

        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="w-full mt-4"
          size="lg"
        >
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
};

export default InstallPWA;
