import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Send, Loader2, CheckCircle, AlertTriangle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StripePaymentRequestProps {
  courseId: string;
  driverId: string;
  amount: number;
  depositPaid?: number;
  depositStatus?: string;
  clientEmail?: string;
  clientName?: string;
  guestName?: string;
  guestPhone?: string;
  isGuestBooking?: boolean;
  driverHasStripeConnect?: boolean;
  onPaymentSent?: () => void;
  className?: string;
}

export function StripePaymentRequest({
  courseId,
  driverId,
  amount,
  depositPaid = 0,
  depositStatus,
  clientEmail,
  clientName,
  guestName,
  guestPhone,
  isGuestBooking = false,
  driverHasStripeConnect = false,
  onPaymentSent,
  className,
}: StripePaymentRequestProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const remainingAmount = amount - depositPaid;
  const hasDeposit = depositPaid > 0 && depositStatus === 'paid';
  const displayName = clientName || guestName || 'Client';
  const contactEmail = clientEmail || null;

  if (!driverHasStripeConnect) {
    return null;
  }

  const handleSendPaymentRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      // Créer une session Checkout pour le solde
      const { data, error: fnError } = await supabase.functions.invoke('capture-final-payment', {
        body: {
          course_id: courseId,
          client_email: contactEmail,
        }
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.checkout_url) {
        // Si on a une URL de checkout, créer une notification et copier le lien
        await supabase.from('notifications').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: '💳 Lien de paiement créé',
          message: `Un lien de paiement de ${remainingAmount.toFixed(2)}€ a été créé pour ${displayName}`,
          type: 'info',
        });

        // Copier le lien dans le presse-papier
        await navigator.clipboard.writeText(data.checkout_url);
        toast.success('Lien de paiement copié ! Envoyez-le au client par SMS ou WhatsApp.');
        
        setSuccess(true);
        onPaymentSent?.();
      }
    } catch (err: any) {
      console.error('Error sending payment request:', err);
      setError(err.message || 'Erreur lors de la création du paiement');
      toast.error(err.message || 'Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert className={cn("bg-green-500/10 border-green-500/30", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Lien de paiement créé et copié ! Envoyez-le au client.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Encaissement Stripe</span>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
          <CreditCard className="w-3 h-3 mr-1" />
          {remainingAmount.toFixed(2)}€
        </Badge>
      </div>

      {hasDeposit && (
        <div className="text-xs text-muted-foreground">
          Acompte payé : {depositPaid.toFixed(2)}€ • Reste à payer : {remainingAmount.toFixed(2)}€
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSendPaymentRequest}
        disabled={loading || remainingAmount <= 0}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        size="sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Création du lien...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Envoyer demande de paiement CB
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        Un lien de paiement sera créé. Vous pourrez l'envoyer par SMS ou WhatsApp.
      </p>
    </div>
  );
}
