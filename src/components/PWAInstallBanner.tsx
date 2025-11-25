import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est sur mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Vérifier si l'app est déjà installée
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    // Vérifier si l'utilisateur a déjà fermé la bannière
    const bannerDismissed = localStorage.getItem('pwa-banner-dismissed');
    
    // Afficher la bannière si mobile, pas installé, et pas fermé
    if (isMobile && !isInstalled && !bannerDismissed) {
      setShowBanner(true);
    }

    // Capturer l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', 'true');
      }
      
      setDeferredPrompt(null);
    } else {
      // Fallback pour iOS ou si le prompt n'est pas disponible
      alert("Pour installer l'application :\n\niOS : Appuyez sur le bouton 'Partager' puis 'Sur l'écran d'accueil'\n\nAndroid : Ouvrez le menu du navigateur et sélectionnez 'Installer l'application'");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Download className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              Installez SoloCab sur votre mobile
            </p>
            <p className="text-xs opacity-90 truncate">
              Accédez plus facilement à l'application
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="text-xs"
          >
            Installer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
