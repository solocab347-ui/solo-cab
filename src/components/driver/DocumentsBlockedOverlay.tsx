/**
 * Overlay affiché quand l'accès est bloqué car les documents n'ont pas été soumis à temps
 * L'utilisateur ne peut accéder qu'aux documents et à la gestion de l'abonnement
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle, FileText, CreditCard, AlertTriangle } from "lucide-react";
import { DriverDocuments } from "./DriverDocuments";
import SubscriptionManager from "./SubscriptionManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-4xl mx-auto">
        {/* Alerte principale */}
        <Alert variant="destructive" className="mb-8">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Accès bloqué - Documents requis</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              Le délai de <strong>7 jours</strong> pour soumettre vos documents professionnels est dépassé.
            </p>
            <p>
              Votre accès à SoloCab est temporairement suspendu. Vous pouvez uniquement :
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Soumettre vos documents pour débloquer votre compte</li>
              <li>Gérer votre abonnement (modifier votre carte bancaire, etc.)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Card d'avertissement */}
        <Card className="p-6 bg-amber-500/10 border-amber-500/30 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg text-amber-500 mb-2">Comment débloquer votre compte ?</h3>
              <p className="text-muted-foreground mb-4">
                Soumettez tous les documents requis ci-dessous. Une fois vos documents validés, 
                vous retrouverez automatiquement l'accès complet à votre espace chauffeur.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Carte professionnelle VTC</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Permis de conduire</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Attestation d'assurance</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Carte grise du véhicule</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Onglets Documents / Abonnement */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4" />
              Mes Documents
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <CreditCard className="w-4 h-4" />
              Mon Abonnement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card className="p-6">
              <DriverDocuments driverId={driverId} userId={userId} />
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card className="p-6">
              <SubscriptionManager 
                driverProfile={driverProfile} 
                onSubscriptionUpdate={onSubscriptionUpdate} 
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
