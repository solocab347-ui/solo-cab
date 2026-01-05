import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Users, 
  Euro, 
  Clock, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Scale,
  Building2,
  Car,
  CreditCard,
  Handshake,
  CalendarCheck
} from 'lucide-react';

interface CompanyDriverSignatureConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  partnerType: 'company' | 'driver';
  paymentFrequency?: string;
  paymentMethods?: string[];
  onConfirmSign: () => void;
  signing?: boolean;
}

const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  per_course: 'Par course',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  mixed: 'Mixte',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire',
  payment_link: 'Lien de paiement',
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
};

interface Obligation {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  critical?: boolean;
  forParty: 'company' | 'driver' | 'both';
}

const OBLIGATIONS: Obligation[] = [
  // Obligations for COMPANY
  {
    id: 'company_payment_respect',
    icon: <Euro className="h-5 w-5" />,
    title: 'Respect des délais de paiement',
    description: 'Je m\'engage à régler le chauffeur dans les délais convenus selon la fréquence de paiement définie dans le contrat. Tout retard de paiement supérieur à 15 jours pourra entraîner des pénalités.',
    critical: true,
    forParty: 'company',
  },
  {
    id: 'company_booking_respect',
    icon: <CalendarCheck className="h-5 w-5" />,
    title: 'Respect des réservations',
    description: 'Je m\'engage à honorer les réservations effectuées auprès du chauffeur et à prévenir dans un délai raisonnable en cas d\'annulation.',
    forParty: 'company',
  },
  {
    id: 'company_driver_respect',
    icon: <Handshake className="h-5 w-5" />,
    title: 'Respect du chauffeur partenaire',
    description: 'Je m\'engage à traiter le chauffeur partenaire avec respect et professionnalisme, et à lui fournir toutes les informations nécessaires pour ses prestations.',
    forParty: 'company',
  },
  // Obligations for DRIVER
  {
    id: 'driver_service_quality',
    icon: <Car className="h-5 w-5" />,
    title: 'Qualité de service irréprochable',
    description: 'Je m\'engage à fournir une prestation de transport de qualité aux employés et clients de l\'entreprise, avec un véhicule propre, bien entretenu et conforme aux standards professionnels.',
    critical: true,
    forParty: 'driver',
  },
  {
    id: 'driver_punctuality',
    icon: <Clock className="h-5 w-5" />,
    title: 'Ponctualité et fiabilité',
    description: 'Je m\'engage à respecter scrupuleusement les horaires de prise en charge convenus. Toute annulation tardive ou non-présentation porte atteinte à la réputation de l\'entreprise partenaire.',
    critical: true,
    forParty: 'driver',
  },
  {
    id: 'driver_confidentiality',
    icon: <Shield className="h-5 w-5" />,
    title: 'Confidentialité des informations',
    description: 'Je m\'engage à préserver la confidentialité des informations concernant l\'entreprise, ses employés et ses activités, et à ne pas les divulguer à des tiers.',
    forParty: 'driver',
  },
  // Obligations for BOTH
  {
    id: 'mutual_communication',
    icon: <Users className="h-5 w-5" />,
    title: 'Communication transparente',
    description: 'Je m\'engage à maintenir une communication claire et réactive avec mon partenaire concernant toute question liée à notre collaboration.',
    forParty: 'both',
  },
  {
    id: 'legal_compliance',
    icon: <Scale className="h-5 w-5" />,
    title: 'Conformité légale et réglementaire',
    description: 'Je confirme être en conformité avec la réglementation applicable à mon activité et m\'engage à maintenir cette conformité pendant toute la durée du partenariat.',
    forParty: 'both',
  },
];

export function CompanyDriverSignatureConfirmation({
  open,
  onOpenChange,
  partnerName,
  partnerType,
  paymentFrequency,
  paymentMethods,
  onConfirmSign,
  signing,
}: CompanyDriverSignatureConfirmationProps) {
  const [acceptedObligations, setAcceptedObligations] = useState<Set<string>>(new Set());
  const [globalAcceptance, setGlobalAcceptance] = useState(false);

  // Filter obligations based on party type
  const relevantObligations = OBLIGATIONS.filter(
    o => o.forParty === partnerType || o.forParty === 'both'
  );

  const allObligationsAccepted = relevantObligations.every(o => acceptedObligations.has(o.id));
  const canSign = allObligationsAccepted && globalAcceptance;

  const toggleObligation = (id: string) => {
    const newSet = new Set(acceptedObligations);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setAcceptedObligations(newSet);
  };

  const handleConfirm = () => {
    if (canSign) {
      onConfirmSign();
    }
  };

  const resetAndClose = () => {
    setAcceptedObligations(new Set());
    setGlobalAcceptance(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              {partnerType === 'company' ? (
                <Building2 className="h-6 w-6 text-primary" />
              ) : (
                <Car className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">Confirmation de signature</DialogTitle>
              <DialogDescription>
                Contrat de partenariat avec <span className="font-semibold text-foreground">{partnerName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          {/* Summary */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fréquence de paiement</span>
              <Badge variant="secondary" className="font-semibold">
                {paymentFrequency ? PAYMENT_FREQUENCY_LABELS[paymentFrequency] || paymentFrequency : 'À définir'}
              </Badge>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Moyens de paiement</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {paymentMethods?.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">
                    {PAYMENT_METHOD_LABELS[m] || m}
                  </Badge>
                )) || <Badge variant="outline">À définir</Badge>}
              </div>
            </div>
          </div>

          {/* Critical warning */}
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Attention :</strong> En signant ce contrat, vous vous engagez professionnellement. 
              Veuillez lire attentivement chaque clause avant d'accepter.
            </AlertDescription>
          </Alert>

          {/* Role-specific header */}
          <div className="mb-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-center">
              {partnerType === 'company' ? (
                <>Vos engagements en tant <strong>qu'Entreprise</strong> :</>
              ) : (
                <>Vos engagements en tant <strong>que Chauffeur VTC</strong> :</>
              )}
            </p>
          </div>

          {/* Obligations list */}
          <div className="space-y-3 mb-4">
            {relevantObligations.map((obligation) => (
              <div 
                key={obligation.id}
                className={`p-3 rounded-lg border transition-colors ${
                  acceptedObligations.has(obligation.id)
                    ? 'border-green-500/50 bg-green-500/5'
                    : obligation.critical
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id={obligation.id}
                    checked={acceptedObligations.has(obligation.id)}
                    onCheckedChange={() => toggleObligation(obligation.id)}
                    className="mt-1"
                  />
                  <label htmlFor={obligation.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={obligation.critical ? 'text-red-600 dark:text-red-400' : 'text-primary'}>
                        {obligation.icon}
                      </span>
                      <span className="font-medium text-sm">{obligation.title}</span>
                      {obligation.critical && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Critique
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {obligation.description}
                    </p>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Global acceptance */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="global-acceptance"
                checked={globalAcceptance}
                onCheckedChange={(checked) => setGlobalAcceptance(checked === true)}
                disabled={!allObligationsAccepted}
                className="mt-0.5"
              />
              <label htmlFor="global-acceptance" className="cursor-pointer">
                <span className="font-semibold text-sm block mb-1">
                  Déclaration sur l'honneur
                </span>
                <p className="text-xs text-muted-foreground">
                  Je déclare avoir lu, compris et accepté l'intégralité des clauses du contrat de partenariat. 
                  Je m'engage sur l'honneur à respecter ces obligations et comprends que tout manquement 
                  pourra entraîner la suspension ou la résiliation du partenariat.
                </p>
              </label>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={resetAndClose}
              className="flex-1"
              disabled={signing}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!canSign || signing}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Je signe le contrat
                </>
              )}
            </Button>
          </div>
          
          {!allObligationsAccepted && (
            <p className="text-xs text-muted-foreground text-center mt-2 w-full">
              Veuillez accepter toutes les obligations pour continuer
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
