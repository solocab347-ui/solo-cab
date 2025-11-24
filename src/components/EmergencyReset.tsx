import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Composant d'urgence pour débloquer l'interface en cas de freeze
 * Détecte les situations problématiques et offre un moyen de récupération
 */
export const EmergencyReset = () => {
  const [showEmergency, setShowEmergency] = useState(false);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    let interactionTimeout: NodeJS.Timeout;
    let lastInteraction = Date.now();
    let checkInterval: NodeJS.Timeout;

    // Détecter l'inactivité forcée (possible freeze)
    const resetInteractionTimer = () => {
      lastInteraction = Date.now();
      setIsStuck(false);
    };

    // Écouter les interactions utilisateur
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, resetInteractionTimer);
    });

    // Vérifier périodiquement si l'UI est figée
    checkInterval = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteraction;
      
      // Si pas d'interaction depuis 15 secondes et qu'il y a des overlays ouverts
      if (timeSinceLastInteraction > 15000) {
        const hasOpenOverlays = document.querySelector('[data-state="open"]') !== null;
        const hasDialogs = document.querySelector('[role="dialog"]') !== null;
        
        if (hasOpenOverlays || hasDialogs) {
          setIsStuck(true);
          setShowEmergency(true);
        }
      }
    }, 5000);

    // Raccourci clavier d'urgence: Ctrl+Alt+R
    const handleEmergencyKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'r') {
        e.preventDefault();
        setShowEmergency(true);
      }
    };
    window.addEventListener('keydown', handleEmergencyKeyboard);

    return () => {
      clearTimeout(interactionTimeout);
      clearInterval(checkInterval);
      events.forEach(event => {
        window.removeEventListener(event, resetInteractionTimer);
      });
      window.removeEventListener('keydown', handleEmergencyKeyboard);
    };
  }, []);

  const handleEmergencyReset = () => {
    try {
      // Fermer tous les dialogs/modals/overlays ouverts
      const overlays = document.querySelectorAll('[data-state="open"]');
      overlays.forEach(overlay => {
        const closeButton = overlay.querySelector('[data-dismiss]') as HTMLElement;
        if (closeButton) closeButton.click();
      });

      // Fermer tous les portals
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach(portal => portal.remove());

      // Réactiver le scroll
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = '';

      // Nettoyer les éventuels overlays bloquants
      const backdrops = document.querySelectorAll('[role="presentation"]');
      backdrops.forEach(backdrop => backdrop.remove());

      toast.success('Interface débloquée');
      setShowEmergency(false);
      setIsStuck(false);
    } catch (error) {
      console.error('Emergency reset failed:', error);
      toast.error('Échec du déblocage, rechargement...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleForceReload = () => {
    window.location.reload();
  };

  if (!showEmergency && !isStuck) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className="bg-destructive/95 backdrop-blur-sm text-destructive-foreground rounded-lg shadow-2xl p-4 max-w-sm animate-in slide-in-from-bottom-5 border-2 border-destructive">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <h3 className="font-bold mb-1">Interface bloquée détectée</h3>
            <p className="text-sm opacity-90 mb-3">
              {isStuck 
                ? "Aucune interaction détectée depuis 15 secondes. L'interface semble figée."
                : "Utilisez les options ci-dessous pour débloquer l'application."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleEmergencyReset}
                className="flex-1"
              >
                Débloquer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceReload}
                className="flex-1"
              >
                Recharger
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEmergency(false)}
                className="px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs opacity-75 mt-2">
              Raccourci: Ctrl+Alt+R
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
