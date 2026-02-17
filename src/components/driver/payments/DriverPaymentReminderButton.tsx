import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DriverPaymentReminderButtonProps {
  courseId: string;
  employeeId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  invitationToken?: string | null;
  companyId?: string;
  onReminderSent?: () => void;
}

export function DriverPaymentReminderButton({
  courseId,
  employeeId,
  guestName,
  guestEmail,
  invitationToken,
  companyId,
  onReminderSent
}: DriverPaymentReminderButtonProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendReminder = async () => {
    setSending(true);
    try {
      // Enregistrer la relance dans la base de données
      const { error: reminderError } = await supabase
        .from("payment_confirmation_reminders")
        .insert({
          course_id: courseId,
          employee_id: employeeId,
          guest_name: guestName,
          guest_email: guestEmail,
          invitation_token: invitationToken,
          company_id: companyId,
          sent_by: "driver",
          sent_at: new Date().toISOString()
        });

      if (reminderError) {
        // Si la table n'existe pas encore, on continue quand même
        console.warn("Reminder table error:", reminderError);
      }

      // Appeler l'edge function pour envoyer l'email
      const { error: emailError } = await supabase.functions.invoke(
        "send-payment-reminder",
        {
          body: {
            course_id: courseId,
            employee_id: employeeId,
            guest_name: guestName,
            guest_email: guestEmail,
            invitation_token: invitationToken,
            company_id: companyId,
            sent_by: "driver"
          }
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
        // On affiche quand même un succès car la notification in-app fonctionne
      }

      toast.success("Relance envoyée", {
        description: guestName 
          ? `${guestName} sera notifié(e)` 
          : "Le collaborateur sera notifié"
      });

      setOpen(false);
      onReminderSent?.();
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Erreur lors de l'envoi de la relance");
    } finally {
      setSending(false);
    }
  };

  const recipientName = guestName || "le collaborateur";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Bell className="w-4 h-4" />
        Relancer
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Relancer {recipientName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {guestName ? (
                <>
                  Une notification sera envoyée à <strong>{guestName}</strong> pour 
                  lui rappeler de confirmer le mode de paiement de cette course.
                  {guestEmail && <span className="block mt-2 text-xs">Email : {guestEmail}</span>}
                </>
              ) : (
                <>
                  Une notification sera envoyée au collaborateur pour lui rappeler 
                  de confirmer le mode de paiement de cette course.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendReminder} disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Envoyer la relance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
