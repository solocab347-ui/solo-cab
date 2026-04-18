import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Banknote,
  CreditCard,
  AlertTriangle,
  Loader2,
  ExternalLink,
  X,
  Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CourseIncidentReportDialog } from "./CourseIncidentReportDialog";
import { DriverRateClient } from "./DriverRateClient";
import { CashConfirmationDialog } from "./CashConfirmationDialog";

interface CourseCompletionScreenProps {
  courseId: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  driverId?: string;
  clientId?: string | null;
  guestPhone?: string | null;
  paymentResult: {
    success: boolean;
    status?: string;
    error?: string;
    alreadyPaid?: boolean;
  };
  onDismiss: () => void;
}

export function CourseCompletionScreen({
  courseId,
  clientName,
  amount,
  paymentMethod,
  driverId,
  clientId,
  guestPhone,
  paymentResult,
  onDismiss,
}: CourseCompletionScreenProps) {
  const [retrying, setRetrying] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [localResult, setLocalResult] = useState(paymentResult);
  const [switchedToCash, setSwitchedToCash] = useState(false);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);

  useEffect(() => {
    setLocalResult(paymentResult);
  }, [paymentResult]);

  const isOriginallyCard = paymentMethod === "card" || paymentMethod === "stripe" || paymentMethod === "card_online";
  const isCash = !isOriginallyCard || switchedToCash;
  const isCard = isOriginallyCard && !switchedToCash;
  const isProcessing = isCard && localResult.status === "processing";
  const isSuccess = localResult.success || localResult.alreadyPaid || switchedToCash;
  const isFailed = isCard && !isSuccess && !isProcessing;

  const handleRetryPayment = async () => {
    if (retrying) return; // Anti double-click
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("finalize-course-payment", {
        body: { course_id: courseId },
      });
      // Transient = lock contention. Soft retry once after the suggested delay.
      if (data?.transient && data?.retry_in_sec) {
        toast.info(`Paiement déjà en cours, nouvelle tentative dans ${data.retry_in_sec}s...`);
        await new Promise((r) => setTimeout(r, (data.retry_in_sec + 1) * 1000));
        const retry = await supabase.functions.invoke("finalize-course-payment", { body: { course_id: courseId } });
        if (retry.data?.success || retry.data?.already_paid || retry.data?.status === "succeeded") {
          toast.success("Paiement encaissé avec succès !");
          setLocalResult({ success: true, status: "succeeded" });
          return;
        }
      }
      if (error) throw error;
      if (data?.status === "succeeded" || data?.success || data?.already_paid) {
        toast.success("Paiement encaissé avec succès !");
        setLocalResult({ success: true, status: "succeeded" });
      } else {
        toast.error("Le paiement a échoué. Utilisez le lien ou encaissez en espèces.");
        setLocalResult({ success: false, status: "failed", error: data?.error || "Paiement refusé" });
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du paiement");
    } finally {
      setRetrying(false);
    }
  };

  // Cash switch is now gated by an anti-fraud confirmation dialog
  // (montant à retaper) handled by CashConfirmationDialog.
  const handleOpenCashDialog = () => setShowCashDialog(true);

  const handleCashConfirmed = () => {
    setSwitchedToCash(true);
    setLocalResult({ success: true, status: "succeeded" });
    toast.success("Course finalisée en espèces");
  };

  const handleSendPaymentLink = async () => {
    setSendingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-spontaneous-payment", {
        body: {
          amount,
          description: `Régularisation course - ${clientName}`,
          date: new Date().toISOString(),
          course_id: courseId, // ← lie le paiement à la course pour clôture auto via webhook
        },
      });
      if (error) throw error;
      if (data?.url) {
        await navigator.clipboard.writeText(data.url).catch(() => {});
        if (navigator.share) {
          await navigator.share({
            title: `Paiement de ${amount.toFixed(2)}€`,
            text: `Bonjour, veuillez procéder au paiement de ${amount.toFixed(2)}€ pour votre course.`,
            url: data.url,
          }).catch(() => {});
        }
        setLinkSent(true);
        toast.success("Lien envoyé. La course sera finalisée dès que le client paie.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du lien");
    } finally {
      setSendingLink(false);
    }
  };

  // Realtime: when the recovery link is paid (webhook updates the course),
  // mark the screen as success automatically — no manual refresh needed.
  useEffect(() => {
    if (!linkSent) return;
    const channel = supabase
      .channel(`course-recovery-${courseId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "courses", filter: `id=eq.${courseId}` },
        (payload: any) => {
          const next = payload.new || {};
          if (next.payment_status === "paid" && next.final_payment_status === "succeeded") {
            setLocalResult({ success: true, status: "succeeded" });
            toast.success("🎉 Paiement reçu — course finalisée !");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkSent, courseId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[99999] bg-background flex flex-col"
    >
      {/* Header — close button is disabled if payment failed (no escape hatch) */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h2 className="text-lg font-bold text-foreground">Récapitulatif</h2>
        {!isProcessing && !isFailed && (
          <Button variant="ghost" size="icon" onClick={onDismiss} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 px-5 space-y-6 overflow-y-auto pb-8">
        {/* Status Icon */}
        <div className="flex flex-col items-center pt-4">
          {isProcessing ? (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <h3 className="text-2xl font-black text-foreground">Finalisation...</h3>
              <p className="text-base text-muted-foreground font-medium mt-1">Paiement carte en cours de traitement</p>
            </>
          ) : isCash && isSuccess ? (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Banknote className="w-12 h-12 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-foreground">Course terminée</h3>
              <p className="text-base text-amber-600 font-medium mt-1">Paiement en espèces</p>
            </>
          ) : isCard && isSuccess ? (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-emerald-600">Course terminée</h3>
              <p className="text-base text-emerald-600/80 font-medium mt-1">Client débité par carte</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-2xl font-black text-destructive">Échec du paiement</h3>
              <p className="text-base text-destructive/80 font-medium mt-1">Le client n'a pas été débité</p>
            </>
          )}
        </div>

        {/* Amount Card */}
        <div className="bg-muted/50 border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Client</span>
            <span className="font-semibold text-foreground">{clientName}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Montant</span>
            <span className="text-2xl font-black text-foreground">{amount.toFixed(2)} €</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Moyen de paiement</span>
            <Badge variant="outline" className="text-sm gap-1.5">
              {isCash ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
              {isCash ? "Espèces" : "Carte bancaire"}
            </Badge>
          </div>
        </div>

        {/* Processing state */}
        {isProcessing && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-primary text-base">
                  Traitement du paiement en cours...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Le prélèvement sur la carte du client est en cours. Veuillez patienter quelques secondes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cash instructions */}
        {isCash && isSuccess && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Banknote className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300 text-base">
                  💵 Encaissez votre client en espèces
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                  Le paiement n'est <strong>pas automatique</strong> pour cette course.
                  Récupérez <strong>{amount.toFixed(2)} €</strong> directement auprès du client avant qu'il ne quitte le véhicule.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card success */}
        {isCard && isSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CreditCard className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-800 dark:text-emerald-300 text-base">
                  ✅ Paiement débité automatiquement
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                  Le client a été débité de <strong>{amount.toFixed(2)} €</strong> sur sa carte bancaire.
                  Vous n'avez <strong>rien à faire</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card failed - show recovery options */}
        {isFailed && (
          <div className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-destructive text-base">
                    ⚠️ Le paiement par carte a échoué
                  </p>
                  <p className="text-sm text-destructive/80 mt-2">
                    {localResult.error || "La capture n'a pas abouti."}
                    {" "}Choisissez une option ci-dessous.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 1: Retry card */}
            <Button
              onClick={handleRetryPayment}
              disabled={retrying}
              className="w-full h-14 rounded-2xl font-bold text-base"
              variant="outline"
            >
              {retrying ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              Réessayer le paiement carte
            </Button>

            {/* Option 2: Send payment link */}
            <Button
              onClick={handleSendPaymentLink}
              disabled={sendingLink || linkSent}
              className="w-full h-14 rounded-2xl font-bold text-base bg-primary hover:bg-primary/90"
            >
              {sendingLink ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : linkSent ? (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              ) : (
                <ExternalLink className="w-5 h-5 mr-2" />
              )}
              {linkSent ? "Lien envoyé !" : "Envoyer un lien de paiement"}
            </Button>

            {/* Option 3: Switch to cash (with anti-fraud amount re-entry) */}
            <Button
              onClick={handleOpenCashDialog}
              className="w-full h-14 rounded-2xl font-bold text-base bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Banknote className="w-5 h-5 mr-2" />
              Encaisser en espèces
            </Button>
          </div>
        )}
      </div>

      {/* Driver rates client */}
      {!isProcessing && isSuccess && driverId && (
        <div className="px-5 py-4 border-t border-border bg-muted/30">
          <DriverRateClient
            courseId={courseId}
            driverId={driverId}
            clientId={clientId}
            clientName={clientName}
          />
        </div>
      )}

      {/* Bottom actions: ZÉRO ZONE GRISE — pas de "Fermer" si paiement non validé */}
      {!isProcessing && (
        <div className="px-5 pb-6 pt-3 border-t border-border bg-background space-y-3">
          {isFailed ? (
            <div className="rounded-2xl bg-destructive/10 border-2 border-destructive/30 p-4 text-center">
              <p className="font-bold text-destructive text-sm">
                ⛔ La course ne peut pas être terminée sans paiement
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                Choisissez l'une des 3 options ci-dessus pour continuer
              </p>
            </div>
          ) : (
            <Button
              onClick={onDismiss}
              className="w-full h-14 rounded-2xl font-black text-base"
            >
              {isCash ? "J'ai encaissé, fermer" : "Fermer"}
            </Button>
          )}

          {driverId && !isFailed && (
            <Button
              variant="outline"
              onClick={() => setShowIncidentDialog(true)}
              className="w-full h-12 rounded-2xl text-sm gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Flag className="h-4 w-4" />
              Signaler un problème avec ce client
            </Button>
          )}
        </div>
      )}

      {/* Incident Report Dialog */}
      {driverId && (
        <CourseIncidentReportDialog
          open={showIncidentDialog}
          onOpenChange={setShowIncidentDialog}
          courseId={courseId}
          driverId={driverId}
          clientId={clientId}
          clientName={clientName}
          guestPhone={guestPhone}
        />
      )}

      {/* Anti-fraud cash confirmation (driver re-types the amount) */}
      <CashConfirmationDialog
        open={showCashDialog}
        onOpenChange={setShowCashDialog}
        courseId={courseId}
        expectedAmount={amount}
        onConfirmed={handleCashConfirmed}
      />
    </motion.div>
  );
}
