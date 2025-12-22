import { useState, useEffect, useCallback } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Platform = 'ios' | 'android' | 'desktop';

// Fonction de détection de plateforme améliorée
const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Détection iOS - vérifie plusieurs indicateurs
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  
  if (isIOS || isIPadOS) {
    return 'ios';
  }
  
  // Détection Android - vérifie le user agent
  if (/android/i.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
};

export const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Détection de la plateforme
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    
    // Vérifier si l'utilisateur est sur mobile
    const isMobile = detectedPlatform === 'ios' || detectedPlatform === 'android';
    
    // Vérifier si l'app est déjà installée
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    // Vérifier si l'app a été installée (persistant)
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    
    // Vérifier si temporairement masqué (session only, expire après 24h)
    const dismissedAt = sessionStorage.getItem('pwa-banner-dismissed-at');
    const isTemporarilyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt)) < 24 * 60 * 60 * 1000;
    
    // Afficher la bannière si mobile, pas installé, et pas temporairement masqué
    if (isMobile && !isInstalled && !wasInstalled && !isTemporarilyDismissed) {
      setShowBanner(true);
    }

    // Capturer l'événement beforeinstallprompt (Android/Desktop Chrome uniquement)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Réafficher la bannière si le prompt est disponible
      if (isMobile && !isInstalled && !wasInstalled) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter l'événement d'installation réussie
    const handleAppInstalled = () => {
      setShowBanner(false);
      localStorage.setItem('pwa-installed', 'true');
      sessionStorage.removeItem('pwa-banner-dismissed-at');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    // Si on a le prompt natif (Android Chrome), l'utiliser directement
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setShowBanner(false);
          localStorage.setItem('pwa-installed', 'true');
          sessionStorage.removeItem('pwa-banner-dismissed-at');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Erreur lors de l\'installation:', error);
        setShowInstructions(true);
      }
    } else {
      // Pas de prompt disponible, afficher les instructions
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    // Ne masquer que temporairement (se réaffiche à la prochaine session ou après 24h)
    sessionStorage.setItem('pwa-banner-dismissed-at', Date.now().toString());
  }, []);

  if (!showBanner) return null;

  return (
    <>
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
              className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog d'instructions spécifique à la plateforme */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Installer SoloCab
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {platform === 'ios' ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour installer l'application sur votre iPhone/iPad :
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span className="text-sm">
                      Appuyez sur le bouton <Share className="inline h-4 w-4 mx-1" /> <strong>Partager</strong> en bas de Safari
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span className="text-sm">
                      Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong>
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">3</span>
                    <span className="text-sm">
                      Appuyez sur <strong>"Ajouter"</strong>
                    </span>
                  </li>
                </ol>
              </div>
            ) : platform === 'android' ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour installer l'application sur votre Android :
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span className="text-sm">
                      Appuyez sur le menu <strong>⋮</strong> en haut à droite de Chrome
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span className="text-sm">
                      Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">3</span>
                    <span className="text-sm">
                      Confirmez l'installation
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour installer l'application sur votre ordinateur :
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span className="text-sm">
                      Cliquez sur l'icône d'installation dans la barre d'adresse
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span className="text-sm">
                      Confirmez l'installation
                    </span>
                  </li>
                </ol>
              </div>
            )}
            
            <Button 
              className="w-full" 
              onClick={() => setShowInstructions(false)}
            >
              Compris
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
