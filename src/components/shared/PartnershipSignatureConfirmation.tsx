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
  UserX,
  Handshake
} from 'lucide-react';

interface PartnershipSignatureConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  commissionPercentage?: number;
  paymentSchedule?: string;
  onConfirmSign: () => void;
  signing?: boolean;
  partnershipType?: 'driver' | 'fleet'; // driver = chauffeur-chauffeur, fleet = chauffeur-gestionnaire
  mode?: 'accept' | 'propose'; // accept = accepter une offre, propose = faire une demande
  signerRole?: 'driver' | 'fleet_manager'; // qui signe le contrat
}

const PAYMENT_SCHEDULE_LABELS: Record<string, string> = {
  per_course: 'Par course',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

interface Obligation {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  critical?: boolean;
}

// Obligations pour les partenariats chauffeur-chauffeur
const DRIVER_OBLIGATIONS: Obligation[] = [
  {
    id: 'client_protection',
    icon: <UserX className="h-5 w-5" />,
    title: 'Protection de la clientèle',
    description: 'Je m\'engage à NE PAS solliciter, démarcher ou détourner les clients de mon partenaire. Chaque client appartient exclusivement au chauffeur qui l\'a acquis. Toute tentative de détournement est une faute grave pouvant entraîner la résiliation immédiate du partenariat et des poursuites judiciaires.',
    critical: true,
  },
  {
    id: 'payment_respect',
    icon: <Euro className="h-5 w-5" />,
    title: 'Respect des paiements',
    description: 'Je m\'engage à verser les commissions dues dans les délais convenus. Tout retard de paiement supérieur à 15 jours pourra entraîner des pénalités de retard et la suspension du partenariat.',
    critical: true,
  },
  {
    id: 'deadline_respect',
    icon: <Clock className="h-5 w-5" />,
    title: 'Respect des délais',
    description: 'Je m\'engage à respecter scrupuleusement les horaires de prise en charge convenus avec les clients. Toute annulation tardive ou non-présentation porte atteinte à la réputation de mon partenaire.',
  },
  {
    id: 'service_quality',
    icon: <Handshake className="h-5 w-5" />,
    title: 'Qualité de service',
    description: 'Je m\'engage à fournir un service irréprochable aux clients de mon partenaire, avec le même professionnalisme que pour mes propres clients. La satisfaction client est notre priorité commune.',
  },
  {
    id: 'confidentiality',
    icon: <Shield className="h-5 w-5" />,
    title: 'Confidentialité des informations',
    description: 'Je m\'engage à préserver la confidentialité des informations commerciales partagées (coordonnées clients, tarifs, etc.) et à ne pas les utiliser en dehors du cadre de notre partenariat.',
  },
  {
    id: 'legal_compliance',
    icon: <Scale className="h-5 w-5" />,
    title: 'Conformité légale',
    description: 'Je confirme être en possession de toutes les autorisations nécessaires à l\'exercice de mon activité (carte VTC, assurance professionnelle, immatriculation) et m\'engage à les maintenir valides.',
  },
];

// Obligations pour les partenariats chauffeur-gestionnaire de flotte (côté chauffeur)
const FLEET_DRIVER_OBLIGATIONS: Obligation[] = [
  {
    id: 'client_protection_fleet',
    icon: <UserX className="h-5 w-5" />,
    title: 'Protection de la clientèle du gestionnaire',
    description: 'Je m\'engage à NE PAS solliciter, démarcher ou détourner les clients du gestionnaire de flotte. Les clients qui me sont confiés via ce partenariat restent exclusivement liés au gestionnaire. Toute tentative de détournement entraînera la résiliation immédiate et des poursuites judiciaires.',
    critical: true,
  },
  {
    id: 'payment_respect',
    icon: <Euro className="h-5 w-5" />,
    title: 'Respect des paiements',
    description: 'Je m\'engage à verser les commissions dues dans les délais convenus. Tout retard de paiement supérieur à 15 jours pourra entraîner des pénalités de retard et la suspension du partenariat.',
    critical: true,
  },
  {
    id: 'deadline_respect',
    icon: <Clock className="h-5 w-5" />,
    title: 'Respect des délais',
    description: 'Je m\'engage à respecter scrupuleusement les horaires de prise en charge convenus. Toute annulation tardive ou non-présentation porte atteinte à la réputation du gestionnaire de flotte.',
  },
  {
    id: 'service_quality',
    icon: <Handshake className="h-5 w-5" />,
    title: 'Qualité de service',
    description: 'Je m\'engage à fournir un service irréprochable aux clients qui me sont confiés, représentant dignement l\'image du gestionnaire de flotte. La satisfaction client est primordiale.',
  },
  {
    id: 'confidentiality',
    icon: <Shield className="h-5 w-5" />,
    title: 'Confidentialité des informations',
    description: 'Je m\'engage à préserver la confidentialité de toutes les informations commerciales (coordonnées clients, tarifs, stratégies) et à ne pas les utiliser en dehors du cadre de ce partenariat.',
  },
  {
    id: 'legal_compliance',
    icon: <Scale className="h-5 w-5" />,
    title: 'Conformité légale',
    description: 'Je confirme être en possession de toutes les autorisations nécessaires à l\'exercice de mon activité (carte VTC, assurance professionnelle, immatriculation) et m\'engage à les maintenir valides.',
  },
];

// Obligations pour le gestionnaire de flotte envers le chauffeur
const FLEET_MANAGER_OBLIGATIONS: Obligation[] = [
  {
    id: 'course_provision',
    icon: <Users className="h-5 w-5" />,
    title: 'Fourniture de missions',
    description: 'Je m\'engage à proposer des courses au chauffeur partenaire dans le cadre de notre collaboration, sans obligation de volume minimum ou maximum. Les missions seront attribuées selon les besoins et disponibilités.',
    critical: true,
  },
  {
    id: 'timely_communication',
    icon: <Clock className="h-5 w-5" />,
    title: 'Transmission rapide des missions',
    description: 'Je m\'engage à transmettre les demandes de courses au chauffeur dans les meilleurs délais possibles, afin de lui permettre de s\'organiser efficacement et d\'assurer un service de qualité.',
    critical: true,
  },
  {
    id: 'respectful_clients',
    icon: <Handshake className="h-5 w-5" />,
    title: 'Clients respectueux',
    description: 'Je m\'engage à envoyer des clients qui respectent le travail du chauffeur, son véhicule et son matériel professionnel. En cas de comportement inapproprié signalé, je m\'engage à prendre les mesures nécessaires.',
  },
  {
    id: 'commission_respect',
    icon: <Euro className="h-5 w-5" />,
    title: 'Respect des commissions convenues',
    description: 'Je m\'engage à respecter le taux de commission convenu contractuellement et à ne pas le modifier unilatéralement. Toute modification devra faire l\'objet d\'un accord mutuel préalable.',
    critical: true,
  },
  {
    id: 'fair_treatment',
    icon: <Scale className="h-5 w-5" />,
    title: 'Traitement équitable',
    description: 'Je m\'engage à traiter le chauffeur partenaire de manière équitable et professionnelle, en respectant son statut d\'indépendant et en maintenant une communication transparente.',
  },
  {
    id: 'payment_transparency',
    icon: <Shield className="h-5 w-5" />,
    title: 'Transparence financière',
    description: 'Je m\'engage à fournir au chauffeur toutes les informations nécessaires concernant les courses effectuées, les montants et les commissions, permettant un suivi clair de notre collaboration.',
  },
];

export function PartnershipSignatureConfirmation({
  open,
  onOpenChange,
  partnerName,
  commissionPercentage,
  paymentSchedule,
  onConfirmSign,
  signing,
  partnershipType = 'driver',
  mode = 'accept',
  signerRole = 'driver',
}: PartnershipSignatureConfirmationProps) {
  const [acceptedObligations, setAcceptedObligations] = useState<Set<string>>(new Set());
  const [globalAcceptance, setGlobalAcceptance] = useState(false);

  // Sélectionner les obligations selon le type de partenariat ET le rôle du signataire
  const obligations = partnershipType === 'fleet' 
    ? (signerRole === 'fleet_manager' ? FLEET_MANAGER_OBLIGATIONS : FLEET_DRIVER_OBLIGATIONS)
    : DRIVER_OBLIGATIONS;

  const allObligationsAccepted = obligations.every(o => acceptedObligations.has(o.id));
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
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {mode === 'propose' ? 'Engagements contractuels' : 'Confirmation de signature'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'propose' 
                  ? <>Demande de partenariat à <span className="font-semibold text-foreground">{partnerName}</span></>
                  : <>Partenariat avec <span className="font-semibold text-foreground">{partnerName}</span></>
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          {/* Summary */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Commission</span>
              <Badge variant="secondary" className="font-semibold">
                {commissionPercentage ? `${commissionPercentage}%` : 'À définir'}
              </Badge>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paiement</span>
              <Badge variant="secondary">
                {paymentSchedule ? PAYMENT_SCHEDULE_LABELS[paymentSchedule] || paymentSchedule : 'À définir'}
              </Badge>
            </div>
          </div>

          {/* Critical warning */}
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Attention :</strong> {mode === 'propose' 
                ? "En envoyant cette demande, vous vous engagez à respecter les obligations ci-dessous si le partenariat est accepté."
                : "En signant ce contrat, vous vous engagez légalement. Veuillez lire attentivement chaque clause avant d'accepter."
              }
            </AlertDescription>
          </Alert>

          {/* Obligations list */}
          <div className="space-y-3 mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Engagements contractuels
            </h4>
            
            {obligations.map((obligation) => (
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
                  {mode === 'propose'
                    ? "Je déclare avoir lu, compris et accepté l'intégralité des engagements ci-dessus. En envoyant cette demande de partenariat, je m'engage sur l'honneur à respecter ces obligations si ma demande est acceptée."
                    : "Je déclare avoir lu, compris et accepté l'intégralité des clauses du contrat de partenariat. Je m'engage sur l'honneur à respecter ces obligations et comprends que tout manquement pourra entraîner des sanctions, la résiliation du partenariat et d'éventuelles poursuites judiciaires."
                  }
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
                  {mode === 'propose' ? 'Envoi en cours...' : 'Signature en cours...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {mode === 'propose' ? "J'accepte et j'envoie ma demande" : 'Je signe le contrat'}
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
