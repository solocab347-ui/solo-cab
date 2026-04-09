import { useState, useCallback, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from "react-joyride";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Rocket, QrCode, ChevronRight, ChevronLeft, X, 
  Smartphone, ExternalLink, Share2, CheckCircle2,
  Sparkles
} from "lucide-react";

// ─── Welcome overlay (shown before Joyride starts) ──────────────────
function WelcomeOverlay({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-border/50"
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-success to-success/80 p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4"
          >
            <Rocket className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-1">
            Bienvenue sur SoloCab
          </h2>
          <p className="text-sm text-white/80">
            Vous pouvez maintenant accepter vos propres clients.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-foreground/80 text-center leading-relaxed">
            Nous allons vous montrer comment obtenir votre <strong>premier client</strong> en quelques étapes simples.
          </p>

          <div className="space-y-2">
            {[
              "Configurer vos tarifs",
              "Découvrir votre QR code",
              "Tester avec un vrai scan",
              "Partager votre lien",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2.5 text-sm text-foreground/70"
              >
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                {item}
              </motion.div>
            ))}
          </div>

          <Button
            onClick={onStart}
            className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90 text-white gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Commencer
          </Button>
          <button
            onClick={onSkip}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Passer le tutoriel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Interactive test overlay (Step 4) ──────────────────────────────
function InteractiveTestOverlay({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-border/50"
      >
        <div className="bg-gradient-to-br from-primary to-accent p-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">Essayez maintenant !</h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-3">
            {[
              { num: "1", text: "Prenez un autre téléphone" },
              { num: "2", text: "Scannez votre QR code affiché" },
              { num: "3", text: "Ouvrez la page de réservation client" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                  {item.num}
                </div>
                <p className="text-sm text-foreground/80 pt-1">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 h-11 gap-2 text-sm"
            >
              Passer
            </Button>
            <Button
              onClick={onDone}
              className="flex-1 h-11 gap-2 text-sm bg-success hover:bg-success/90 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" />
              J'ai testé
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Conclusion overlay (Step 7) ────────────────────────────────────
function ConclusionOverlay({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-border/50"
      >
        <div className="bg-gradient-to-br from-success to-emerald-600 p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4"
          >
            <Rocket className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">Vous êtes prêt !</h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-3 text-center">
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong>Chaque client scanné devient votre client.</strong>
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Montrez votre QR code après chaque course pour fidéliser vos passagers.
            </p>
          </div>

          <div className="bg-success/10 rounded-xl p-3 space-y-2">
            {[
              "✓ Vos tarifs sont configurés",
              "✓ Votre QR code est prêt",
              "✓ Vous savez partager votre lien",
            ].map((item, i) => (
              <p key={i} className="text-xs text-success font-medium">{item}</p>
            ))}
          </div>

          <Button
            onClick={onFinish}
            className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90 text-white gap-2"
          >
            <Rocket className="w-5 h-5" />
            Terminer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Custom tooltip for Joyride ─────────────────────────────────────
function TutorialTooltip({
  continuous,
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
  isLastStep,
}: any) {
  return (
    <div
      {...tooltipProps}
      className="bg-card rounded-2xl shadow-2xl max-w-[340px] w-full border border-border/50 overflow-hidden"
    >
      {/* Progress */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-success to-success/80 transition-all duration-500"
          style={{ width: `${((index + 1) / size) * 100}%` }}
        />
      </div>

      <div className="p-4">
        {step.title && (
          <h4 className="font-bold text-base text-foreground mb-1">{step.title}</h4>
        )}
        <div className="text-sm text-foreground/80 leading-relaxed">
          {step.content}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/30">
        {index > 0 && (
          <Button
            {...backProps}
            variant="ghost"
            size="sm"
            className="gap-1 text-xs h-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Précédent
          </Button>
        )}
        <div className="flex-1" />
        <button
          {...skipProps}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          Quitter
        </button>
        <Button
          {...primaryProps}
          size="sm"
          className="gap-1 h-8 px-3 text-xs font-semibold bg-success hover:bg-success/90 text-white"
        >
          Suivant
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Tutorial Component ────────────────────────────────────────
export interface DriverTutorialProps {
  isVisible: boolean;
  onNavigateToTab: (tab: string) => void;
  onComplete: () => void;
}

type Phase = "welcome" | "joyride" | "test" | "conclusion" | "done";

const JOYRIDE_STEPS: Step[] = [
  // Step 2 — Tarifs (navigates to settings tab)
  {
    target: '[data-tutorial="pricing-section"]',
    title: "Vos tarifs",
    content: (
      <div className="space-y-2">
        <p>Définissez vos prix pour accepter vos réservations.</p>
        <p className="text-muted-foreground text-xs">
          Vos clients paieront directement selon ces tarifs.
        </p>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
    disableOverlayClose: true,
  },
  // Step 3 — QR Code (navigates to qrcode tab)
  {
    target: '[data-tutorial="qr-code"]',
    title: "Votre QR code client",
    content: (
      <div className="space-y-2">
        <p>Voici votre QR code client.</p>
        <p className="text-muted-foreground text-xs">
          Montrez-le à vos passagers après chaque course.
        </p>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
    disableOverlayClose: true,
  },
  // Step 5 — Page client explanation
  {
    target: '[data-tutorial="qr-code"]',
    title: "Ce que voit votre client",
    content: (
      <div className="space-y-2">
        <p>Voici ce que votre client voit après le scan.</p>
        <p className="text-muted-foreground text-xs">
          Le client peut réserver directement avec vous — sans intermédiaire.
        </p>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
    disableOverlayClose: true,
  },
  // Step 6 — Share button
  {
    target: '[data-tutorial="share-button"]',
    title: "Partagez votre lien",
    content: (
      <div className="space-y-2">
        <p>Vous pouvez aussi envoyer votre lien à vos clients par SMS, WhatsApp ou e-mail.</p>
        <p className="text-muted-foreground text-xs">
          Pratique pour les clients réguliers ou les recommandations.
        </p>
      </div>
    ),
    placement: "bottom",
    disableBeacon: true,
    disableOverlayClose: true,
  },
];

export function DriverTutorial({ isVisible, onNavigateToTab, onComplete }: DriverTutorialProps) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [runJoyride, setRunJoyride] = useState(false);
  const [joyrideStepIndex, setJoyrideStepIndex] = useState(0);

  // Reset when visibility changes
  useEffect(() => {
    if (isVisible) {
      setPhase("welcome");
      setRunJoyride(false);
      setJoyrideStepIndex(0);
    }
  }, [isVisible]);

  const handleStartTour = useCallback(() => {
    // Navigate to settings tab to show pricing
    onNavigateToTab("settings");
    setPhase("joyride");
    // Small delay to let tab render
    setTimeout(() => {
      setJoyrideStepIndex(0);
      setRunJoyride(true);
    }, 600);
  }, [onNavigateToTab]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    // User finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunJoyride(false);
      setPhase("conclusion");
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Navigate to appropriate tab before showing next step
      if (action !== ACTIONS.PREV) {
        if (nextIndex === 0) {
          // Pricing step → settings tab
          onNavigateToTab("settings");
        } else if (nextIndex === 1 || nextIndex === 2 || nextIndex === 3) {
          // QR code / client view / share → qrcode tab
          onNavigateToTab("qrcode");
        }

        // After step 1 (qr code shown), show interactive test
        if (nextIndex === 2) {
          setRunJoyride(false);
          setPhase("test");
          return;
        }
      } else {
        // Going back
        if (nextIndex === 0) {
          onNavigateToTab("settings");
        } else {
          onNavigateToTab("qrcode");
        }
      }

      // Delay to let tab render
      setTimeout(() => {
        setJoyrideStepIndex(nextIndex);
      }, 400);
    }
  }, [onNavigateToTab]);

  const handleTestDone = useCallback(() => {
    setPhase("joyride");
    onNavigateToTab("qrcode");
    setTimeout(() => {
      setJoyrideStepIndex(2); // Continue from step 5 (client page)
      setRunJoyride(true);
    }, 400);
  }, [onNavigateToTab]);

  const handleFinish = useCallback(() => {
    setPhase("done");
    onNavigateToTab("home");
    onComplete();
  }, [onNavigateToTab, onComplete]);

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {phase === "welcome" && (
          <WelcomeOverlay
            key="welcome"
            onStart={handleStartTour}
            onSkip={handleFinish}
          />
        )}
        {phase === "test" && (
          <InteractiveTestOverlay
            key="test"
            onDone={handleTestDone}
            onSkip={handleTestDone}
          />
        )}
        {phase === "conclusion" && (
          <ConclusionOverlay
            key="conclusion"
            onFinish={handleFinish}
          />
        )}
      </AnimatePresence>

      {phase === "joyride" && (
        <Joyride
          steps={JOYRIDE_STEPS}
          stepIndex={joyrideStepIndex}
          run={runJoyride}
          continuous
          scrollToFirstStep
          showSkipButton
          disableCloseOnEsc={false}
          disableOverlayClose
          spotlightClicks={false}
          callback={handleJoyrideCallback}
          tooltipComponent={TutorialTooltip}
          floaterProps={{
            disableAnimation: true,
          }}
          styles={{
            options: {
              zIndex: 9998,
              arrowColor: 'hsl(var(--card))',
              overlayColor: 'rgba(0, 0, 0, 0.75)',
            },
            spotlight: {
              borderRadius: 12,
            },
          }}
        />
      )}
    </>
  );
}
