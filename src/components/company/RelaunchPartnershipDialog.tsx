import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, User, Car, Star, RefreshCw, Info } from "lucide-react";
import { notificationService } from "@/lib/notificationService";

interface RelaunchPartnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: any;
  companyId: string;
  companyName: string;
}

export function RelaunchPartnershipDialog({
  open,
  onOpenChange,
  agreement,
  companyId,
  companyName
}: RelaunchPartnershipDialogProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const driver = agreement?.driver;
  const driverProfile = agreement?.driverProfile;
  const driverPhoto = driverProfile?.profile_photo_url || driver?.card_photo_url;
  const driverName = driverProfile?.full_name || driver?.company_name || "Chauffeur VTC";

  const relaunchMutation = useMutation({
    mutationFn: async () => {
      // Mettre à jour l'accord existant pour le remettre en pending
      const { error } = await supabase
        .from("company_driver_agreements")
        .update({
          status: "pending",
          proposed_by: "company",
          company_signed: false,
          company_signed_at: null,
          driver_signed: false,
          driver_signed_at: null,
          accepted_at: null,
          rejected_at: null,
          rejection_reason: null,
          notes: message ? `Relance: ${message}` : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreement.id);

      if (error) throw error;

      // Notifier le chauffeur de la nouvelle proposition
      if (driver?.user_id) {
        await notificationService.notifyCompanyAgreementRequest(
          driver.user_id,
          companyName
        );
      }
    },
    onSuccess: () => {
      toast.success("Proposition de partenariat relancée !");
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      onOpenChange(false);
      setMessage("");
    },
    onError: (error: any) => {
      console.error("Relaunch error:", error);
      toast.error("Erreur lors de la relance: " + error.message);
    },
  });

  const handleRelaunch = () => {
    relaunchMutation.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMessage("");
    }
    onOpenChange(newOpen);
  };

  if (!agreement) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Relancer le partenariat
          </DialogTitle>
          <DialogDescription>
            Proposer à nouveau un partenariat à ce chauffeur
          </DialogDescription>
        </DialogHeader>

        {/* Info chauffeur */}
        <div className="flex gap-3 p-3 bg-muted rounded-lg">
          <Avatar className="w-14 h-14">
            <AvatarImage src={driverPhoto} />
            <AvatarFallback>
              <User className="w-7 h-7" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold">{driverName}</h4>
            {driver?.company_name && driverProfile?.full_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Car className="w-3 h-3" />
                {driver.company_name}
              </p>
            )}
            {(driver?.vehicle_brand || driver?.vehicle_model) && (
              <p className="text-xs text-muted-foreground">
                {driver.vehicle_brand} {driver.vehicle_model}
              </p>
            )}
            {driver?.show_rating_for_sharing !== false && driver?.rating && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs">{driver.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Le chauffeur recevra une notification de votre nouvelle proposition. 
            Vous pouvez ajouter un message personnalisé.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="message">Message (optionnel)</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Expliquez pourquoi vous souhaitez relancer ce partenariat..."
            className="min-h-[80px]"
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)} 
            disabled={relaunchMutation.isPending}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleRelaunch}
            disabled={relaunchMutation.isPending}
          >
            {relaunchMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer la proposition
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
