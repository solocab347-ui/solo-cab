import { motion } from "framer-motion";
import { Navigation, Clock, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ETAData } from "@/hooks/useETACalculation";

interface ETADisplayProps {
  eta: ETAData | null;
  loading: boolean;
  onRefresh: () => void;
  phase: "approaching" | "in_progress";
  totalDistanceKm?: number | null;
}

export function ETADisplay({ eta, loading, onRefresh, phase, totalDistanceKm }: ETADisplayProps) {
  if (!eta && !loading) return null;

  const isApproaching = phase === "approaching";
  const progressPercent = totalDistanceKm && eta
    ? Math.max(0, Math.min(100, ((totalDistanceKm - eta.distanceKm) / totalDistanceKm) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-2 ${isApproaching ? 'border-blue-500/30 bg-blue-500/5' : 'border-primary/30 bg-primary/5'}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isApproaching ? 'bg-blue-500/15' : 'bg-primary/15'}`}>
                <Navigation className={`w-4 h-4 ${isApproaching ? 'text-blue-500' : 'text-primary'}`} />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {isApproaching ? 'Chauffeur en approche' : 'Trajet en cours'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>

          {eta ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <Clock className={`w-5 h-5 shrink-0 ${isApproaching ? 'text-blue-500' : 'text-primary'}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isApproaching ? 'Arrivée estimée' : 'Temps restant'}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {eta.durationMin} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <MapPin className={`w-5 h-5 shrink-0 ${isApproaching ? 'text-blue-500' : 'text-primary'}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isApproaching ? 'Distance' : 'Distance restante'}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {eta.distanceKm < 1
                        ? `${Math.round(eta.distanceKm * 1000)} m`
                        : `${eta.distanceKm} km`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar for in_progress */}
              {!isApproaching && totalDistanceKm && totalDistanceKm > 0 && (
                <div className="space-y-1.5">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {Math.round(progressPercent)}% du trajet effectué
                  </p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-1">
                Mis à jour à {eta.lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Calcul en cours...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
