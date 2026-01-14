/**
 * Indicateur de connexion discret et informatif
 * Apparaît uniquement en cas de problème
 */
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function ConnectionIndicator() {
  const { 
    isOnline, 
    isStable, 
    isSlow, 
    isRecovering, 
    isManualRecovering,
    latency,
    consecutiveFailures,
    forceReconnect 
  } = useConnectionStatus();
  
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Réinitialiser le dismiss si la connexion change significativement
  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false);
    }
  }, [isOnline]);

  // Ne rien afficher si tout va bien ou si l'utilisateur a fermé
  if ((isOnline && isStable && !isSlow) || isDismissed) {
    return null;
  }

  // Déterminer le type d'alerte et le style
  const getAlertConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        title: 'Hors ligne',
        description: 'Vérifiez votre connexion internet',
        bgClass: 'bg-destructive text-destructive-foreground',
        iconClass: 'text-destructive-foreground',
      };
    }
    if (isRecovering) {
      return {
        icon: Loader2,
        title: 'Reconnexion en cours...',
        description: 'Tentative de rétablissement de la connexion',
        bgClass: 'bg-amber-500 text-white',
        iconClass: 'animate-spin',
      };
    }
    if (isSlow) {
      return {
        icon: AlertTriangle,
        title: 'Connexion lente',
        description: `Latence: ${Math.round(latency)}ms`,
        bgClass: 'bg-amber-500 text-white',
        iconClass: 'text-white',
      };
    }
    return {
      icon: Wifi,
      title: 'Connexion instable',
      description: `${consecutiveFailures} erreur(s) récente(s)`,
      bgClass: 'bg-muted border border-border text-foreground',
      iconClass: 'text-muted-foreground animate-pulse',
    };
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 sm:right-auto sm:max-w-sm">
      <div className={cn(
        "rounded-lg shadow-lg overflow-hidden",
        config.bgClass
      )}>
        {/* Barre principale */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Icon className={cn("w-5 h-5 shrink-0", config.iconClass)} />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{config.title}</p>
            {showDetails && (
              <p className="text-xs opacity-80 truncate">{config.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Bouton détails */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-white/20"
              onClick={() => setShowDetails(!showDetails)}
              title={showDetails ? "Masquer les détails" : "Voir les détails"}
            >
              <span className="text-xs font-medium">
                {showDetails ? '−' : '+'}
              </span>
            </Button>

            {/* Bouton reconnecter */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-white/20"
              onClick={forceReconnect}
              disabled={isManualRecovering || isRecovering}
              title="Tenter de reconnecter"
            >
              {isManualRecovering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            
            {/* Bouton fermer */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100 hover:bg-white/20"
              onClick={() => setIsDismissed(true)}
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Barre de progression si en cours de récupération */}
        {(isRecovering || isManualRecovering) && (
          <div className="h-1 bg-white/20">
            <div className="h-full bg-white/60 animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
}
