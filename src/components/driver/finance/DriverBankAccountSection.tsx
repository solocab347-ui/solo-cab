/**
 * Section "Mon compte bancaire" pour le chauffeur.
 * - Affiche le RIB actuel (last4 masqué)
 * - Affiche les virements échoués avec CTA explicite
 * - Bouton "Modifier mon RIB" : ouvre IbanUpdateDialog
 * - Fallback : lien vers Stripe (account_update) si erreur API
 */

import { useState } from 'react';
import { useDriverBankAccount } from '@/hooks/useDriverBankAccount';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Building2, ExternalLink, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { IbanUpdateDialog } from './IbanUpdateDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  driverId: string;
}

export const DriverBankAccountSection = ({ driverId }: Props) => {
  const {
    status,
    isLoading,
    failedTransfers,
    isCreatingLink,
    createAccountLink,
    refresh,
  } = useDriverBankAccount(driverId);

  const [updateOpen, setUpdateOpen] = useState(false);

  const blockedAmount = failedTransfers.reduce((sum, t: any) => sum + (t.amount_cents ?? 0), 0);

  if (isLoading) {
    return (
      <Card className="p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bandeau virements bloqués */}
      {failedTransfers.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="space-y-2">
            <div className="font-semibold">
              {failedTransfers.length} virement{failedTransfers.length > 1 ? 's' : ''} en attente —{' '}
              {(blockedAmount / 100).toFixed(2)} €
            </div>
            <p className="text-sm">
              Mettez à jour votre RIB ci-dessous pour débloquer ces virements. Une fois validé, ils seront retentés
              automatiquement.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Bloc compte bloqué */}
      {!status?.payouts_enabled && status?.has_bank_account && (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertDescription>
            Vos virements sont actuellement <strong>désactivés par Stripe</strong>. Vérifiez que votre RIB est valide
            ou contactez le support.
          </AlertDescription>
        </Alert>
      )}

      {/* Carte RIB actuel */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Compte bancaire de versement</h3>
              <p className="text-xs text-muted-foreground">Reçoit vos paiements de courses</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} title="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {status?.has_bank_account && status.bank_account ? (
          <div className="space-y-3">
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Banque</span>
                <span className="font-medium">{status.bank_account.bank_name ?? 'Banque'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">IBAN</span>
                <span className="font-mono">•••• {status.bank_account.last4}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pays / Devise</span>
                <span className="text-sm">
                  {status.bank_account.country} / {status.bank_account.currency.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant={status.payouts_enabled ? 'default' : 'destructive'}>
                  {status.payouts_enabled ? 'Actif' : 'Bloqué'}
                </Badge>
              </div>
              {status.updated_at && (
                <p className="text-xs text-muted-foreground pt-1">
                  Dernière mise à jour : {format(new Date(status.updated_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <Alert className="mb-4">
            <AlertDescription>
              Aucun RIB configuré. Ajoutez-en un pour recevoir vos paiements.
            </AlertDescription>
          </Alert>
        )}

        {/* Rate limit info */}
        {status?.rate_limit && status.rate_limit.recent_changes > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {status.rate_limit.allowed
              ? `${status.rate_limit.remaining} changement${status.rate_limit.remaining! > 1 ? 's' : ''} restant${status.rate_limit.remaining! > 1 ? 's' : ''} sur 30 jours`
              : `Limite atteinte. Prochain changement possible le ${
                  status.rate_limit.next_allowed_at
                    ? format(new Date(status.rate_limit.next_allowed_at), 'dd MMM yyyy', { locale: fr })
                    : 'plus tard'
                }`}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={() => setUpdateOpen(true)}
            disabled={status?.rate_limit && !status.rate_limit.allowed}
          >
            {status?.has_bank_account ? 'Modifier mon RIB' : 'Ajouter un RIB'}
          </Button>
          <Button
            variant="outline"
            onClick={() => createAccountLink()}
            disabled={isCreatingLink}
            title="Si la mise à jour directe ne fonctionne pas"
          >
            {isCreatingLink ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Via Stripe
          </Button>
        </div>
      </Card>

      {/* Liste détaillée des virements bloqués */}
      {failedTransfers.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">Virements en attente</h4>
          <div className="space-y-2">
            {failedTransfers.map((ft: any) => (
              <div
                key={ft.id}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
              >
                <div>
                  <div className="font-medium">{(ft.amount_cents / 100).toFixed(2)} €</div>
                  <div className="text-xs text-muted-foreground">
                    Échec le {format(new Date(ft.created_at), 'dd MMM yyyy', { locale: fr })}
                    {ft.failure_code && ` — ${ft.failure_code}`}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {ft.status === 'awaiting_rib_update' && 'RIB requis'}
                  {ft.status === 'pending_retry' && 'En attente'}
                  {ft.status === 'retrying' && 'En cours...'}
                  {ft.status === 'awaiting_admin_review' && 'Révision admin'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <IbanUpdateDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        driverId={driverId}
      />
    </div>
  );
};
