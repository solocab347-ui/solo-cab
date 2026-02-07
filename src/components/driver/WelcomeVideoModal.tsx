import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize,
  CheckCircle2,
  Rocket,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WelcomeVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  videoUrl?: string;
  onComplete: () => void;
}

export function WelcomeVideoModal({
  open,
  onOpenChange,
  driverId,
  videoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder - à remplacer
  onComplete
}: WelcomeVideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [completing, setCompleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pour les vidéos YouTube, on simule la progression
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const isYouTube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be');

  useEffect(() => {
    if (open && isYouTube) {
      // Simuler la progression pour YouTube (minimum 30 secondes)
      const interval = setInterval(() => {
        setSimulatedProgress(prev => {
          const next = prev + (100 / 30); // 30 secondes minimum
          if (next >= 100) {
            setCanClose(true);
            clearInterval(interval);
            return 100;
          }
          return next;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [open, isYouTube]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      
      // Permettre de fermer après 80% de la vidéo
      if (currentProgress >= 80) {
        setCanClose(true);
      }
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await supabase
        .from('drivers')
        .update({
          welcome_video_watched: true,
          welcome_video_watched_at: new Date().toISOString()
        })
        .eq('id', driverId);

      toast.success('🎉 Bienvenue dans l\'aventure SoloCab !');
      onComplete();
    } catch (error) {
      console.error('Error marking video as watched:', error);
      toast.error('Erreur, veuillez réessayer');
    } finally {
      setCompleting(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const currentProgress = isYouTube ? simulatedProgress : progress;
  const canProceed = isYouTube ? simulatedProgress >= 100 : canClose;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Empêcher la fermeture si la vidéo n'est pas terminée
      if (!newOpen && !canProceed) {
        toast.info('Regardez la vidéo jusqu\'au bout pour continuer');
        return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-900 border-emerald-500/30">
        <DialogHeader className="p-4 bg-gradient-to-r from-emerald-500/20 to-primary/20">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5 text-emerald-400" />
            Bienvenue sur SoloCab !
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Découvrez tout ce que SoloCab peut faire pour vous en quelques minutes
          </DialogDescription>
        </DialogHeader>

        {/* Video container */}
        <div className="relative aspect-video bg-black">
          {isYouTube ? (
            <iframe
              src={`${videoUrl}?autoplay=1&rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setCanClose(true)}
              />
              
              {/* Video controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  
                  <div className="flex-1">
                    <Progress value={progress} className="h-1" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Progress and CTA */}
        <div className="p-4 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-3">
            <Progress 
              value={currentProgress} 
              className={cn(
                "flex-1 h-2",
                canProceed && "bg-emerald-500/20"
              )}
            />
            <span className="text-xs text-white/60 min-w-[60px] text-right">
              {Math.round(currentProgress)}%
            </span>
          </div>

          {/* CTA Button */}
          {canProceed ? (
            <Button
              onClick={handleComplete}
              disabled={completing}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-primary font-semibold"
            >
              {completing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  C'est parti ! 🚀
                </>
              )}
            </Button>
          ) : (
            <div className="text-center text-white/60 text-sm py-2">
              <p>Regardez la vidéo pour découvrir les fonctionnalités de SoloCab</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
