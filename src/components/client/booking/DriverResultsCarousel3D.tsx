import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, Eye, Star } from 'lucide-react';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { formatDriverName } from '@/lib/formatDriverName';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const GLOW_THEMES = [
  { from: '217 91% 60%', to: '210 100% 45%' },
  { from: '270 70% 60%', to: '280 80% 50%' },
  { from: '25 95% 55%', to: '15 90% 50%' },
  { from: '175 70% 45%', to: '190 80% 40%' },
  { from: '340 75% 55%', to: '350 80% 48%' },
  { from: '45 90% 50%', to: '35 85% 45%' },
];

function estimateApproachTime(distanceMeters: number): string {
  const km = distanceMeters / 1000;
  let minutes: number;
  if (km < 5) minutes = Math.round(km * 2);
  else if (km < 20) minutes = Math.round(km * 1.2);
  else minutes = Math.round(km * 1);
  if (minutes < 1) return '< 1 min';
  return `~${minutes} min`;
}

interface DriverResultsCarousel3DProps {
  drivers: NearbyDriver[];
  selectedDriverIds: Set<string>;
  routeDistanceKm?: number | null;
  clientPaymentMethod?: 'card' | 'cash' | null;
}

export function DriverResultsCarousel3D({
  drivers,
  selectedDriverIds,
  routeDistanceKm,
  clientPaymentMethod,
}: DriverResultsCarousel3DProps) {
  const navigate = useNavigate();
  const [rotation, setRotation] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const rotationRef = useRef(0);

  const count = drivers.length;
  const angleStep = count > 0 ? 360 / count : 360;
  // Dynamic radius — bigger with more cards, minimum for 1 card
  const radius = count <= 1 ? 0 : Math.max(110, count * 50);

  // Continuous rotation animation
  useEffect(() => {
    if (isPaused) return;
    if (count === 0) return;

    if (count === 1) {
      // Single card: gentle floating Y-axis oscillation
      const startTime = performance.now();
      const oscillate = (time: number) => {
        const elapsed = (time - startTime) / 1000;
        const angle = Math.sin(elapsed * 0.8) * 12;
        setRotation(angle);
        animFrameRef.current = requestAnimationFrame(oscillate);
      };
      animFrameRef.current = requestAnimationFrame(oscillate);
      return () => cancelAnimationFrame(animFrameRef.current);
    }

    const speed = 0.2; // degrees per frame (~12°/s — slower for browsing)
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      rotationRef.current = (rotationRef.current + speed * (delta / 16.67)) % 360;
      setRotation(rotationRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [count, isPaused]);

  if (count === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ perspective: '900px' }}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      onPointerLeave={() => setIsPaused(false)}
    >
      {/* Container */}
      <div
        className="relative mx-auto flex items-center justify-center"
        style={{
          height: count === 1 ? '195px' : '210px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Glow ring under carousel */}
        {count > 1 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-25 pointer-events-none"
            style={{
              bottom: '5px',
              width: `${Math.min(radius * 1.6, 320)}px`,
              height: '16px',
              background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
              filter: 'blur(6px)',
            }}
          />
        )}

        {/* Rotating container */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: count > 1 ? `rotateY(${rotation}deg)` : 'none',
          }}
        >
          {drivers.map((driver, index) => {
            const angle = index * angleStep;
            const theme = GLOW_THEMES[index % GLOW_THEMES.length];
            const isSelected = selectedDriverIds.has(driver.driver_id);

            return (
              <div
                key={driver.driver_id}
                className="absolute"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: count > 1
                    ? `rotateY(${angle}deg) translateZ(${radius}px)`
                    : 'none',
                }}
              >
                <motion.div
                  style={{
                    transform: count > 1 ? `rotateY(${-angle - rotation}deg)` : `rotateY(${rotation}deg)`,
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                >
                  <ResultCard3D
                    driver={driver}
                    theme={theme}
                    rank={index + 1}
                    isSelected={isSelected}
                    routeDistanceKm={routeDistanceKm}
                    onViewProfile={() => navigate(`/chauffeur/${driver.driver_id}`)}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Individual card for the 3D carousel
function ResultCard3D({
  driver,
  theme,
  rank,
  isSelected,
  routeDistanceKm,
  onViewProfile,
}: {
  driver: NearbyDriver;
  theme: { from: string; to: string };
  rank: number;
  isSelected: boolean;
  routeDistanceKm?: number | null;
  onViewProfile: () => void;
}) {
  const rawName = driver.display_name || driver.company_name || 'Chauffeur VTC';
  const displayName = formatDriverName(rawName, false);
  const initials = rawName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const formatDistance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  const approachTime = estimateApproachTime(driver.distance_meters);

  const priceText = driver.estimated_price !== undefined && driver.estimated_price > 0
    ? `${driver.estimated_price.toFixed(2)}€`
    : null;

  return (
    <div className="relative w-[130px] select-none">
      {/* Animated glow border */}
      <div className={cn("absolute rounded-xl overflow-hidden", isSelected ? "-inset-[2px]" : "-inset-[1.5px]")}>
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, hsl(${theme.from}) 0%, transparent 10%, hsl(${theme.to}) 25%, transparent 35%, hsl(${theme.from}) 50%, transparent 60%, hsl(${theme.to}) 75%, transparent 85%, hsl(${theme.from}) 100%)`,
            animation: 'spin-slow 3s linear infinite',
          }}
        />
      </div>

      {isSelected && (
        <div
          className="absolute -inset-1 rounded-xl blur-md opacity-50 pointer-events-none"
          style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.4), hsl(${theme.to} / 0.4))` }}
        />
      )}

      <div
        className={cn(
          "relative flex flex-col rounded-xl overflow-hidden transition-all duration-300",
          "bg-gradient-to-b from-card via-card to-card/95 border border-transparent",
          isSelected && "scale-[1.03]"
        )}
        style={{
          boxShadow: isSelected
            ? `0 4px 24px 4px hsl(${theme.from} / 0.35)`
            : `0 4px 16px 2px hsl(${theme.from} / 0.15)`,
        }}
      >
        {/* Rank + check */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            {rank}
          </div>
          {isSelected && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
            >
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center px-2 pt-1 pb-1.5">
          <div
            className="rounded-full p-[2px]"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            <Avatar className="h-12 w-12 border-2 border-card">
              <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} className="object-cover object-[center_15%]" />
              <AvatarFallback className="font-bold text-xs text-white" style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.3), hsl(${theme.to} / 0.3))` }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <h4 className="font-bold text-foreground text-[11px] mt-1.5 truncate w-full text-center leading-tight">
            {displayName}
          </h4>

          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
            <span>{formatDistance(driver.distance_meters)}</span>
            <span className="text-border">·</span>
            <span style={{ color: `hsl(${theme.from})` }} className="font-semibold">{approachTime}</span>
          </div>
        </div>

        {/* Price */}
        <div
          className="py-1.5 text-center"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.from} / 0.12), hsl(${theme.to} / 0.18))`,
            borderTop: `1px solid hsl(${theme.from} / 0.2)`,
          }}
        >
          {priceText ? (
            <div
              className="text-base font-extrabold text-white tracking-tight"
              style={{ textShadow: `0 0 12px hsl(${theme.from} / 0.4)` }}
            >
              {priceText}
            </div>
          ) : (
            <div className="text-[10px] text-white/60 italic">Sur devis</div>
          )}
        </div>

        {/* Profile link */}
        <div className="px-2 py-1.5">
          <button
            className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
            onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
          >
            <Eye className="h-3 w-3" />
            Profil
          </button>
        </div>
      </div>
    </div>
  );
}
