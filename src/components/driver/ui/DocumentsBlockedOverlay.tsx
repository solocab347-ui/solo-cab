/**
 * Overlay affiché quand l'accès est restreint - Documents requis
 * 
 * 2 cas possibles:
 * 1. Documents non soumis → L'utilisateur doit uploader ses documents
 * 2. Documents soumis → En attente de validation admin
 * 
 * L'utilisateur ne peut accéder qu'aux documents
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, FileText, AlertTriangle, Clock, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { DriverDocuments } from "../DriverDocuments";

interface DocumentsBlockedOverlayProps {
  driverId: string;
  userId: string;
  driverProfile: any;
  onSubscriptionUpdate: () => void;
}

export const DocumentsBlockedOverlay = ({ 
  driverId, 
  userId,
  driverProfile, 
  onSubscriptionUpdate 
}: DocumentsBlockedOverlayProps) => {
  const documentsStatus = driverProfile?.driver?.documents_status || 'pending';
  const isSubmitted = documentsStatus === 'submitted';
  const isRejected = documentsStatus === 'rejected';
  const isPending = documentsStatus === 'pending';
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-4xl mx-auto">
        {/* Alerte principale - différente selon le statut */}
        {isSubmitted ? (
          // Documents soumis - En attente de validation
          <Alert className="mb-8 bg-amber-500/10 border-amber-500/50">
            <Clock className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-lg font-bold text-amber-600">Documents en cours de validation</AlertTitle>
            <AlertDescription className="mt-2 text-muted-foreground">
              <p className="mb-2">
                Vos documents ont été soumis et sont <strong>en cours d'examen</strong> par notre équipe.
              </p>
              <p>
                Vous serez notifié dès que la validation sera effectuée. 
                Ce processus prend généralement <strong>24 à 48 heures ouvrées</strong>.
              </p>
            </AlertDescription>
          </Alert>
        ) : isRejected ? (
          // Documents rejetés
          <Alert variant="destructive" className="mb-8">
            <XCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">Documents rejetés</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                Certains de vos documents ont été <strong>rejetés</strong> par notre équipe de vérification.
              </p>
              <p>
                Veuillez les corriger et les soumettre à nouveau pour activer votre compte.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          // Documents non encore soumis
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">Documents requis pour activer votre compte</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                Pour accéder à votre espace chauffeur SoloCab, vous devez d'abord soumettre vos <strong>documents professionnels</strong>.
              </p>
              <p>
                Une fois soumis, notre équipe validera vos documents sous 24 à 48 heures ouvrées.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Étapes de validation */}
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Processus de validation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Étape 1 - Soumission */}
            <div className={`p-4 rounded-lg border-2 transition-all ${
              isPending ? 'border-primary bg-primary/5' : 'border-success bg-success/5'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isPending ? (
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                ) : (
                  <CheckCircle className="w-6 h-6 text-success" />
                )}
                <span className="font-medium">Soumettre les documents</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPending ? "Téléchargez tous vos documents obligatoires" : "Documents soumis ✓"}
              </p>
            </div>

            {/* Étape 2 - Validation */}
            <div className={`p-4 rounded-lg border-2 transition-all ${
              isSubmitted ? 'border-amber-500 bg-amber-500/5' : 
              !isPending ? 'border-success bg-success/5' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isSubmitted ? (
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                ) : isPending ? (
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">2</div>
                ) : (
                  <CheckCircle className="w-6 h-6 text-success" />
                )}
                <span className="font-medium">Validation admin</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isSubmitted ? "En cours de vérification..." : 
                 isPending ? "En attente de soumission" : "Documents validés ✓"}
              </p>
            </div>

            {/* Étape 3 - Accès */}
            <div className={`p-4 rounded-lg border-2 border-muted`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
                <span className="font-medium">Accès complet</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Profitez de toutes les fonctionnalités SoloCab
              </p>
            </div>
          </div>
        </Card>

        {/* Card d'information sur les documents requis */}
        {isPending && (
          <Card className="p-6 bg-primary/5 border-primary/30 mb-6">
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-primary mb-2">Documents obligatoires</h3>
                <p className="text-muted-foreground mb-4">
                  Soumettez les documents ci-dessous pour activer votre compte chauffeur.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Carte professionnelle VTC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Permis de conduire</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Pièce d'identité</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Carte grise du véhicule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Attestation d'assurance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Extrait Kbis / INSEE</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Message d'attente pour documents soumis */}
        {isSubmitted && (
          <Card className="p-6 bg-amber-500/10 border-amber-500/30 mb-6">
            <div className="flex items-start gap-4">
              <Clock className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-amber-600 mb-2">Validation en cours</h3>
                <p className="text-muted-foreground">
                  Notre équipe examine actuellement vos documents. Vous recevrez une notification 
                  par email et dans l'application dès que la vérification sera terminée.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    En attente de validation
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Documents */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Mes Documents</h3>
            {isPending && (
              <Badge variant="destructive" className="ml-2 h-5 text-[10px]">Requis</Badge>
            )}
            {isSubmitted && (
              <Badge className="ml-2 h-5 text-[10px] bg-amber-500">En attente</Badge>
            )}
          </div>
          <DriverDocuments driverId={driverId} userId={userId} />
        </Card>

        {/* Footer informatif */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Besoin d'aide ? Contactez-nous à <a href="mailto:support@solocab.fr" className="text-primary hover:underline">support@solocab.fr</a>
          </p>
        </div>
      </div>
    </div>
  );
};
