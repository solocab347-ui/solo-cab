import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Banknote, 
  Building2, 
  CheckCircle, 
  Loader2,
  AlertCircle
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

  // Ne montrer que si la course est terminée
  if (status !== "completed") return null;

  // Si déjà déclaré, montrer le statut
  if (employeeDeclaredPaidAt || driverDeclaredPaymentReceived) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">Paiement confirmé</p>
              <p className="text-sm text-muted-foreground">
                {driverDeclaredPaymentReceived 
                  ? "Le chauffeur a confirmé avoir reçu le paiement"
                  : "Vous avez déclaré avoir payé directement"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const declarePaymentMutation = useMutation({
    mutationFn: async (type: string) => {
      // Mettre à jour la course avec la déclaration de paiement
      const { error: courseError } = await supabase
        .from("courses")
        .update({
          company_payment_status: type === "paid_on_spot" ? "paid_on_spot" : "company_will_pay",
          employee_declared_paid_at: type === "paid_on_spot" ? new Date().toISOString() : null
        })
        .eq("id", courseId);

      if (courseError) throw courseError;

      // Mettre à jour company_courses
      const { error: ccError } = await supabase
        .from("company_courses")
        .update({
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
      queryClient.invalidateQueries({ queryKey: ["company-payments"] });
      toast.success(
        type === "paid_on_spot" 
          ? "Merci ! Votre paiement a été confirmé" 
          : "Information enregistrée. L'entreprise gérera le paiement."
      );
      onPaymentDeclared?.();
    },
    onError: (error) => {
      console.error("Error declaring payment:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  });

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
