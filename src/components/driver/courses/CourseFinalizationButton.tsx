import { useState, useEffect } from 'react';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  CreditCard,
  RefreshCw,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CourseFinalizationButtonProps {
  courseId: string;
  totalAmount: number;
  depositPaid?: number;
  depositStatus?: string;
  hasCardHold?: boolean;
  finalPaymentStatus?: string;
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action';

export function CourseFinalizationButton({
  courseId,
  totalAmount,
  depositPaid = 0,
  depositStatus,
  hasCardHold = false,
  finalPaymentStatus: initialStatus,
  onSuccess,
  disabled = false,
  className,
}: CourseFinalizationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>((initialStatus as PaymentStatus) || 'pending');
  const [error, setError] = useState<string | null>(null);

  const remainingAmount = totalAmount - (depositStatus === 'paid' ? depositPaid : 0);
  const isFullyPaidViaDeposit = depositStatus === 'paid' && depositPaid >= totalAmount;

  // Subscribe to realtime updates for payment status via centralized manager
  useEffect(() => {
    const cleanup = subscriptionManager.subscribe(
      `course-payment-${courseId}`,
      { table: 'courses', event: 'UPDATE', filter: `id=eq.${courseId}` },
      (payload) => {
        const newStatus = payload.new.final_payment_status as PaymentStatus;
        if (newStatus && newStatus !== status) {
          setStatus(newStatus);
          
          if (newStatus === 'succeeded') {
            toast.success('🎉 Paiement encaissé avec succès !');
            onSuccess?.();
          } else if (newStatus === 'failed') {
            setError(payload.new.last_payment_error || 'Échec du paiement');
            toast.error('Échec du paiement');
          }
        }
      }
    );

    return cleanup;
  }, [courseId, status, onSuccess]);

  const handleFinalize = async () => {
    if (loading) return; // Anti double-click
    setLoading(true);
    setError(null);

    const invokeOnce = () => supabase.functions.invoke('finalize-course-payment', {
      body: { course_id: courseId }
    });

    try {
      let { data, error: fnError } = await invokeOnce();

      // Soft retry on transient lock contention
      if (data?.transient && data?.retry_in_sec) {
        toast.info(`Paiement déjà en cours, nouvelle tentative dans ${data.retry_in_sec}s...`);
        await new Promise((r) => setTimeout(r, (data.retry_in_sec + 1) * 1000));
        const retry = await invokeOnce();
        data = retry.data;
        fnError = retry.error;
      }

      if (fnError) throw fnError;
      if (data?.error && !data?.success && !data?.already_paid) throw new Error(data.error);

      if (data.status === 'succeeded' || data.already_paid || data.success) {
        setStatus('succeeded');
        toast.success('🎉 Paiement encaissé avec succès !');
        onSuccess?.();
      } else if (data.status === 'requires_action') {
        setStatus('requires_action');
        toast.warning('Le client doit valider le paiement (3D Secure)');
      } else if (data.status === 'processing') {
        setStatus('processing');
        toast.info('Paiement en cours de traitement...');
      }
    } catch (err: any) {
      console.error('Finalization error:', err);
      setError(err.message || 'Erreur lors de la finalisation');
      setStatus('failed');
      toast.error(err.message || 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('pending');
    handleFinalize();
  };

  // Render based on status
  const renderStatusBadge = () => {
    switch (status) {
      case 'succeeded':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paiement confirmé
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            En cours...
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Échec
          </Badge>
        );
      case 'requires_action':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Action requise
          </Badge>
        );
      default:
        return null;
    }
  };

  // Already completed
  if (status === 'succeeded') {
    return (
      <Card className={cn("border-green-500/30 bg-green-500/5", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">Paiement encaissé</p>
                <p className="text-sm text-muted-foreground">
                  {remainingAmount > 0 
                    ? `${remainingAmount.toFixed(2)}€ prélevés avec succès`
                    : `Course payée via l'acompte`}
                </p>
              </div>
            </div>
            {renderStatusBadge()}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Processing
  if (status === 'processing') {
    return (
      <Card className={cn("border-blue-500/30 bg-blue-500/5", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <div>
              <p className="font-semibold text-blue-700">Paiement en cours</p>
              <p className="text-sm text-muted-foreground">
                Veuillez patienter...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Requires action (3D Secure)
  if (status === 'requires_action') {
    return (
      <Card className={cn("border-yellow-500/30 bg-yellow-500/5", className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-700">En attente de validation</p>
              <p className="text-sm text-muted-foreground">
                Le client doit valider le paiement (3D Secure)
              </p>
            </div>
          </div>
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Une notification a été envoyée au client pour valider le paiement.
              Le statut sera mis à jour automatiquement.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Failed - show retry
  if (status === 'failed') {
    return (
      <Card className={cn("border-red-500/30 bg-red-500/5", className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="font-semibold text-red-700">Échec du paiement</p>
                <p className="text-sm text-muted-foreground">
                  {error || 'Une erreur est survenue'}
                </p>
              </div>
            </div>
            {renderStatusBadge()}
          </div>
          <Button 
            onClick={handleRetry}
            variant="outline"
            className="w-full border-red-500/30 text-red-600 hover:bg-red-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer le paiement
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pending - show finalize button
  return (
    <Card className={cn(className)}>
      <CardContent className="p-4 space-y-4">
        {/* Amount summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant total</span>
            <span className="font-medium">{totalAmount.toFixed(2)}€</span>
          </div>
          {depositStatus === 'paid' && depositPaid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Acompte payé</span>
              <span className="text-green-600">-{depositPaid.toFixed(2)}€</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Reste à encaisser</span>
            <span className="text-primary">{remainingAmount.toFixed(2)}€</span>
          </div>
        </div>

        {/* Warning if no card hold */}
        {!hasCardHold && !isFullyPaidViaDeposit && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Aucune empreinte bancaire. Le client devra payer manuellement.
            </AlertDescription>
          </Alert>
        )}

        {/* Finalize button */}
        <Button
          onClick={handleFinalize}
          disabled={disabled || loading || (!hasCardHold && !isFullyPaidViaDeposit)}
          className="w-full bg-gradient-to-r from-primary to-primary/80"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Encaissement en cours...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {isFullyPaidViaDeposit 
                ? 'Finaliser la course'
                : `Encaisser ${remainingAmount.toFixed(2)}€`
              }
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {isFullyPaidViaDeposit 
            ? "La course est entièrement payée via l'acompte"
            : "Le paiement sera prélevé automatiquement sur la carte du client"
          }
        </p>
      </CardContent>
    </Card>
  );
}
