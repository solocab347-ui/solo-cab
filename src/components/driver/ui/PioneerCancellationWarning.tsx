import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trophy, XCircle, Euro, Clock } from "lucide-react";

interface PioneerCancellationWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const PioneerCancellationWarning = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: PioneerCancellationWarningProps) => {
  const [step, setStep] = useState<1 | 2>(1);

  const handleConfirmStep1 = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    setStep(1);
    onConfirm();
  };

  const handleCancel = () => {
    setStep(1);
    onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <AlertDialogTitle className="text-xl">
                  ⚠️ Attention : Vous êtes Pionnier !
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Statut Pionnier SoloCab
                      </span>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                        Exclusif
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      En tant que Pionnier, vous bénéficiez d'avantages exceptionnels à vie.
                      Ces avantages seront <strong className="text-destructive">définitivement perdus</strong> en cas de résiliation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Ce que vous perdrez :
                    </h4>
                    
                    <div className="grid gap-2">
                      <div className="flex items-start gap-3 bg-destructive/10 rounded-lg p-3">
                        <Euro className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Tarif Pionnier à vie</p>
                          <p className="text-sm text-muted-foreground">
                            Vous perdrez votre tarif préférentiel Pioneer → Vous passerez au tarif standard <strong>19,99€/mois</strong>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Perte de l'avantage Pioneer exclusif
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 bg-destructive/10 rounded-lg p-3">
                        <Trophy className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Badge Pionnier</p>
                          <p className="text-sm text-muted-foreground">
                            Votre badge distinctif sera retiré de votre profil public et des recherches.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 bg-destructive/10 rounded-lg p-3">
                        <Clock className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Avantages irrécupérables</p>
                          <p className="text-sm text-muted-foreground">
                            Si vous vous réinscrivez après la fin de période, vous perdrez définitivement le statut Pioneer.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      💡 Conseil : Si vous avez des difficultés temporaires, contactez-nous ! 
                      Nous pouvons peut-être trouver une solution pour préserver votre statut Pionnier.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel onClick={handleCancel} className="flex-1">
                Garder mon abonnement
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmStep1}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                Je comprends, continuer
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-destructive/20">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl">
                  Confirmation Finale
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <p className="font-semibold text-destructive mb-2">
                      Êtes-vous absolument certain de vouloir résilier ?
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Votre accès reste actif jusqu'à la fin de la période payée</li>
                      <li>• Si vous revenez <strong>avant la fin de période</strong>, vous pourrez annuler la résiliation</li>
                      <li>• Si vous revenez <strong>après la fin de période</strong>, vous perdrez définitivement le tarif Pionnier</li>
                    </ul>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-destructive mb-1">
                      Perte du statut Pioneer
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Si vous vous réinscrivez après expiration
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel onClick={handleCancel} className="flex-1">
                ← Annuler
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleFinalConfirm}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                Confirmer la résiliation
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PioneerCancellationWarning;
