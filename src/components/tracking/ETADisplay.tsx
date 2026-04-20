import { motion } from "framer-motion";
import { Navigation, Clock, MapPin, RefreshCw, Loader2, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ETAData } from "@/hooks/useETACalculation";
import { useLiveRouteProgress } from "@/hooks/useLiveRouteProgress";

interface ETADisplayProps {
  eta: ETAData | null;
  loading: boolean;
  onRefresh: () => void;
  phase: "approaching" | "in_progress";
  totalDistanceKm?: number | null;
  pickupAddress?: string | null;
  destinationAddress?: string | null;
}

export function ETADisplay({ eta, loading, onRefresh, phase, totalDistanceKm, pickupAddress, destinationAddress }: ETADisplayProps) {
  const isApproaching = phase === "approaching";
  const { progressPercent } = useLiveRouteProgress({
    phase,
    eta,
    fallbackTotalDistanceKm: totalDistanceKm,
  });

  if (!eta && !loading) return null;

  const targetAddress = isApproaching ? pickupAddress : destinationAddress;
  const shortTarget = targetAddress
    ? (targetAddress.length > 55 ? targetAddress.substring(0, 52) + '...' : targetAddress)
    : null;

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
                {isApproaching ? 'Chauffeur en approche' : 'En route vers destination'}
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

          {/* Target address context */}
          {shortTarget && (
            <div className="flex items-start gap-2 mb-3 px-2.5 py-2 rounded-lg bg-background/60 border border-border/30">
              <Target className={`w-4 h-4 mt-0.5 shrink-0 ${isApproaching ? 'text-blue-500' : 'text-primary'}`} />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {isApproaching ? 'Vers votre position' : 'Destination'}
                </p>
                <p className="text-xs text-foreground font-medium truncate">{shortTarget}</p>
              </div>
            </div>
          )}

          {eta ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <Clock className={`w-5 h-5 shrink-0 ${isApproaching ? 'text-blue-500' : 'text-primary'}`} />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {isApproaching ? "Arrivée estimée\ndu chauffeur" : "Temps restant\njusqu'à destination"}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {eta.durationMin} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <MapPin className={`w-5 h-5 shrink-0 ${isApproaching ? 'text-blue-500' : 'text-primary'}`} />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {isApproaching ? "Distance\ndu chauffeur" : "Distance restante\njusqu'à destination"}
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
