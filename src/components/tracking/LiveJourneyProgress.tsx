import { motion } from "framer-motion";
import { MapPin, Flag, Car, Pause } from "lucide-react";
import type { ETAData } from "@/hooks/useETACalculation";
import { useLiveRouteProgress } from "@/hooks/useLiveRouteProgress";

interface LiveJourneyProgressProps {
  /** approaching = driver→client, in_progress = vehicle→destination */
  phase: "approaching" | "in_progress";
  /** Current live ETA. Null = loading */
  eta: ETAData | null;
  /**
   * Planned total trip distance (from `courses.distance_km`). Used as a
   * fallback only — we prefer to anchor on the FIRST live ETA reading of
   * the phase so progress starts at 0% honestly.
   */
  totalDistanceKm: number | null;
  fromLabel?: string;
  toLabel?: string;
}

/**
 * Visual journey progress bar. Truly reflects the driver's progress because:
 *  - The total distance is anchored to the first ETA reading of each phase
 *    (so the marker always starts at 0% when a phase begins).
 *  - The remaining distance comes from real Mapbox responses driven by GPS
 *    movement — there is NO artificial countdown.
 *  - When the driver is stationary for >30s a "Pause" indicator appears
 *    instead of a fake-moving marker.
 */
export function LiveJourneyProgress({
  phase,
  eta,
  totalDistanceKm,
  fromLabel,
  toLabel,
}: LiveJourneyProgressProps) {
  const isApproaching = phase === "approaching";
  const { progressPercent, isStalled } = useLiveRouteProgress({
    phase,
    eta,
    fallbackTotalDistanceKm: totalDistanceKm,
  });

  const accent = isApproaching ? "text-blue-500" : "text-primary";
  const accentBg = isApproaching ? "bg-blue-500" : "bg-primary";
  const accentSoft = isApproaching ? "bg-blue-500/10" : "bg-primary/10";
  const accentBorder = isApproaching ? "border-blue-500/40" : "border-primary/40";

  const formatDistance = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;

  return (
    <div className={`rounded-2xl border-2 ${accentBorder} ${accentSoft} p-4 space-y-3`}>
      {/* Header label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className={`w-4 h-4 ${accent}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>
            {isApproaching ? "Chauffeur en approche" : "En route vers destination"}
          </span>
        </div>
        {eta && (
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {Math.round(progressPercent)}%
          </span>
        )}
      </div>

      {/* Endpoint labels */}
      {(fromLabel || toLabel) && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
          <span className="truncate max-w-[45%]" title={fromLabel || ""}>
            {fromLabel || (isApproaching ? "Position chauffeur" : "Récupération")}
          </span>
          <span className="truncate max-w-[45%] text-right" title={toLabel || ""}>
            {toLabel || (isApproaching ? "Votre position" : "Destination")}
          </span>
        </div>
      )}

      {/* Track with moving marker */}
      <div className="relative h-12 px-2">
        {/* Track line */}
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${accentBg}`}
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "tween", ease: "easeOut", duration: 1.4 }}
          />
        </div>

        {/* Start pin */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <div className={`w-5 h-5 rounded-full border-2 border-background shadow-md flex items-center justify-center ${isApproaching ? "bg-muted-foreground/30" : "bg-emerald-500"}`}>
            <MapPin className="w-2.5 h-2.5 text-background" strokeWidth={3} />
          </div>
        </div>

        {/* End pin (flag) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
          <div className={`w-5 h-5 rounded-full border-2 border-background shadow-md flex items-center justify-center ${accentBg}`}>
            <Flag className="w-2.5 h-2.5 text-background" strokeWidth={3} />
          </div>
        </div>

        {/* Moving marker — animates in sync with REAL progress */}
        <motion.div
          className="absolute top-1/2 z-20"
          initial={false}
          animate={{ left: `${progressPercent}%` }}
          transition={{ type: "tween", ease: "easeOut", duration: 1.4 }}
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div className="relative">
            <div className={`w-10 h-10 rounded-full ${accentBg} border-[3px] border-background shadow-xl flex items-center justify-center`}>
              <Car className="w-5 h-5 text-background" strokeWidth={2.5} />
            </div>
            <span
              className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                isStalled ? "bg-amber-500" : "bg-emerald-500"
              }`}
            >
              {!isStalled && (
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
              )}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Stall hint */}
      {isStalled && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          <Pause className="w-3 h-3" />
          {isApproaching
            ? "Le chauffeur est momentanément à l'arrêt"
            : "Véhicule à l'arrêt (feu / circulation)"}
        </div>
      )}

      {/* Live metrics */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl bg-background/80 border border-border/50 p-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {isApproaching ? "Arrivée dans" : "Temps restant"}
          </p>
          <motion.p
            key={eta?.durationMin ?? "loading"}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="text-xl font-black text-foreground tabular-nums"
          >
            {eta ? (eta.durationMin === 0 ? "Arrivé" : `${eta.durationMin} min`) : "—"}
          </motion.p>
        </div>
        <div className="rounded-xl bg-background/80 border border-border/50 p-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Distance restante
          </p>
          <motion.p
            key={`d-${eta?.distanceKm ?? "loading"}`}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="text-xl font-black text-foreground tabular-nums"
          >
            {eta ? formatDistance(eta.distanceKm) : "—"}
          </motion.p>
        </div>
      </div>
    </div>
  );
}
