import { useState, useEffect, useCallback, useRef } from "react";
import { X, Download, Share, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Platform = 'ios' | 'android' | 'desktop';

// Stocker le prompt globalement pour ne pas le perdre
interface PWAPromptStore {
  prompt: any;
  setPrompt: (p: any) => void;
  getPrompt: () => any;
}

const pwaStore: PWAPromptStore = {
  prompt: null,
  setPrompt(p: any) {
    this.prompt = p;
    console.log('PWA Store: Prompt saved', !!p);
  },
  getPrompt() {
    return this.prompt;
  }
};

// Capturer le prompt au niveau global le plus tôt possible
if (typeof window !== 'undefined') {
  const capturePrompt = (e: Event) => {
    e.preventDefault();
    pwaStore.setPrompt(e);
    console.log('PWA: Global beforeinstallprompt captured');
  };
  
  window.addEventListener('beforeinstallprompt', capturePrompt);
  
  // Aussi sur DOMContentLoaded au cas où
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.addEventListener('beforeinstallprompt', capturePrompt);
    });
  }
}

// Fonction de détection de plateforme améliorée
const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Détection iOS
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  
  if (isIOS || isIPadOS) {
    return 'ios';
  }
  
  // Détection Android
  if (/android/i.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
};

export const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const hasPromptRef = useRef(false);

  useEffect(() => {
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    
    const isMobile = detectedPlatform === 'ios' || detectedPlatform === 'android';
    
    // Vérifier si l'app est déjà installée
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    
    // Vérifier si temporairement masqué
    const dismissedAt = sessionStorage.getItem('pwa-banner-dismissed-at');
    const isTemporarilyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt)) < 24 * 60 * 60 * 1000;
    
    if (isMobile && !isInstalled && !wasInstalled && !isTemporarilyDismissed) {
      setShowBanner(true);
    }

    // Écouter le prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      pwaStore.setPrompt(e);
      hasPromptRef.current = true;
      console.log('PWA: Component captured beforeinstallprompt');
      
      if (isMobile && !isInstalled && !wasInstalled) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Écouter l'installation réussie
    const handleAppInstalled = () => {
      console.log('PWA: App installed!');
      setShowBanner(false);
      setIsInstalling(false);
      localStorage.setItem('pwa-installed', 'true');
      sessionStorage.removeItem('pwa-banner-dismissed-at');
      pwaStore.setPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Vérifier si on a déjà le prompt
    if (pwaStore.getPrompt()) {
      hasPromptRef.current = true;
      console.log('PWA: Prompt already available');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = pwaStore.getPrompt();
    
    console.log('PWA: Install clicked, prompt:', !!prompt, 'platform:', platform);
    
    // Sur Android avec prompt disponible - installation directe
    if (prompt) {
      setIsInstalling(true);
      try {
        await prompt.prompt();
        const result = await prompt.userChoice;
        console.log('PWA: User choice:', result.outcome);
        
        if (result.outcome === 'accepted') {
          setShowBanner(false);
          localStorage.setItem('pwa-installed', 'true');
          sessionStorage.removeItem('pwa-banner-dismissed-at');
        }
        
        // Le prompt ne peut être utilisé qu'une fois
        pwaStore.setPrompt(null);
      } catch (error) {
        console.error('PWA: Install error:', error);
        // Sur Android, si erreur on ne montre pas les instructions
        // car Chrome gère lui-même l'installation
        if (platform !== 'android') {
          setShowInstructions(true);
        }
      } finally {
        setIsInstalling(false);
      }
      return;
    }
    
    // Sur Android sans prompt - Chrome n'a pas encore déclenché beforeinstallprompt
    // Cela signifie que la PWA n'est peut-être pas encore reconnue comme installable
    // OU l'utilisateur doit utiliser le menu de Chrome
    if (platform === 'android') {
      // Afficher un message court puis tenter d'attendre le prompt
      setIsInstalling(true);
      
      // Attendre jusqu'à 3 secondes pour le prompt
      let waited = 0;
      const checkInterval = setInterval(async () => {
        waited += 300;
        const newPrompt = pwaStore.getPrompt();
        
        if (newPrompt) {
          clearInterval(checkInterval);
          try {
            await newPrompt.prompt();
            const result = await newPrompt.userChoice;
            if (result.outcome === 'accepted') {
              setShowBanner(false);
              localStorage.setItem('pwa-installed', 'true');
            }
            pwaStore.setPrompt(null);
          } catch (e) {
            console.error('PWA: Delayed prompt error:', e);
          }
          setIsInstalling(false);
        } else if (waited >= 3000) {
          clearInterval(checkInterval);
          setIsInstalling(false);
          // Sur Android, afficher les instructions en dernier recours
          setShowInstructions(true);
        }
      }, 300);
      
      return;
    }
    
    // iOS ou Desktop sans prompt - afficher les instructions
    setShowInstructions(true);
  }, [platform]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
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
                Installez SoloCab
              </p>
              <p className="text-xs opacity-90 truncate">
                Accès rapide depuis votre écran d'accueil
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              disabled={isInstalling}
              className="text-xs font-medium"
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Installer'
              )}
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

      {/* Instructions uniquement pour iOS ou si vraiment nécessaire */}
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
                  Sur iPhone/iPad :
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span className="text-sm">
                      Appuyez sur <Share className="inline h-4 w-4 mx-1" /> <strong>Partager</strong>
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span className="text-sm">
                      <strong>"Sur l'écran d'accueil"</strong>
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">3</span>
                    <span className="text-sm">
                      <strong>"Ajouter"</strong>
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour installer l'application :
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">1</span>
                    <span className="text-sm">
                      Menu <strong>⋮</strong> en haut à droite
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">2</span>
                    <span className="text-sm">
                      <strong>"Installer l'application"</strong>
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