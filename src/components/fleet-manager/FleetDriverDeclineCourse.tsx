import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FleetDriverDeclineCourseProps {
  courseId: string;
  driverId: string;
  fleetManagerId: string;
  onDeclined?: () => void;
  courseSummary?: string;
}

export const FleetDriverDeclineCourse = ({ 
  courseId, 
  driverId, 
  fleetManagerId, 
  onDeclined,
  courseSummary = "cette course"
}: FleetDriverDeclineCourseProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDecline = async () => {
    if (!reason.trim()) {
      toast.error("Veuillez indiquer une raison");
      return;
    }

    setLoading(true);
    try {
      // Insert declined course record
      const { error: insertError } = await supabase
        .from("fleet_driver_declined_courses")
        .insert({
          fleet_manager_id: fleetManagerId,
          course_id: courseId,
          declined_by_driver_id: driverId,
          reason: reason.trim(),
          status: "pending",
        });

      if (insertError) throw insertError;

      // Update course to remove driver assignment
      const { error: updateError } = await supabase
        .from("courses")
        .update({ 
          driver_id: null,
          status: "pending"
        })
        .eq("id", courseId);

      if (updateError) throw updateError;

      toast.success("Course renvoyée au gestionnaire");
      setOpen(false);
      setReason("");
      onDeclined?.();
    } catch (error) {
      console.error("Error declining course:", error);
      toast.error("Erreur lors du refus de la course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
          <X className="w-4 h-4" />
          Refuser la course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Refuser la course
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de refuser {courseSummary}. Elle sera renvoyée au gestionnaire de flotte pour réassignation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Cette action est irréversible. La course sera retirée de votre planning.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison du refus *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez pourquoi vous ne pouvez pas effectuer cette course..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDecline} 
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Confirmer le refus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
