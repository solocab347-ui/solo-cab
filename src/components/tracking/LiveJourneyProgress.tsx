import { motion } from "framer-motion";
import { MapPin, Flag, Car, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ETAData } from "@/hooks/useETACalculation";

interface LiveJourneyProgressProps {
  /** approaching = driver→client, in_progress = vehicle→destination */
  phase: "approaching" | "in_progress";
  /** Current live ETA (interpolated). Null = loading */
  eta: ETAData | null;
  /** Total trip distance — used to compute % progress */
  totalDistanceKm: number | null;
  /** Optional driver photo (shown on the moving marker for approaching phase) */
  driverPhotoUrl?: string | null;
  driverName?: string | null;
  /** Address labels for endpoints */
  fromLabel?: string;
  toLabel?: string;
}

/**
 * Visual journey progress bar showing the moving driver/vehicle along
 * a horizontal track between origin and destination.
 *
 * - Smooth movement powered by interpolated ETA (no jumps)
 * - Photo of driver during approach phase (humanized)
 * - Car icon during in_progress phase
 */
export function LiveJourneyProgress({
  phase,
  eta,
  totalDistanceKm,
  driverPhotoUrl,
  driverName,
  fromLabel,
  toLabel,
}: LiveJourneyProgressProps) {
  const isApproaching = phase === "approaching";

  // Compute progress %: (total - remaining) / total
  let progressPct = 0;
  if (eta && totalDistanceKm && totalDistanceKm > 0) {
    progressPct = Math.max(0, Math.min(100, ((totalDistanceKm - eta.distanceKm) / totalDistanceKm) * 100));
  } else if (eta && eta.distanceKm === 0) {
    progressPct = 100;
  }

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
          {isApproaching ? (
            <User className={`w-4 h-4 ${accent}`} />
          ) : (
            <Car className={`w-4 h-4 ${accent}`} />
          )}
          <span className={`text-xs font-bold uppercase tracking-wider ${accent}`}>
            {isApproaching ? "Chauffeur en approche" : "En route vers destination"}
          </span>
        </div>
        {eta && (
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {Math.round(progressPct)}%
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
          {/* Filled portion (smooth animation via framer-motion) */}
          <motion.div
            className={`h-full rounded-full ${accentBg}`}
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "tween", ease: "linear", duration: 0.9 }}
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

        {/* Moving marker (photo OR car) — animates left:0% → 100% smoothly */}
        <motion.div
          className="absolute top-1/2 z-20"
          initial={false}
          animate={{ left: `${progressPct}%` }}
          transition={{ type: "tween", ease: "linear", duration: 0.9 }}
          style={{ transform: "translate(-50%, -50%)" }}
        >
          {isApproaching ? (
            // Driver photo bubble
            <div className="relative">
              <Avatar className={`w-10 h-10 border-[3px] border-background shadow-xl ring-2 ${isApproaching ? "ring-blue-500" : "ring-primary"}`}>
                {driverPhotoUrl && <AvatarImage src={driverPhotoUrl} alt={driverName || "Chauffeur"} />}
                <AvatarFallback className="bg-blue-500 text-white text-xs font-bold">
                  {driverName ? driverName.charAt(0).toUpperCase() : "C"}
                </AvatarFallback>
              </Avatar>
              {/* Pulsing dot */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </span>
            </div>
          ) : (
            // Vehicle marker
            <div className="relative">
              <div className={`w-10 h-10 rounded-full ${accentBg} border-[3px] border-background shadow-xl flex items-center justify-center`}>
                <Car className="w-5 h-5 text-background" strokeWidth={2.5} />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Live metrics: minutes + km, smoothly updated */}
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
