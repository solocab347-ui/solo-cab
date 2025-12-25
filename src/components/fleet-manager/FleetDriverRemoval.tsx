import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserMinus, AlertTriangle } from "lucide-react";

interface FleetDriverRemovalProps {
  driverId: string;
  driverName: string;
  fleetManagerId: string;
  onRemoved?: () => void;
}

export const FleetDriverRemoval = ({
  driverId,
  driverName,
  fleetManagerId,
  onRemoved,
}: FleetDriverRemovalProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleRemoveDriver = async () => {
    if (!reason.trim()) {
      toast.error("Veuillez indiquer la raison de la suppression");
      return;
    }

    setProcessing(true);
    try {
      // 1. Update fleet_manager_drivers status to removed
      const { error: updateError } = await supabase
        .from("fleet_manager_drivers")
        .update({
          status: "removed",
          removed_at: new Date().toISOString(),
          removed_reason: reason,
          removed_by_manager: true,
        })
        .eq("driver_id", driverId)
        .eq("fleet_manager_id", fleetManagerId);

      if (updateError) throw updateError;

      // 2. Update driver to remove fleet association
      const { error: driverError } = await supabase
        .from("drivers")
        .update({
          fleet_manager_id: null,
          is_fleet_driver: false,
          // Reset fleet-specific fields
          fleet_documents_status: null,
          fleet_documents_deadline: null,
          fleet_documents_submitted_at: null,
        })
        .eq("id", driverId);

      if (driverError) throw driverError;

      // 3. Get driver's user_id for notification
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", driverId)
        .single();

      if (driverData?.user_id) {
        // 4. Create notification for driver
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "⚠️ Vous avez été retiré de la flotte",
          message: `Le gestionnaire de flotte vous a retiré de son équipe. Motif: ${reason}. Votre compte reste actif et vous pouvez continuer en tant que chauffeur indépendant.`,
          type: "warning",
          link: "/driver-dashboard",
        });

        // 5. Send email notification via edge function
        try {
          await supabase.functions.invoke("send-driver-fleet-removal", {
            body: {
              driver_id: driverId,
              reason: reason,
            },
          });
        } catch (emailError) {
          console.error("Error sending removal email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast.success(`${driverName} a été retiré de votre flotte`);
      setOpen(false);
      setReason("");
      onRemoved?.();
    } catch (error) {
      console.error("Error removing driver:", error);
      toast.error("Erreur lors de la suppression du chauffeur");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <UserMinus className="w-4 h-4" />
          Retirer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Retirer {driverName} de votre flotte ?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Cette action est <strong>irréversible</strong>. En retirant ce chauffeur :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Il ne recevra plus de courses de votre part</li>
              <li>Son compte restera actif comme chauffeur indépendant</li>
              <li>Il pourra rejoindre un autre gestionnaire ou travailler seul</li>
              <li>Ses documents resteront archivés dans votre dossier</li>
              <li>Pour le récupérer, vous devrez signer un nouveau contrat</li>
            </ul>
            
            <div className="pt-3 space-y-2">
              <Label htmlFor="removal-reason">Motif de la suppression *</Label>
              <Textarea
                id="removal-reason"
                placeholder="Ex: Fin de collaboration, non respect des règles..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRemoveDriver();
            }}
            disabled={processing || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <UserMinus className="w-4 h-4 mr-2" />
                Confirmer la suppression
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
