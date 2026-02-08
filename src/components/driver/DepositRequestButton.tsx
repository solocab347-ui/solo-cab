import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Euro, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Copy,
  MessageCircle,
  Mail,
  Link2,
  ExternalLink,
  Percent,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DepositRequestButtonProps {
  courseId: string;
  devisId?: string;
  totalAmount: number;
  depositPercentage?: number;
  clientEmail?: string;
  clientName?: string;
  clientPhone?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  depositStatus?: string;
  depositAmount?: number;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  disabled?: boolean;
}

export function DepositRequestButton({
  courseId,
  devisId,
  totalAmount,
  depositPercentage = 20,
  clientEmail,
  clientName,
  clientPhone,
  pickupAddress,
  destinationAddress,
  depositStatus,
  depositAmount,
  onSuccess,
  variant = "outline",
  size = "sm",
  className,
  disabled = false
}: DepositRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [result, setResult] = useState<{
    deposit_amount: number;
    remaining_amount: number;
  } | null>(null);

  const isDepositPaid = depositStatus === 'paid';
  const isDepositPending = depositStatus === 'pending';

  const calculatedDepositAmount = (totalAmount * depositPercentage) / 100;
  const remainingAmount = totalAmount - calculatedDepositAmount;

  const handleCreateDepositRequest = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-deposit-payment', {
        body: {
          course_id: courseId,
          devis_id: devisId,
          client_email: clientEmail,
          client_name: clientName,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        setPaymentLink(data.checkout_url);
        setResult({
          deposit_amount: data.deposit_amount,
          remaining_amount: data.remaining_amount,
        });
        toast.success("Lien d'acompte généré !");
      }
    } catch (err: any) {
      console.error("Deposit request error:", err);
      toast.error(err.message || "Erreur lors de la création de la demande d'acompte");
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
      `Bonjour ${clientName || ''}, voici le lien pour payer votre acompte de ${result?.deposit_amount?.toFixed(2) || calculatedDepositAmount.toFixed(2)}€ :\n${paymentLink}`
    );
    const phone = clientPhone.replace(/\s/g, '').replace(/^0/, '33');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleShareSMS = () => {
    if (!paymentLink || !clientPhone) return;
    
    const message = encodeURIComponent(
      `Acompte VTC : ${paymentLink}`
    );
    window.open(`sms:${clientPhone}?body=${message}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!paymentLink) return;
    
    const subject = encodeURIComponent("Acompte pour votre course VTC");
    const body = encodeURIComponent(
      `Bonjour ${clientName || ''},\n\nVoici le lien pour payer votre acompte de ${result?.deposit_amount?.toFixed(2) || calculatedDepositAmount.toFixed(2)}€ :\n${paymentLink}\n\nCordialement`
    );
    window.open(`mailto:${clientEmail || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleClose = () => {
    setOpen(false);
    if (paymentLink) {
      onSuccess?.();
    }
    // Reset state after close
    setTimeout(() => {
      setPaymentLink(null);
      setResult(null);
      setLinkCopied(false);
    }, 300);
  };

  // If deposit is already paid, show a different state
  if (isDepositPaid) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Acompte payé : {depositAmount?.toFixed(2)}€
      </Badge>
    );
  }

  // If deposit is pending, show pending state
  if (isDepositPending) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Acompte en attente
      </Badge>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn("gap-1.5", className)}
      >
        <Percent className="h-3.5 w-3.5" />
        Demander acompte
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Demander un acompte
            </DialogTitle>
            <DialogDescription>
              Envoyez une demande d'acompte au client avant la course
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
                <span className="font-semibold">{totalAmount.toFixed(2)} €</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between text-primary">
                <span className="text-sm flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  Acompte demandé ({depositPercentage}%)
                </span>
                <span className="font-semibold">
                  {result?.deposit_amount?.toFixed(2) || calculatedDepositAmount.toFixed(2)} €
                </span>
              </div>
              
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-sm">Reste à payer (fin de course)</span>
                <span className="text-sm">
                  {result?.remaining_amount?.toFixed(2) || remainingAmount.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Payment Link Section */}
            {paymentLink ? (
              <div className="space-y-3">
                <Alert className="border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700 text-sm">Lien d'acompte prêt</AlertTitle>
                  <AlertDescription className="text-green-600 text-xs mt-1">
                    Partagez ce lien avec votre client pour qu'il puisse payer l'acompte.
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

                {/* Policy reminder */}
                <Alert className="border-primary/30 bg-primary/5">
                  <Shield className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Règle d'annulation :</strong> Si vous annulez, l'acompte est remboursé. Si le client annule tardivement (moins de 4h avant), l'acompte vous est acquis.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                {/* Fees Info */}
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <Euro className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-600 text-xs">
                    <strong>Frais de transaction :</strong> 0,50€ (SoloCab) + ~1,5% + 0,25€ (Stripe) seront déduits proportionnellement.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!paymentLink ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button onClick={handleCreateDepositRequest} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Générer le lien d'acompte
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleClose} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Terminé
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DepositRequestButton;