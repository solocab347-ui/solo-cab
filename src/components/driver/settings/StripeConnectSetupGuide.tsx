import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  CreditCard,
  Building2,
  User,
  CheckCircle2,
  Info,
  ArrowRight,
  Shield,
  Clock,
  HelpCircle,
  ChevronRight,
  Banknote,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StripeConnectSetupGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartSetup: () => void;
  isConnecting?: boolean;
}

const SETUP_STEPS = [
  {
    number: 1,
    title: "Créez votre compte Stripe",
    icon: User,
    description: "Inscription rapide avec votre email",
    details: [
      "Utilisez votre email professionnel",
      "Choisissez un mot de passe sécurisé",
      "Confirmez votre email via le lien reçu",
    ],
    time: "2 min",
  },
  {
    number: 2,
    title: "Vérifiez votre identité",
    icon: FileText,
    description: "Pièce d'identité requise",
    details: [
      "Carte d'identité ou passeport valide",
      "Photo recto/verso lisible",
      "Vérification automatique en quelques secondes",
    ],
    time: "1 min",
  },
  {
    number: 3,
    title: "Ajoutez votre compte bancaire",
    icon: Building2,
    description: "Pour recevoir vos paiements",
    details: [
      "IBAN de votre compte professionnel",
      "Nom du titulaire du compte",
      "Les virements arrivent en 2 jours ouvrés",
    ],
    time: "1 min",
  },
  {
    number: 4,
    title: "Activez votre compte",
    icon: CheckCircle2,
    description: "Validation finale",
    details: [
      "Stripe vérifie vos informations (24h max)",
      "Vous recevez une confirmation par email",
      "Vous pouvez commencer à encaisser !",
    ],
    time: "Automatique",
  },
];

const DOCUMENTS_REQUIRED = [
  {
    icon: User,
    title: "Pièce d'identité",
    description: "CNI ou Passeport valide",
  },
  {
    icon: Building2,
    title: "RIB / IBAN",
    description: "Compte bancaire professionnel",
  },
  {
    icon: FileText,
    title: "Numéro SIRET",
    description: "De votre entreprise VTC",
  },
  {
    icon: Smartphone,
    title: "Numéro de téléphone",
    description: "Pour la vérification",
  },
];

const FAQ_ITEMS = [
  {
    question: "Combien coûte Stripe Connect ?",
    answer:
      "SoloCab prélève 0,50€ par course (espèces ou carte). Pour les encaissements spontanés : 0,80€. Aucun abonnement mensuel. Vous ne payez que quand vous encaissez !",
  },
  {
    question: "Quand vais-je recevoir mes paiements ?",
    answer:
      "Les virements sont automatiques et arrivent sur votre compte en 2 jours ouvrés après la course. Stripe effectue les virements quotidiennement.",
  },
  {
    question: "Est-ce sécurisé ?",
    answer:
      "Stripe est leader mondial des paiements en ligne, utilisé par des millions d'entreprises (Uber, Amazon, Google...). Vos données sont cryptées et protégées selon les normes PCI-DSS les plus strictes.",
  },
  {
    question: "Puis-je utiliser mon compte Stripe existant ?",
    answer:
      "Non, SoloCab crée un compte Stripe Express dédié pour gérer vos paiements VTC. C'est plus simple et sécurisé car SoloCab gère l'infrastructure technique.",
  },
  {
    question: "Que se passe-t-il si un client conteste un paiement ?",
    answer:
      "Stripe gère les litiges automatiquement. En cas de contestation, vous serez notifié et pourrez fournir des preuves (trajet GPS, confirmation client). SoloCab vous accompagne dans ce processus.",
  },
  {
    question: "Puis-je revenir à mon propre TPE plus tard ?",
    answer:
      "Oui, vous pouvez à tout moment modifier vos paramètres d'encaissement dans SoloCab pour utiliser votre propre équipement. Les deux modes peuvent même coexister.",
  },
];

export function StripeConnectSetupGuide({
  open,
  onOpenChange,
  onStartSetup,
  isConnecting = false,
}: StripeConnectSetupGuideProps) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <DialogTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Guide de configuration Stripe Connect
          </DialogTitle>
          <DialogDescription className="text-white/90 text-sm">
            Tout ce que vous devez savoir pour activer les paiements en ligne
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-6">
            {/* Temps estimé */}
            <div className="flex items-center justify-center gap-2 bg-primary/10 rounded-lg p-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Configuration en <strong>5 minutes</strong>
              </span>
            </div>

            {/* Étapes visuelles */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Les 4 étapes de la configuration
              </h3>

              <div className="space-y-2">
                {SETUP_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeStep === index;
                  return (
                    <div
                      key={step.number}
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-all",
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setActiveStep(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {step.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-sm">{step.title}</h4>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {step.time}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>

                          {isActive && (
                            <ul className="mt-2 space-y-1">
                              {step.details.map((detail, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-muted-foreground"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                            isActive && "rotate-90"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents à préparer */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Documents à préparer
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {DOCUMENTS_REQUIRED.map((doc, index) => {
                  const Icon = doc.icon;
                  return (
                    <div
                      key={index}
                      className="bg-muted/50 rounded-lg p-3 flex items-start gap-2"
                    >
                      <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700">
                    100% sécurisé
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Stripe est le leader mondial des paiements en ligne. Vos
                    données sont cryptées et jamais partagées avec SoloCab.
                  </p>
                </div>
              </div>
            </div>

            {/* Transparence frais */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Banknote className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Frais transparents
                  </p>
                   <p className="text-xs text-blue-600 mt-0.5">
                     Frais estimés : <strong>~1,10€</strong> par transaction de 15€
                     <br />
                     <span className="text-blue-500">
                       Aucun abonnement, vous payez uniquement quand vous encaissez
                     </span>
                   </p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Questions fréquentes
              </h3>

              <Accordion type="single" collapsible className="w-full">
                {FAQ_ITEMS.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-xs text-left py-2">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Important note */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Comment ça fonctionne ?
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    En cliquant sur <strong>"Commencer la configuration"</strong>, 
                    SoloCab vous redirige automatiquement vers Stripe où votre compte 
                    sera créé et lié à SoloCab. Vous n'avez rien à faire manuellement !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* CTA Footer */}
        <div className="p-4 border-t bg-background">
          <Button
            onClick={() => {
              onStartSetup();
              onOpenChange(false);
            }}
            disabled={isConnecting}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isConnecting ? (
              "Redirection en cours..."
            ) : (
              <>
                Commencer la configuration
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Vous serez redirigé vers Stripe.com pour compléter l'inscription
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StripeConnectSetupGuide;
