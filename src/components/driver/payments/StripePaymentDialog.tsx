import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Euro, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Copy,
  MessageCircle,
  Mail,
  Link2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StripePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  devisId?: string;
  amount: number;
  depositPercentage?: number;
  clientEmail?: string;
  clientName?: string;
  clientPhone?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  onSuccess?: () => void;
  mode: "deposit" | "final_payment" | "link";
}

export function StripePaymentDialog({
  open,
  onOpenChange,
  courseId,
  devisId,
  amount,
  depositPercentage = 20,
  clientEmail,
  clientName,
  clientPhone,
  pickupAddress,
  destinationAddress,
  onSuccess,
  mode
}: StripePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const depositAmount = mode === "deposit" ? (amount * depositPercentage) / 100 : 0;
  const remainingAmount = amount - depositAmount;

  const handleCreatePayment = async () => {
    try {
      setLoading(true);

      const endpoint = mode === "deposit" 
        ? "create-deposit-payment" 
        : mode === "final_payment"
          ? "capture-final-payment"
          : "create-course-payment";

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          course_id: courseId,
          devis_id: devisId,
          client_email: clientEmail,
          client_name: clientName,
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        setPaymentLink(data.checkout_url);
        toast.success("Lien de paiement généré !");
      } else if (data?.success) {
        toast.success(mode === "final_payment" ? "Paiement capturé !" : "Paiement initié !");
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Stripe payment error:", err);
      toast.error(err.message || "Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;
    
    try {
      await navigator.clipboard.writeText(paymentLink);
      setLinkCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleShareWhatsApp = () => {
    if (!paymentLink || !clientPhone) return;
    
    const message = encodeURIComponent(
      `Bonjour ${clientName || ''}, voici le lien pour payer votre course :\n${paymentLink}`
    );
    const phone = clientPhone.replace(/\s/g, '').replace(/^0/, '33');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    toast.success("WhatsApp ouvert");
  };

  const handleShareSMS = () => {
    if (!paymentLink || !clientPhone) return;
    
    const message = encodeURIComponent(
      `Voici le lien pour payer votre course : ${paymentLink}`
    );
    window.open(`sms:${clientPhone}?body=${message}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!paymentLink) return;
    
    const subject = encodeURIComponent("Lien de paiement pour votre course VTC");
    const body = encodeURIComponent(
      `Bonjour ${clientName || ''},\n\nVoici le lien pour procéder au paiement de votre course :\n${paymentLink}\n\nCordialement`
    );
    window.open(`mailto:${clientEmail || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const getTitle = () => {
    switch (mode) {
      case "deposit": return "Demander un acompte";
      case "final_payment": return "Encaisser le solde";
      case "link": return "Envoyer un lien de paiement";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "deposit": return "Le client recevra un lien pour payer l'acompte en ligne";
      case "final_payment": return "Capturer le paiement final après la course";
      case "link": return "Générez un lien de paiement à envoyer au client";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course Info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="text-sm font-medium">{clientName || "Client"}</span>
            </div>
            {pickupAddress && (
              <div className="text-xs text-muted-foreground truncate">
                {pickupAddress.split(',')[0]} → {destinationAddress?.split(',')[0]}
              </div>
            )}
          </div>

          {/* Amount Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Montant total de la course</span>
              <span className="font-semibold">{amount.toFixed(2)} €</span>
            </div>
            
            {mode === "deposit" && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-primary">
                  <span className="text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Acompte ({depositPercentage}%)
                  </span>
                  <span className="font-semibold">{depositAmount.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-sm">Reste à payer (fin de course)</span>
                  <span className="text-sm">{remainingAmount.toFixed(2)} €</span>
                </div>
              </>
            )}
          </div>

          {/* Payment Link Section */}
          {paymentLink ? (
            <div className="space-y-3">
              <Alert className="border-green-500/30 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 text-sm">Lien de paiement prêt</AlertTitle>
                <AlertDescription className="text-green-600 text-xs mt-1">
                  Partagez ce lien avec votre client pour qu'il puisse payer en ligne.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  {linkCopied ? (
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {linkCopied ? "Copié !" : "Copier le lien"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(paymentLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Envoyer au client :</p>
                <div className="grid grid-cols-3 gap-2">
                  {clientPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareWhatsApp}
                      className="flex-col h-auto py-2"
                    >
                      <MessageCircle className="h-4 w-4 mb-1 text-green-600" />
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                  )}
                  {clientPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareSMS}
                      className="flex-col h-auto py-2"
                    >
                      <MessageCircle className="h-4 w-4 mb-1" />
                      <span className="text-xs">SMS</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareEmail}
                    className="flex-col h-auto py-2"
                  >
                    <Mail className="h-4 w-4 mb-1" />
                    <span className="text-xs">Email</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Fees Warning */}
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <Euro className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-600 text-xs">
                  <strong>Frais de transaction :</strong> 0,50€ (gestion paiement) + ~1,5% + 0,25€ Stripe seront déduits du virement.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!paymentLink ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreatePayment} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Générer le lien
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Terminé
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StripePaymentDialog;
