/**
 * Composant d'indicateur de connexion avec récupération automatique
 */
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionIndicator() {
  const { isOnline, isStable, latency, isRecovering, forceReconnect } = useConnectionStatus();

  // Ne rien afficher si tout va bien
  if (isOnline && isStable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-4">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg",
        !isOnline ? "bg-destructive text-destructive-foreground" :
        latency === 'slow' ? "bg-amber-500 text-white" :
        "bg-muted"
      )}>
        {!isOnline ? (
          <WifiOff className="w-4 h-4" />
        ) : latency === 'slow' ? (
          <Wifi className="w-4 h-4 animate-pulse" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        
        <span className="text-sm font-medium">
          {!isOnline ? 'Hors ligne' :
           latency === 'slow' ? 'Connexion lente' :
           'Connexion instable'}
        </span>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={forceReconnect}
          disabled={isRecovering}
        >
          {isRecovering ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
