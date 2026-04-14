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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CourseCompletionScreenProps {
  courseId: string;
  clientName: string;
  amount: number;
  paymentMethod: string; // 'card' | 'cash' | 'stripe' | 'especes'
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
  paymentResult,
  onDismiss,
}: CourseCompletionScreenProps) {
  const [retrying, setRetrying] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [localResult, setLocalResult] = useState(paymentResult);

  // Sync with parent prop updates (e.g. from background finalization)
  useEffect(() => {
    setLocalResult(paymentResult);
  }, [paymentResult]);

  const isCard = paymentMethod === "card" || paymentMethod === "stripe" || paymentMethod === "card_online";
  const isCash = !isCard;
  const isSuccess = localResult.success || localResult.alreadyPaid;

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const { data, error } = await supabase.functions.invoke("finalize-course-payment", {
        body: { course_id: courseId },
      });
      clearTimeout(timeout);

      if (error) throw error;
      if (data?.status === "succeeded" || data?.success || data?.already_paid) {
        toast.success("Paiement encaissé avec succès !");
        setLocalResult({ success: true, status: "succeeded" });
      } else {
        toast.error("Le paiement a échoué. Utilisez le lien de paiement.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du paiement");
    } finally {
      setRetrying(false);
    }
  };

  const handleSendPaymentLink = async () => {
    setSendingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-spontaneous-payment", {
        body: {
          amount,
          description: `Régularisation course - ${clientName}`,
          date: new Date().toISOString(),
        },
      });
      if (error) throw error;
      if (data?.url) {
        // Copy to clipboard and open share
        await navigator.clipboard.writeText(data.url).catch(() => {});
        
        // Try native share
        if (navigator.share) {
          await navigator.share({
            title: `Paiement de ${amount.toFixed(2)}€`,
            text: `Bonjour, veuillez procéder au paiement de ${amount.toFixed(2)}€ pour votre course.`,
            url: data.url,
          }).catch(() => {});
        }
        
        setLinkSent(true);
        toast.success("Lien de paiement généré et copié !");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du lien");
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h2 className="text-lg font-bold text-foreground">Récapitulatif</h2>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 px-5 space-y-6 overflow-y-auto pb-8">
        {/* Success / Fail Icon */}
        <div className="flex flex-col items-center pt-4">
          {isCard && isSuccess ? (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-emerald-600">Course terminée</h3>
              <p className="text-base text-emerald-600/80 font-medium mt-1">Client débité par carte</p>
            </>
          ) : isCard && !isSuccess ? (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-2xl font-black text-destructive">Échec du paiement</h3>
              <p className="text-base text-destructive/80 font-medium mt-1">Le client n'a pas été débité</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Banknote className="w-12 h-12 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-foreground">Course terminée</h3>
              <p className="text-base text-amber-600 font-medium mt-1">Paiement en espèces</p>
            </>
          )}
        </div>

        {/* Amount */}
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
              {isCard ? <CreditCard className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
              {isCard ? "Carte bancaire" : "Espèces"}
            </Badge>
          </div>
        </div>

        {/* Instructions based on payment method */}
        {isCash && (
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
                  Vous n'avez <strong>rien à faire</strong>. Le montant sera versé sur votre compte lors du prochain règlement.
                </p>
              </div>
            </div>
          </div>
        )}

        {isCard && !isSuccess && (
          <div className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-destructive text-base">
                    ⚠️ Le paiement par carte a échoué
                  </p>
                  <p className="text-sm text-destructive/80 mt-2">
                    {paymentResult.error || "La capture de l'empreinte bancaire n'a pas abouti."}
                    Vous pouvez réessayer ou envoyer un lien de paiement au client.
                  </p>
                </div>
              </div>
            </div>

            {/* Retry button */}
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
              Réessayer le paiement
            </Button>

            {/* Send payment link */}
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
          </div>
        )}
      </div>

      {/* Bottom dismiss */}
      <div className="px-5 pb-6 pt-3 border-t border-border bg-background">
        <Button
          onClick={onDismiss}
          className="w-full h-14 rounded-2xl font-black text-base"
        >
          {isCash ? "J'ai encaissé, fermer" : "Fermer"}
        </Button>
      </div>
    </motion.div>
  );
}
