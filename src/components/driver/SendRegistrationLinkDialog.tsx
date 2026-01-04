import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Link2, 
  User, 
  Phone, 
  Mail, 
  Copy,
  MessageSquare,
  Send,
  CheckCircle,
  Loader2,
  ExternalLink
} from "lucide-react";

interface GuestBooking {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  pickup_address?: string;
  destination_address?: string;
  scheduled_date?: string;
  guest_estimated_price?: number | null;
}

interface SendRegistrationLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestBooking: GuestBooking | null;
  driverId: string;
  onSuccess?: () => void;
}

export const SendRegistrationLinkDialog = ({
  open,
  onOpenChange,
  guestBooking,
  driverId,
  onSuccess,
}: SendRegistrationLinkDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (!guestBooking) return;
    
    setLoading(true);

    try {
      // Create registration token
      const { data, error } = await supabase
        .from("guest_registration_tokens")
        .insert({
          driver_id: driverId,
          course_id: guestBooking.id,
          guest_name: guestBooking.guest_name,
          guest_phone: guestBooking.guest_phone,
          guest_email: guestBooking.guest_email || null,
          pickup_address: guestBooking.pickup_address || null,
          destination_address: guestBooking.destination_address || null,
          scheduled_date: guestBooking.scheduled_date || null,
          estimated_price: guestBooking.guest_estimated_price || null,
        })
        .select("token")
        .single();

      if (error) throw error;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/inscription-client?token=${data.token}`;
      setGeneratedLink(link);
      toast.success("Lien d'inscription généré !");

    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Erreur lors de la génération du lien");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleSendSMS = () => {
    if (!generatedLink || !guestBooking) return;
    
    const message = `Bonjour ${guestBooking.guest_name},\n\nFinalisez votre inscription SoloCab pour accéder à vos réservations et bénéficier de tous les avantages :\n\n${generatedLink}\n\nÀ bientôt !`;
    window.location.href = `sms:${guestBooking.guest_phone}?body=${encodeURIComponent(message)}`;
  };

  const handleSendWhatsApp = () => {
    if (!generatedLink || !guestBooking) return;
    
    const phone = guestBooking.guest_phone.replace(/\D/g, "");
    const formattedPhone = phone.startsWith("0") ? `33${phone.substring(1)}` : phone;
    const message = `Bonjour ${guestBooking.guest_name},\n\nFinalisez votre inscription SoloCab pour accéder à vos réservations et bénéficier de tous les avantages :\n\n${generatedLink}\n\nÀ bientôt !`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleSendEmail = () => {
    if (!generatedLink || !guestBooking) return;
    
    const subject = "Finalisez votre inscription SoloCab";
    const body = `Bonjour ${guestBooking.guest_name},\n\nFinalisez votre inscription SoloCab pour accéder à vos réservations et bénéficier de tous les avantages :\n\n${generatedLink}\n\nÀ bientôt !`;
    window.location.href = `mailto:${guestBooking.guest_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setCopied(false);
    onOpenChange(false);
    onSuccess?.();
  };

  if (!guestBooking) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Lien d'inscription
          </DialogTitle>
          <DialogDescription>
            Envoyez un lien au client pour qu'il finalise son inscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{guestBooking.guest_name}</span>
              <Badge variant="secondary" className="text-xs">Non inscrit</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{guestBooking.guest_phone}</span>
            </div>
            {guestBooking.guest_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{guestBooking.guest_email}</span>
              </div>
            )}
          </div>

          {!generatedLink ? (
            <>
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertDescription className="text-sm">
                  <strong>Important :</strong> Le client devra finaliser son inscription lui-même. 
                  Les informations pré-remplies pourront être modifiées par le client.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full bg-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Générer le lien d'inscription
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Generated Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Lien généré</label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="bg-muted/50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className={copied ? "text-green-500" : ""}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce lien est valide pendant 30 jours
                </p>
              </div>

              {/* Send Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Envoyer via</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSendSMS}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendWhatsApp}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700"
                  >
                    <Send className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
                {guestBooking.guest_email && (
                  <Button
                    variant="outline"
                    onClick={handleSendEmail}
                    className="w-full flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                )}
              </div>

              <Alert className="border-green-500/30 bg-green-500/5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-sm">
                  Une fois inscrit, le client sera automatiquement lié à votre compte.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
