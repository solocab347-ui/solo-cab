import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, FileWarning } from "lucide-react";
import { differenceInDays, isPast } from "date-fns";

interface DocumentWarningBannerProps {
  documentsStatus: string;
  documentsDeadline: string | null;
  onDismiss?: () => void;
  onNavigateToDocuments?: () => void;
  showCloseButton?: boolean;
}

export const DocumentWarningBanner = ({
  documentsStatus,
  documentsDeadline,
  onDismiss,
  onNavigateToDocuments,
  showCloseButton = false,
}: DocumentWarningBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if documents are validated or submitted
  if (documentsStatus === "validated" || documentsStatus === "submitted" || dismissed) {
    return null;
  }

  const getDeadlineInfo = () => {
    if (!documentsDeadline) return null;

    const deadline = new Date(documentsDeadline);
    const daysRemaining = differenceInDays(deadline, new Date());
    const isExpired = isPast(deadline);

    return { deadline, daysRemaining, isExpired };
  };

  const deadlineInfo = getDeadlineInfo();

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Critical warning - expired or less than 2 days
  const isCritical = deadlineInfo?.isExpired || (deadlineInfo?.daysRemaining !== undefined && deadlineInfo.daysRemaining <= 2);
  
  // Warning - less than 5 days
  const isWarning = deadlineInfo?.daysRemaining !== undefined && deadlineInfo.daysRemaining <= 5 && !isCritical;

  return (
    <div className={`w-full ${isCritical ? 'bg-destructive' : isWarning ? 'bg-orange-500' : 'bg-amber-500'} text-white`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
            ) : (
              <FileWarning className="w-5 h-5 shrink-0" />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold">
                {deadlineInfo?.isExpired
                  ? "⚠️ ATTENTION : Délai expiré !"
                  : deadlineInfo
                  ? `⚠️ ATTENTION : ${deadlineInfo.daysRemaining} jour${deadlineInfo.daysRemaining !== 1 ? 's' : ''} restant${deadlineInfo.daysRemaining !== 1 ? 's' : ''} pour soumettre vos documents !`
                  : "⚠️ ATTENTION : Documents requis !"}
              </span>
              <span className="text-sm opacity-90">
                {deadlineInfo?.isExpired
                  ? "Votre compte sera suspendu tant que les documents ne seront pas soumis."
                  : "Soumettez vos documents maintenant pour éviter la suspension de votre compte."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={onNavigateToDocuments}
            >
              Envoyer maintenant
            </Button>
            {showCloseButton && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentWarningBanner;
