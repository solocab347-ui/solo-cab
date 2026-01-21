/**
 * Indicateur de synchronisation offline
 * Affiche l'état du cache et des mutations en attente
 * UNIQUEMENT pour les utilisateurs connectés
 */

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Loader2, 
  Check, 
  AlertTriangle,
  Database,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function OfflineSyncIndicator() {
  const { user } = useAuth();
  const {
    isOnline,
    isOfflineMode,
    isSyncing,
    pendingMutations,
    failedMutations,
    lastSync,
    cacheStats,
    syncNow,
    retryFailedMutations,
    clearFailedMutations,
  } = useOfflineSync();

  const [isOpen, setIsOpen] = useState(false);

  // Ne pas afficher pour les utilisateurs non connectés
  if (!user) return null;

  // Déterminer l'icône et le style
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        label: 'Hors ligne',
      };
    }
    if (isSyncing) {
      return {
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        label: 'Synchronisation...',
        animate: true,
      };
    }
    if (failedMutations > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        label: `${failedMutations} erreur(s)`,
      };
    }
    if (pendingMutations > 0) {
      return {
        icon: Clock,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: `${pendingMutations} en attente`,
      };
    }
    return {
      icon: Cloud,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Synchronisé',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Ne pas afficher si tout est OK et pas de données importantes
  const shouldShow = !isOnline || pendingMutations > 0 || failedMutations > 0 || 
    (cacheStats.courses > 0 || cacheStats.clients > 0);

  if (!shouldShow) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "fixed bottom-20 right-4 z-40 h-10 gap-2 rounded-full shadow-lg",
            config.bgColor,
            "hover:opacity-90"
          )}
        >
          <Icon className={cn("w-4 h-4", config.color, config.animate && "animate-spin")} />
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
          {(pendingMutations > 0 || failedMutations > 0) && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {pendingMutations + failedMutations}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Synchronisation</h4>
            <div className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full",
              isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {isOnline ? <Check className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>

          {/* Stats du cache */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-2">
              <Database className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{cacheStats.courses}</p>
              <p className="text-[10px] text-muted-foreground">Courses</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-lg font-bold">{cacheStats.clients}</p>
              <p className="text-[10px] text-muted-foreground">Clients</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-lg font-bold">{cacheStats.drivers}</p>
              <p className="text-[10px] text-muted-foreground">Chauffeurs</p>
            </div>
          </div>

          {/* Mutations en attente */}
          {pendingMutations > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm">{pendingMutations} action(s) en attente</span>
              </div>
            </div>
          )}

          {/* Mutations échouées */}
          {failedMutations > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">{failedMutations} action(s) échouée(s)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryFailedMutations}
                  disabled={isSyncing}
                  className="flex-1"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Réessayer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFailedMutations}
                  className="text-muted-foreground"
                >
                  Ignorer
                </Button>
              </div>
            </div>
          )}

          {/* Dernière sync */}
          {lastSync && (
            <p className="text-xs text-muted-foreground text-center">
              Dernière sync: {formatDistanceToNow(lastSync, { addSuffix: true, locale: fr })}
            </p>
          )}

          {/* Bouton sync */}
          <Button
            onClick={syncNow}
            disabled={!isOnline || isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Synchroniser maintenant
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
