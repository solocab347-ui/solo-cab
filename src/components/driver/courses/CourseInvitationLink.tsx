import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Copy, 
  Share2, 
  Mail, 
  MessageCircle, 
  Send,
  CheckCircle,
  Smartphone
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CourseInvitationLinkProps {
  token: string;
  estimatedPrice: number;
  pickupAddress: string;
  destinationAddress: string;
  onClose: () => void;
}

export const CourseInvitationLink = ({
  token,
  estimatedPrice,
  pickupAddress,
  destinationAddress,
  onClose,
}: CourseInvitationLinkProps) => {
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const invitationUrl = `${baseUrl}/register-course-invitation?token=${token}`;

  const shareMessage = `Bonjour ! Je vous envoie un devis pour votre course :\n\n📍 De: ${pickupAddress}\n🏁 Vers: ${destinationAddress}\n💰 Prix estimé: ${estimatedPrice.toFixed(2)}€\n\nCliquez sur le lien pour vous inscrire et confirmer votre réservation:\n${invitationUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleShareSMS = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.open(smsUrl, "_blank");
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Votre réservation VTC - Devis");
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(invitationUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(telegramUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Réservation VTC",
          text: shareMessage,
          url: invitationUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      toast.error("Partage non supporté sur cet appareil");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Course créée avec succès !
          </DialogTitle>
          <DialogDescription>
            Envoyez ce lien à votre client pour qu'il s'inscrive et reçoive automatiquement le devis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé de la course */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Départ:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{pickupAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrivée:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{destinationAddress}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Prix estimé:</span>
                <span className="font-bold text-lg text-success">{estimatedPrice.toFixed(2)}€</span>
              </div>
            </div>
          </Card>

          {/* Lien avec bouton copier */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <input
              type="text"
              value={invitationUrl}
              readOnly
              className="flex-1 bg-transparent text-sm truncate outline-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Boutons de partage */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Partager via :</p>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleShareSMS}
                className="flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                SMS
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                WhatsApp
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShareEmail}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShareTelegram}
                className="flex items-center gap-2 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border-[#0088cc]/30"
              >
                <Send className="w-4 h-4 text-[#0088cc]" />
                Telegram
              </Button>
            </div>

            {navigator.share && (
              <Button
                onClick={handleNativeShare}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Plus d'options de partage
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Ce lien est valide pendant 7 jours. Le client pourra s'inscrire et voir automatiquement le devis dans son espace.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
