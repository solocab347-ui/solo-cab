import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Clock, Star } from 'lucide-react';
import { formatDriverName } from '@/lib/formatDriverName';

interface CarouselDriver {
  driver_id: string;
  driver_name: string;
  photo_url: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  estimated_price?: number;
  distance_text?: string;
}

interface DriverCarousel3DProps {
  drivers: CarouselDriver[];
  acceptedDriverId?: string | null;
  isSearching: boolean;
}

export function DriverCarousel3D({ drivers, acceptedDriverId, isSearching }: DriverCarousel3DProps) {
  const [rotation, setRotation] = useState(0);
  const [showAcceptReveal, setShowAcceptReveal] = useState(false);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const rotationRef = useRef(0);

  const count = drivers.length;
  const angleStep = count > 0 ? 360 / count : 360;
  const radius = Math.max(100, count * 22); // Dynamic radius based on count

  // Continuous rotation animation
  useEffect(() => {
    if (!isSearching || count === 0 || showAcceptReveal) return;

    const speed = 0.3; // degrees per frame (~18°/s)
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
  }, [isSearching, count, showAcceptReveal]);

  // When a driver accepts, stop rotation and reveal
  useEffect(() => {
    if (!acceptedDriverId) return;
    
    // Find the accepted driver's index
    const acceptedIndex = drivers.findIndex(d => d.driver_id === acceptedDriverId);
    if (acceptedIndex === -1) return;

    // Calculate target rotation to center the accepted driver at front (0°)
    const targetAngle = -(acceptedIndex * angleStep);
    const currentRot = rotationRef.current % 360;
    let diff = targetAngle - currentRot;
    // Normalize to shortest path
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    
    const finalRotation = rotationRef.current + diff;
    
    // Animate to target
    cancelAnimationFrame(animFrameRef.current);
    
    const startRot = rotationRef.current;
    const duration = 800;
    const startTime = performance.now();
    
    const animateToTarget = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      rotationRef.current = startRot + (finalRotation - startRot) * eased;
      setRotation(rotationRef.current);
      
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateToTarget);
      } else {
        // After centering, trigger reveal
        setTimeout(() => setShowAcceptReveal(true), 300);
      }
    };
    
    animFrameRef.current = requestAnimationFrame(animateToTarget);
    
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [acceptedDriverId, drivers, angleStep]);

  if (count === 0) return null;

  const acceptedDriver = acceptedDriverId ? drivers.find(d => d.driver_id === acceptedDriverId) : null;

  return (
    <div className="relative w-full" style={{ perspective: '800px' }}>
      {/* 3D Carousel */}
      <AnimatePresence mode="wait">
        {!showAcceptReveal ? (
          <motion.div
            key="carousel"
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto"
            style={{ 
              height: count === 1 ? '160px' : '200px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Glow ring under the carousel */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-30"
              style={{
                bottom: '10px',
                width: `${radius * 1.8}px`,
                height: '20px',
                background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
            
            {/* Rotating container */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateY(${rotation}deg)`,
              }}
            >
              {drivers.map((driver, index) => {
                const angle = index * angleStep;
                const isAccepted = driver.status === 'accepted';
                const isRejected = driver.status === 'rejected';
                const isExpired = driver.status === 'expired';
                
                return (
                  <div
                    key={driver.driver_id}
                    className="absolute"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                      // Counter-rotate so cards always face the viewer
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        transform: `rotateY(${-angle - rotation}deg)`,
                        transition: 'transform 0.1s linear',
                      }}
                    >
                      <DriverCard3D
                        driver={driver}
                        isAccepted={isAccepted}
                        isRejected={isRejected}
                        isExpired={isExpired}
                        isPending={driver.status === 'pending'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : acceptedDriver ? (
          /* Acceptance Reveal */
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.3, rotateY: 180 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ 
              duration: 0.8,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="flex flex-col items-center py-4"
          >
            {/* Glowing ring behind avatar */}
            <motion.div
              className="relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
            >
              <motion.div
                className="absolute -inset-3 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, hsl(var(--primary)), hsl(142 71% 45%), hsl(var(--primary)))',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute -inset-4 rounded-full opacity-40"
                style={{
                  background: 'radial-gradient(circle, hsl(142 71% 45% / 0.4), transparent 70%)',
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Avatar className="h-20 w-20 border-4 border-background relative z-10 shadow-2xl">
                <AvatarImage src={acceptedDriver.photo_url || undefined} className="object-cover object-[center_15%]" />
                <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                  {acceptedDriver.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Checkmark badge */}
              <motion.div
                className="absolute -bottom-1 -right-1 z-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              className="mt-4 text-center space-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-xl font-bold text-foreground">
                {acceptedDriver.driver_name}
              </h3>
              <p className="text-sm text-green-500 font-semibold">
                A accepté votre course ! 🎉
              </p>
              {acceptedDriver.estimated_price && (
                <motion.div
                  className="inline-block mt-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-lg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {acceptedDriver.estimated_price.toFixed(2)}€
                </motion.div>
              )}
            </motion.div>

            {/* Confetti particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(45 93% 47%)', 'hsl(280 73% 60%)'][i % 4],
                  top: '40%',
                  left: '50%',
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 12) * Math.PI * 2) * (80 + Math.random() * 60),
                  y: Math.sin((i / 12) * Math.PI * 2) * (80 + Math.random() * 60) - 30,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.4 + Math.random() * 0.3,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// Individual driver card for the 3D carousel
function DriverCard3D({
  driver,
  isAccepted,
  isRejected,
  isExpired,
  isPending,
}: {
  driver: CarouselDriver;
  isAccepted: boolean;
  isRejected: boolean;
  isExpired: boolean;
  isPending: boolean;
}) {
  const initials = driver.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className={`
        relative w-[110px] flex flex-col items-center p-2.5 rounded-2xl border
        backdrop-blur-sm transition-all duration-300 select-none
        ${isAccepted 
          ? 'bg-green-500/15 border-green-500/40 shadow-[0_0_20px_hsl(142_71%_45%/0.3)]' 
          : isRejected 
            ? 'bg-destructive/10 border-destructive/30 opacity-60' 
            : isExpired
              ? 'bg-muted/30 border-border/30 opacity-50'
              : 'bg-card/90 border-border/50 shadow-lg shadow-primary/5'
        }
      `}
    >
      {/* Pending spinner */}
      {isPending && (
        <motion.div
          className="absolute -inset-[2px] rounded-2xl overflow-hidden"
          style={{ zIndex: -1 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, hsl(var(--primary)) 0%, transparent 30%, hsl(var(--primary)) 100%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-background shadow-md">
          <AvatarImage src={driver.photo_url || undefined} className="object-cover object-[center_15%]" />
          <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Status indicator */}
        {isAccepted && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="h-3 w-3 text-white" />
          </div>
        )}
        {isRejected && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
            <XCircle className="h-3 w-3 text-white" />
          </div>
        )}
        {isPending && (
          <div className="absolute -bottom-1 -right-1">
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent bg-background"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="mt-1.5 text-[10px] font-semibold text-foreground text-center truncate w-full leading-tight">
        {driver.driver_name}
      </p>

      {/* Price */}
      {driver.estimated_price && driver.estimated_price > 0 && (
        <p className="text-xs font-bold text-primary mt-0.5">
          {driver.estimated_price.toFixed(2)}€
        </p>
      )}

      {/* Status label */}
      {isAccepted && (
        <Badge className="mt-1 text-[8px] h-4 bg-green-500 text-white border-0 px-1.5">
          Accepté ✓
        </Badge>
      )}
      {isRejected && (
        <Badge variant="outline" className="mt-1 text-[8px] h-4 border-destructive/40 text-destructive px-1.5">
          Refusé
        </Badge>
      )}
      {isExpired && (
        <Badge variant="outline" className="mt-1 text-[8px] h-4 border-muted-foreground/30 text-muted-foreground px-1.5">
          Pas de réponse
        </Badge>
      )}
    </div>
  );
}
