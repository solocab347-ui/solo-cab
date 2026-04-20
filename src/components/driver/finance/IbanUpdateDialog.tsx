/**
 * Dialog de mise à jour du RIB.
 * Utilise Stripe.js pour générer un bank_account token côté client (IBAN jamais envoyé à notre backend).
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDriverBankAccount } from '@/hooks/useDriverBankAccount';
import { Loader2, ShieldCheck, Info } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
}

export const IbanUpdateDialog = ({ open, onOpenChange, driverId }: Props) => {
  const { updateWithToken, isUpdating, createAccountLink, isCreatingLink } = useDriverBankAccount(driverId);
  const [iban, setIban] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [country, setCountry] = useState('FR');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!iban.trim() || !accountHolder.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe non disponible');

      // Création du token bank_account côté client (IBAN ne quitte pas le navigateur sans passer par Stripe)
      const result = await stripe.createToken('bank_account', {
        country,
        currency: 'eur',
        account_number: iban.replace(/\s/g, ''),
        account_holder_name: accountHolder,
        account_holder_type: 'individual',
      });

      if (result.error) {
        toast.error(result.error.message || 'IBAN invalide');
        return;
      }

      await updateWithToken(result.token!.id);
      onOpenChange(false);
      setIban('');
      setAccountHolder('');
    } catch (err: any) {
      // Si l'API refuse, proposer le fallback Account Link
      if (err.message?.includes('account_invalid') || err.message?.includes('verification')) {
        toast.error('Mise à jour directe impossible. Redirection vers Stripe...');
        setTimeout(() => createAccountLink(), 1500);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier mon RIB</DialogTitle>
          <DialogDescription>
            Saisissez les informations de votre nouveau compte bancaire. Votre IBAN est sécurisé par Stripe et n'est
            jamais stocké chez nous.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <ShieldCheck className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Validation et chiffrement par Stripe. Limite : 3 changements par 30 jours.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="holder">Titulaire du compte</Label>
            <Input
              id="holder"
              placeholder="Jean Dupont"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              disabled={submitting || isUpdating}
            />
          </div>

          <div>
            <Label htmlFor="country">Pays</Label>
            <select
              id="country"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={submitting || isUpdating}
            >
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="DE">Allemagne</option>
              <option value="ES">Espagne</option>
              <option value="IT">Italie</option>
              <option value="LU">Luxembourg</option>
              <option value="CH">Suisse</option>
            </select>
          </div>

          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              disabled={submitting || isUpdating}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Vérifiez bien votre IBAN avant validation
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting || isUpdating}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={() => createAccountLink()}
            disabled={submitting || isUpdating || isCreatingLink}
          >
            {isCreatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Faire via Stripe'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || isUpdating}>
            {submitting || isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
