import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, FileText, Clock, Info } from "lucide-react";

interface CourseCreatedInfoDialogProps {
  open: boolean;
  onClose: () => void;
  pickupAddress?: string;
  destinationAddress?: string;
  scheduledDate?: string;
}

export function CourseCreatedInfoDialog({
  open,
  onClose,
  pickupAddress,
  destinationAddress,
  scheduledDate,
}: CourseCreatedInfoDialogProps) {
  const [hasRead, setHasRead] = useState(false);

  const handleClose = () => {
    if (hasRead) {
      onClose();
      setHasRead(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && hasRead && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <DialogTitle className="text-xl">
              Demande de course enregistrée !
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Votre demande a bien été transmise au chauffeur
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Résumé de la course */}
          {(pickupAddress || destinationAddress) && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Résumé de votre demande
              </h4>
              {pickupAddress && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Départ:</span> {pickupAddress}
                </p>
              )}
              {destinationAddress && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Arrivée:</span> {destinationAddress}
                </p>
              )}
              {scheduledDate && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Date:</span> {formatDate(scheduledDate)}
                </p>
              )}
            </div>
          )}

          {/* Étape 1: Devis généré */}
          <div className="flex gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex-shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Un devis a été généré</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Consultez votre devis dans l'onglet <strong>"Devis & Factures"</strong> ou dans 
                <strong> "Mes courses"</strong> de votre espace client.
              </p>
            </div>
          </div>

          {/* Étape 2: Action requise */}
          <div className="flex gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <div className="flex-shrink-0">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                Action requise de votre part
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Pour confirmer votre réservation, vous devez <strong>accepter le devis</strong>.
                Sans cette confirmation, le chauffeur ne pourra pas valider votre course.
              </p>
            </div>
          </div>

          {/* Attention importante */}
          <div className="flex gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h4 className="font-semibold text-destructive">
                ⚠️ Point d'attention important
              </h4>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>
                  <strong>Si vous n'acceptez pas le devis</strong>, votre course ne sera pas confirmée
                </li>
                <li>Le chauffeur ne peut pas effectuer la course sans votre validation</li>
                <li>Les devis non acceptés expirent automatiquement après un certain délai</li>
              </ul>
            </div>
          </div>

          {/* Comment faire */}
          <div className="bg-card border rounded-lg p-4">
            <h4 className="font-semibold mb-2">📋 Comment accepter votre devis ?</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Allez dans l'onglet <strong>"Devis & Factures"</strong></li>
              <li>Cliquez sur le devis en attente</li>
              <li>Vérifiez les détails et le montant</li>
              <li>Cliquez sur <strong>"Accepter le devis"</strong></li>
            </ol>
          </div>

          {/* Confirmation de lecture */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="has-read"
              checked={hasRead}
              onCheckedChange={(checked) => setHasRead(checked as boolean)}
              className="mt-0.5"
            />
            <label
              htmlFor="has-read"
              className="text-sm cursor-pointer leading-relaxed"
            >
              J'ai compris que je dois <strong>accepter le devis</strong> pour confirmer ma réservation 
              et que sans cette action, ma course ne sera pas validée.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            disabled={!hasRead}
            className="w-full"
            size="lg"
          >
            {hasRead ? "Compris, voir mon devis" : "Veuillez confirmer avoir lu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
