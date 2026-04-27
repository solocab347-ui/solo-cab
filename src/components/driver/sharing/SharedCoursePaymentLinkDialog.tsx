import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Copy,
  Check,
  CreditCard,
  QrCode,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Share2,
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharedCourseId: string;
  amountTtc: number;
  courseLabel?: string;
  /** Called once Stripe confirms the course is paid */
  onPaid?: () => void;
}

type Status = 'idle' | 'creating' | 'awaiting' | 'verifying' | 'paid' | 'error';

export function SharedCoursePaymentLinkDialog({
  open,
  onOpenChange,
  sharedCourseId,
  amountTtc,
  courseLabel,
  onPaid,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing link from DB when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('shared_courses')
        .select('client_payment_url, payment_status')
        .eq('id', sharedCourseId)
        .single();
      if (cancelled) return;
      if (data?.payment_status?.startsWith('paid')) {
        setStatus('paid');
      } else if (data?.client_payment_url) {
        setPaymentUrl(data.client_payment_url);
        setStatus('awaiting');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sharedCourseId]);

  // Generate QR whenever URL changes
  useEffect(() => {
    if (!paymentUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(paymentUrl, { width: 256, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [paymentUrl]);

  // Realtime: detect when webhook updates payment_status
  useEffect(() => {
    if (!open || status === 'paid') return;
    const channel = supabase
      .channel(`shared-course-pay-${sharedCourseId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_courses',
          filter: `id=eq.${sharedCourseId}`,
        },
        (payload) => {
          const ps = String((payload.new as any)?.payment_status || '');
          if (ps.startsWith('paid')) {
            setStatus('paid');
            toast.success('✅ Paiement client confirmé par Stripe');
            onPaid?.();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, sharedCourseId, status, onPaid]);

  const createLink = useCallback(async (forceRecreate = false) => {
    setStatus('creating');
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-shared-course-payment-link',
        { body: { shared_course_id: sharedCourseId, force_recreate: forceRecreate } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.already_paid) {
        setStatus('paid');
        onPaid?.();
        return;
      }
      setPaymentUrl(data.checkout_url);
      setStatus('awaiting');
      toast.success(
        forceRecreate ? 'Nouveau lien généré' : 'Lien de paiement prêt',
      );
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la création du lien');
      setStatus('error');
      toast.error(e?.message || 'Impossible de créer le lien');
    }
  }, [sharedCourseId, onPaid]);

  const copyLink = async () => {
    if (!paymentUrl) return;
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast.success('Lien copié dans le presse-papiers');
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePayment = async () => {
    if (!paymentUrl) return;
    const text = `Voici le lien de paiement pour votre course (${amountTtc.toFixed(2)} €) : ${paymentUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Paiement de votre course', text, url: paymentUrl });
      } catch {
        // user cancelled
      }
    } else {
      // Fallback: WhatsApp web
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        '_blank',
      );
    }
  };

  const verifyNow = async () => {
    setStatus('verifying');
    try {
      const { data, error } = await supabase.functions.invoke(
        'verify-shared-course-payment',
        { body: { shared_course_id: sharedCourseId } },
      );
      if (error) throw error;
      if (data?.paid) {
        setStatus('paid');
        toast.success('✅ Paiement confirmé par Stripe');
        onPaid?.();
      } else {
        setStatus('awaiting');
        toast.info('Stripe n\'a pas encore reçu le paiement');
      }
    } catch (e: any) {
      setStatus('awaiting');
      toast.error(e?.message || 'Vérification impossible');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Paiement de la course partagée
          </DialogTitle>
          <DialogDescription>
            {courseLabel ? `${courseLabel} — ` : ''}
            Montant TTC à encaisser :{' '}
            <span className="font-semibold text-foreground">
              {amountTtc.toFixed(2)} €
            </span>
          </DialogDescription>
        </DialogHeader>

        {status === 'paid' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <p className="font-semibold text-green-700">
              Paiement confirmé par Stripe
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Le montant TTC de {amountTtc.toFixed(2)} € a bien été encaissé.
              Vous pouvez maintenant terminer la course en toute sécurité.
            </p>
            <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Course réglée
            </Badge>
          </div>
        ) : status === 'idle' || (status === 'error' && !paymentUrl) ? (
          <div className="space-y-4 py-2">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Aucun lien Stripe n'a encore été généré pour cette course.
                Le client doit régler avant la fin de la course pour que
                Stripe confirme le paiement.
              </AlertDescription>
            </Alert>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={() => createLink(false)}
              disabled={status === 'creating'}
              className="w-full"
            >
              {status === 'creating' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération du lien Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Générer le lien de paiement Stripe
                </>
              )}
            </Button>
          </div>
        ) : status === 'creating' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <AlertDescription className="text-xs text-amber-900">
                Tant que Stripe n'a pas confirmé le paiement, la course ne
                pourra pas être terminée.
              </AlertDescription>
            </Alert>

            {/* Lien copiable */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Lien Stripe à envoyer au client
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={paymentUrl || ''}
                  className="text-xs font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  title="Copier"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={sharePayment} size="sm">
                <Share2 className="w-4 h-4 mr-1" />
                Envoyer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => paymentUrl && window.open(paymentUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Ouvrir
              </Button>
            </div>

            {/* QR */}
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border">
                <img
                  src={qrDataUrl}
                  alt="QR code de paiement Stripe"
                  className="w-40 h-40"
                />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  Le client scanne pour payer ({amountTtc.toFixed(2)} €)
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Badge variant="outline" className="text-xs">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                En attente de paiement Stripe
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createLink(true)}
                disabled={status === 'creating'}
                title="Régénérer un nouveau lien"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            <Button
              onClick={verifyNow}
              disabled={status === 'verifying'}
              variant="default"
              className="w-full"
            >
              {status === 'verifying' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification Stripe...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  J'ai vérifié, contrôler Stripe maintenant
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
