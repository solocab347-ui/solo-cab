/**
 * Indicateur de mode sans échec / statut réseau
 * Affiche un badge discret quand hors ligne avec accès au mode consultation
 */

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Shield, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const SafeModeIndicator = () => {
  const { isOnline, isOfflineMode, lastSync, isSyncing, syncNow, stats } = useOfflineData();
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  // Afficher une notification quand on passe offline
  useEffect(() => {
    if (isOfflineMode) {
      setShowTooltip(true);
      const timer = setTimeout(() => setShowTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOfflineMode]);

  // Ne rien afficher si tout va bien et pas de données en cache
  if (isOnline && stats.clients === 0 && stats.courses === 0) {
    return null;
  }

  return (
    <Popover open={showTooltip} onOpenChange={setShowTooltip}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`fixed bottom-4 right-4 z-50 rounded-full shadow-lg transition-all ${
            isOfflineMode 
              ? 'bg-orange-500 text-white hover:bg-orange-600 animate-pulse' 
              : 'bg-background/80 backdrop-blur border hover:bg-accent'
          }`}
        >
          {isOfflineMode ? (
            <>
              <WifiOff className="h-4 w-4 mr-1" />
              <Shield className="h-4 w-4" />
            </>
          ) : isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-72"
      >
        <div className="space-y-3">
          {/* Statut connexion */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isOfflineMode ? 'Mode Sans Échec' : 'Connecté'}
            </span>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? (
                <><Wifi className="h-3 w-3 mr-1" /> En ligne</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Hors ligne</>
              )}
            </Badge>
          </div>

          {/* Statistiques cache */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Courses en cache</span>
              <span className="font-medium">{stats.courses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contacts en cache</span>
              <span className="font-medium">{stats.clients + stats.drivers}</span>
            </div>
            {lastSync && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dernière sync</span>
                <span className="font-medium">
                  {format(lastSync, 'HH:mm', { locale: fr })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isOnline && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={syncNow}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Synchroniser
              </Button>
            )}
            <Button
              size="sm"
              variant={isOfflineMode ? 'default' : 'secondary'}
              className="flex-1"
              onClick={() => navigate('/safe-mode')}
            >
              <Shield className="h-3 w-3 mr-1" />
              Consultation
            </Button>
          </div>

          {isOfflineMode && (
            <p className="text-xs text-muted-foreground">
              Les données affichées proviennent du cache local. 
              Les modifications ne sont pas possibles hors ligne.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
