/**
 * Modale de Prominent Disclosure exigée par Google Play pour la
 * permission ACCESS_BACKGROUND_LOCATION.
 *
 * S'abonne au bus `prominentDisclosure` et s'affiche à la demande,
 * avant que l'OS ne présente sa propre boîte de dialogue système.
 *
 * Contenu conforme aux exigences Google :
 *   - Quelles données sont collectées (position GPS précise)
 *   - Pourquoi elles sont collectées (mise en relation chauffeur/client)
 *   - Comment elles sont utilisées (affichage en temps réel, sécurité)
 *   - Mention claire de l'usage EN ARRIÈRE-PLAN même app fermée
 *   - Choix explicite Accepter / Refuser
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Shield, Clock, Lock, FileText, ExternalLink } from 'lucide-react';
import { _registerDisclosureListener, type DisclosureDecision } from '@/lib/prominentDisclosure';

export function BackgroundLocationDisclosureDialog() {
  const [open, setOpen] = useState(false);
  const [resolver, setResolver] = useState<((d: DisclosureDecision) => void) | null>(null);

  useEffect(() => {
    _registerDisclosureListener((resolve) => {
      setResolver(() => resolve);
      setOpen(true);
    });
    return () => _registerDisclosureListener(null);
  }, []);

  const respond = (decision: DisclosureDecision) => {
    setOpen(false);
    const r = resolver;
    setResolver(null);
    // Laisse la modale se fermer avant de résoudre, pour éviter un flash
    setTimeout(() => r?.(decision), 50);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) respond('declined'); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Utilisation de votre localisation
          </DialogTitle>
          <DialogDescription className="text-center">
            Avant que le système ne vous demande l'autorisation, voici
            comment SoloCab utilise votre position GPS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Quelles données :</strong> votre position GPS précise
                (latitude, longitude, vitesse, cap).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Pourquoi :</strong> pour vous attribuer les courses
                proches de vous, calculer les itinéraires, et permettre au
                client de suivre votre véhicule en temps réel.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Quand, y compris en arrière-plan :</strong> uniquement
                lorsque vous êtes <strong>en ligne</strong> ou qu'une course
                est en cours. La collecte continue si l'application est
                réduite, l'écran éteint ou si vous utilisez une autre app —
                c'est indispensable pour ne pas perdre les courses pendant un
                trajet. Aucune collecte quand vous êtes hors ligne.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Comment :</strong> les positions sont transmises de
                façon chiffrée à nos serveurs et ne sont jamais vendues à des
                tiers. Vous pouvez révoquer l'autorisation à tout moment dans
                les Réglages Android.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Après votre accord ci-dessous, Android vous présentera sa propre
            boîte de dialogue. Choisissez <strong>« Toujours autoriser »</strong>{' '}
            pour activer le mode chauffeur en arrière-plan.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => respond('accepted')} className="w-full">
            J'accepte, continuer
          </Button>
          <Button
            variant="ghost"
            onClick={() => respond('declined')}
            className="w-full text-muted-foreground"
          >
            Refuser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
