import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Banknote, Building2, Send, Loader2, CheckCircle, Wallet, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoursePaymentDialogContentProps {
  courseId: string;
  driverId: string;
  courseAmount: number;
  depositPaid?: number;
  depositStatus?: string;
  clientEmail?: string;
  clientName?: string;
  guestName?: string;
  isGuestBooking?: boolean;
  isCompanyCourse?: boolean;
  companyName?: string;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  companyPaymentStatus?: string;
  onCompanyPaymentStatusChange?: (value: string) => void;
  onStripePaymentSent?: () => void;
}

export function CoursePaymentDialogContent({
  courseId,
  driverId,
  courseAmount,
  depositPaid = 0,
  depositStatus,
  clientEmail,
  clientName,
  guestName,
  isGuestBooking = false,
  isCompanyCourse = false,
  companyName,
  paymentMethod,
  onPaymentMethodChange,
  companyPaymentStatus,
  onCompanyPaymentStatusChange,
  onStripePaymentSent,
}: CoursePaymentDialogContentProps) {
  const [driverHasStripeConnect, setDriverHasStripeConnect] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripePaymentSent, setStripePaymentSent] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(true);

  const remainingAmount = courseAmount - depositPaid;
  const hasDeposit = depositPaid > 0 && depositStatus === 'paid';
  const displayName = clientName || guestName || 'Client';

  // Check if driver has Stripe Connect configured
  useEffect(() => {
    const checkStripeConnect = async () => {
      try {
        const { data } = await supabase
          .from('drivers')
          .select('billing_type, stripe_connect_account_id, stripe_connect_charges_enabled')
          .eq('id', driverId)
          .single();

        const hasStripe = !!data?.stripe_connect_account_id && 
                          data?.stripe_connect_charges_enabled === true;
        setDriverHasStripeConnect(hasStripe);
      } catch (err) {
        console.error('Error checking Stripe Connect:', err);
      } finally {
        setCheckingStripe(false);
      }
    };

    checkStripeConnect();
  }, [driverId]);

  const handleSendStripePayment = async () => {
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-request', {
        body: {
          course_id: courseId,
          client_email: clientEmail,
          client_name: displayName,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        // Copy the link to clipboard
        await navigator.clipboard.writeText(data.checkout_url);
        toast.success('Lien de paiement copié ! Envoyez-le au client par SMS ou WhatsApp.');
        setStripePaymentSent(true);
        onStripePaymentSent?.();
      }
    } catch (err: any) {
      console.error('Error sending Stripe payment:', err);
      toast.error(err.message || 'Erreur lors de la création du lien de paiement');
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Standard payment methods */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Paiement reçu en</Label>
        <RadioGroup value={paymentMethod} onValueChange={onPaymentMethodChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Carte bancaire" id="card" />
            <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
              <CreditCard className="w-4 h-4 text-blue-500" />
              Carte bancaire (TPE)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Espèces" id="cash" />
            <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
              <Banknote className="w-4 h-4 text-green-500" />
              Espèces
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Stripe Connect Payment Option */}
      {!checkingStripe && driverHasStripeConnect && !isCompanyCourse && (
        <>
          <Separator className="my-4" />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Ou envoyer une demande de paiement CB
              </Label>
            </div>

            {hasDeposit && (
              <Alert className="py-2 bg-blue-500/10 border-blue-500/30">
                <AlertDescription className="text-xs text-blue-700">
                  Acompte déjà payé : {depositPaid.toFixed(2)}€ • Reste à payer : {remainingAmount.toFixed(2)}€
                </AlertDescription>
              </Alert>
            )}

            {stripePaymentSent ? (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Lien de paiement créé et copié ! Envoyez-le au client par SMS ou WhatsApp.
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                onClick={handleSendStripePayment}
                disabled={stripeLoading || remainingAmount <= 0}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                variant="default"
                size="sm"
              >
                {stripeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création du lien...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Créer lien de paiement ({remainingAmount.toFixed(2)}€)
                  </>
                )}
              </Button>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Le lien sera copié. Envoyez-le par SMS, WhatsApp ou email au client.
            </p>
          </div>
        </>
      )}

      {/* Company payment status (unchanged) */}
      {isCompanyCourse && onCompanyPaymentStatusChange && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Statut du paiement entreprise ({companyName})</Label>
          <RadioGroup value={companyPaymentStatus || ''} onValueChange={onCompanyPaymentStatusChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="received" id="received" />
              <Label htmlFor="received" className="cursor-pointer">
                Paiement reçu sur place
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company_will_pay" id="company_will_pay" />
              <Label htmlFor="company_will_pay" className="cursor-pointer">
                L'entreprise paiera ultérieurement
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
