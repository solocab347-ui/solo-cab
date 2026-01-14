/**
 * Composant d'indicateur de connexion avec récupération automatique
 * Optimisé pour les réseaux mobiles lents
 */
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function ConnectionIndicator() {
  const { isOnline, isStable, latency, isRecovering, forceReconnect } = useConnectionStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Ne rien afficher si tout va bien ou si l'utilisateur a fermé
  if ((isOnline && isStable) || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 sm:right-auto sm:max-w-xs">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg",
        !isOnline ? "bg-destructive text-destructive-foreground" :
        latency === 'slow' ? "bg-amber-500 text-white" :
        "bg-muted border border-border"
      )}>
        {!isOnline ? (
          <WifiOff className="w-4 h-4 shrink-0" />
        ) : latency === 'slow' ? (
          <Wifi className="w-4 h-4 animate-pulse shrink-0" />
        ) : (
          <Wifi className="w-4 h-4 shrink-0" />
        )}
        
        <span className="text-sm font-medium flex-1">
          {!isOnline ? 'Hors ligne - vérifiez votre connexion' :
           latency === 'slow' ? 'Connexion lente' :
           'Connexion instable'}
        </span>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={forceReconnect}
            disabled={isRecovering}
            title="Reconnecter"
          >
            {isRecovering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
            onClick={() => setIsDismissed(true)}
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
