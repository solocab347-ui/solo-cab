/**
 * Tutoriel chauffeur immersif — version 2 (slides plein écran).
 *
 * 5 slides avec maquettes animées :
 *   1. Bienvenue & philosophie SoloCab
 *   2. Votre QR code expliqué (avec maquette QR)
 *   3. Ce que voit votre client (maquette page mobile)
 *   4. Partager votre lien (maquette messagerie)
 *   5. Conclusion & "à vos clients !"
 *
 * Cap : voir tutorialState.ts (3 propositions max OU 1 complétion).
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  X,
  QrCode,
  Smartphone,
  Share2,
  Sparkles,
  Rocket,
  Check,
  MessageCircle,
  Mail,
  Coins,
  Star,
  ShieldCheck,
  Users,
} from "lucide-react";

export interface DriverTutorialProps {
  isVisible: boolean;
  onNavigateToTab: (tab: string) => void;
  /** Appelé quand l'utilisateur termine le tutoriel jusqu'au bout. */
  onComplete: () => void;
  /** Appelé quand l'utilisateur ferme/saute. Différent de onComplete. */
  onDismiss?: () => void;
}

type SlideId = "welcome" | "qrcode" | "client" | "share" | "done";

const SLIDES: SlideId[] = ["welcome", "qrcode", "client", "share", "done"];

export function DriverTutorial({
  isVisible,
  onNavigateToTab,
  onComplete,
  onDismiss,
}: DriverTutorialProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isVisible) setIndex(0);
  }, [isVisible]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  }, []);
  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleFinish = useCallback(() => {
    onNavigateToTab("qrcode");
    onComplete();
  }, [onNavigateToTab, onComplete]);

  const handleSkip = useCallback(() => {
    if (onDismiss) onDismiss();
    else onComplete();
  }, [onDismiss, onComplete]);

  if (!isVisible) return null;

  const current = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
      }}
    >
      {/* Header : progression + skip */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-3">
        <div className="flex-1 flex gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= index ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          aria-label="Fermer le tutoriel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-y-auto px-4">
        <AnimatePresence mode="wait">
          {current === "welcome" && <WelcomeSlide key="welcome" />}
          {current === "qrcode" && <QrCodeSlide key="qrcode" />}
          {current === "client" && <ClientSlide key="client" />}
          {current === "share" && <ShareSlide key="share" />}
          {current === "done" && <DoneSlide key="done" />}
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={index === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>
        <div className="flex-1 text-center text-xs text-muted-foreground">
          {index + 1} / {SLIDES.length}
        </div>
        {isLast ? (
          <Button
            size="sm"
            onClick={handleFinish}
            className="gap-1 bg-gradient-premium text-white font-semibold"
          >
            <Rocket className="w-4 h-4" />
            J'ai compris
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={goNext}
            className="gap-1 bg-gradient-premium text-white font-semibold"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Slides ─────────────────────────────────────────────────────────────────

const slideVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
};

function SlideShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-md mx-auto py-4 space-y-5"
    >
      {children}
    </motion.div>
  );
}

// 1. Welcome / Philosophie
function WelcomeSlide() {
  return (
    <SlideShell>
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 14, delay: 0.1 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-gradient-premium flex items-center justify-center shadow-elegant"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold leading-tight">
          Bienvenue sur <span className="text-primary">SoloCab</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          La plateforme qui vous appartient. Vos tarifs, vos clients,
          vos revenus. Aucune commission cachée.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { Icon: Coins, label: "Vos tarifs", sub: "Vous décidez" },
          { Icon: Users, label: "Vos clients", sub: "À vie" },
          { Icon: ShieldCheck, label: "0,50 €", sub: "Frais fixe" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="rounded-xl bg-card border border-border/60 p-3 text-center"
          >
            <item.Icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-xs font-semibold">{item.label}</div>
            <div className="text-[10px] text-muted-foreground">{item.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" /> CE QUE NOUS ALLONS VOIR
        </p>
        <ul className="space-y-1.5 text-sm">
          {[
            "Comment fonctionne votre QR code personnel",
            "Ce que voit le client après le scan",
            "Comment partager votre lien (SMS, WhatsApp, e-mail)",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <span className="text-foreground/85">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </SlideShell>
  );
}

// 2. QR Code expliqué — avec maquette QR animée
function QrCodeSlide() {
  return (
    <SlideShell>
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <QrCode className="w-3.5 h-3.5" /> ÉTAPE 1
        </div>
        <h2 className="text-xl font-bold">Votre QR code personnel</h2>
        <p className="text-sm text-muted-foreground">
          Unique, généré pour vous. Imprimez-le, collez-le, partagez-le.
        </p>
      </div>

      {/* Maquette QR */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", damping: 18 }}
        className="mx-auto rounded-2xl bg-card border-2 border-primary/30 p-5 max-w-[220px] shadow-elegant"
      >
        <div className="aspect-square bg-white rounded-lg p-3 flex items-center justify-center">
          <FakeQrCode />
        </div>
        <div className="mt-3 text-center">
          <div className="text-xs font-bold text-foreground">SoloCab</div>
          <div className="text-[10px] text-muted-foreground">votre nom · votre véhicule</div>
        </div>
      </motion.div>

      <div className="space-y-2">
        {[
          { num: "1", text: "Le client scanne avec l'appareil photo de son téléphone" },
          { num: "2", text: "Il atterrit directement sur VOTRE page de réservation" },
          { num: "3", text: "Il devient votre client — pour cette course et les suivantes" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-start gap-3 bg-muted/40 rounded-lg p-3"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {item.num}
            </div>
            <p className="text-sm text-foreground/85 pt-0.5">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
}

// 3. Page client — maquette mobile animée
function ClientSlide() {
  return (
    <SlideShell>
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Smartphone className="w-3.5 h-3.5" /> ÉTAPE 2
        </div>
        <h2 className="text-xl font-bold">Ce que voit votre client</h2>
        <p className="text-sm text-muted-foreground">
          Une page propre, à votre nom. Pas d'algorithme, pas d'enchère.
        </p>
      </div>

      {/* Maquette mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="mx-auto max-w-[240px] rounded-[28px] border-[6px] border-foreground/80 bg-background overflow-hidden shadow-elegant"
      >
        <div className="bg-foreground/80 h-4 flex items-center justify-center">
          <div className="w-12 h-1 bg-background/40 rounded-full" />
        </div>
        <div className="p-3 space-y-2.5 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs font-bold">
              S
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-foreground">Réserver avec</div>
              <div className="text-xs font-bold text-primary">Votre Chauffeur</div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-lg bg-card border border-border/40 p-2 space-y-1.5"
          >
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Départ</span>
            </div>
            <div className="text-[11px] font-medium truncate">12 rue de la République</div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Arrivée</span>
            </div>
            <div className="text-[11px] font-medium truncate">Gare du Nord</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="rounded-lg bg-gradient-premium text-white text-center py-2 text-xs font-bold"
          >
            Réserver — 18,50 €
          </motion.div>
        </div>
      </motion.div>

      <div className="rounded-xl bg-success/10 border border-success/20 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-success flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Le client RÉSERVE DIRECTEMENT avec vous
        </p>
        <p className="text-xs text-foreground/70 leading-relaxed">
          Pas de mise aux enchères, pas d'attribution aléatoire.
          La course est pour vous — vous gardez 100% du tarif moins
          0,50 € de frais fixe.
        </p>
      </div>
    </SlideShell>
  );
}

// 4. Partage — maquette messagerie
function ShareSlide() {
  return (
    <SlideShell>
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Share2 className="w-3.5 h-3.5" /> ÉTAPE 3
        </div>
        <h2 className="text-xl font-bold">Partagez votre lien</h2>
        <p className="text-sm text-muted-foreground">
          Pas besoin de QR code physique. Envoyez votre lien par message.
        </p>
      </div>

      {/* Maquette conversation WhatsApp */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-auto max-w-[260px] rounded-2xl border border-border bg-card p-3 space-y-2 shadow-md"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-xs font-semibold">Marie · cliente</div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-muted/60 rounded-lg rounded-tl-none px-2.5 py-1.5 text-[11px] max-w-[80%]"
        >
          Bonjour, vous êtes dispo demain matin ?
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-primary text-primary-foreground rounded-lg rounded-tr-none px-2.5 py-1.5 text-[11px] max-w-[85%] ml-auto"
        >
          Bonjour Marie ! Réservez ici directement 👉
          <div className="mt-1 text-[10px] underline opacity-90">
            solocab.fr/r/votre-nom
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { Icon: MessageCircle, label: "WhatsApp" },
          { Icon: Smartphone, label: "SMS" },
          { Icon: Mail, label: "E-mail" },
        ].map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.08 }}
            className="rounded-xl bg-muted/40 border border-border/40 p-3 text-center"
          >
            <c.Icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-[10px] font-medium">{c.label}</div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground italic">
        Pratique pour vos clients réguliers, recommandations ou cartes de visite.
      </p>
    </SlideShell>
  );
}

// 5. Conclusion
function DoneSlide() {
  return (
    <SlideShell>
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 0.1 }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center shadow-elegant"
        >
          <Rocket className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold">Vous êtes prêt !</h2>
        <p className="text-sm text-muted-foreground leading-relaxed px-2">
          Chaque client scanné devient votre client.
          Montrez votre QR code après chaque course pour fidéliser
          vos passagers.
        </p>
      </div>

      <div className="rounded-xl bg-success/10 border border-success/20 p-4 space-y-2.5">
        {[
          "Votre QR code est prêt à être utilisé",
          "Votre lien est partageable en un clic",
          "Frais fixe : 0,50 € par course (pas de % sur le prix)",
        ].map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-start gap-2 text-sm"
          >
            <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <span className="text-foreground/85">{t}</span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
        <p className="text-xs text-primary font-semibold">
          💡 Astuce
        </p>
        <p className="text-xs text-foreground/75 mt-1">
          Vous pourrez relancer ce tutoriel à tout moment depuis
          <strong> Réglages → Aide</strong>.
        </p>
      </div>
    </SlideShell>
  );
}

// ─── Faux QR code décoratif (SVG) ───────────────────────────────────────────
function FakeQrCode() {
  // Pattern simple pour évoquer un QR sans en générer un vrai
  const cells = Array.from({ length: 9 * 9 }, (_, i) => {
    // Pseudo-random stable pour le rendu
    const x = i % 9;
    const y = Math.floor(i / 9);
    const isCorner =
      (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
    const filled = isCorner || ((x * 7 + y * 13 + 3) % 5 < 2);
    return { i, filled };
  });
  return (
    <svg viewBox="0 0 9 9" className="w-full h-full">
      {cells.map(({ i, filled }) =>
        filled ? (
          <rect
            key={i}
            x={i % 9}
            y={Math.floor(i / 9)}
            width="1"
            height="1"
            fill="hsl(var(--foreground))"
          />
        ) : null,
      )}
      {/* Coins emblématiques d'un QR */}
      {[
        [0, 0],
        [6, 0],
        [0, 6],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="3" height="3" fill="hsl(var(--foreground))" />
          <rect x={x + 0.5} y={y + 0.5} width="2" height="2" fill="white" />
          <rect x={x + 1} y={y + 1} width="1" height="1" fill="hsl(var(--foreground))" />
        </g>
      ))}
    </svg>
  );
}
