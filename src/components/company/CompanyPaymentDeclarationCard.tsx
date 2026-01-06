import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Banknote, 
  Building2, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  ShieldCheck,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface CompanyPaymentDeclarationCardProps {
  courseId: string;
  requestId?: string;
  invitationToken?: string;
  status: string;
  currentPaymentStatus?: string;
  employeeDeclaredPaidAt?: string;
  driverDeclaredPaymentReceived?: boolean;
  onPaymentDeclared?: () => void;
}

export function CompanyPaymentDeclarationCard({
  courseId,
  requestId,
  invitationToken,
  status,
  currentPaymentStatus,
  employeeDeclaredPaidAt,
  driverDeclaredPaymentReceived,
  onPaymentDeclared
}: CompanyPaymentDeclarationCardProps) {
  const [paymentChoice, setPaymentChoice] = useState<string>("");
  const queryClient = useQueryClient();

  // Récupérer les infos de confirmation actuelles
  const { data: courseConfirmation } = useQuery({
    queryKey: ["course-payment-confirmation", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("client_payment_confirmation, client_payment_confirmation_at, company_payment_status")
        .eq("id", courseId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && status === "completed"
  });

  // Ne montrer que si la course est terminée
  if (status !== "completed") return null;

  // Le chauffeur a déclaré paiement reçu sur place
  if (driverDeclaredPaymentReceived) {
    // Vérifier si le client a aussi confirmé
    const clientConfirmedPaidOnSpot = courseConfirmation?.client_payment_confirmation === "paid_on_spot";
    
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Paiement confirmé</p>
              <p className="text-sm text-muted-foreground">
                Le chauffeur a confirmé avoir reçu le paiement sur place
              </p>
            </div>
          </div>
          {clientConfirmedPaidOnSpot && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 p-2 rounded">
              <ShieldCheck className="w-4 h-4" />
              <span>Confirmé également par le collaborateur - Double vérification validée</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Le client a déjà déclaré
  if (employeeDeclaredPaidAt) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Paiement déclaré</p>
              <p className="text-sm text-muted-foreground">
                Vous avez déclaré avoir payé directement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Le chauffeur a déclaré "company_will_pay" - afficher la demande de confirmation
  const driverDeclaredPending = currentPaymentStatus === "company_will_pay";
  const clientAlreadyConfirmed = courseConfirmation?.client_payment_confirmation;

  // Si le client a déjà confirmé son choix
  if (clientAlreadyConfirmed) {
    const isCompanyWillPay = clientAlreadyConfirmed === "company_will_pay";
    return (
      <Card className={isCompanyWillPay ? "border-blue-500/30 bg-blue-500/5" : "border-green-500/30 bg-green-500/5"}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {isCompanyWillPay ? (
              <Building2 className="w-5 h-5 text-blue-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <div>
              <p className={`font-medium ${isCompanyWillPay ? 'text-blue-700' : 'text-green-700'}`}>
                {isCompanyWillPay ? "Paiement entreprise confirmé" : "Paiement sur place confirmé"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isCompanyWillPay 
                  ? "Vous avez confirmé ne pas avoir réglé sur place. L'entreprise gérera le paiement."
                  : "Vous avez confirmé avoir payé directement le chauffeur."
                }
              </p>
            </div>
          </div>
          {driverDeclaredPending && isCompanyWillPay && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-500/10 p-2 rounded mt-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Double vérification validée - Chauffeur et collaborateur sont d'accord</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const declarePaymentMutation = useMutation({
    mutationFn: async (type: string) => {
      // Mettre à jour la course avec la déclaration de paiement du client
      const updateData: any = {
        client_payment_confirmation: type,
        client_payment_confirmation_at: new Date().toISOString()
      };

      // Si le client dit avoir payé sur place
      if (type === "paid_on_spot") {
        updateData.company_payment_status = "paid_on_spot";
        updateData.employee_declared_paid_at = new Date().toISOString();
      }

      const { error: courseError } = await supabase
        .from("courses")
        .update(updateData)
        .eq("id", courseId);

      if (courseError) throw courseError;

      // Mettre à jour company_courses avec la confirmation client
      const { error: ccError } = await supabase
        .from("company_courses")
        .update({
          client_confirmed_payment_method: type,
          client_confirmed_at: new Date().toISOString(),
          actual_payment_method: type === "paid_on_spot" ? "employee_paid_spot" : "company_deferred",
          payment_declared_at: new Date().toISOString(),
          payment_declared_by: "employee"
        })
        .eq("course_id", courseId);

      if (ccError) throw ccError;

      // Si payé sur place, mettre à jour le statut de la facture
      if (type === "paid_on_spot") {
        await supabase
          .from("factures")
          .update({ 
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("course_id", courseId);
      }

      return type;
    },
    onSuccess: (type) => {
      queryClient.invalidateQueries({ queryKey: ["guest-employee-course-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["course-payment-confirmation"] });
      queryClient.invalidateQueries({ queryKey: ["company-payments"] });
      
      if (type === "paid_on_spot") {
        toast.success("Merci ! Votre paiement a été confirmé");
      } else {
        toast.success("Confirmation enregistrée. L'entreprise sera notifiée pour le paiement.");
      }
      onPaymentDeclared?.();
    },
    onError: (error) => {
      console.error("Error declaring payment:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  });

  // Si le chauffeur a déclaré paiement en attente, afficher la demande de confirmation spéciale
  if (driverDeclaredPending) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Confirmation de paiement requise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700">
              Le chauffeur a indiqué que le paiement sera géré par votre entreprise. 
              Merci de confirmer cette information pour sécuriser la transaction.
            </AlertDescription>
          </Alert>

          <RadioGroup value={paymentChoice} onValueChange={setPaymentChoice}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="company_will_pay" id="confirm_company" className="mt-0.5" />
              <Label htmlFor="confirm_company" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Je confirme ne pas avoir payé</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  C'est bien à mon entreprise de régler cette course
                </p>
              </Label>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="paid_on_spot" id="actually_paid" className="mt-0.5" />
              <Label htmlFor="actually_paid" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-600" />
                  <span className="font-medium">J'ai en fait payé sur place</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  J'ai réglé directement le chauffeur (espèces, CB, etc.)
                </p>
              </Label>
            </div>
          </RadioGroup>

          <Button
            className="w-full"
            onClick={() => declarePaymentMutation.mutate(paymentChoice)}
            disabled={!paymentChoice || declarePaymentMutation.isPending}
          >
            {declarePaymentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            Confirmer ma déclaration
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Sinon afficher la question standard
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          Comment avez-vous réglé cette course ?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={paymentChoice} onValueChange={setPaymentChoice}>
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="paid_on_spot" id="paid_spot" className="mt-0.5" />
            <Label htmlFor="paid_spot" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="font-medium">J'ai payé directement le chauffeur</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Paiement en espèces, carte bancaire ou autre sur place
              </p>
            </Label>
          </div>
          
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="company_will_pay" id="company_pays" className="mt-0.5" />
            <Label htmlFor="company_pays" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="font-medium">L'entreprise paiera</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Le paiement sera géré par mon entreprise
              </p>
            </Label>
          </div>
        </RadioGroup>

        <Button
          className="w-full"
          onClick={() => declarePaymentMutation.mutate(paymentChoice)}
          disabled={!paymentChoice || declarePaymentMutation.isPending}
        >
          {declarePaymentMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Confirmer
        </Button>
      </CardContent>
    </Card>
  );
}
