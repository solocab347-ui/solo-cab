import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle, FileText } from "lucide-react";
import { differenceInDays } from "date-fns";

interface DocumentWarningBannerProps {
  documentsStatus: string;
  documentsDeadline: string | null;
  onNavigateToDocuments: () => void;
}

export const DocumentWarningBanner = ({
  documentsStatus,
  documentsDeadline,
  onNavigateToDocuments,
}: DocumentWarningBannerProps) => {
  // Ne rien afficher si les documents sont validés ou soumis
  if (documentsStatus === "validated" || documentsStatus === "submitted") {
    return null;
  }

  const deadline = documentsDeadline ? new Date(documentsDeadline) : null;
  const daysRemaining = deadline ? differenceInDays(deadline, new Date()) : null;

  // Deadline expirée
  if (daysRemaining !== null && daysRemaining < 0) {
    return (
      <Alert variant="destructive" className="mb-6">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Accès restreint - Documents requis</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span>
            Le délai pour soumettre vos documents est expiré. Votre accès aux fonctionnalités est restreint.
            Soumettez vos documents pour retrouver un accès complet.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToDocuments}
            className="whitespace-nowrap border-white/20 hover:bg-white/10"
          >
            <FileText className="w-4 h-4 mr-2" />
            Soumettre mes documents
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Moins de 7 jours restants - alerte urgente
  if (daysRemaining !== null && daysRemaining <= 7) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Attention - Documents requis !</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span>
            Plus que {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} pour soumettre vos documents.
            Passé ce délai, votre compte sera bloqué.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToDocuments}
            className="whitespace-nowrap border-white/20 hover:bg-white/10"
          >
            <FileText className="w-4 h-4 mr-2" />
            Soumettre maintenant
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Plus de 7 jours ou rappel simple
  if (documentsStatus === "pending") {
    const displayDays = daysRemaining !== null ? daysRemaining : 7;
    return (
      <Alert className="mb-4 sm:mb-6 bg-amber-500/10 border-amber-500/30">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <AlertTitle className="text-amber-500 text-sm sm:text-base">Documents en attente</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span className="text-xs sm:text-sm">
            Vous avez {displayDays} jour{displayDays > 1 ? "s" : ""} pour soumettre vos documents professionnels et finaliser votre inscription.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToDocuments}
            className="whitespace-nowrap w-full sm:w-auto text-xs sm:text-sm"
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Mes documents
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Documents rejetés
  if (documentsStatus === "rejected") {
    return (
      <Alert variant="destructive" className="mb-6">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Documents rejetés</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span>
            Certains de vos documents ont été rejetés. Veuillez les soumettre à nouveau.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToDocuments}
            className="whitespace-nowrap border-white/20 hover:bg-white/10"
          >
            <FileText className="w-4 h-4 mr-2" />
            Corriger mes documents
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
