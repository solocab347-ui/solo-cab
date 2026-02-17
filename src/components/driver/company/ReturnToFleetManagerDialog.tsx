import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Undo2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReturnToFleetManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  fleetManagerId: string;
  fleetManagerName: string;
  onSuccess: () => void;
}

const RETURN_REASONS = [
  { id: "unavailable", label: "Je suis indisponible à cette date/heure" },
  { id: "vehicle_issue", label: "Problème de véhicule" },
  { id: "personal", label: "Raison personnelle" },
  { id: "distance", label: "Trajet trop éloigné" },
  { id: "other", label: "Autre raison" },
];

export function ReturnToFleetManagerDialog({
  open,
  onOpenChange,
  courseId,
  fleetManagerId,
  fleetManagerName,
  onSuccess,
}: ReturnToFleetManagerDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Veuillez sélectionner un motif");
      return;
    }

    const reason = selectedReason === "other" 
      ? customReason.trim() || "Autre raison"
      : RETURN_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;

    if (selectedReason === "other" && !customReason.trim()) {
      toast.error("Veuillez préciser le motif");
      return;
    }

    setLoading(true);
    try {
      // Use RPC function to return course (bypasses RLS restrictions)
      const { error: courseError } = await supabase
        .rpc("return_course_to_fleet_manager", {
          p_course_id: courseId,
          p_reason: reason,
        });

      if (courseError) throw courseError;

      // Create an escalation record for the fleet manager
      const { error: escalationError } = await supabase
        .from("fleet_course_escalations")
        .insert({
          course_id: courseId,
          fleet_manager_id: fleetManagerId,
          escalation_reason: "driver_returned",
          escalation_message: reason,
          status: "pending",
        });

      if (escalationError) {
        console.error("Error creating escalation:", escalationError);
        // Don't fail the whole operation if escalation fails
      }

      // Notify the fleet manager
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("profiles:user_id(full_name)")
          .eq("user_id", userData.user.id)
          .single();

        const driverName = driverData?.profiles?.full_name || "Un chauffeur";

        await supabase.from("notifications").insert({
          user_id: fleetManagerId,
          title: "Course retournée",
          message: `${driverName} a retourné une course. Motif: ${reason}`,
          type: "fleet_course_returned",
          data: { course_id: courseId, reason },
        });
      }

      toast.success("Course renvoyée au gestionnaire");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error returning course:", error);
      toast.error("Erreur lors du renvoi de la course");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedReason("");
      setCustomReason("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-amber-500" />
            Renvoyer au gestionnaire
          </DialogTitle>
          <DialogDescription>
            Cette course sera renvoyée à <strong>{fleetManagerName}</strong> pour être réassignée à un autre chauffeur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Label>Motif du renvoi *</Label>
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {RETURN_REASONS.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.id} id={reason.id} />
                <Label htmlFor={reason.id} className="font-normal cursor-pointer">
                  {reason.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "other" && (
            <Textarea
              placeholder="Précisez le motif..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedReason}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Undo2 className="w-4 h-4 mr-2" />
                Renvoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
