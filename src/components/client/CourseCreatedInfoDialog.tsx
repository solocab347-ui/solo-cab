import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
}: CourseCreatedInfoDialogProps) {
  const navigate = useNavigate();

  const handleViewDevis = () => {
    // Navigation directe vers les devis sans passer par le dashboard
    navigate("/client-dashboard?tab=courses", { replace: true });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <DialogTitle className="text-xl text-center">
            Devis créé avec succès !
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm text-primary mb-4">
            <FileText className="w-4 h-4" />
            <span>Votre devis vous attend</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Acceptez-le pour confirmer votre réservation.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleViewDevis}
            className="w-full"
            size="lg"
          >
            <FileText className="w-4 h-4 mr-2" />
            Voir mon devis
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground"
          >
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
